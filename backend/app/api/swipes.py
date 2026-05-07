"""Swipe sessions per TZ §07. Stores tinder results."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import SwipeSession, User
from app.services import claude

router = APIRouter(prefix="/api/swipes", tags=["tinder"])


class SwipeIn(BaseModel):
    tg_id: int
    liked_ids: list[uuid.UUID]
    disliked_ids: list[uuid.UUID]
    liked_descriptions: list[str] = []
    disliked_descriptions: list[str] = []


class SwipeOut(BaseModel):
    id: uuid.UUID
    ai_summary: str | None
    result_tags: list[str]


@router.post("", response_model=SwipeOut)
async def submit_swipes(payload: SwipeIn, session: AsyncSession = Depends(get_session)) -> SwipeOut:
    user = await session.scalar(select(User).where(User.tg_id == payload.tg_id))
    if not user:
        user = User(tg_id=payload.tg_id)
        session.add(user)
        await session.flush()
    summary = ""
    if len(payload.liked_ids) + len(payload.disliked_ids) >= 10:
        summary = await claude.tinder_taste(payload.liked_descriptions, payload.disliked_descriptions)
    item = SwipeSession(
        user_id=user.id,
        liked_ids=payload.liked_ids,
        disliked_ids=payload.disliked_ids,
        ai_summary=summary,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return SwipeOut(id=item.id, ai_summary=item.ai_summary, result_tags=item.result_tags or [])
