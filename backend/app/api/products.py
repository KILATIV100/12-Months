"""Products and bouquet elements REST API for the TWA."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import BouquetElement, ElementType, Product

router = APIRouter(prefix="/api", tags=["catalog"])


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    base_price: float
    image_url: str | None
    composition: str | None
    tags: list[str]
    is_available: bool


class ElementOut(BaseModel):
    id: uuid.UUID
    name: str
    type: ElementType
    price_per_unit: float
    image_url: str | None
    color_tags: list[str]
    emoji: str | None
    is_available: bool


@router.get("/products", response_model=list[ProductOut])
async def list_products(category: str | None = None, session: AsyncSession = Depends(get_session)) -> list[ProductOut]:
    stmt = select(Product).where(Product.is_deleted.is_(False), Product.is_available.is_(True))
    if category:
        stmt = stmt.where(Product.category == category)
    rows = (await session.scalars(stmt)).all()
    return [ProductOut.model_validate(p, from_attributes=True) for p in rows]


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> ProductOut:
    p = await session.get(Product, product_id)
    if not p or p.is_deleted:
        raise HTTPException(404, "Not found")
    return ProductOut.model_validate(p, from_attributes=True)


@router.get("/elements", response_model=list[ElementOut])
async def list_elements(
    type: ElementType | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[ElementOut]:
    stmt = select(BouquetElement).where(BouquetElement.is_available.is_(True)).order_by(BouquetElement.sort_order)
    if type is not None:
        stmt = stmt.where(BouquetElement.type == type)
    rows = (await session.scalars(stmt)).all()
    return [ElementOut.model_validate(e, from_attributes=True) for e in rows]
