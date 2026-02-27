"""add important_dates table

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "important_dates",
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
        # Event label: "День народження", "Річниця", "8 Березня", etc.
        sa.Column("label", sa.String(100), nullable=False),
        # Name of the person the event is for
        sa.Column("person_name", sa.String(100), nullable=True),
        # The reference date (only month+day used when repeat_yearly=True)
        sa.Column("date", sa.Date(), nullable=False),
        # Whether the event repeats every year
        sa.Column(
            "repeat_yearly",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        # Days-before list for reminders, e.g. [3, 1]
        sa.Column(
            "reminder_days",
            postgresql.ARRAY(sa.Integer()),
            nullable=False,
            server_default="'{3,1}'",
        ),
        # Soft-disable without deleting
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.create_index(
        "ix_important_dates_user_id",
        "important_dates",
        ["user_id"],
    )
    op.create_index(
        "ix_important_dates_date",
        "important_dates",
        ["date"],
    )


def downgrade() -> None:
    op.drop_index("ix_important_dates_date",    table_name="important_dates")
    op.drop_index("ix_important_dates_user_id", table_name="important_dates")
    op.drop_table("important_dates")
