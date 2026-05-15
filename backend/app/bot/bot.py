"""aiogram bot setup. Webhook mode per TZ §02."""
from __future__ import annotations

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, BotCommandScopeChat, BotCommandScopeDefault

from app.bot.handlers import admin, dates, quick, start, subscribe
from app.config import settings

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
    """Register the "/" menu. Public list for everyone, fuller list for the owner."""
    await bot.set_my_commands(PUBLIC_COMMANDS, scope=BotCommandScopeDefault())
    if settings.owner_tg_id:
        try:
            await bot.set_my_commands(
                ADMIN_COMMANDS, scope=BotCommandScopeChat(chat_id=settings.owner_tg_id)
            )
        except Exception:
            # Owner may not have opened the bot yet — harmless, retried next boot.
            pass


async def make_dispatcher() -> Dispatcher:
    storage = RedisStorage.from_url(settings.redis_url)
    dp = Dispatcher(storage=storage)
    dp.include_router(start.router)
    dp.include_router(quick.router)
    dp.include_router(dates.router)
    dp.include_router(subscribe.router)
    dp.include_router(admin.router)
    return dp
