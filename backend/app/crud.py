from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ResearchJob, Run, SourceCandidate
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
