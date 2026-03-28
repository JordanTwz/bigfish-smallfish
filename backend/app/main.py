from uuid import UUID

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.db import get_db
from app.schemas import (
    ResearchJobCreate,
    ResearchJobResponse,
    RunCreate,
    RunResponse,
    SourceCandidateResponse,
)
from app.services.orchestrator import enqueue_research_job

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/runs", response_model=list[RunResponse])
def read_runs(db: Session = Depends(get_db)) -> list[RunResponse]:
    return crud.list_runs(db)


@app.post("/runs", response_model=RunResponse, status_code=status.HTTP_201_CREATED)
def create_run(payload: RunCreate, db: Session = Depends(get_db)) -> RunResponse:
    return crud.create_run(db, payload)


@app.get("/runs/{run_id}", response_model=RunResponse)
def read_run(run_id: UUID, db: Session = Depends(get_db)) -> RunResponse:
    run = crud.get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


@app.post("/research-jobs", response_model=ResearchJobResponse, status_code=status.HTTP_201_CREATED)
def create_research_job(
    payload: ResearchJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ResearchJobResponse:
    research_job = crud.create_research_job(db, payload)
    background_tasks.add_task(enqueue_research_job, str(research_job.id))
    return research_job


@app.get("/research-jobs/{job_id}", response_model=ResearchJobResponse)
def read_research_job(job_id: UUID, db: Session = Depends(get_db)) -> ResearchJobResponse:
    research_job = crud.get_research_job(db, job_id)
    if research_job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found")
    return research_job


@app.get("/research-jobs/{job_id}/sources", response_model=list[SourceCandidateResponse])
def read_research_job_sources(job_id: UUID, db: Session = Depends(get_db)) -> list[SourceCandidateResponse]:
    research_job = crud.get_research_job(db, job_id)
    if research_job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found")
    return crud.list_research_job_sources(db, job_id)


@app.post("/research-jobs/{job_id}/refresh", response_model=ResearchJobResponse)
def refresh_research_job(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ResearchJobResponse:
    research_job = crud.get_research_job(db, job_id)
    if research_job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found")
    if research_job.status not in {"discovering", "extracting", "scoring"}:
        crud.update_research_job_status(db, research_job, "queued")
        background_tasks.add_task(enqueue_research_job, str(research_job.id))
        research_job = crud.get_research_job(db, job_id)
    return research_job
