"""
// filepath: backend/api/routers/swipes.py

Tinder-mode swipe session endpoints.

POST /api/swipes/session
    Saves liked/disliked product IDs, calls Claude AI for taste analysis,
    finds 3 recommendations from liked categories, returns everything.
"""
import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_serializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import get_current_twa_user
from backend.core.database import get_db as get_session
from backend.models.product import Product
from backend.models.swipe import SwipeSession
from backend.models.user import User
from backend.services.ai_service import analyze_taste

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/swipes", tags=["swipes"])

# ── Schemas ───────────────────────────────────────────────────────────────────


class SwipeSessionIn(BaseModel):
    liked_ids: list[uuid.UUID]
    disliked_ids: list[uuid.UUID]


class ProductShort(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    base_price: float
    image_url: str | None
    category: str | None

    @field_serializer("base_price")
    def serialize_price(self, v, _info):
        return float(v)


class SwipeSessionOut(BaseModel):
    session_id: uuid.UUID
    ai_summary: str
    recommendations: list[ProductShort]


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _resolve_user(tg_user: dict, session: AsyncSession) -> User:
    result = await session.execute(
        select(User).where(User.tg_id == int(tg_user["id"]))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── POST /api/swipes/session ──────────────────────────────────────────────────


@router.post("/session", response_model=SwipeSessionOut, status_code=201)
async def create_swipe_session(
    body: SwipeSessionIn,
    session: AsyncSession = Depends(get_session),
    tg_user: dict = Depends(get_current_twa_user),
):
    """
    Persist the result of a Tinder-mode session and return AI taste analysis
    plus 3 recommended products.

    Algorithm:
    1. Load liked & disliked products from DB (to get names & categories).
    2. Call Claude Haiku to produce a taste summary.
    3. Find 3 available products from the categories the user liked,
       excluding products they already saw.
    4. Save SwipeSession (liked_ids, disliked_ids, ai_summary).
    5. Return session_id + ai_summary + recommendations.
    """
    user = await _resolve_user(tg_user, session)

    all_seen_ids = list(body.liked_ids) + list(body.disliked_ids)

    # ── 1. Load liked products ────────────────────────────────────────────────
    liked_products: list[Product] = []
    if body.liked_ids:
        res = await session.execute(
            select(Product).where(Product.id.in_(body.liked_ids))
        )
        liked_products = list(res.scalars().all())

    disliked_products: list[Product] = []
    if body.disliked_ids:
        res = await session.execute(
            select(Product).where(Product.id.in_(body.disliked_ids))
        )
        disliked_products = list(res.scalars().all())

    liked_names    = [p.name for p in liked_products]
    disliked_names = [p.name for p in disliked_products]

    # ── 2. Claude AI taste analysis ───────────────────────────────────────────
    ai_summary = await analyze_taste(liked_names, disliked_names)

    # ── 3. Recommendations ────────────────────────────────────────────────────
    # Categories the user liked
    liked_categories = list({p.category for p in liked_products if p.category})

    recommendations: list[Product] = []

    if liked_categories:
        # Try to find similar products in same categories not yet seen
        res = await session.execute(
            select(Product)
            .where(
                Product.category.in_(liked_categories),
                Product.is_available == True,
                Product.is_deleted == False,
                Product.id.notin_(all_seen_ids),
            )
            .order_by(Product.base_price)
            .limit(3)
        )
        recommendations = list(res.scalars().all())

    if len(recommendations) < 3:
        # Fallback: top available products not already seen
        existing_ids = [r.id for r in recommendations] + all_seen_ids
        res = await session.execute(
            select(Product)
            .where(
                Product.is_available == True,
                Product.is_deleted == False,
                Product.id.notin_(existing_ids),
            )
            .order_by(Product.base_price)
            .limit(3 - len(recommendations))
        )
        recommendations.extend(res.scalars().all())

    # ── 4. Save SwipeSession ──────────────────────────────────────────────────
    swipe_session = SwipeSession(
        id=uuid.uuid4(),
        user_id=user.id,
        liked_ids=[str(i) for i in body.liked_ids],
        disliked_ids=[str(i) for i in body.disliked_ids],
        ai_summary=ai_summary,
        result_tags=liked_categories[:5],
    )
    session.add(swipe_session)
    await session.commit()

    logger.info(
        "SwipeSession %s saved for user %s (liked=%d, disliked=%d)",
        swipe_session.id, user.id,
        len(body.liked_ids), len(body.disliked_ids),
    )

    return SwipeSessionOut(
        session_id=swipe_session.id,
        ai_summary=ai_summary,
        recommendations=[ProductShort.model_validate(p) for p in recommendations],
    )
