from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, HttpUrl


class RunCreate(BaseModel):
    source_url: HttpUrl
    goal: str


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tinyfish_run_id: str | None
    status: str
    source_url: str
    goal: str
    result_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None


class ResearchJobCreate(BaseModel):
    candidate_name: str
    company_name: str | None = None
    company_domain: str | None = None
    role_title: str | None = None
    search_context: str | None = None


class SourceCandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    research_job_id: UUID
    url: str
    normalized_url: str | None
    title: str | None
    source_type: str | None
    stage: str
    confidence: float | None
    ranking_score: float | None
    evidence_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class ResearchJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    candidate_name: str
    company_name: str | None
    company_domain: str | None
    role_title: str | None
    search_context: str | None
    final_brief_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None
