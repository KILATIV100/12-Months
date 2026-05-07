"""Important dates REST API."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import ImportantDate, User

router = APIRouter(prefix="/api/dates", tags=["dates"])


class DateIn(BaseModel):
    tg_id: int
    label: str
    person_name: str | None = None
    date: date
    repeat_yearly: bool = True
    reminder_days: list[int] = [3, 1]


class DateOut(BaseModel):
    id: uuid.UUID
    label: str
    person_name: str | None
    date: date
    repeat_yearly: bool
    reminder_days: list[int]
    is_active: bool


@router.get("", response_model=list[DateOut])
async def list_dates(tg_id: int, session: AsyncSession = Depends(get_session)) -> list[DateOut]:
    user = await session.scalar(select(User).where(User.tg_id == tg_id))
    if not user:
        return []
    items = (await session.scalars(
        select(ImportantDate).where(ImportantDate.user_id == user.id, ImportantDate.is_active.is_(True))
    )).all()
    return [DateOut.model_validate(d, from_attributes=True) for d in items]


@router.post("", response_model=DateOut)
async def add_date(payload: DateIn, session: AsyncSession = Depends(get_session)) -> DateOut:
    user = await session.scalar(select(User).where(User.tg_id == payload.tg_id))
    if not user:
        user = User(tg_id=payload.tg_id)
        session.add(user)
        await session.flush()
    item = ImportantDate(
        user_id=user.id,
        label=payload.label,
        person_name=payload.person_name,
        date=payload.date,
        repeat_yearly=payload.repeat_yearly,
        reminder_days=payload.reminder_days,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return DateOut.model_validate(item, from_attributes=True)


@router.delete("/{date_id}")
async def delete_date(date_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> dict:
    item = await session.get(ImportantDate, date_id)
    if not item:
        raise HTTPException(404, "Not found")
    item.is_active = False
    await session.commit()
    return {"ok": True}
