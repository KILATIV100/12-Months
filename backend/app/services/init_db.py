"""First-run schema bootstrap. Idempotent — safe to call on every startup."""
from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy import select

from app.db import Base, async_session, engine
from app.models import BouquetElement, ElementType

log = logging.getLogger(__name__)


# Seed catalog matches the prototype's data.jsx so the TWA has something to show
# as soon as the user opens it. Idempotent: only inserted if the table is empty.
SEED_ELEMENTS: list[dict] = [
    # Bases
    {"name": "Крафт", "type": ElementType.base, "price_per_unit": "80", "emoji": "📄", "color_tags": ["natural"]},
    {"name": "Коробка", "type": ElementType.base, "price_per_unit": "180", "emoji": "📦", "color_tags": ["dark"]},
    {"name": "Кошик", "type": ElementType.base, "price_per_unit": "220", "emoji": "🧺", "color_tags": ["wicker"]},
    # Flowers
    {"name": "Півонія рожева", "type": ElementType.flower, "price_per_unit": "120", "emoji": "🌸", "color_tags": ["pastel", "round", "romantic"]},
    {"name": "Троянда коралова", "type": ElementType.flower, "price_per_unit": "90", "emoji": "🌹", "color_tags": ["warm", "classic"]},
    {"name": "Троянда біла", "type": ElementType.flower, "price_per_unit": "85", "emoji": "🤍", "color_tags": ["classic", "wedding"]},
    {"name": "Тюльпан жовтий", "type": ElementType.flower, "price_per_unit": "55", "emoji": "🌷", "color_tags": ["spring", "bright"]},
    {"name": "Ранункулюс", "type": ElementType.flower, "price_per_unit": "75", "emoji": "🌼", "color_tags": ["layered", "peach"]},
    {"name": "Гортензія", "type": ElementType.flower, "price_per_unit": "140", "emoji": "💠", "color_tags": ["cloud", "blue"]},
    {"name": "Еустома", "type": ElementType.flower, "price_per_unit": "80", "emoji": "🪻", "color_tags": ["lavender"]},
    {"name": "Ромашка", "type": ElementType.flower, "price_per_unit": "35", "emoji": "🌼", "color_tags": ["field", "simple"]},
    # Greens
    {"name": "Евкаліпт", "type": ElementType.green, "price_per_unit": "40", "emoji": "🌿", "color_tags": ["sage"]},
    {"name": "Папороть", "type": ElementType.green, "price_per_unit": "30", "emoji": "🌿", "color_tags": ["dark"]},
    {"name": "Рускус", "type": ElementType.green, "price_per_unit": "35", "emoji": "🌿", "color_tags": ["dark"]},
    # Decor
    {"name": "Стрічка крем", "type": ElementType.decor, "price_per_unit": "25", "emoji": "🎀", "color_tags": ["cream"]},
    {"name": "Стрічка шавлія", "type": ElementType.decor, "price_per_unit": "25", "emoji": "🎀", "color_tags": ["sage"]},
]


async def init_db() -> None:
    # Create any missing tables. Safe on every boot — we drop nothing.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("DB schema ensured")

    # Seed bouquet_elements if the table is empty.
    async with async_session() as session:
        existing = await session.scalar(select(BouquetElement).limit(1))
        if existing is not None:
            return
        for i, item in enumerate(SEED_ELEMENTS):
            session.add(BouquetElement(
                name=item["name"],
                type=item["type"],
                price_per_unit=Decimal(item["price_per_unit"]),
                emoji=item["emoji"],
                color_tags=item["color_tags"],
                sort_order=i,
                is_available=True,
            ))
        await session.commit()
    log.info("seeded %d bouquet_elements", len(SEED_ELEMENTS))
