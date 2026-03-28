from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.db import get_db
from app.schemas import RunCreate, RunResponse

app = FastAPI(title=settings.app_name)


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
