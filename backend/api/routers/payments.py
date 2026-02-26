"""Payments API router — LiqPay integration.

Endpoints:
  POST /api/payments/create/{order_id}   — generate LiqPay checkout link
  POST /api/payments/liqpay/callback     — LiqPay server-side payment notification

LiqPay algorithm (v3):
  data      = base64( json({ public_key, version, action, amount, ... }) )
  signature = base64( sha1( private_key + data + private_key ) )
  checkout  = https://www.liqpay.ua/api/3/checkout?data=DATA&signature=SIG

Callback security:
  LiqPay POSTs form-encoded body: data=BASE64&signature=SHA1
  We verify: signature == base64(sha1(private_key + data + private_key))
"""
import base64
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.security import get_current_twa_user
from backend.bot.services.notifications import notify_order_paid
from backend.core.config import settings
from backend.core.database import get_db
from backend.models.order import Order, OrderItem
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])

LIQPAY_CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout"

# Statuses that LiqPay sends when money is confirmed
LIQPAY_SUCCESS_STATUSES = {"success", "sandbox", "subscribed"}


# ── LiqPay helpers ─────────────────────────────────────────────────────────────

def _liqpay_encode(payload: dict) -> str:
    """Serialize payload dict to base64-encoded JSON string."""
    return base64.b64encode(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).decode("utf-8")


def _liqpay_sign(private_key: str, data_b64: str) -> str:
    """Compute LiqPay signature: base64(sha1(private_key + data + private_key))."""
    raw = (private_key + data_b64 + private_key).encode("utf-8")
    return base64.b64encode(hashlib.sha1(raw).digest()).decode("utf-8")


def _liqpay_verify(private_key: str, data_b64: str, signature: str) -> bool:
    """Verify incoming LiqPay callback signature (constant-time compare)."""
    import hmac as _hmac
    expected = _liqpay_sign(private_key, data_b64)
    # Both are plain base64 strings — compare as bytes
    return _hmac.compare_digest(expected.encode(), signature.encode())


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_order_for_user(
    order_id: uuid.UUID,
    tg_user: dict,
    session: AsyncSession,
) -> Order:
    """Load an order and verify it belongs to the authenticated user."""
    tg_id: int = tg_user["id"]
    result = await session.execute(
        select(Order)
        .join(Order.user)
        .where(Order.id == order_id, User.tg_id == tg_id)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


# ── Response schemas ───────────────────────────────────────────────────────────

class PaymentLinkOut(BaseModel):
    checkout_url: str   # Full GET URL — open in Telegram via openLink()
    data: str           # base64 payload (for custom form submission)
    signature: str      # base64 signature


# ── POST /api/payments/create/{order_id} ──────────────────────────────────────

@router.post("/create/{order_id}", response_model=PaymentLinkOut)
async def create_payment_link(
    order_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> PaymentLinkOut:
    """Generate a LiqPay checkout URL for the given order.

    The frontend opens this URL via:
        window.Telegram.WebApp.openLink(checkout_url)
    or redirects to it. The URL encodes all payment parameters and
    is valid for one-time use.

    Raises 409 if the order is already paid.
    Raises 403 if the order belongs to another user.
    """
    if not settings.liqpay_public_key or not settings.liqpay_private_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment provider not configured",
        )

    order = await _get_order_for_user(order_id, tg_user, session)

    if order.paid_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order is already paid",
        )

    if order.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot pay a cancelled order",
        )

    # Build LiqPay payload
    payload = {
        "public_key":  settings.liqpay_public_key,
        "version":     "3",
        "action":      "pay",
        "amount":      str(round(float(order.total_price), 2)),
        "currency":    "UAH",
        "description": f"12 Місяців — замовлення #{str(order.id)[-6:].upper()}",
        "order_id":    str(order.id),
        "language":    "uk",
        "result_url":  f"{settings.webhook_host}/app/payment/result",
        "server_url":  f"{settings.webhook_host}/api/payments/liqpay/callback",
    }

    data_b64 = _liqpay_encode(payload)
    signature = _liqpay_sign(settings.liqpay_private_key, data_b64)
    checkout_url = f"{LIQPAY_CHECKOUT_URL}?data={data_b64}&signature={signature}"

    logger.info(
        "Payment link created for order=%s amount=%s",
        order.id,
        payload["amount"],
    )

    return PaymentLinkOut(
        checkout_url=checkout_url,
        data=data_b64,
        signature=signature,
    )


# ── POST /api/payments/liqpay/callback ────────────────────────────────────────

@router.post(
    "/liqpay/callback",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,  # hide from public Swagger docs
)
async def liqpay_callback(
    session: Annotated[AsyncSession, Depends(get_db)],
    data: str = Form(...),
    signature: str = Form(...),
) -> dict:
    """Receive LiqPay server-side payment notification.

    LiqPay POSTs application/x-www-form-urlencoded with:
      data      — base64-encoded JSON payload
      signature — base64(sha1(private_key + data + private_key))

    Steps:
    1. Verify signature (reject with 400 if invalid)
    2. Decode the payload JSON
    3. Find the order by order_id in payload
    4. If payment is confirmed — set paid_at + status = "in_work"
    5. Send Telegram notification to the buyer
    """
    # ── 1. Verify signature ─────────────────────────────────────
    if not _liqpay_verify(settings.liqpay_private_key, data, signature):
        logger.warning("LiqPay callback: invalid signature received")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    # ── 2. Decode payload ───────────────────────────────────────
    try:
        payload: dict = json.loads(base64.b64decode(data).decode("utf-8"))
    except Exception as exc:
        logger.error("LiqPay callback: failed to decode data: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed data payload",
        ) from exc

    payment_status: str = payload.get("status", "")
    liqpay_order_id: str = payload.get("order_id", "")
    amount: str = payload.get("amount", "?")
    err_code: str = payload.get("err_code", "")

    logger.info(
        "LiqPay callback: order_id=%s status=%s amount=%s err=%s",
        liqpay_order_id,
        payment_status,
        amount,
        err_code,
    )

    # ── 3. Only process confirmed payments ──────────────────────
    if payment_status not in LIQPAY_SUCCESS_STATUSES:
        # Not a success — log and return 200 so LiqPay stops retrying
        logger.info("LiqPay: non-success status '%s', skipping", payment_status)
        return {"received": True}

    # ── 4. Load and update the order ────────────────────────────
    try:
        order_uuid = uuid.UUID(liqpay_order_id)
    except (ValueError, AttributeError):
        logger.error("LiqPay callback: invalid order_id '%s'", liqpay_order_id)
        return {"received": True}

    result = await session.execute(
        select(Order)
        .where(Order.id == order_uuid)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
    )
    order = result.scalar_one_or_none()

    if order is None:
        logger.error("LiqPay callback: order %s not found in DB", order_uuid)
        return {"received": True}

    if order.paid_at is not None:
        # Already processed — idempotent response
        logger.info("LiqPay callback: order %s already paid, skipping", order_uuid)
        return {"received": True}

    # Mark as paid → transition to in_work
    order.paid_at = datetime.now(tz=timezone.utc)
    order.status = "in_work"
    await session.commit()
    await session.refresh(order)

    logger.info("Order %s marked as paid (amount=%s UAH)", order.id, amount)

    # ── 5. Telegram notification ────────────────────────────────
    # Reload relationships after commit
    result2 = await session.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
    )
    order = result2.scalar_one()
    await notify_order_paid(order)

    return {"received": True}
