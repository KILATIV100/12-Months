"""Greeting cards (QR-code receivers) per TZ §04 Flow 2."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Order
from app.services.qr import greeting_url, render_qr_png

router = APIRouter(prefix="/api/greetings", tags=["greetings"])


class GreetingOut(BaseModel):
    order_id: uuid.UUID
    type: str  # "video" or "text"
    text: str | None = None
    media_url: str | None = None


@router.get("/{token}", response_model=GreetingOut)
async def get_greeting(token: uuid.UUID, session: AsyncSession = Depends(get_session)) -> GreetingOut:
    order = await session.scalar(select(Order).where(Order.qr_token == token))
    if not order:
        raise HTTPException(404, "Not found")
    return GreetingOut(
        order_id=order.id,
        type="video" if (order.greeting_url or "").endswith((".mp4", ".webm")) else "text",
        text=order.comment,
        media_url=order.greeting_url,
    )


@router.get("/{token}/qr.png")
async def get_qr_png(token: uuid.UUID) -> Response:
    """Return a printable QR code PNG. The florist tucks this into the bouquet."""
    url = greeting_url(token)
    png = render_qr_png(url)
    return Response(content=png, media_type="image/png")
