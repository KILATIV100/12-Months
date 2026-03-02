"""Add referral system and bonus balance

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users table ──────────────────────────────────────────────────────────
    # referred_by: self-referential FK → users.id (SET NULL on delete)
    op.add_column(
        "users",
        sa.Column(
            "referred_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "bonus_balance",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
    )

    # ── orders table ─────────────────────────────────────────────────────────
    op.add_column(
        "orders",
        sa.Column(
            "bonuses_used",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("orders", "bonuses_used")
    op.drop_column("users", "bonus_balance")
    op.drop_column("users", "referred_by")
