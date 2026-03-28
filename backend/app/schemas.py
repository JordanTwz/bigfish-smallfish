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
    client_name: str | None = None
    client_profile: dict[str, Any] | None = None


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
    client_name: str | None
    client_profile_jsonb: dict[str, Any] | None
    final_brief_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None


class BlogDraftJobCreate(BaseModel):
    goal: str = "resonance"
    draft_count: int = 3
    target_length: str = "medium"
    style_constraints: str | None = None
    persona_constraints: str | None = None
    client_name: str | None = None
    client_profile: dict[str, Any] | None = None
    requested_angles: list[str] | None = None


class BlogDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    blog_draft_job_id: UUID
    title: str
    angle: str
    author_mode: str
    slug_suggestion: str | None
    summary: str
    audience_fit_rationale: str
    outline_jsonb: dict[str, Any]
    body_markdown: str
    disclosure_note: str | None
    key_takeaways_jsonb: list[str] | None
    tags_jsonb: list[str] | None
    evidence_references_jsonb: list[dict[str, Any]] | None
    quality_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class BlogDraftPublishResponse(BaseModel):
    draft: BlogDraftResponse
    tinyfish_run_id: str
    status: str
    published_url: str | None = None
    result_jsonb: dict[str, Any] | None = None
    error_jsonb: dict[str, Any] | None = None


class BlogDraftJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    research_job_id: UUID
    status: str
    goal: str
    draft_count: int
    target_length: str
    style_constraints: str | None
    persona_constraints: str | None
    client_name: str | None
    client_profile_jsonb: dict[str, Any] | None
    requested_angles_jsonb: list[str] | None
    resonance_profile_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None


class OpportunityJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    research_job_id: UUID
    status: str
    summary_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None


class OpportunityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    opportunity_job_id: UUID
    type: str
    title: str
    description: str
    target_url: str | None
    theme: str | None
    estimated_impact: float | None
    estimated_effort: float | None
    confidence: float | None
    why_now: str | None
    supporting_sources_jsonb: list[dict[str, Any]] | None
    recommended_asset_type: str | None
    priority_score: float | None
    created_at: datetime


class MonitorJobCreate(BaseModel):
    cadence: str = "manual"


class MonitorJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    research_job_id: UUID
    status: str
    cadence: str
    active: bool
    snapshot_jsonb: dict[str, Any] | None
    summary_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    last_checked_at: datetime | None
    next_check_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MonitorEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    monitor_job_id: UUID
    event_type: str
    source_url: str | None
    change_summary: str
    confidence: float | None
    recommended_followup: str | None
    payload_jsonb: dict[str, Any] | None
    created_at: datetime
