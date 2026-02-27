"""
// filepath: backend/api/routers/subscriptions.py

Subscription CRUD endpoints.

  GET  /api/subscriptions            — list current user's subscriptions
  POST /api/subscriptions            — create a new subscription
  PATCH /api/subscriptions/{id}/status — pause / resume / cancel
"""
import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import get_current_twa_user
from backend.core.database import get_db
from backend.models.subscription import Subscription
from backend.models.user import User

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

# ── Server-side price map for bouquet sizes ───────────────────────────────────

BOUQUET_PRICES: dict[str, Decimal] = {
    "S": Decimal("599.00"),
    "M": Decimal("799.00"),
    "L": Decimal("1099.00"),
}

# ── Schemas ───────────────────────────────────────────────────────────────────


class SubscriptionOut(BaseModel):
    id: uuid.UUID
    frequency: str
    product_id: uuid.UUID | None
    bouquet_size: str | None
    price: Decimal
    next_delivery: date
    address: str | None
    is_active: bool
    paused_until: date | None

    class Config:
        from_attributes = True


class SubscriptionCreateIn(BaseModel):
    frequency: str = Field(..., pattern="^(weekly|biweekly)$")
    product_id: uuid.UUID | None = None
    bouquet_size: str | None = Field(None, pattern="^(S|M|L)$")
    next_delivery: date
    address: str | None = None


class SubscriptionStatusIn(BaseModel):
    action: str = Field(..., pattern="^(pause|resume|cancel)$")
    paused_until: date | None = None


# ── Helper ────────────────────────────────────────────────────────────────────


async def _get_user(session: AsyncSession, tg_id: int) -> User:
    result = await session.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — open the bot first",
        )
    return user


# ── GET /api/subscriptions ────────────────────────────────────────────────────


@router.get("", response_model=list[SubscriptionOut])
async def list_subscriptions(
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> list[SubscriptionOut]:
    """Return all subscriptions (active + inactive) for the current user."""
    user = await _get_user(session, tg_user["id"])
    result = await session.execute(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .order_by(Subscription.created_at.desc())
    )
    return list(result.scalars().all())


# ── POST /api/subscriptions ───────────────────────────────────────────────────


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    body: SubscriptionCreateIn,
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> SubscriptionOut:
    """
    Create a new subscription.

    Provide either `product_id` (specific catalog item) OR `bouquet_size` (S/M/L).
    Price is always set server-side — never trusted from client.
    `next_delivery` must be in the future.
    """
    user = await _get_user(session, tg_user["id"])

    if body.product_id is None and body.bouquet_size is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either product_id or bouquet_size must be provided",
        )

    if body.next_delivery <= date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="next_delivery must be in the future",
        )

    # ── Determine price ────────────────────────────────────────────────────
    if body.product_id is not None:
        from backend.models.product import Product
        prod = await session.get(Product, body.product_id)
        if prod is None or prod.is_deleted or not prod.is_available:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or unavailable",
            )
        price = Decimal(str(prod.base_price))
        bouquet_size = None
    else:
        price = BOUQUET_PRICES[body.bouquet_size]  # type: ignore[index]
        bouquet_size = body.bouquet_size

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        frequency=body.frequency,
        product_id=body.product_id,
        bouquet_size=bouquet_size,
        price=price,
        next_delivery=body.next_delivery,
        address=body.address,
        is_active=True,
        paused_until=None,
    )
    session.add(sub)
    await session.commit()
    await session.refresh(sub)
    return sub


# ── PATCH /api/subscriptions/{sub_id}/status ─────────────────────────────────


@router.patch("/{sub_id}/status", response_model=SubscriptionOut)
async def update_subscription_status(
    sub_id: uuid.UUID,
    body: SubscriptionStatusIn,
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> SubscriptionOut:
    """
    Pause, resume, or cancel a subscription.

    - pause:  sets paused_until (date required); skips deliveries until then.
    - resume: clears paused_until.
    - cancel: sets is_active=False permanently.
    """
    user = await _get_user(session, tg_user["id"])

    sub = await session.get(Subscription, sub_id)
    if sub is None or sub.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    if body.action == "pause":
        if body.paused_until is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="paused_until is required for pause action",
            )
        if body.paused_until <= date.today():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="paused_until must be in the future",
            )
        sub.paused_until = body.paused_until
        sub.is_active = True  # paused ≠ cancelled

    elif body.action == "resume":
        sub.paused_until = None
        sub.is_active = True

    elif body.action == "cancel":
        sub.is_active = False
        sub.paused_until = None

    await session.commit()
    await session.refresh(sub)
    return sub
