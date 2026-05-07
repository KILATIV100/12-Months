"""Orders REST API. Used by TWA checkout."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import (
    DeliveryType,
    Order,
    OrderItem,
    OrderStatus,
    OrderType,
    Product,
    User,
)
from app.services.qr import greeting_url, make_qr_token

router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1


class OrderIn(BaseModel):
    tg_id: int
    type: OrderType
    items: list[OrderItemIn]
    delivery_type: DeliveryType
    delivery_at: datetime | None = None
    address: str | None = None
    recipient_name: str | None = None
    recipient_phone: str | None = None
    comment: str | None = None
    add_greeting: bool = False


class OrderOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    total_price: float
    qr_token: uuid.UUID | None
    greeting_url: str | None


@router.post("", response_model=OrderOut)
async def create_order(payload: OrderIn, session: AsyncSession = Depends(get_session)) -> OrderOut:
    user = await session.scalar(select(User).where(User.tg_id == payload.tg_id))
    if user is None:
        user = User(tg_id=payload.tg_id)
        session.add(user)
        await session.flush()

    total = Decimal("0")
    items: list[OrderItem] = []
    for it in payload.items:
        product = await session.get(Product, it.product_id)
        if not product or not product.is_available:
            raise HTTPException(400, f"Product {it.product_id} not available")
        line_price = Decimal(product.base_price) * it.quantity
        total += line_price
        items.append(OrderItem(product_id=product.id, quantity=it.quantity, price_at_order=Decimal(product.base_price)))

    qr_token = make_qr_token() if payload.add_greeting else None
    order = Order(
        user_id=user.id,
        type=payload.type,
        total_price=total,
        delivery_type=payload.delivery_type,
        delivery_at=payload.delivery_at,
        address=payload.address,
        recipient_name=payload.recipient_name,
        recipient_phone=payload.recipient_phone,
        comment=payload.comment,
        qr_token=qr_token,
        greeting_url=greeting_url(qr_token) if qr_token else None,
        items=items,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)
    return OrderOut(
        id=order.id,
        status=order.status,
        total_price=float(order.total_price),
        qr_token=order.qr_token,
        greeting_url=order.greeting_url,
    )


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> OrderOut:
    o = await session.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Not found")
    return OrderOut(
        id=o.id, status=o.status, total_price=float(o.total_price),
        qr_token=o.qr_token, greeting_url=o.greeting_url,
    )
