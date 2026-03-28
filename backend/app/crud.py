from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    BlogDraft,
    BlogDraftJob,
    MonitorEvent,
    MonitorJob,
    Opportunity,
    OpportunityJob,
    ResearchJob,
    Run,
    SourceCandidate,
    TinyfishRun,
)
from app.schemas import BlogDraftJobCreate, MonitorJobCreate, ResearchJobCreate, RunCreate


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


def create_blog_draft_job(db: Session, research_job: ResearchJob, payload: BlogDraftJobCreate) -> BlogDraftJob:
    blog_draft_job = BlogDraftJob(
        research_job_id=research_job.id,
        goal=payload.goal,
        draft_count=payload.draft_count,
        target_length=payload.target_length,
        style_constraints=payload.style_constraints,
        persona_constraints=payload.persona_constraints,
        client_name=payload.client_name,
        client_profile_jsonb=payload.client_profile,
        requested_angles_jsonb=payload.requested_angles or ["client_voice", "expert_commentary"],
    )
    db.add(blog_draft_job)
    db.commit()
    db.refresh(blog_draft_job)
    return blog_draft_job


def get_blog_draft_job(db: Session, blog_draft_job_id: UUID) -> BlogDraftJob | None:
    return db.get(BlogDraftJob, blog_draft_job_id)


def list_blog_drafts(db: Session, blog_draft_job_id: UUID) -> list[BlogDraft]:
    stmt = select(BlogDraft).where(BlogDraft.blog_draft_job_id == blog_draft_job_id)
    return list(db.scalars(stmt.order_by(BlogDraft.created_at.asc())))


def update_blog_draft_job_status(
    db: Session,
    blog_draft_job: BlogDraftJob,
    status: str,
    *,
    resonance_profile_jsonb: dict | None = None,
    error_jsonb: dict | None = None,
    finished: bool = False,
) -> BlogDraftJob:
    blog_draft_job.status = status
    blog_draft_job.updated_at = datetime.now(timezone.utc)
    if resonance_profile_jsonb is not None:
        blog_draft_job.resonance_profile_jsonb = resonance_profile_jsonb
    if error_jsonb is not None:
        blog_draft_job.error_jsonb = error_jsonb
    if finished:
        blog_draft_job.finished_at = datetime.now(timezone.utc)
    db.add(blog_draft_job)
    db.commit()
    db.refresh(blog_draft_job)
    return blog_draft_job


def create_blog_draft(
    db: Session,
    *,
    blog_draft_job_id: UUID,
    title: str,
    angle: str,
    author_mode: str,
    slug_suggestion: str | None,
    summary: str,
    audience_fit_rationale: str,
    outline_jsonb: dict,
    body_markdown: str,
    disclosure_note: str | None,
    key_takeaways_jsonb: list[str] | None,
    tags_jsonb: list[str] | None,
    evidence_references_jsonb: list[dict] | None,
    quality_jsonb: dict | None,
) -> BlogDraft:
    blog_draft = BlogDraft(
        blog_draft_job_id=blog_draft_job_id,
        title=title,
        angle=angle,
        author_mode=author_mode,
        slug_suggestion=slug_suggestion,
        summary=summary,
        audience_fit_rationale=audience_fit_rationale,
        outline_jsonb=outline_jsonb,
        body_markdown=body_markdown,
        disclosure_note=disclosure_note,
        key_takeaways_jsonb=key_takeaways_jsonb,
        tags_jsonb=tags_jsonb,
        evidence_references_jsonb=evidence_references_jsonb,
        quality_jsonb=quality_jsonb,
    )
    db.add(blog_draft)
    db.commit()
    db.refresh(blog_draft)
    return blog_draft


def create_opportunity_job(db: Session, research_job: ResearchJob) -> OpportunityJob:
    opportunity_job = OpportunityJob(research_job_id=research_job.id)
    db.add(opportunity_job)
    db.commit()
    db.refresh(opportunity_job)
    return opportunity_job


def get_opportunity_job(db: Session, opportunity_job_id: UUID) -> OpportunityJob | None:
    return db.get(OpportunityJob, opportunity_job_id)


def list_opportunities(db: Session, opportunity_job_id: UUID) -> list[Opportunity]:
    stmt = select(Opportunity).where(Opportunity.opportunity_job_id == opportunity_job_id)
    return list(db.scalars(stmt.order_by(Opportunity.priority_score.desc(), Opportunity.created_at.asc())))


def update_opportunity_job_status(
    db: Session,
    opportunity_job: OpportunityJob,
    status: str,
    *,
    summary_jsonb: dict | None = None,
    error_jsonb: dict | None = None,
    finished: bool = False,
) -> OpportunityJob:
    opportunity_job.status = status
    opportunity_job.updated_at = datetime.now(timezone.utc)
    if summary_jsonb is not None:
        opportunity_job.summary_jsonb = summary_jsonb
    if error_jsonb is not None:
        opportunity_job.error_jsonb = error_jsonb
    if finished:
        opportunity_job.finished_at = datetime.now(timezone.utc)
    db.add(opportunity_job)
    db.commit()
    db.refresh(opportunity_job)
    return opportunity_job


def create_opportunity(
    db: Session,
    *,
    opportunity_job_id: UUID,
    type: str,
    title: str,
    description: str,
    target_url: str | None,
    theme: str | None,
    estimated_impact: float | None,
    estimated_effort: float | None,
    confidence: float | None,
    why_now: str | None,
    supporting_sources_jsonb: list[dict] | None,
    recommended_asset_type: str | None,
    priority_score: float | None,
) -> Opportunity:
    opportunity = Opportunity(
        opportunity_job_id=opportunity_job_id,
        type=type,
        title=title,
        description=description,
        target_url=target_url,
        theme=theme,
        estimated_impact=estimated_impact,
        estimated_effort=estimated_effort,
        confidence=confidence,
        why_now=why_now,
        supporting_sources_jsonb=supporting_sources_jsonb,
        recommended_asset_type=recommended_asset_type,
        priority_score=priority_score,
    )
    db.add(opportunity)
    db.commit()
    db.refresh(opportunity)
    return opportunity


def create_monitor_job(db: Session, research_job: ResearchJob, payload: MonitorJobCreate, snapshot_jsonb: dict) -> MonitorJob:
    monitor_job = MonitorJob(
        research_job_id=research_job.id,
        cadence=payload.cadence,
        snapshot_jsonb=snapshot_jsonb,
        summary_jsonb={"message": "Baseline snapshot captured"},
    )
    db.add(monitor_job)
    db.commit()
    db.refresh(monitor_job)
    return monitor_job


def get_monitor_job(db: Session, monitor_job_id: UUID) -> MonitorJob | None:
    return db.get(MonitorJob, monitor_job_id)


def list_monitor_events(db: Session, monitor_job_id: UUID) -> list[MonitorEvent]:
    stmt = select(MonitorEvent).where(MonitorEvent.monitor_job_id == monitor_job_id)
    return list(db.scalars(stmt.order_by(MonitorEvent.created_at.desc())))


def update_monitor_job(
    db: Session,
    monitor_job: MonitorJob,
    *,
    status: str | None = None,
    active: bool | None = None,
    snapshot_jsonb: dict | None = None,
    summary_jsonb: dict | None = None,
    error_jsonb: dict | None = None,
    last_checked_at: datetime | None = None,
    next_check_at: datetime | None = None,
) -> MonitorJob:
    if status is not None:
        monitor_job.status = status
    if active is not None:
        monitor_job.active = active
    if snapshot_jsonb is not None:
        monitor_job.snapshot_jsonb = snapshot_jsonb
    if summary_jsonb is not None:
        monitor_job.summary_jsonb = summary_jsonb
    if error_jsonb is not None:
        monitor_job.error_jsonb = error_jsonb
    if last_checked_at is not None:
        monitor_job.last_checked_at = last_checked_at
    if next_check_at is not None:
        monitor_job.next_check_at = next_check_at
    monitor_job.updated_at = datetime.now(timezone.utc)
    db.add(monitor_job)
    db.commit()
    db.refresh(monitor_job)
    return monitor_job


def create_monitor_event(
    db: Session,
    *,
    monitor_job_id: UUID,
    event_type: str,
    source_url: str | None,
    change_summary: str,
    confidence: float | None,
    recommended_followup: str | None,
    payload_jsonb: dict | None,
) -> MonitorEvent:
    event = MonitorEvent(
        monitor_job_id=monitor_job_id,
        event_type=event_type,
        source_url=source_url,
        change_summary=change_summary,
        confidence=confidence,
        recommended_followup=recommended_followup,
        payload_jsonb=payload_jsonb,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
