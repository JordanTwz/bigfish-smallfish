"""add monitor tables"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0006"
down_revision = "20260328_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monitor_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("research_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("cadence", sa.String(length=64), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("snapshot_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("summary_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_check_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["research_job_id"], ["research_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_monitor_jobs_created_at"), "monitor_jobs", ["created_at"], unique=False)
    op.create_index(op.f("ix_monitor_jobs_research_job_id"), "monitor_jobs", ["research_job_id"], unique=False)
    op.create_index(op.f("ix_monitor_jobs_status"), "monitor_jobs", ["status"], unique=False)

    op.create_table(
        "monitor_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("monitor_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column("change_summary", sa.String(length=4096), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("recommended_followup", sa.String(length=2048), nullable=True),
        sa.Column("payload_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["monitor_job_id"], ["monitor_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_monitor_events_created_at"), "monitor_events", ["created_at"], unique=False)
    op.create_index(op.f("ix_monitor_events_event_type"), "monitor_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_monitor_events_monitor_job_id"), "monitor_events", ["monitor_job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_monitor_events_monitor_job_id"), table_name="monitor_events")
    op.drop_index(op.f("ix_monitor_events_event_type"), table_name="monitor_events")
    op.drop_index(op.f("ix_monitor_events_created_at"), table_name="monitor_events")
    op.drop_table("monitor_events")
    op.drop_index(op.f("ix_monitor_jobs_status"), table_name="monitor_jobs")
    op.drop_index(op.f("ix_monitor_jobs_research_job_id"), table_name="monitor_jobs")
    op.drop_index(op.f("ix_monitor_jobs_created_at"), table_name="monitor_jobs")
    op.drop_table("monitor_jobs")
