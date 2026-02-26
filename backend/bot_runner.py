"""
12 Months — Telegram Bot Runner
Sprint 1: Skeleton. Handlers підключаються в Sprint 2.
"""
import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from backend.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # ── Routers (підключаються в Sprint 2) ───────────────────
    # from backend.bot.handlers.start import router as start_router
    # dp.include_router(start_router)

    logger.info("Bot starting in webhook mode...")
    logger.info(f"Webhook URL: {settings.webhook_url}")

    # У prod-режимі бот запускається як частина FastAPI через webhook.
    # Тут залишаємо polling тільки для локальної розробки без HTTPS.
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    asyncio.run(main())
