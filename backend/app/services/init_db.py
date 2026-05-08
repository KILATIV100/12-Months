"""First-run schema bootstrap. Idempotent — safe to call on every startup."""
from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy import select

from app.db import Base, async_session, engine
from app.models import BouquetElement, ElementType, Product

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


# Sample bouquets for Tinder / Catalog. Same set as the prototype's BOUQUETS.
SEED_PRODUCTS: list[dict] = [
    {"name": "Ніжність", "category": "ready", "base_price": "850",
     "composition": "Півонії рожеві 5шт, евкаліпт 3 гілки",
     "tags": ["pastel", "romantic", "lover"]},
    {"name": "Ранкова кава", "category": "ready", "base_price": "720",
     "composition": "Ранункулюс 7шт, папороть 2 гілки",
     "tags": ["warm", "peach", "just"]},
    {"name": "Польова", "category": "ready", "base_price": "560",
     "composition": "Ромашки 9шт, тюльпани жовті 5шт",
     "tags": ["field", "spring", "mom"]},
    {"name": "Хмара", "category": "ready", "base_price": "1240",
     "composition": "Гортензія 3шт, троянда біла 5шт",
     "tags": ["cloud", "blue", "lover"]},
    {"name": "Карамель", "category": "ready", "base_price": "980",
     "composition": "Троянда коралова 11шт",
     "tags": ["warm", "classic", "bday"]},
    {"name": "Лаванда", "category": "ready", "base_price": "680",
     "composition": "Еустома 7шт, евкаліпт 3 гілки",
     "tags": ["lavender", "calm", "just"]},
    {"name": "Сонячний", "category": "ready", "base_price": "520",
     "composition": "Тюльпани жовті 11шт",
     "tags": ["bright", "spring", "office"]},
    {"name": "Класика", "category": "ready", "base_price": "1450",
     "composition": "Троянда коралова 15шт, троянда біла 6шт",
     "tags": ["classic", "romantic", "lover"]},
    {"name": "Зимовий ранок", "category": "ready", "base_price": "890",
     "composition": "Троянда біла 7шт, евкаліпт 5 гілок",
     "tags": ["cool", "soft", "just"]},
    {"name": "Гарбузовий пиріг", "category": "ready", "base_price": "760",
     "composition": "Ранункулюс 5шт, тюльпани жовті 3шт",
     "tags": ["autumn", "warm", "just"]},
    {"name": "Опівночі", "category": "ready", "base_price": "1100",
     "composition": "Еустома 9шт, півонії рожеві 3шт",
     "tags": ["moody", "romantic", "lover"]},
    {"name": "Лимонна цедра", "category": "ready", "base_price": "640",
     "composition": "Тюльпани жовті 7шт, ромашки 5шт",
     "tags": ["fresh", "bright", "office"]},
]


async def init_db() -> None:
    # Create any missing tables. Safe on every boot — we drop nothing.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("DB schema ensured")

    async with async_session() as session:
        # Seed bouquet_elements if empty (used by /api/elements → Constructor).
        if (await session.scalar(select(BouquetElement).limit(1))) is None:
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
            log.info("seeded %d bouquet_elements", len(SEED_ELEMENTS))

        # Seed products if empty (used by /api/products → Tinder + Catalog).
        if (await session.scalar(select(Product).limit(1))) is None:
            for item in SEED_PRODUCTS:
                session.add(Product(
                    name=item["name"],
                    category=item["category"],
                    base_price=Decimal(item["base_price"]),
                    composition=item["composition"],
                    tags=item["tags"],
                    is_available=True,
                    is_deleted=False,
                ))
            log.info("seeded %d products", len(SEED_PRODUCTS))

        await session.commit()
