"""create subscriptions table and link orders to subscriptions

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── subscriptions table ───────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
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
        # weekly | biweekly
        sa.Column(
            "frequency",
            sa.Enum("weekly", "biweekly", name="subscription_frequency"),
            nullable=False,
        ),
        # Optional: link to a specific Product in catalog
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Bouquet size when no product_id: "S" | "M" | "L"
        sa.Column("bouquet_size", sa.String(2), nullable=True),
        # Server-side price locked at subscription creation
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        # ISO date of next scheduled delivery
        sa.Column("next_delivery", sa.Date(), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        # active=True, paused, cancelled → is_active=False
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        # If not null, skip deliveries until this date
        sa.Column("paused_until", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_subscriptions_user_id",     "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_next_delivery","subscriptions", ["next_delivery"])

    # ── orders: add subscription_id FK ───────────────────────────────────────
    # Allows LiqPay callback to know which subscription to advance next_delivery
    op.add_column(
        "orders",
        sa.Column(
            "subscription_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_orders_subscription_id",
        "orders",
        ["subscription_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_orders_subscription_id", table_name="orders")
    op.drop_column("orders", "subscription_id")
    op.drop_index("ix_subscriptions_next_delivery", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id",       table_name="subscriptions")
    op.drop_table("subscriptions")
    op.execute("DROP TYPE IF EXISTS subscription_frequency")
