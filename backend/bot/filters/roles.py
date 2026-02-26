"""Role-based access filters for aiogram 3.

Usage in handlers:
    @router.message(Command("admin"), IsAdmin())
    @router.message(Command("stats"), IsOwner())
    @router.message(Command("stock"), IsFlorist())

The `user` parameter is injected by AuthMiddleware via data["user"].
If no user in data (e.g. channel posts), filters return False.
"""
from typing import Union

from aiogram.filters import BaseFilter
from aiogram.types import CallbackQuery, Message

from backend.models.user import User


class IsAdmin(BaseFilter):
    """Allows managers and owner (role in 'manager', 'owner')."""

    async def __call__(
        self,
        event: Union[Message, CallbackQuery],
        user: User | None = None,
    ) -> bool:
        if user is None:
            return False
        return user.is_admin


class IsOwner(BaseFilter):
    """Allows only the owner (role == 'owner')."""

    async def __call__(
        self,
        event: Union[Message, CallbackQuery],
        user: User | None = None,
    ) -> bool:
        if user is None:
            return False
        return user.is_owner


class IsFlorist(BaseFilter):
    """Allows florist, manager, and owner (any staff role)."""

    async def __call__(
        self,
        event: Union[Message, CallbackQuery],
        user: User | None = None,
    ) -> bool:
        if user is None:
            return False
        return user.is_florist


class IsRegularUser(BaseFilter):
    """Allows only regular users (role == 'user').
    Useful for handlers that should NOT be accessible by staff."""

    async def __call__(
        self,
        event: Union[Message, CallbackQuery],
        user: User | None = None,
    ) -> bool:
        if user is None:
            return False
        return user.role == "user"
