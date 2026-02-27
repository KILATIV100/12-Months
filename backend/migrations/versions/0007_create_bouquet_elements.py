"""create bouquet_elements table, seed data, add element_id to order_items

Revision ID: 0007
Revises: 0006
Create Date: 2026-02-27
"""
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── bouquet_elements table ────────────────────────────────────────────────
    op.create_table(
        "bouquet_elements",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "type",
            sa.Enum("flower", "base", "decor", "green", name="element_type"),
            nullable=False,
        ),
        sa.Column("price_per_unit", sa.Numeric(10, 2), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column(
            "is_available",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "color_tags",
            postgresql.ARRAY(sa.String()),
            nullable=True,
        ),
        sa.Column("emoji", sa.String(10), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_bouquet_elements_type", "bouquet_elements", ["type"])
    op.create_index("ix_bouquet_elements_sort",  "bouquet_elements", ["sort_order"])

    # ── order_items: add element_id FK ───────────────────────────────────────
    # Allows custom bouquet order items to reference bouquet_elements
    op.add_column(
        "order_items",
        sa.Column(
            "element_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bouquet_elements.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_order_items_element_id", "order_items", ["element_id"])

    # ── Seed data ─────────────────────────────────────────────────────────────
    # Flowers
    flowers = [
        ("🌹 Троянда",       "flower", 45, "🌹", ["червоний", "рожевий"], 1),
        ("🌷 Тюльпан",       "flower", 35, "🌷", ["рожевий", "жовтий"],   2),
        ("🌸 Піон",          "flower", 120,"🌸", ["рожевий", "кремовий"], 3),
        ("🌺 Хризантема",    "flower", 55, "🌺", ["жовтий", "білий"],     4),
        ("💐 Фрезія",        "flower", 65, "💐", ["жовтий", "пастельний"],5),
        ("🌻 Соняшник",      "flower", 40, "🌻", ["жовтий"],              6),
        ("🌼 Ромашка",       "flower", 25, "🌼", ["білий"],               7),
        ("💜 Лаванда",       "flower", 50, "💜", ["фіолетовий"],          8),
        ("🌸 Альстромерія",  "flower", 35, "🌸", ["рожевий", "бордовий"],9),
        ("🌿 Еустома",       "flower", 80, "🌿", ["пастельний", "білий"], 10),
        ("🔴 Гвоздика",      "flower", 30, "🔴", ["червоний"],            11),
        ("🌙 Орхідея",       "flower", 150,"🌙", ["білий", "пурпурний"], 12),
    ]
    # Greens
    greens = [
        ("🌿 Евкаліпт",   "green", 30, "🌿", ["зелений"], 1),
        ("🌱 Аспарагус",  "green", 20, "🌱", ["зелений"], 2),
        ("🍃 Рускус",     "green", 25, "🍃", ["зелений"], 3),
        ("🌾 Пшениця",    "green", 15, "🌾", ["бежевий"], 4),
        ("🫒 Маслина",    "green", 35, "🫒", ["сірий", "зелений"], 5),
    ]
    # Packaging / base
    packaging = [
        ("📄 Крафт-папір",    "base", 30,  "📄", None, 1),
        ("🎁 Коробка",        "base", 80,  "🎁", None, 2),
        ("🧺 Кошик",          "base", 120, "🧺", None, 3),
        ("🎩 Шляпна коробка", "base", 150, "🎩", None, 4),
        ("🌊 Акварельний пакет","base", 50,"🌊", None, 5),
    ]
    # Decor
    decor = [
        ("🎀 Атласна стрічка", "decor", 20, "🎀", None, 1),
        ("✨ Гілки дротяні",  "decor", 40, "✨", None, 2),
        ("🪨 Камені дна",     "decor", 25, "🪨", None, 3),
        ("🕯 Свічка",         "decor", 60, "🕯", None, 4),
    ]

    conn = op.get_bind()
    for name, typ, price, emoji, tags, sort in flowers + greens + packaging + decor:
        conn.execute(
            sa.text(
                """
                INSERT INTO bouquet_elements
                  (id, name, type, price_per_unit, emoji, color_tags, sort_order, is_available)
                VALUES
                  (:id, :name, :type, :price, :emoji, :tags, :sort, true)
                """
            ),
            {
                "id":    str(uuid.uuid4()),
                "name":  name,
                "type":  typ,
                "price": price,
                "emoji": emoji,
                "tags":  tags,
                "sort":  sort,
            },
        )


def downgrade() -> None:
    op.drop_index("ix_order_items_element_id", table_name="order_items")
    op.drop_column("order_items", "element_id")
    op.drop_index("ix_bouquet_elements_sort", table_name="bouquet_elements")
    op.drop_index("ix_bouquet_elements_type", table_name="bouquet_elements")
    op.drop_table("bouquet_elements")
    op.execute("DROP TYPE IF EXISTS element_type")
