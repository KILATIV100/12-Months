"""Access levels per TZ §06."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserRole

ADMIN_ROLES = {UserRole.florist, UserRole.manager, UserRole.owner}
OWNER_ONLY = {UserRole.owner}
MANAGER_OR_OWNER = {UserRole.manager, UserRole.owner}


async def get_or_create_user(session: AsyncSession, tg_id: int, name: str | None = None) -> User:
    user = await session.scalar(_select_by_tg(tg_id))
    if user:
        return user
    user = User(tg_id=tg_id, name=name)
    session.add(user)
    await session.flush()
    return user


def _select_by_tg(tg_id: int):
    from sqlalchemy import select
    return select(User).where(User.tg_id == tg_id)


def is_admin(user: User) -> bool:
    return user.role in ADMIN_ROLES


def is_owner(user: User) -> bool:
    return user.role in OWNER_ONLY


def can_edit_catalog(user: User) -> bool:
    return user.role in MANAGER_OR_OWNER
