"""add opportunity tables"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0005"
down_revision = "20260328_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "opportunity_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("research_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("summary_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["research_job_id"], ["research_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_opportunity_jobs_created_at"), "opportunity_jobs", ["created_at"], unique=False)
    op.create_index(op.f("ix_opportunity_jobs_research_job_id"), "opportunity_jobs", ["research_job_id"], unique=False)
    op.create_index(op.f("ix_opportunity_jobs_status"), "opportunity_jobs", ["status"], unique=False)

    op.create_table(
        "opportunities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("opportunity_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.String(length=4096), nullable=False),
        sa.Column("target_url", sa.String(length=2048), nullable=True),
        sa.Column("theme", sa.String(length=255), nullable=True),
        sa.Column("estimated_impact", sa.Float(), nullable=True),
        sa.Column("estimated_effort", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("why_now", sa.String(length=2048), nullable=True),
        sa.Column("supporting_sources_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("recommended_asset_type", sa.String(length=64), nullable=True),
        sa.Column("priority_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_job_id"], ["opportunity_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_opportunities_opportunity_job_id"), "opportunities", ["opportunity_job_id"], unique=False)
    op.create_index(op.f("ix_opportunities_priority_score"), "opportunities", ["priority_score"], unique=False)
    op.create_index(op.f("ix_opportunities_type"), "opportunities", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_opportunities_type"), table_name="opportunities")
    op.drop_index(op.f("ix_opportunities_priority_score"), table_name="opportunities")
    op.drop_index(op.f("ix_opportunities_opportunity_job_id"), table_name="opportunities")
    op.drop_table("opportunities")
    op.drop_index(op.f("ix_opportunity_jobs_status"), table_name="opportunity_jobs")
    op.drop_index(op.f("ix_opportunity_jobs_research_job_id"), table_name="opportunity_jobs")
    op.drop_index(op.f("ix_opportunity_jobs_created_at"), table_name="opportunity_jobs")
    op.drop_table("opportunity_jobs")
