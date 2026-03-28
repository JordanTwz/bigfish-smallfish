from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Run
from app.schemas import RunCreate


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
