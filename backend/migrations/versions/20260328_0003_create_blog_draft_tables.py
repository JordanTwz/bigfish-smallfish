"""create blog draft tables"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0003"
down_revision = "20260328_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "blog_draft_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("research_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("goal", sa.String(length=64), nullable=False),
        sa.Column("draft_count", sa.Integer(), nullable=False),
        sa.Column("target_length", sa.String(length=32), nullable=False),
        sa.Column("style_constraints", sa.String(length=4096), nullable=True),
        sa.Column("persona_constraints", sa.String(length=4096), nullable=True),
        sa.Column("resonance_profile_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["research_job_id"], ["research_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_blog_draft_jobs_created_at"), "blog_draft_jobs", ["created_at"], unique=False)
    op.create_index(op.f("ix_blog_draft_jobs_research_job_id"), "blog_draft_jobs", ["research_job_id"], unique=False)
    op.create_index(op.f("ix_blog_draft_jobs_status"), "blog_draft_jobs", ["status"], unique=False)

    op.create_table(
        "blog_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blog_draft_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("slug_suggestion", sa.String(length=512), nullable=True),
        sa.Column("summary", sa.String(length=2048), nullable=False),
        sa.Column("audience_fit_rationale", sa.String(length=4096), nullable=False),
        sa.Column("outline_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("body_markdown", sa.String(length=20000), nullable=False),
        sa.Column("key_takeaways_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tags_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("evidence_references_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("quality_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["blog_draft_job_id"], ["blog_draft_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_blog_drafts_blog_draft_job_id"), "blog_drafts", ["blog_draft_job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_blog_drafts_blog_draft_job_id"), table_name="blog_drafts")
    op.drop_table("blog_drafts")
    op.drop_index(op.f("ix_blog_draft_jobs_status"), table_name="blog_draft_jobs")
    op.drop_index(op.f("ix_blog_draft_jobs_research_job_id"), table_name="blog_draft_jobs")
    op.drop_index(op.f("ix_blog_draft_jobs_created_at"), table_name="blog_draft_jobs")
    op.drop_table("blog_draft_jobs")
