from datetime import datetime, timezone
from uuid import UUID

from app import crud
from app.db import SessionLocal
from app.models import ResearchJob, SourceCandidate


def enqueue_opportunity_job(opportunity_job_id: str) -> None:
    run_opportunity_job(UUID(opportunity_job_id))


def run_opportunity_job(opportunity_job_id: UUID) -> None:
    db = SessionLocal()
    try:
        opportunity_job = crud.get_opportunity_job(db, opportunity_job_id)
        if opportunity_job is None:
            return

        research_job = crud.get_research_job(db, opportunity_job.research_job_id)
        if research_job is None:
            crud.update_opportunity_job_status(
                db,
                opportunity_job,
                "failed",
                error_jsonb={"stage": "validation", "message": "Research job not found"},
                finished=True,
            )
            return

        sources = crud.list_research_job_sources(db, research_job.id)
        final_brief = research_job.final_brief_jsonb or {}
        discovery_insights = final_brief.get("discovery_insights") or {}

        crud.update_opportunity_job_status(db, opportunity_job, "ranking")
        opportunities = build_opportunities(research_job, sources, discovery_insights)
        for item in opportunities:
            crud.create_opportunity(db, opportunity_job_id=opportunity_job.id, **item)

        summary = {
            "count": len(opportunities),
            "top_types": _top_types(opportunities),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        final_status = "completed" if opportunities else "partial"
        error_jsonb = None if opportunities else {"message": "No useful opportunities were generated"}
        crud.update_opportunity_job_status(
            db,
            opportunity_job,
            final_status,
            summary_jsonb=summary,
            error_jsonb=error_jsonb,
            finished=True,
        )
    except Exception as exc:
        opportunity_job = crud.get_opportunity_job(db, opportunity_job_id)
        if opportunity_job is not None:
            crud.update_opportunity_job_status(
                db,
                opportunity_job,
                "failed",
                error_jsonb={"stage": "orchestration", "message": str(exc)},
                finished=True,
            )
        raise
    finally:
        db.close()


def build_opportunities(
    research_job: ResearchJob, sources: list[SourceCandidate], discovery_insights: dict
) -> list[dict]:
    items: list[dict] = []
    safe_content_angles = discovery_insights.get("safe_content_angles") or []
    engagement_opportunities = discovery_insights.get("engagement_opportunities") or []
    contribution_opportunities = discovery_insights.get("contribution_opportunities") or []
    credibility_opportunities = discovery_insights.get("credibility_opportunities") or []
    top_sources = sorted(sources, key=lambda item: (item.ranking_score or item.confidence or 0.0), reverse=True)[:5]

    for angle in safe_content_angles[:3]:
        theme = angle.get("angle")
        items.append(
            {
                "type": "content_opportunity",
                "title": f"Publish a technical angle: {theme}",
                "description": angle.get("why_it_resonates") or "Turn this theme into a public technical artifact.",
                "target_url": None,
                "theme": theme,
                "estimated_impact": 0.82,
                "estimated_effort": 0.55,
                "confidence": 0.78,
                "why_now": "This aligns directly with the target's visible public interests.",
                "supporting_sources_jsonb": _supporting_sources(top_sources),
                "recommended_asset_type": "blog_draft",
                "priority_score": 0.82,
            }
        )

    for engagement in engagement_opportunities[:3]:
        urls = engagement.get("candidate_urls") or []
        items.append(
            {
                "type": engagement.get("type") or "engagement_opportunity",
                "title": f"Engage via {engagement.get('type', 'public discussion').replace('_', ' ')}",
                "description": engagement.get("description") or "Public engagement opportunity derived from the target's ecosystem.",
                "target_url": urls[0] if urls else None,
                "theme": _first_theme(discovery_insights),
                "estimated_impact": 0.74,
                "estimated_effort": 0.35,
                "confidence": 0.72,
                "why_now": "A direct public engagement surface is already visible.",
                "supporting_sources_jsonb": [{"url": url} for url in urls[:3]],
                "recommended_asset_type": "comment_draft",
                "priority_score": 0.76,
            }
        )

    for contribution in contribution_opportunities[:3]:
        theme = contribution.get("theme")
        items.append(
            {
                "type": "contribution_opportunity",
                "title": f"Contribute around {theme}",
                "description": contribution.get("suggestion") or "Contribute in a public technical surface related to this theme.",
                "target_url": _first_source_url(top_sources),
                "theme": theme,
                "estimated_impact": 0.7,
                "estimated_effort": 0.6,
                "confidence": 0.68,
                "why_now": "This theme appears in the current public evidence set.",
                "supporting_sources_jsonb": _supporting_sources(top_sources),
                "recommended_asset_type": "credibility_note",
                "priority_score": 0.71,
            }
        )

    for note in credibility_opportunities[:2]:
        items.append(
            {
                "type": "profile_update_opportunity",
                "title": "Strengthen visible credibility signals",
                "description": note,
                "target_url": None,
                "theme": _first_theme(discovery_insights),
                "estimated_impact": 0.65,
                "estimated_effort": 0.25,
                "confidence": 0.75,
                "why_now": "This can improve the client's public footprint before longer-form publishing.",
                "supporting_sources_jsonb": _supporting_sources(top_sources),
                "recommended_asset_type": "linkedin_copy",
                "priority_score": 0.79,
            }
        )

    return sorted(items, key=lambda item: item["priority_score"] or 0.0, reverse=True)


def _supporting_sources(sources: list[SourceCandidate]) -> list[dict]:
    return [
        {
            "source_id": str(source.id),
            "url": source.url,
            "title": source.title,
            "source_type": source.source_type,
        }
        for source in sources[:3]
    ]


def _top_types(opportunities: list[dict]) -> list[str]:
    seen = []
    for item in opportunities:
        item_type = item.get("type")
        if item_type and item_type not in seen:
            seen.append(item_type)
    return seen[:4]


def _first_theme(discovery_insights: dict) -> str | None:
    signals = discovery_insights.get("public_interest_signals") or []
    if signals and isinstance(signals[0], dict):
        return signals[0].get("interest")
    return None


def _first_source_url(sources: list[SourceCandidate]) -> str | None:
    return sources[0].url if sources else None
