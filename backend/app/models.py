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
    browser_profile: Mapped[str] = mapped_column(String(64), default="default")
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
