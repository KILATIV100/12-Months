"""add swipe_sessions table and greeting fields to orders

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── swipe_sessions ────────────────────────────────────────────────────────
    op.create_table(
        "swipe_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "liked_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=True,
        ),
        sa.Column(
            "disliked_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=True,
        ),
        sa.Column(
            "result_tags",
            postgresql.ARRAY(sa.String()),
            nullable=True,
        ),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_swipe_sessions_user_id",
        "swipe_sessions",
        ["user_id"],
    )

    # ── orders: greeting_text + greeting_type ─────────────────────────────────
    op.add_column(
        "orders",
        sa.Column("greeting_text", sa.Text(), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("greeting_type", sa.String(10), nullable=True),
        # values: "text" | "video" | None (no greeting)
    )


def downgrade() -> None:
    op.drop_column("orders", "greeting_type")
    op.drop_column("orders", "greeting_text")
    op.drop_index("ix_swipe_sessions_user_id", table_name="swipe_sessions")
    op.drop_table("swipe_sessions")
