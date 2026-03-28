from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tinyfish_run_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[str] = mapped_column(String(64), index=True, default="pending")
    source_url: Mapped[str] = mapped_column(String(2048))
    goal: Mapped[str] = mapped_column(String(4096))
    result_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ResearchJob(Base):
    __tablename__ = "research_jobs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    status: Mapped[str] = mapped_column(String(64), index=True, default="queued")
    candidate_name: Mapped[str] = mapped_column(String(255))
    company_name: Mapped[str | None] = mapped_column(String(255))
    company_domain: Mapped[str | None] = mapped_column(String(255))
    role_title: Mapped[str | None] = mapped_column(String(255))
    search_context: Mapped[str | None] = mapped_column(String(2048))
    final_brief_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    source_candidates: Mapped[list["SourceCandidate"]] = relationship(
        back_populates="research_job", cascade="all, delete-orphan"
    )
    tinyfish_runs: Mapped[list["TinyfishRun"]] = relationship(
        back_populates="research_job", cascade="all, delete-orphan"
    )
    blog_draft_jobs: Mapped[list["BlogDraftJob"]] = relationship(
        back_populates="research_job", cascade="all, delete-orphan"
    )
    opportunity_jobs: Mapped[list["OpportunityJob"]] = relationship(
        back_populates="research_job", cascade="all, delete-orphan"
    )
    monitor_jobs: Mapped[list["MonitorJob"]] = relationship(
        back_populates="research_job", cascade="all, delete-orphan"
    )


class SourceCandidate(Base):
    __tablename__ = "source_candidates"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    research_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(2048))
    normalized_url: Mapped[str | None] = mapped_column(String(2048), index=True)
    title: Mapped[str | None] = mapped_column(String(512))
    source_type: Mapped[str | None] = mapped_column(String(64), index=True)
    stage: Mapped[str] = mapped_column(String(64), default="discovery")
    confidence: Mapped[float | None] = mapped_column(Float)
    ranking_score: Mapped[float | None] = mapped_column(Float)
    evidence_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    research_job: Mapped["ResearchJob"] = relationship(back_populates="source_candidates")


class TinyfishRun(Base):
    __tablename__ = "tinyfish_runs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    research_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    tinyfish_run_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stage: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(64), index=True, default="queued")
    target_url: Mapped[str] = mapped_column(String(2048))
    goal: Mapped[str] = mapped_column(String(4096))
    browser_profile: Mapped[str] = mapped_column(String(64), default="lite")
    attempt_number: Mapped[int] = mapped_column(default=1)
    raw_result_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    raw_error_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    research_job: Mapped["ResearchJob"] = relationship(back_populates="tinyfish_runs")


class BlogDraftJob(Base):
    __tablename__ = "blog_draft_jobs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    research_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(64), index=True, default="queued")
    goal: Mapped[str] = mapped_column(String(64), default="resonance")
    draft_count: Mapped[int] = mapped_column(default=3)
    target_length: Mapped[str] = mapped_column(String(32), default="medium")
    style_constraints: Mapped[str | None] = mapped_column(String(4096))
    persona_constraints: Mapped[str | None] = mapped_column(String(4096))
    client_name: Mapped[str | None] = mapped_column(String(255))
    client_profile_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    requested_angles_jsonb: Mapped[list[str] | None] = mapped_column(JSONB)
    resonance_profile_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    research_job: Mapped["ResearchJob"] = relationship(back_populates="blog_draft_jobs")
    drafts: Mapped[list["BlogDraft"]] = relationship(
        back_populates="blog_draft_job", cascade="all, delete-orphan"
    )


class BlogDraft(Base):
    __tablename__ = "blog_drafts"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    blog_draft_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("blog_draft_jobs.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(512))
    angle: Mapped[str] = mapped_column(String(64), default="client_voice")
    author_mode: Mapped[str] = mapped_column(String(64), default="client_voice")
    slug_suggestion: Mapped[str | None] = mapped_column(String(512))
    summary: Mapped[str] = mapped_column(String(2048))
    audience_fit_rationale: Mapped[str] = mapped_column(String(4096))
    outline_jsonb: Mapped[dict[str, Any]] = mapped_column(JSONB)
    body_markdown: Mapped[str] = mapped_column(String(20000))
    disclosure_note: Mapped[str | None] = mapped_column(String(2048))
    key_takeaways_jsonb: Mapped[list[str] | None] = mapped_column(JSONB)
    tags_jsonb: Mapped[list[str] | None] = mapped_column(JSONB)
    evidence_references_jsonb: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
    quality_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    blog_draft_job: Mapped["BlogDraftJob"] = relationship(back_populates="drafts")


class OpportunityJob(Base):
    __tablename__ = "opportunity_jobs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    research_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(64), index=True, default="queued")
    summary_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    research_job: Mapped["ResearchJob"] = relationship(back_populates="opportunity_jobs")
    items: Mapped[list["Opportunity"]] = relationship(
        back_populates="opportunity_job", cascade="all, delete-orphan"
    )


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    opportunity_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("opportunity_jobs.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(String(4096))
    target_url: Mapped[str | None] = mapped_column(String(2048))
    theme: Mapped[str | None] = mapped_column(String(255))
    estimated_impact: Mapped[float | None] = mapped_column(Float)
    estimated_effort: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)
    why_now: Mapped[str | None] = mapped_column(String(2048))
    supporting_sources_jsonb: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
    recommended_asset_type: Mapped[str | None] = mapped_column(String(64))
    priority_score: Mapped[float | None] = mapped_column(Float, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    opportunity_job: Mapped["OpportunityJob"] = relationship(back_populates="items")


class MonitorJob(Base):
    __tablename__ = "monitor_jobs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    research_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(64), index=True, default="active")
    cadence: Mapped[str] = mapped_column(String(64), default="manual")
    active: Mapped[bool] = mapped_column(default=True)
    snapshot_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    summary_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    research_job: Mapped["ResearchJob"] = relationship(back_populates="monitor_jobs")
    events: Mapped[list["MonitorEvent"]] = relationship(
        back_populates="monitor_job", cascade="all, delete-orphan"
    )


class MonitorEvent(Base):
    __tablename__ = "monitor_events"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    monitor_job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("monitor_jobs.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    source_url: Mapped[str | None] = mapped_column(String(2048))
    change_summary: Mapped[str] = mapped_column(String(4096))
    confidence: Mapped[float | None] = mapped_column(Float)
    recommended_followup: Mapped[str | None] = mapped_column(String(2048))
    payload_jsonb: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    monitor_job: Mapped["MonitorJob"] = relationship(back_populates="events")
