from datetime import datetime, timezone
from uuid import UUID

from app import crud
from app.db import SessionLocal
from app.services.opportunity_engine import build_opportunities
from app.services.orchestrator import enqueue_research_job


def enqueue_monitor_refresh(monitor_job_id: str) -> None:
    run_monitor_refresh(UUID(monitor_job_id))


def build_research_snapshot(research_job, sources: list) -> dict:
    final_brief = research_job.final_brief_jsonb or {}
    discovery_insights = final_brief.get("discovery_insights") or {}
    return {
        "client_name": research_job.client_name,
        "client_profile": research_job.client_profile_jsonb,
        "source_urls": sorted(source.url for source in sources),
        "top_themes": list(final_brief.get("expertise_themes") or []),
        "interest_signals": [
            item.get("interest")
            for item in discovery_insights.get("public_interest_signals") or []
            if isinstance(item, dict) and item.get("interest")
        ],
        "safe_content_angles": [
            item.get("angle")
            for item in discovery_insights.get("safe_content_angles") or []
            if isinstance(item, dict) and item.get("angle")
        ],
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }


def run_monitor_refresh(monitor_job_id: UUID) -> None:
    db = SessionLocal()
    try:
        monitor_job = crud.get_monitor_job(db, monitor_job_id)
        if monitor_job is None:
            return

        research_job = crud.get_research_job(db, monitor_job.research_job_id)
        if research_job is None:
            crud.update_monitor_job(
                db,
                monitor_job,
                status="failed",
                error_jsonb={"stage": "validation", "message": "Research job not found"},
            )
            return

        previous_snapshot = monitor_job.snapshot_jsonb or {}
        crud.update_monitor_job(db, monitor_job, status="checking")

        enqueue_research_job(str(research_job.id))

        refreshed_research_job = crud.get_research_job(db, research_job.id)
        sources = crud.list_research_job_sources(db, research_job.id)
        new_snapshot = build_research_snapshot(refreshed_research_job, sources)
        events = _build_monitor_events(previous_snapshot, new_snapshot)
        for event in events:
            crud.create_monitor_event(db, monitor_job_id=monitor_job.id, **event)

        opportunity_preview = build_opportunities(
            refreshed_research_job,
            sources,
            (refreshed_research_job.final_brief_jsonb or {}).get("discovery_insights") or {},
        )[:3]
        summary = {
            "event_count": len(events),
            "top_new_actions": [item.get("title") for item in opportunity_preview],
            "client_name": refreshed_research_job.client_name,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
        crud.update_monitor_job(
            db,
            monitor_job,
            status="active",
            snapshot_jsonb=new_snapshot,
            summary_jsonb=summary,
            error_jsonb=None,
            last_checked_at=datetime.now(timezone.utc),
        )
    except Exception as exc:
        monitor_job = crud.get_monitor_job(db, monitor_job_id)
        if monitor_job is not None:
            crud.update_monitor_job(
                db,
                monitor_job,
                status="failed",
                error_jsonb={"stage": "monitoring", "message": str(exc)},
            )
        raise
    finally:
        db.close()


def _build_monitor_events(previous_snapshot: dict, new_snapshot: dict) -> list[dict]:
    events: list[dict] = []

    old_urls = set(previous_snapshot.get("source_urls") or [])
    new_urls = set(new_snapshot.get("source_urls") or [])
    for url in sorted(new_urls - old_urls)[:5]:
        events.append(
            {
                "event_type": "new_source",
                "source_url": url,
                "change_summary": "A new public source was detected for the target.",
                "confidence": 0.8,
                "recommended_followup": "Review this source for a new engagement or content opportunity.",
                "payload_jsonb": {"url": url},
            }
        )

    old_interests = set(previous_snapshot.get("interest_signals") or [])
    new_interests = set(new_snapshot.get("interest_signals") or [])
    for interest in sorted(new_interests - old_interests)[:5]:
        events.append(
            {
                "event_type": "new_interest_signal",
                "source_url": None,
                "change_summary": f"A new public interest signal appeared: {interest}.",
                "confidence": 0.7,
                "recommended_followup": "Consider updating content angles or short-form engagement ideas.",
                "payload_jsonb": {"interest": interest},
            }
        )

    old_angles = set(previous_snapshot.get("safe_content_angles") or [])
    new_angles = set(new_snapshot.get("safe_content_angles") or [])
    for angle in sorted(new_angles - old_angles)[:5]:
        events.append(
            {
                "event_type": "new_content_angle",
                "source_url": None,
                "change_summary": f"A new safe content angle is now supported: {angle}.",
                "confidence": 0.72,
                "recommended_followup": "Generate a blog or persona draft from this angle.",
                "payload_jsonb": {"angle": angle},
            }
        )

    return events
