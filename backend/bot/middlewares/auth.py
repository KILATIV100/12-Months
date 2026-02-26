"""Auth + DB Session Middleware.

Runs before EVERY Telegram update.

Responsibilities:
1. Opens an async SQLAlchemy session for the duration of the handler call.
2. Resolves the Telegram user → DB User (creates record if first visit).
3. Injects into handler data dict:
   - data["session"] : AsyncSession  — use in any handler for DB queries
   - data["user"]    : User          — the resolved DB user object

The session is committed or rolled back automatically after the handler.
"""
import logging
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User as TgUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal
from backend.models.user import User

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        tg_user: TgUser | None = data.get("event_from_user")

        async with AsyncSessionLocal() as session:
            data["session"] = session

            if tg_user is not None:
                try:
                    db_user = await self._get_or_create_user(session, tg_user)
                    data["user"] = db_user
                    # Update display name if changed in Telegram
                    new_name = tg_user.full_name or tg_user.username
                    if new_name and db_user.name != new_name:
                        db_user.name = new_name
                        await session.commit()
                except Exception as exc:
                    logger.error(
                        "AuthMiddleware: failed to resolve user tg_id=%s: %s",
                        tg_user.id,
                        exc,
                    )
                    await session.rollback()

            return await handler(event, data)

    @staticmethod
    async def _get_or_create_user(
        session: AsyncSession,
        tg_user: TgUser,
    ) -> User:
        """Fetch user from DB by tg_id; create a new record if not found."""
        stmt = select(User).where(User.tg_id == tg_user.id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                tg_id=tg_user.id,
                name=tg_user.full_name or tg_user.username,
                role="user",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            logger.info("New user registered: tg_id=%s name=%r", tg_user.id, user.name)

        return user
