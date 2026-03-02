"""
// filepath: backend/api/routers/media.py

Media & Greeting-card endpoints.

POST /api/media/greeting
    Upload a text or video greeting for an existing order.
    Generates a QR code that resolves to /greeting/{qr_token}.
    Returns: qr_token, public_url, qr_png_base64

GET /api/media/greeting/{qr_token}
    Public endpoint — no auth required.
    Returns greeting data so anyone with the QR can view the card.
"""
import base64
import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import get_current_twa_user
from backend.core.database import get_db as get_session
from backend.models.order import Order
from backend.models.user import User
from backend.services import qr_service, storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/media", tags=["media"])

# ── Max video size: 50 MB ─────────────────────────────────────────────────────
MAX_VIDEO_BYTES = 50 * 1024 * 1024

# ── Response schemas ──────────────────────────────────────────────────────────


class GreetingUploadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    qr_token: uuid.UUID
    greeting_url: str | None          # public URL for video (None for text)
    greeting_text: str | None
    greeting_type: str                # "text" | "video"
    qr_public_url: str                # URL embedded in the QR
    qr_png_base64: str                # PNG data URI for display


class GreetingViewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    qr_token: uuid.UUID
    greeting_type: str
    greeting_text: str | None
    greeting_url: str | None
    recipient_name: str | None
    order_id: uuid.UUID


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _resolve_user(
    tg_user: dict,
    session: AsyncSession,
) -> User:
    result = await session.execute(
        select(User).where(User.tg_id == int(tg_user["id"]))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── POST /api/media/greeting ──────────────────────────────────────────────────


@router.post("/greeting", response_model=GreetingUploadOut, status_code=201)
async def upload_greeting(
    order_id: Annotated[uuid.UUID, Form()],
    greeting_type: Annotated[str, Form()],           # "text" | "video"
    greeting_text: Annotated[str | None, Form()] = None,
    video: Annotated[UploadFile | None, File()] = None,
    session: AsyncSession = Depends(get_session),
    tg_user: dict = Depends(get_current_twa_user),
):
    """
    Attach a greeting card to an existing order.

    - type="text"  → greeting_text is required; video ignored.
    - type="video" → video file is required; greeting_text optional (caption).

    Idempotent: calling again on the same order overwrites the previous greeting.
    """
    if greeting_type not in ("text", "video"):
        raise HTTPException(status_code=422, detail="greeting_type must be 'text' or 'video'")

    if greeting_type == "text" and not greeting_text:
        raise HTTPException(status_code=422, detail="greeting_text is required for type='text'")

    if greeting_type == "video" and not video:
        raise HTTPException(status_code=422, detail="video file is required for type='video'")

    # ── Resolve user + order ──────────────────────────────────────────────────
    user = await _resolve_user(tg_user, session)

    result = await session.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # ── Ensure qr_token exists ────────────────────────────────────────────────
    if not order.qr_token:
        order.qr_token = uuid.uuid4()

    # ── Upload video to R2 ────────────────────────────────────────────────────
    video_url: str | None = None

    if greeting_type == "video":
        content = await video.read()
        if len(content) > MAX_VIDEO_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Video exceeds {MAX_VIDEO_BYTES // (1024*1024)} MB limit",
            )

        ext = (video.filename or "video.mp4").rsplit(".", 1)[-1].lower()
        key = f"greetings/{order.qr_token}.{ext}"

        video_url = await storage_service.upload_bytes(
            data=content,
            object_key=key,
            content_type=video.content_type or "video/mp4",
        )

    # ── Persist greeting data on the order ───────────────────────────────────
    order.greeting_type = greeting_type
    order.greeting_text = greeting_text if greeting_type == "text" else greeting_text
    order.greeting_url  = video_url   # None for text greetings

    await session.commit()
    await session.refresh(order)

    # ── Generate QR PNG ───────────────────────────────────────────────────────
    qr_png = qr_service.generate_greeting_qr(order.qr_token)
    qr_b64  = "data:image/png;base64," + base64.b64encode(qr_png).decode()
    qr_url  = qr_service.greeting_public_url(order.qr_token)

    logger.info(
        "Greeting uploaded for order %s (type=%s)", order_id, greeting_type
    )

    return GreetingUploadOut(
        qr_token=order.qr_token,
        greeting_url=order.greeting_url,
        greeting_text=order.greeting_text,
        greeting_type=order.greeting_type,
        qr_public_url=qr_url,
        qr_png_base64=qr_b64,
    )


# ── GET /api/media/greeting/{qr_token} ───────────────────────────────────────


@router.get("/greeting/{qr_token}", response_model=GreetingViewOut)
async def view_greeting(
    qr_token: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """
    Public endpoint — no Telegram auth required.
    Opened by the recipient after scanning the QR code.
    """
    result = await session.execute(
        select(Order).where(Order.qr_token == qr_token)
    )
    order = result.scalar_one_or_none()

    if not order or not order.greeting_type:
        raise HTTPException(status_code=404, detail="Greeting not found")

    return GreetingViewOut(
        qr_token=order.qr_token,
        greeting_type=order.greeting_type,
        greeting_text=order.greeting_text,
        greeting_url=order.greeting_url,
        recipient_name=order.recipient_name,
        order_id=order.id,
    )
