"""add origin endpoint to blog draft tables"""

from alembic import op
import sqlalchemy as sa


revision = "20260328_0005"
down_revision = "20260328_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "blog_draft_jobs",
        sa.Column("origin_endpoint", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "blog_drafts",
        sa.Column("origin_endpoint", sa.String(length=64), nullable=True),
    )

    op.execute(
        """
        UPDATE blog_draft_jobs
        SET origin_endpoint = CASE
            WHEN client_name IS NOT NULL OR client_profile_jsonb IS NOT NULL THEN 'persona-post-jobs'
            ELSE 'blog-drafts'
        END
        WHERE origin_endpoint IS NULL
        """
    )
    op.execute(
        """
        UPDATE blog_drafts AS d
        SET origin_endpoint = j.origin_endpoint
        FROM blog_draft_jobs AS j
        WHERE d.blog_draft_job_id = j.id
          AND d.origin_endpoint IS NULL
        """
    )

    op.alter_column("blog_draft_jobs", "origin_endpoint", nullable=False)
    op.alter_column("blog_drafts", "origin_endpoint", nullable=False)


def downgrade() -> None:
    op.drop_column("blog_drafts", "origin_endpoint")
    op.drop_column("blog_draft_jobs", "origin_endpoint")
