"""Users API router.

GET /api/users/me  — returns the current TWA user's profile:
                     bonus_balance, tg_id, name, referral_link.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import get_current_twa_user
from backend.core.config import settings
from backend.core.database import get_db
from backend.models.user import User

router = APIRouter(prefix="/api/users", tags=["users"])


class UserMeOut(BaseModel):
    tg_id: int
    name: str | None
    bonus_balance: int
    referral_link: str


@router.get("/me", response_model=UserMeOut)
async def get_me(
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> UserMeOut:
    """Return the current user's profile data including bonus balance and referral link."""
    tg_id: int = tg_user["id"]
    result = await session.execute(select(User).where(User.tg_id == tg_id))
    db_user = result.scalar_one_or_none()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — open the bot first",
        )

    referral_link = (
        f"https://t.me/{settings.bot_username}?start=ref_{db_user.tg_id}"
        if settings.bot_username
        else ""
    )

    return UserMeOut(
        tg_id=db_user.tg_id,
        name=db_user.name,
        bonus_balance=db_user.bonus_balance,
        referral_link=referral_link,
    )
