"""aiogram bot setup. Webhook mode per TZ §02."""
from __future__ import annotations

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage

from app.bot.handlers import admin, dates, quick, start, subscribe
from app.config import settings


def make_bot() -> Bot:
    return Bot(
        settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


async def make_dispatcher() -> Dispatcher:
    storage = RedisStorage.from_url(settings.redis_url)
    dp = Dispatcher(storage=storage)
    dp.include_router(start.router)
    dp.include_router(quick.router)
    dp.include_router(dates.router)
    dp.include_router(subscribe.router)
    dp.include_router(admin.router)
    return dp
