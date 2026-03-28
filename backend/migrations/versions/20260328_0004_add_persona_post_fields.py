"""add persona post fields"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0004"
down_revision = "20260328_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("blog_draft_jobs", sa.Column("client_name", sa.String(length=255), nullable=True))
    op.add_column(
        "blog_draft_jobs",
        sa.Column("client_profile_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "blog_draft_jobs",
        sa.Column("requested_angles_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.add_column("blog_drafts", sa.Column("angle", sa.String(length=64), nullable=True))
    op.add_column("blog_drafts", sa.Column("author_mode", sa.String(length=64), nullable=True))
    op.add_column("blog_drafts", sa.Column("disclosure_note", sa.String(length=2048), nullable=True))

    op.execute("UPDATE blog_drafts SET angle = 'client_voice' WHERE angle IS NULL")
    op.execute("UPDATE blog_drafts SET author_mode = 'client_voice' WHERE author_mode IS NULL")

    op.alter_column("blog_drafts", "angle", nullable=False)
    op.alter_column("blog_drafts", "author_mode", nullable=False)


def downgrade() -> None:
    op.drop_column("blog_drafts", "disclosure_note")
    op.drop_column("blog_drafts", "author_mode")
    op.drop_column("blog_drafts", "angle")
    op.drop_column("blog_draft_jobs", "requested_angles_jsonb")
    op.drop_column("blog_draft_jobs", "client_profile_jsonb")
    op.drop_column("blog_draft_jobs", "client_name")
