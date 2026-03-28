from datetime import datetime, timezone
from uuid import UUID

from app import crud
from app.db import SessionLocal
from app.models import SourceCandidate
from app.services.discovery_insights import build_discovery_insights
from app.services.openai_content import OpenAIContentClient, OpenAIContentError
from app.services.persona import build_evidence_summary, build_seed_profile
from app.services.prompt_templates import build_blog_draft_prompts, build_resonance_profile_prompts


def enqueue_blog_draft_job(blog_draft_job_id: str) -> None:
    run_blog_draft_job(UUID(blog_draft_job_id))


def run_blog_draft_job(blog_draft_job_id: UUID) -> None:
    db = SessionLocal()
    try:
        blog_draft_job = crud.get_blog_draft_job(db, blog_draft_job_id)
        if blog_draft_job is None:
            return

        research_job = crud.get_research_job(db, blog_draft_job.research_job_id)
        if research_job is None:
            crud.update_blog_draft_job_status(
                db,
                blog_draft_job,
                "failed",
                error_jsonb={"stage": "validation", "message": "Research job not found"},
                finished=True,
            )
            return

        if research_job.status not in {"completed", "partial"}:
            crud.update_blog_draft_job_status(
                db,
                blog_draft_job,
                "failed",
                error_jsonb={"stage": "validation", "message": "Research job must be completed or partial"},
                finished=True,
            )
            return

        sources = crud.list_research_job_sources(db, research_job.id)
        if not sources:
            crud.update_blog_draft_job_status(
                db,
                blog_draft_job,
                "failed",
                error_jsonb={"stage": "validation", "message": "No sources available for blog drafting"},
                finished=True,
            )
            return

        try:
            client = OpenAIContentClient()
        except OpenAIContentError as exc:
            crud.update_blog_draft_job_status(
                db,
                blog_draft_job,
                "failed",
                error_jsonb={"stage": "configuration", "message": str(exc)},
                finished=True,
            )
            return

        crud.update_blog_draft_job_status(db, blog_draft_job, "profiling")
        evidence_summary = build_evidence_summary(sources)
        seed_profile = build_seed_profile(research_job, sources)
        discovery_insights = _get_discovery_insights(research_job, sources)
        profile_system, profile_user = build_resonance_profile_prompts(
            candidate_name=research_job.candidate_name,
            company_name=research_job.company_name,
            goal=blog_draft_job.goal,
            seed_profile=seed_profile,
            evidence_summary=evidence_summary,
            discovery_insights=discovery_insights,
            style_constraints=blog_draft_job.style_constraints,
            persona_constraints=blog_draft_job.persona_constraints,
        )
        resonance_profile = client.generate_json(system_prompt=profile_system, user_prompt=profile_user)
        crud.update_blog_draft_job_status(
            db,
            blog_draft_job,
            "outlining",
            resonance_profile_jsonb=resonance_profile,
        )

        crud.update_blog_draft_job_status(db, blog_draft_job, "drafting")
        draft_system, draft_user = build_blog_draft_prompts(
            candidate_name=research_job.candidate_name,
            company_name=research_job.company_name,
            goal=blog_draft_job.goal,
            draft_count=blog_draft_job.draft_count,
            target_length=blog_draft_job.target_length,
            resonance_profile=resonance_profile,
            evidence_summary=evidence_summary,
            discovery_insights=discovery_insights,
            style_constraints=blog_draft_job.style_constraints,
            persona_constraints=blog_draft_job.persona_constraints,
            client_name=blog_draft_job.client_name,
            client_profile=blog_draft_job.client_profile_jsonb,
            requested_angles=blog_draft_job.requested_angles_jsonb,
        )
        draft_payload = client.generate_json(system_prompt=draft_system, user_prompt=draft_user)
        drafts = draft_payload.get("drafts") or []

        created_count = 0
        for draft in drafts:
            if not isinstance(draft, dict):
                continue
            body_markdown = str(draft.get("body_markdown") or "").strip()
            title = str(draft.get("title") or "").strip()
            summary = str(draft.get("summary") or "").strip()
            audience_fit_rationale = str(draft.get("audience_fit_rationale") or "").strip()
            if not body_markdown or not title or not summary or not audience_fit_rationale:
                continue
            references = _normalize_evidence_references(draft.get("evidence_references"), sources)
            quality = (
                draft.get("quality")
                if isinstance(draft.get("quality"), dict)
                else _default_quality(body_markdown, draft.get("discovery_alignment"))
            )
            crud.create_blog_draft(
                db,
                blog_draft_job_id=blog_draft_job.id,
                title=title,
                origin_endpoint=blog_draft_job.origin_endpoint,
                angle=_normalize_angle(draft.get("angle")),
                author_mode=_normalize_author_mode(draft.get("author_mode")),
                slug_suggestion=_slugify(draft.get("slug_suggestion") or title),
                summary=summary,
                audience_fit_rationale=audience_fit_rationale,
                outline_jsonb=draft.get("outline") if isinstance(draft.get("outline"), dict) else {"sections": []},
                body_markdown=body_markdown,
                disclosure_note=_disclosure_note_for_mode(_normalize_author_mode(draft.get("author_mode"))),
                key_takeaways_jsonb=_string_list(draft.get("key_takeaways")),
                tags_jsonb=_string_list(draft.get("tags")),
                evidence_references_jsonb=references,
                quality_jsonb=quality,
            )
            created_count += 1

        final_status = "completed" if created_count == blog_draft_job.draft_count else "partial"
        error_jsonb = None
        if created_count == 0:
            final_status = "failed"
            error_jsonb = {"stage": "drafting", "message": "No valid blog drafts were generated"}
        elif final_status == "partial":
            error_jsonb = {
                "stage": "drafting",
                "message": f"Generated {created_count} of {blog_draft_job.draft_count} requested drafts",
            }

        crud.update_blog_draft_job_status(
            db,
            blog_draft_job,
            final_status,
            resonance_profile_jsonb=resonance_profile,
            error_jsonb=error_jsonb,
            finished=True,
        )
    except Exception as exc:
        blog_draft_job = crud.get_blog_draft_job(db, blog_draft_job_id)
        if blog_draft_job is not None:
            crud.update_blog_draft_job_status(
                db,
                blog_draft_job,
                "failed",
                error_jsonb={"stage": "orchestration", "message": str(exc)},
                finished=True,
            )
        raise
    finally:
        db.close()


def _normalize_evidence_references(references: object, sources: list[SourceCandidate]) -> list[dict]:
    allowed_urls = {source.url for source in sources}
    normalized: list[dict] = []
    if isinstance(references, list):
        for item in references:
            if not isinstance(item, dict):
                continue
            source_url = item.get("source_url")
            if isinstance(source_url, str) and source_url in allowed_urls:
                normalized.append(
                    {
                        "source_url": source_url,
                        "source_type": item.get("source_type"),
                        "reason": item.get("reason"),
                    }
                )
    return normalized


def _default_quality(body_markdown: str, discovery_alignment: object = None) -> dict:
    length = len(body_markdown)
    aligned_signals = 0
    if isinstance(discovery_alignment, dict):
        aligned_signals += len(discovery_alignment.get("used_interest_signals") or [])
        aligned_signals += len(discovery_alignment.get("used_content_angles") or [])
        aligned_signals += len(discovery_alignment.get("used_credibility_opportunities") or [])
    return {
        "depth_score": min(round(length / 2500, 2), 1.0),
        "specificity_score": min(round(length / 3000, 2), 1.0),
        "resonance_fit_score": min(0.55 + (aligned_signals * 0.1), 1.0),
        "warning_flags": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _slugify(value: str) -> str:
    return "-".join(part for part in value.lower().replace("_", " ").split() if part)


def _normalize_angle(value: object) -> str:
    normalized = str(value or "client_voice").strip().lower()
    if normalized not in {"client_voice", "expert_commentary"}:
        return "client_voice"
    return normalized


def _normalize_author_mode(value: object) -> str:
    normalized = str(value or "client_voice").strip().lower()
    if normalized not in {"client_voice", "expert_commentary"}:
        return "client_voice"
    return normalized


def _disclosure_note_for_mode(author_mode: str) -> str | None:
    if author_mode == "expert_commentary":
        return "This draft is written in a generic expert-commentary style and is not attributed to any real authority."
    return None


def _get_discovery_insights(research_job, sources: list[SourceCandidate]) -> dict:
    final_brief = research_job.final_brief_jsonb or {}
    discovery_insights = final_brief.get("discovery_insights")
    if isinstance(discovery_insights, dict):
        return discovery_insights
    return build_discovery_insights(research_job, sources)
