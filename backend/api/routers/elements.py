"""
// filepath: backend/api/routers/elements.py

Bouquet elements API — used by the 2D constructor.

  GET /api/elements — all available elements grouped by type.

No authentication required (public read, elements are not user-specific).
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.models.element import BouquetElement

router = APIRouter(prefix="/api/elements", tags=["elements"])


# ── Schema ────────────────────────────────────────────────────────────────────


class ElementOut(BaseModel):
    id: str
    name: str
    type: str
    price_per_unit: float
    emoji: str | None
    image_url: str | None
    color_tags: list[str] | None

    class Config:
        from_attributes = True


# ── GET /api/elements ─────────────────────────────────────────────────────────


@router.get("", response_model=dict[str, list[ElementOut]])
async def get_elements(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, list[ElementOut]]:
    """
    Return all available bouquet elements grouped by type.

    Response shape:
    {
      "flower": [{ id, name, type, price_per_unit, emoji, image_url, color_tags }],
      "green":  [...],
      "base":   [...],
      "decor":  [...]
    }
    """
    result = await session.execute(
        select(BouquetElement)
        .where(BouquetElement.is_available.is_(True))
        .order_by(BouquetElement.sort_order, BouquetElement.name)
    )
    elements = result.scalars().all()

    grouped: dict[str, list[ElementOut]] = {}
    for el in elements:
        out = ElementOut(
            id=str(el.id),
            name=el.name,
            type=el.type,
            price_per_unit=float(el.price_per_unit),
            emoji=el.emoji,
            image_url=el.image_url,
            color_tags=el.color_tags,
        )
        grouped.setdefault(el.type, []).append(out)

    return grouped
