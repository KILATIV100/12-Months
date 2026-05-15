"""aiogram bot setup. Webhook mode per TZ §02."""
from __future__ import annotations

import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, BotCommandScopeChat, BotCommandScopeDefault

from app.bot.handlers import admin, dates, quick, start, subscribe
from app.config import settings

log = logging.getLogger(__name__)

# Commands every user sees in the "/" menu.
PUBLIC_COMMANDS = [
    BotCommand(command="start", description="🌿 Почати / головне меню"),
    BotCommand(command="order", description="💐 Замовити букет"),
    BotCommand(command="dates", description="📅 Мої важливі дати"),
    BotCommand(command="subscribe", description="🔁 Квітковий абонемент"),
    BotCommand(command="history", description="🧾 Історія замовлень"),
    BotCommand(command="status", description="📦 Статус замовлення"),
]

# Extra commands shown only to the owner/admins (scoped to their chat).
ADMIN_COMMANDS = PUBLIC_COMMANDS + [
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
    """Register the "/" menu. Public list for everyone, fuller list for the owner.

    Clears any previously-registered commands first so stale entries from old
    deploys don't linger. Logs success/failure so the deployer can verify.
    """
    # Public scope.
    try:
        await bot.delete_my_commands(scope=BotCommandScopeDefault())
    except Exception as exc:
        log.warning("delete public commands failed: %s", exc)
    try:
        await bot.set_my_commands(PUBLIC_COMMANDS, scope=BotCommandScopeDefault())
        log.info("public commands registered (%d)", len(PUBLIC_COMMANDS))
    except Exception:
        log.exception("set public commands failed")

    # Per-owner scope.
    if not settings.owner_tg_id:
        log.warning("OWNER_TG_ID not set — admin commands menu will not be visible")
        return
    scope = BotCommandScopeChat(chat_id=settings.owner_tg_id)
    try:
        await bot.delete_my_commands(scope=scope)
    except Exception as exc:
        log.warning("delete owner commands failed: %s", exc)
    try:
        await bot.set_my_commands(ADMIN_COMMANDS, scope=scope)
        log.info("admin commands registered for owner %s (%d)", settings.owner_tg_id, len(ADMIN_COMMANDS))
    except Exception:
        # Common cause: owner hasn't messaged the bot yet, so Telegram doesn't
        # know about that chat. Will succeed on next boot after /start.
        log.exception("set owner commands failed (owner may not have started bot yet)")


async def make_dispatcher() -> Dispatcher:
    storage = RedisStorage.from_url(settings.redis_url)
    dp = Dispatcher(storage=storage)
    dp.include_router(start.router)
    dp.include_router(quick.router)
    dp.include_router(dates.router)
    dp.include_router(subscribe.router)
    dp.include_router(admin.router)
    return dp
