"""create research job tables"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0002"
down_revision = "20260328_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "research_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("candidate_name", sa.String(length=255), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=True),
        sa.Column("company_domain", sa.String(length=255), nullable=True),
        sa.Column("role_title", sa.String(length=255), nullable=True),
        sa.Column("search_context", sa.String(length=2048), nullable=True),
        sa.Column("final_brief_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_research_jobs_created_at"), "research_jobs", ["created_at"], unique=False)
    op.create_index(op.f("ix_research_jobs_status"), "research_jobs", ["status"], unique=False)

    op.create_table(
        "source_candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("research_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("normalized_url", sa.String(length=2048), nullable=True),
        sa.Column("title", sa.String(length=512), nullable=True),
        sa.Column("source_type", sa.String(length=64), nullable=True),
        sa.Column("stage", sa.String(length=64), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("ranking_score", sa.Float(), nullable=True),
        sa.Column("evidence_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["research_job_id"], ["research_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_source_candidates_normalized_url"), "source_candidates", ["normalized_url"], unique=False)
    op.create_index(op.f("ix_source_candidates_research_job_id"), "source_candidates", ["research_job_id"], unique=False)
    op.create_index(op.f("ix_source_candidates_source_type"), "source_candidates", ["source_type"], unique=False)

    op.create_table(
        "tinyfish_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("research_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tinyfish_run_id", sa.String(length=255), nullable=True),
        sa.Column("stage", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("target_url", sa.String(length=2048), nullable=False),
        sa.Column("goal", sa.String(length=4096), nullable=False),
        sa.Column("browser_profile", sa.String(length=64), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("raw_result_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_error_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["research_job_id"], ["research_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tinyfish_run_id"),
    )
    op.create_index(op.f("ix_tinyfish_runs_research_job_id"), "tinyfish_runs", ["research_job_id"], unique=False)
    op.create_index(op.f("ix_tinyfish_runs_stage"), "tinyfish_runs", ["stage"], unique=False)
    op.create_index(op.f("ix_tinyfish_runs_status"), "tinyfish_runs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tinyfish_runs_status"), table_name="tinyfish_runs")
    op.drop_index(op.f("ix_tinyfish_runs_stage"), table_name="tinyfish_runs")
    op.drop_index(op.f("ix_tinyfish_runs_research_job_id"), table_name="tinyfish_runs")
    op.drop_table("tinyfish_runs")

    op.drop_index(op.f("ix_source_candidates_source_type"), table_name="source_candidates")
    op.drop_index(op.f("ix_source_candidates_research_job_id"), table_name="source_candidates")
    op.drop_index(op.f("ix_source_candidates_normalized_url"), table_name="source_candidates")
    op.drop_table("source_candidates")

    op.drop_index(op.f("ix_research_jobs_status"), table_name="research_jobs")
    op.drop_index(op.f("ix_research_jobs_created_at"), table_name="research_jobs")
    op.drop_table("research_jobs")
