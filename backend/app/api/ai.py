"""AI endpoints — TZ §08 three scenarios."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import claude

router = APIRouter(prefix="/api/ai", tags=["ai"])


class HintIn(BaseModel):
    flowers_list: str
    budget: int = 0
    occasion: str = "просто так"


class TasteIn(BaseModel):
    liked: list[str]
    disliked: list[str]


class PicksIn(BaseModel):
    order_history: list[dict[str, Any]] = []
    event_label: str
    catalog: list[dict[str, Any]]


@router.post("/hint")
async def constructor_hint(payload: HintIn) -> dict:
    text = await claude.constructor_hint(payload.flowers_list, payload.budget, payload.occasion)
    return {"text": text}


@router.post("/taste")
async def tinder_taste(payload: TasteIn) -> dict:
    text = await claude.tinder_taste(payload.liked, payload.disliked)
    return {"text": text}


@router.post("/picks")
async def reminder_picks(payload: PicksIn) -> dict:
    return await claude.reminder_picks(payload.order_history, payload.event_label, payload.catalog)
