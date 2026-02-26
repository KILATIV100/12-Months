"""Products API router.

Endpoints:
  GET /api/products            — paginated catalogue with optional filters
  GET /api/products/categories — list of distinct active categories
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, field_serializer
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import get_current_twa_user
from backend.core.database import get_db
from backend.models.product import Product

router = APIRouter(prefix="/api/products", tags=["products"])


# ── Response schemas ───────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: str
    base_price: float
    is_available: bool
    image_url: str | None
    composition: str | None
    tags: list[str] | None

    @field_serializer("base_price")
    def serialize_price(self, v: float) -> float:
        return round(float(v), 2)

    @field_serializer("id")
    def serialize_id(self, v: UUID) -> str:
        return str(v)


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    limit: int
    offset: int


class CategoriesOut(BaseModel):
    categories: list[str]


# ── Category label map ─────────────────────────────────────────────────────────

CATEGORY_LABELS: dict[str, str] = {
    "bouquets": "Готові букети",
    "single":   "Поштучно",
    "decor":    "Декор",
    "green":    "Зелень",
}


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=CategoriesOut)
async def get_categories(
    session: Annotated[AsyncSession, Depends(get_db)],
    _tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> CategoriesOut:
    """Return distinct categories that have at least one active product."""
    stmt = (
        select(distinct(Product.category))
        .where(
            Product.is_deleted.is_(False),
            Product.is_available.is_(True),
        )
        .order_by(Product.category)
    )
    result = await session.execute(stmt)
    cats = [row[0] for row in result.all()]
    return CategoriesOut(categories=cats)


@router.get("", response_model=ProductListOut)
async def get_products(
    session: Annotated[AsyncSession, Depends(get_db)],
    _tg_user: Annotated[dict, Depends(get_current_twa_user)],
    category: str | None = Query(default=None, description="Filter by category slug"),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    available_only: bool = Query(default=True, description="If true, hide unavailable items"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ProductListOut:
    """Return paginated product catalogue.

    Supports optional filter by category slug and partial name/composition search.
    """
    base_conditions = [Product.is_deleted.is_(False)]

    if available_only:
        base_conditions.append(Product.is_available.is_(True))

    if category:
        base_conditions.append(Product.category == category)

    if search:
        pattern = f"%{search}%"
        base_conditions.append(
            Product.name.ilike(pattern)
            | Product.composition.ilike(pattern)
        )

    # Total count (without pagination)
    count_stmt = select(func.count(Product.id)).where(*base_conditions)
    total: int = (await session.execute(count_stmt)).scalar_one()

    # Paginated items
    items_stmt = (
        select(Product)
        .where(*base_conditions)
        .order_by(Product.category, Product.name)
        .limit(limit)
        .offset(offset)
    )
    items_result = await session.execute(items_stmt)
    products = list(items_result.scalars().all())

    return ProductListOut(
        items=[ProductOut.model_validate(p) for p in products],
        total=total,
        limit=limit,
        offset=offset,
    )
