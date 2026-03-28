"""create runs table"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tinyfish_run_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=False),
        sa.Column("goal", sa.String(length=4096), nullable=False),
        sa.Column("result_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tinyfish_run_id"),
    )
    op.create_index(op.f("ix_runs_created_at"), "runs", ["created_at"], unique=False)
    op.create_index(op.f("ix_runs_status"), "runs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_runs_status"), table_name="runs")
    op.drop_index(op.f("ix_runs_created_at"), table_name="runs")
    op.drop_table("runs")
