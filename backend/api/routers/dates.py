"""
// filepath: backend/api/routers/dates.py

Important-dates CRUD API.

GET    /api/dates           — list user's active dates (sorted by next occurrence)
POST   /api/dates           — create a new important date
DELETE /api/dates/{date_id} — delete a date (hard delete, user-scoped)
"""
import uuid
import logging
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import get_current_twa_user
from backend.core.database import get_db as get_session
from backend.models.date import ImportantDate
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dates", tags=["dates"])

# ── Helpers ───────────────────────────────────────────────────────────────────

LABEL_COLORS: dict[str, str] = {
    "День народження": "pink",
    "Річниця":         "gold",
    "Весілля":         "gold",
    "8 Березня":       "pink",
    "Новий рік":       "green",
    "День закоханих":  "pink",
}


def _dot_color(label: str) -> str:
    """Map event label to a colour token for the frontend cal-dot."""
    for key, colour in LABEL_COLORS.items():
        if key.lower() in label.lower():
            return colour
    return "green"


def _next_occurrence(event_date: date, repeat_yearly: bool) -> date:
    """
    Return the next occurrence of the event relative to today.

    For yearly events the year is adjusted so the result is always in
    the future (or today).
    """
    today = date.today()
    if not repeat_yearly:
        return event_date

    try:
        this_year = date(today.year, event_date.month, event_date.day)
    except ValueError:
        # Edge case: Feb 29 in non-leap year → Feb 28
        this_year = date(today.year, event_date.month, event_date.day - 1)

    if this_year >= today:
        return this_year

    try:
        return date(today.year + 1, event_date.month, event_date.day)
    except ValueError:
        return date(today.year + 1, event_date.month, event_date.day - 1)


def _days_until(event_date: date, repeat_yearly: bool) -> int:
    nxt = _next_occurrence(event_date, repeat_yearly)
    return max(0, (nxt - date.today()).days)


# ── Schemas ───────────────────────────────────────────────────────────────────


class DateIn(BaseModel):
    label:          str
    person_name:    str | None = None
    date:           date
    repeat_yearly:  bool = True
    reminder_days:  list[int] = [3, 1]

    @field_validator("label")
    @classmethod
    def label_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("label must not be empty")
        return v

    @field_validator("reminder_days")
    @classmethod
    def reminder_days_valid(cls, v: list[int]) -> list[int]:
        for d in v:
            if d < 0 or d > 365:
                raise ValueError("reminder_days values must be 0–365")
        return sorted(set(v), reverse=True)


class DateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             uuid.UUID
    label:          str
    person_name:    str | None
    date:           date
    repeat_yearly:  bool
    reminder_days:  list[int]
    is_active:      bool

    # Computed fields (set by the endpoint)
    dot_color:      str = "green"
    days_until:     int = 0
    next_date:      date | None = None


# ── Resolve user ──────────────────────────────────────────────────────────────


async def _get_user(
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


def _enrich(obj: ImportantDate) -> DateOut:
    """Attach computed fields to the ORM object and return a DateOut."""
    out = DateOut.model_validate(obj)
    out.dot_color  = _dot_color(obj.label)
    out.days_until = _days_until(obj.date, obj.repeat_yearly)
    out.next_date  = _next_occurrence(obj.date, obj.repeat_yearly)
    return out


# ── GET /api/dates ────────────────────────────────────────────────────────────


@router.get("", response_model=list[DateOut])
async def list_dates(
    session: AsyncSession = Depends(get_session),
    tg_user: dict = Depends(get_current_twa_user),
):
    """Return all active important dates for the current user, sorted by next occurrence."""
    user = await _get_user(tg_user, session)

    result = await session.execute(
        select(ImportantDate)
        .where(
            ImportantDate.user_id == user.id,
            ImportantDate.is_active == True,
        )
    )
    dates: list[ImportantDate] = list(result.scalars().all())

    enriched = [_enrich(d) for d in dates]
    enriched.sort(key=lambda d: d.days_until)
    return enriched


# ── POST /api/dates ───────────────────────────────────────────────────────────


@router.post("", response_model=DateOut, status_code=201)
async def create_date(
    body: DateIn,
    session: AsyncSession = Depends(get_session),
    tg_user: dict = Depends(get_current_twa_user),
):
    """Create a new important date for the current user."""
    user = await _get_user(tg_user, session)

    important_date = ImportantDate(
        id=uuid.uuid4(),
        user_id=user.id,
        label=body.label,
        person_name=body.person_name,
        date=body.date,
        repeat_yearly=body.repeat_yearly,
        reminder_days=body.reminder_days,
        is_active=True,
    )
    session.add(important_date)
    await session.commit()
    await session.refresh(important_date)

    logger.info("Created ImportantDate %s for user %s", important_date.id, user.id)
    return _enrich(important_date)


# ── DELETE /api/dates/{date_id} ───────────────────────────────────────────────


@router.delete("/{date_id}", status_code=204)
async def delete_date(
    date_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    tg_user: dict = Depends(get_current_twa_user),
):
    """Permanently delete an important date (user-scoped for safety)."""
    user = await _get_user(tg_user, session)

    result = await session.execute(
        select(ImportantDate).where(
            ImportantDate.id == date_id,
            ImportantDate.user_id == user.id,
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Date not found")

    await session.delete(obj)
    await session.commit()
    logger.info("Deleted ImportantDate %s", date_id)
