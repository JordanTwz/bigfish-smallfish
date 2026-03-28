import asyncio
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.db import SessionLocal
from app.models import ResearchJob, SourceCandidate
from app.services.prompt_templates import build_discovery_targets, build_extraction_goal
from app.services.tinyfish import TinyfishClient, TinyfishError

TERMINAL_STATUSES = {"completed", "failed", "cancelled", "timeout"}


def enqueue_research_job(job_id: str) -> None:
    asyncio.run(orchestrate_research_job(UUID(job_id)))


async def orchestrate_research_job(job_id: UUID) -> None:
    db = SessionLocal()
    try:
        job = crud.get_research_job(db, job_id)
        if job is None:
            return

        try:
            client = TinyfishClient()
        except TinyfishError as exc:
            crud.update_research_job_status(
                db,
                job,
                "failed",
                error_jsonb={"message": str(exc), "stage": "configuration"},
                finished=True,
            )
            return

        crud.update_research_job_status(db, job, "discovering")
        discovered_sources = await _run_discovery_stage(db, job, client)
        if not discovered_sources:
            crud.update_research_job_status(
                db,
                job,
                "failed",
                error_jsonb={"message": "No candidate sources found", "stage": "discovery"},
                finished=True,
            )
            return

        crud.update_research_job_status(db, job, "extracting")
        extracted_sources = await _run_extraction_stage(db, job, client, discovered_sources)

        crud.update_research_job_status(db, job, "scoring")
        final_brief = build_final_brief(job, extracted_sources or discovered_sources)
        final_status = "completed" if extracted_sources else "partial"
        crud.update_research_job_status(db, job, final_status, final_brief_jsonb=final_brief, finished=True)
    except Exception as exc:
        job = crud.get_research_job(db, job_id)
        if job is not None:
            crud.update_research_job_status(
                db,
                job,
                "failed",
                error_jsonb={"message": str(exc), "stage": "orchestration"},
                finished=True,
            )
        raise
    finally:
        db.close()


async def _run_discovery_stage(db: Session, job: ResearchJob, client: TinyfishClient) -> list[SourceCandidate]:
    targets = build_discovery_targets(job)
    sem = asyncio.Semaphore(settings.tinyfish_discovery_concurrency)
    domain_semaphores = _build_domain_semaphores(targets)

    async def run_target(target: dict[str, str]) -> None:
        async with sem:
            async with domain_semaphores[_domain_key(target["url"])]:
                task_db = SessionLocal()
                tinyfish_run = None
                try:
                    tinyfish_run = crud.create_tinyfish_run(
                        task_db,
                        research_job_id=job.id,
                        stage="discovery",
                        target_url=target["url"],
                        goal=target["goal"],
                    )
                    start_payload = await client.start_run(url=target["url"], goal=target["goal"])
                    run_id = _extract_run_id(start_payload)
                    crud.update_tinyfish_run(task_db, tinyfish_run, status="running", tinyfish_run_id=run_id)
                    final_payload = await _poll_run(client, run_id)
                    normalized_status = _normalize_status(final_payload.get("status"))
                    crud.update_tinyfish_run(
                        task_db,
                        tinyfish_run,
                        status=normalized_status,
                        raw_result_jsonb=final_payload,
                        finished=normalized_status in TERMINAL_STATUSES,
                    )
                    _persist_discovery_matches(task_db, job.id, final_payload)
                except Exception as exc:
                    task_db.rollback()
                    _record_task_failure(
                        task_db,
                        research_job_id=job.id,
                        stage="discovery",
                        target_url=target["url"],
                        goal=target["goal"],
                        exc=exc,
                        tinyfish_run=tinyfish_run,
                    )
                finally:
                    task_db.close()

    await asyncio.gather(*(run_target(target) for target in targets), return_exceptions=True)
    return crud.list_research_job_sources(db, job.id)


async def _run_extraction_stage(
    db: Session,
    job: ResearchJob,
    client: TinyfishClient,
    discovered_sources: list[SourceCandidate],
) -> list[SourceCandidate]:
    selected_sources = sorted(
        discovered_sources, key=lambda item: (item.confidence or 0.0), reverse=True
    )[:8]
    sem = asyncio.Semaphore(settings.tinyfish_extraction_concurrency)
    domain_semaphores = _build_domain_semaphores([{"url": source.url} for source in selected_sources])

    async def run_source(source: SourceCandidate) -> None:
        goal = build_extraction_goal(job, source.url)
        async with sem:
            async with domain_semaphores[_domain_key(source.url)]:
                task_db = SessionLocal()
                tinyfish_run = None
                try:
                    tinyfish_run = crud.create_tinyfish_run(
                        task_db,
                        research_job_id=job.id,
                        stage="extraction",
                        target_url=source.url,
                        goal=goal,
                    )
                    start_payload = await client.start_run(url=source.url, goal=goal)
                    run_id = _extract_run_id(start_payload)
                    crud.update_tinyfish_run(task_db, tinyfish_run, status="running", tinyfish_run_id=run_id)
                    final_payload = await _poll_run(client, run_id)
                    normalized_status = _normalize_status(final_payload.get("status"))
                    crud.update_tinyfish_run(
                        task_db,
                        tinyfish_run,
                        status=normalized_status,
                        raw_result_jsonb=final_payload,
                        finished=normalized_status in TERMINAL_STATUSES,
                    )
                    if normalized_status == "completed":
                        persisted_source = task_db.get(SourceCandidate, source.id)
                        if persisted_source is not None:
                            _enrich_source_from_extraction(task_db, persisted_source, final_payload)
                except Exception as exc:
                    task_db.rollback()
                    _record_task_failure(
                        task_db,
                        research_job_id=job.id,
                        stage="extraction",
                        target_url=source.url,
                        goal=goal,
                        exc=exc,
                        tinyfish_run=tinyfish_run,
                    )
                finally:
                    task_db.close()

    await asyncio.gather(*(run_source(source) for source in selected_sources), return_exceptions=True)
    return crud.list_research_job_sources(db, job.id)


async def _poll_run(client: TinyfishClient, run_id: str) -> dict[str, Any]:
    deadline = datetime.now(timezone.utc).timestamp() + settings.tinyfish_max_poll_seconds
    while True:
        payload = await client.get_run(run_id)
        status = _normalize_status(payload.get("status"))
        if status in TERMINAL_STATUSES:
            return payload
        if datetime.now(timezone.utc).timestamp() >= deadline:
            return {"status": "timeout", "error": {"message": "Run polling timed out"}, "run_id": run_id}
        await asyncio.sleep(settings.tinyfish_poll_interval_seconds)


def _persist_discovery_matches(db: Session, job_id: UUID, payload: dict[str, Any]) -> None:
    result = _extract_result_payload(payload)
    matches = []
    if isinstance(result, dict):
        matches = result.get("matches") or result.get("partial_results") or []

    for match in matches:
        if not isinstance(match, dict):
            continue
        url = match.get("url")
        if not url:
            continue
        crud.create_source_candidate(
            db,
            research_job_id=job_id,
            url=url,
            normalized_url=_normalize_url(url),
            title=match.get("title"),
            source_type=match.get("source_type"),
            stage="discovery",
            confidence=_coerce_float(match.get("confidence")),
            evidence_jsonb={"discovery_match": match, "notes": result.get("notes") if isinstance(result, dict) else None},
        )


def _enrich_source_from_extraction(db: Session, source: SourceCandidate, payload: dict[str, Any]) -> None:
    result = _extract_result_payload(payload)
    if not isinstance(result, dict):
        return

    source.stage = "extraction"
    source.evidence_jsonb = result
    source.confidence = _coerce_float(result.get("confidence")) or source.confidence
    source.ranking_score = _score_source(result, source.confidence)
    source.updated_at = datetime.now(timezone.utc)
    db.add(source)
    db.commit()
    db.refresh(source)


def build_final_brief(job: ResearchJob, sources: list[SourceCandidate]) -> dict[str, Any]:
    ranked_sources = sorted(sources, key=lambda item: (item.ranking_score or item.confidence or 0.0), reverse=True)
    top_sources = ranked_sources[:8]
    themes = _collect_themes(top_sources)
    top_themes = [theme for theme, _count in themes.most_common(4)]

    return {
        "candidate_name": job.candidate_name,
        "company_name": job.company_name,
        "summary": f"Public-professional source brief for {job.candidate_name}.",
        "top_sources": [
            {
                "title": source.title,
                "url": source.url,
                "source_type": source.source_type,
                "confidence": source.confidence,
                "ranking_score": source.ranking_score,
            }
            for source in top_sources
        ],
        "expertise_themes": top_themes,
        "trait_scores": _build_trait_scores(top_themes),
        "tailored_answer_guidance": [
            f"Prepare one concrete example related to {theme}." for theme in top_themes[:3]
        ],
        "tailored_questions": [
            f"Ask how {job.candidate_name}'s team approaches {theme} in practice." for theme in top_themes[:3]
        ],
        "warnings": [] if top_sources else ["No strong public professional sources were found."],
    }


def _build_domain_semaphores(targets: list[dict[str, str]]) -> dict[str, asyncio.Semaphore]:
    semaphores: dict[str, asyncio.Semaphore] = defaultdict(
        lambda: asyncio.Semaphore(settings.tinyfish_per_domain_concurrency)
    )
    for target in targets:
        semaphores[_domain_key(target["url"])]
    return semaphores


def _domain_key(url: str) -> str:
    return urlparse(url).netloc or "unknown"


def _extract_run_id(payload: dict[str, Any]) -> str:
    run_id = payload.get("run_id") or payload.get("id")
    if not run_id:
        raise TinyfishError(f"Missing run_id in TinyFish response: {payload}")
    return str(run_id)


def _extract_result_payload(payload: dict[str, Any]) -> dict[str, Any] | list[Any] | None:
    if "result" in payload:
        return payload["result"]
    if isinstance(payload.get("data"), dict) and "result" in payload["data"]:
        return payload["data"]["result"]
    return payload.get("data") if isinstance(payload.get("data"), (dict, list)) else payload


def _normalize_status(status: Any) -> str:
    if status is None:
        return "unknown"
    return str(status).strip().lower()


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")


def _coerce_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _score_source(result: dict[str, Any], confidence: float | None) -> float:
    evidence = result.get("evidence") or {}
    richness = sum(len(evidence.get(key) or []) for key in ["expertise_themes", "notable_projects", "quotes_or_claims"])
    primary_source_bonus = 0.15 if (result.get("source") or {}).get("is_primary_source") else 0.0
    return round((confidence or 0.0) + min(richness * 0.05, 0.5) + primary_source_bonus, 3)


def _collect_themes(sources: list[SourceCandidate]) -> Counter:
    themes: Counter = Counter()
    for source in sources:
        if not source.evidence_jsonb:
            continue
        evidence = source.evidence_jsonb.get("evidence") or {}
        for theme in evidence.get("expertise_themes") or []:
            if isinstance(theme, str) and theme.strip():
                themes[theme.strip()] += 1
    return themes


def _build_trait_scores(themes: list[str]) -> dict[str, float]:
    theme_text = " ".join(themes).lower()
    return {
        "architecture_focus": 0.8 if "architecture" in theme_text or "distributed" in theme_text else 0.3,
        "product_focus": 0.8 if "product" in theme_text or "user" in theme_text else 0.3,
        "debugging_operations_focus": 0.8 if "debug" in theme_text or "operations" in theme_text else 0.3,
        "leadership_mentorship_focus": 0.8 if "leadership" in theme_text or "mentorship" in theme_text else 0.3,
        "research_depth_focus": 0.8 if "research" in theme_text or "infrastructure" in theme_text else 0.3,
    }


def _record_task_failure(
    db: Session,
    research_job_id: UUID,
    stage: str,
    target_url: str,
    goal: str,
    exc: Exception,
    tinyfish_run=None,
) -> None:
    if tinyfish_run is None:
        tinyfish_run = crud.create_tinyfish_run(
            db,
            research_job_id=research_job_id,
            stage=stage,
            target_url=target_url,
            goal=goal,
        )
    crud.update_tinyfish_run(
        db,
        tinyfish_run,
        status="failed",
        raw_error_jsonb={"message": str(exc)},
        finished=True,
    )
