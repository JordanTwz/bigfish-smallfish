"""add client profile fields to research jobs"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0007"
down_revision = "20260328_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("research_jobs", sa.Column("client_name", sa.String(length=255), nullable=True))
    op.add_column(
        "research_jobs",
        sa.Column("client_profile_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("research_jobs", "client_profile_jsonb")
    op.drop_column("research_jobs", "client_name")
