"""aiogram bot setup. Webhook mode per TZ §02."""
from __future__ import annotations

import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, BotCommandScopeDefault

from app.bot.handlers import admin, dates, quick, start, subscribe
from app.config import settings

log = logging.getLogger(__name__)

# One unified command list shown to everyone. The per-chat scope trick to
# hide admin commands from customers turned out to cache for hours on the
# Telegram client side; non-admins who tap an admin command just get a
# "Недостатньо прав" reply, which is fine.
ALL_COMMANDS = [
    BotCommand(command="start", description="🌿 Почати / головне меню"),
    BotCommand(command="order", description="💐 Замовити букет"),
    BotCommand(command="dates", description="📅 Мої важливі дати"),
    BotCommand(command="subscribe", description="🔁 Квітковий абонемент"),
    BotCommand(command="history", description="🧾 Історія замовлень"),
    BotCommand(command="status", description="📦 Статус замовлення"),
    BotCommand(command="admin", description="⚙️ Меню адміна"),
    BotCommand(command="orders", description="📋 Активні замовлення"),
    BotCommand(command="add", description="➕ Додати букет"),
    BotCommand(command="addflower", description="🌷 Додати елемент конструктора"),
    BotCommand(command="photo", description="🖼 Оновити фото товару"),
    BotCommand(command="stock", description="📦 Оновити наявність"),
    BotCommand(command="stats", description="📊 Статистика"),
    BotCommand(command="cancel", description="✖️ Скасувати поточну дію"),
]


def make_bot() -> Bot:
    return Bot(
        settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


async def setup_commands(bot: Bot) -> None:
    try:
        await bot.delete_my_commands(scope=BotCommandScopeDefault())
    except Exception as exc:
        log.warning("delete commands failed: %s", exc)
    try:
        await bot.set_my_commands(ALL_COMMANDS, scope=BotCommandScopeDefault())
        log.info("commands registered (%d)", len(ALL_COMMANDS))
    except Exception:
        log.exception("set commands failed")


async def make_dispatcher() -> Dispatcher:
    storage = RedisStorage.from_url(settings.redis_url)
    dp = Dispatcher(storage=storage)
    dp.include_router(start.router)
    dp.include_router(quick.router)
    dp.include_router(dates.router)
    dp.include_router(subscribe.router)
    dp.include_router(admin.router)
    return dp
