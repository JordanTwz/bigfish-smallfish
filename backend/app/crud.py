from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ResearchJob, Run, SourceCandidate, TinyfishRun
from app.schemas import ResearchJobCreate, RunCreate


def create_run(db: Session, payload: RunCreate) -> Run:
    run = Run(source_url=str(payload.source_url), goal=payload.goal)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def list_runs(db: Session) -> list[Run]:
    return list(db.scalars(select(Run).order_by(Run.created_at.desc())))


def get_run(db: Session, run_id: UUID) -> Run | None:
    return db.get(Run, run_id)


def create_research_job(db: Session, payload: ResearchJobCreate) -> ResearchJob:
    research_job = ResearchJob(
        candidate_name=payload.candidate_name,
        company_name=payload.company_name,
        company_domain=payload.company_domain,
        role_title=payload.role_title,
        search_context=payload.search_context,
    )
    db.add(research_job)
    db.commit()
    db.refresh(research_job)
    return research_job


def get_research_job(db: Session, job_id: UUID) -> ResearchJob | None:
    return db.get(ResearchJob, job_id)


def list_research_job_sources(db: Session, job_id: UUID) -> list[SourceCandidate]:
    stmt = select(SourceCandidate).where(SourceCandidate.research_job_id == job_id)
    return list(db.scalars(stmt.order_by(SourceCandidate.created_at.desc())))


def update_research_job_status(
    db: Session,
    job: ResearchJob,
    status: str,
    *,
    final_brief_jsonb: dict | None = None,
    error_jsonb: dict | None = None,
    finished: bool = False,
) -> ResearchJob:
    job.status = status
    job.updated_at = datetime.now(timezone.utc)
    if final_brief_jsonb is not None:
        job.final_brief_jsonb = final_brief_jsonb
    if error_jsonb is not None:
        job.error_jsonb = error_jsonb
    if finished:
        job.finished_at = datetime.now(timezone.utc)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def create_tinyfish_run(
    db: Session,
    *,
    research_job_id: UUID,
    stage: str,
    target_url: str,
    goal: str,
    browser_profile: str = "lite",
    attempt_number: int = 1,
) -> TinyfishRun:
    tinyfish_run = TinyfishRun(
        research_job_id=research_job_id,
        stage=stage,
        target_url=target_url,
        goal=goal,
        browser_profile=browser_profile,
        attempt_number=attempt_number,
    )
    db.add(tinyfish_run)
    db.commit()
    db.refresh(tinyfish_run)
    return tinyfish_run


def update_tinyfish_run(
    db: Session,
    tinyfish_run: TinyfishRun,
    *,
    status: str | None = None,
    tinyfish_run_id: str | None = None,
    raw_result_jsonb: dict | None = None,
    raw_error_jsonb: dict | None = None,
    browser_profile: str | None = None,
    finished: bool = False,
) -> TinyfishRun:
    if status is not None:
        tinyfish_run.status = status
    if tinyfish_run_id is not None:
        tinyfish_run.tinyfish_run_id = tinyfish_run_id
    if raw_result_jsonb is not None:
        tinyfish_run.raw_result_jsonb = raw_result_jsonb
    if raw_error_jsonb is not None:
        tinyfish_run.raw_error_jsonb = raw_error_jsonb
    if browser_profile is not None:
        tinyfish_run.browser_profile = browser_profile
    tinyfish_run.updated_at = datetime.now(timezone.utc)
    if finished:
        tinyfish_run.finished_at = datetime.now(timezone.utc)
    db.add(tinyfish_run)
    db.commit()
    db.refresh(tinyfish_run)
    return tinyfish_run


def create_source_candidate(
    db: Session,
    *,
    research_job_id: UUID,
    url: str,
    normalized_url: str | None,
    title: str | None,
    source_type: str | None,
    stage: str,
    confidence: float | None,
    ranking_score: float | None = None,
    evidence_jsonb: dict | None = None,
) -> SourceCandidate:
    source_candidate = SourceCandidate(
        research_job_id=research_job_id,
        url=url,
        normalized_url=normalized_url,
        title=title,
        source_type=source_type,
        stage=stage,
        confidence=confidence,
        ranking_score=ranking_score,
        evidence_jsonb=evidence_jsonb,
    )
    db.add(source_candidate)
    db.commit()
    db.refresh(source_candidate)
    return source_candidate
