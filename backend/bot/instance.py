"""Bot and Dispatcher singletons.

Imported by:
  - backend/api/routers/webhook.py  (webhook mode — production)
  - backend/bot_runner.py           (polling mode — local development)
  - backend/bot/setup.py            (registers handlers/middlewares)
"""
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage

from backend.core.config import settings

# ── Bot Instance ──────────────────────────────────────────────
bot = Bot(
    token=settings.bot_token,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML),
)

# ── FSM Storage (Redis) ───────────────────────────────────────
# Stores FSM state data in Redis so it survives restarts
storage = RedisStorage.from_url(settings.redis_url)

# ── Dispatcher ────────────────────────────────────────────────
dp = Dispatcher(storage=storage)
