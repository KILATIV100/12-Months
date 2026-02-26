"""add nps_score, nps_sent, delivered_at to orders

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Timestamp when the order was physically delivered/handed over
    op.add_column(
        "orders",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Whether the NPS survey has already been sent (prevents duplicate sends)
    op.add_column(
        "orders",
        sa.Column(
            "nps_sent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Customer satisfaction score: 1–5 (NULL = not yet rated)
    op.add_column(
        "orders",
        sa.Column("nps_score", sa.Integer(), nullable=True),
    )
    # Index for the NPS scheduler query: status + nps_sent + delivered_at
    op.create_index(
        "ix_orders_nps_pending",
        "orders",
        ["status", "nps_sent", "delivered_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_orders_nps_pending", table_name="orders")
    op.drop_column("orders", "nps_score")
    op.drop_column("orders", "nps_sent")
    op.drop_column("orders", "delivered_at")
