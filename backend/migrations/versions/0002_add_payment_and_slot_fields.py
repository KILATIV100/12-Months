"""add paid_at and delivery_time_slot to orders

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-26

NOTE: Run this migration AFTER the initial migration (0001) that creates all tables.
For a fresh DB: ./make_migration.sh upgrade
For an existing DB: alembic upgrade 0002
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # paid_at — timestamp when payment was confirmed (NULL = unpaid)
    op.add_column(
        "orders",
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    # delivery_time_slot — human-readable slot, e.g. "14:00–16:00"
    op.add_column(
        "orders",
        sa.Column("delivery_time_slot", sa.String(30), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "delivery_time_slot")
    op.drop_column("orders", "paid_at")
