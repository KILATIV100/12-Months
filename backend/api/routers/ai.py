"""
// filepath: backend/api/routers/ai.py

AI assistant endpoints for the 2D bouquet constructor.

  POST /api/ai/hint — returns a single short florist tip in Ukrainian
                       given the current bouquet composition, budget, and occasion.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.api.security import get_current_twa_user
from backend.services.ai_service import get_constructor_hint

router = APIRouter(prefix="/api/ai", tags=["ai"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class HintIn(BaseModel):
    # Human-readable flower/green names already in the bouquet
    flowers_list: list[str] = Field(default_factory=list, max_length=30)
    budget: int = Field(default=0, ge=0, le=100_000)
    occasion: str = Field(default="", max_length=100)


class HintOut(BaseModel):
    hint: str


# ── POST /api/ai/hint ─────────────────────────────────────────────────────────


@router.post("/hint", response_model=HintOut)
async def get_bouquet_hint(
    body: HintIn,
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> HintOut:
    """
    Ask Claude Haiku for ONE short Ukrainian florist tip (≤ 15 words).

    Called by the AIHint component in the 2D constructor with a 1.5-second debounce
    so Claude is not called on every single element addition.
    """
    hint = await get_constructor_hint(
        flowers_list=body.flowers_list,
        budget=body.budget,
        occasion=body.occasion,
    )
    return HintOut(hint=hint)
