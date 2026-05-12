"""Orders REST API. Used by TWA checkout."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
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
from app.services.notifications import order_accepted
from app.services.qr import greeting_url, make_qr_token

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1


class OrderIn(BaseModel):
    tg_id: int
    type: OrderType
    items: list[OrderItemIn] = []
    # For constructor-built bouquets the breakdown lives on the client; we
    # accept the total + a human description instead of line items.
    custom_total: float | None = None
    custom_description: str | None = None
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


def _short(order_id: uuid.UUID) -> str:
    return str(order_id)[:8].upper()


@router.post("", response_model=OrderOut)
async def create_order(
    payload: OrderIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> OrderOut:
    user = await session.scalar(select(User).where(User.tg_id == payload.tg_id))
    if user is None:
        user = User(tg_id=payload.tg_id)
        session.add(user)
        await session.flush()

    total = Decimal("0")
    items: list[OrderItem] = []

    if payload.type == OrderType.ready:
        if not payload.items:
            raise HTTPException(400, "ready order requires at least one item")
        for it in payload.items:
            product = await session.get(Product, it.product_id)
            if not product or not product.is_available:
                raise HTTPException(400, f"Product {it.product_id} not available")
            line_price = Decimal(product.base_price) * it.quantity
            total += line_price
            items.append(OrderItem(product_id=product.id, quantity=it.quantity, price_at_order=Decimal(product.base_price)))
    else:
        # Custom (Constructor): no OrderItems, total comes from the client.
        if payload.custom_total is None:
            raise HTTPException(400, "custom order requires custom_total")
        total = Decimal(str(payload.custom_total))

    qr_token = make_qr_token() if payload.add_greeting else None
    composed_comment = payload.comment or ""
    if payload.custom_description:
        composed_comment = (composed_comment + "\n" + f"Склад: {payload.custom_description}").strip()

    order = Order(
        user_id=user.id,
        type=payload.type,
        total_price=total,
        delivery_type=payload.delivery_type,
        delivery_at=payload.delivery_at,
        address=payload.address,
        recipient_name=payload.recipient_name,
        recipient_phone=payload.recipient_phone,
        comment=composed_comment or None,
        qr_token=qr_token,
        greeting_url=greeting_url(qr_token) if qr_token else None,
        items=items,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    # Fire-and-forget bot notifications. Don't fail the API on Telegram errors.
    bot = getattr(request.app.state, "bot", None)
    if bot is not None:
        try:
            await order_accepted(bot, user.tg_id, _short(order.id), order.total_price, order.delivery_at or datetime.utcnow())
        except Exception:
            log.exception("Failed to notify buyer tg=%s about order %s", user.tg_id, order.id)
        if settings.owner_tg_id:
            try:
                from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
                kb = InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="▶️ Взяти в роботу", callback_data=f"ord:work:{order.id}"),
                ]])
                addr = order.address or "Самовивіз"
                slot = f"{order.delivery_at:%d.%m %H:%M}" if order.delivery_at else "час не вказано"
                await bot.send_message(
                    settings.owner_tg_id,
                    f"🆕 Нове замовлення №{_short(order.id)}\n"
                    f"💰 {order.total_price} грн\n"
                    f"📍 {addr}\n"
                    f"⏱ {slot}",
                    reply_markup=kb,
                )
            except Exception:
                log.exception("Failed to notify owner about order %s", order.id)

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
