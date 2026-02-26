"""
12 Months — Telegram Bot Runner (polling mode for local development).

Use this entry point when running locally without HTTPS/webhooks.
In production the bot is driven by the FastAPI webhook endpoint in
backend/api/routers/webhook.py.

Usage:
    python -m backend.bot_runner
"""
import asyncio
import logging

from backend.bot.instance import bot, dp
from backend.bot.setup import setup_dispatcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    # Register all middlewares and routers
    setup_dispatcher(dp)

    logger.info("Starting bot in POLLING mode (local dev)...")

    # Remove any existing webhook so polling works
    await bot.delete_webhook(drop_pending_updates=True)

    try:
        await dp.start_polling(
            bot,
            allowed_updates=dp.resolve_used_update_types(),
        )
    finally:
        await bot.session.close()
        logger.info("Bot stopped.")


if __name__ == "__main__":
    asyncio.run(main())
