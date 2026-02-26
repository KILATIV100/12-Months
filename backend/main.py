"""
12 Months — FastAPI Application Entry Point (webhook + API mode).

Sprint 2: Webhook endpoint wired up; bot handlers registered.
Sprint 3: Products API router added.
Sprint 4: Orders + Payments routers added.
Sprint 5: APScheduler (NPS surveys) integrated.
"""
import logging
from contextlib import asynccontextmanager

from aiogram.types import BotCommandScopeAllPrivateChats, BotCommand
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import webhook as webhook_router
from backend.api.routers import products as products_router
from backend.api.routers import orders as orders_router
from backend.api.routers import payments as payments_router
from backend.bot.instance import bot, dp
from backend.bot.setup import setup_dispatcher
from backend.core.config import settings
from backend.core.database import engine
from backend.core.redis import close_redis, get_redis
from backend.core.scheduler import setup_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Bot commands registered in Telegram UI ────────────────────────────────────
_USER_COMMANDS = [
    BotCommand(command="start",   description="🌸 Головне меню"),
    BotCommand(command="order",   description="🛒 Зробити замовлення"),
    BotCommand(command="status",  description="📦 Статус останнього замовлення"),
    BotCommand(command="history", description="🗂 Історія замовлень"),
]

_ADMIN_COMMANDS = _USER_COMMANDS + [
    BotCommand(command="add",   description="➕ Додати товар"),
    BotCommand(command="stock", description="🌿 Оновити наявність"),
    BotCommand(command="hide",  description="🚫 Зняти з продажу"),
    BotCommand(command="show",  description="✅ Повернути у продаж"),
    BotCommand(command="price", description="💰 Змінити ціну"),
    BotCommand(command="del",   description="🗑 Видалити товар"),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────
    r = await get_redis()
    await r.ping()
    logger.info("Redis OK — %s", settings.redis_url)
    logger.info("DB URL   — %s", settings.database_url)
    logger.info("Webhook  — %s", settings.webhook_url)

    # Register all middlewares and routers on the Dispatcher
    setup_dispatcher(dp)

    # Register Telegram webhook
    secret = getattr(settings, "webhook_secret", None)
    await bot.set_webhook(
        url=settings.webhook_url,
        secret_token=secret,
        allowed_updates=dp.resolve_used_update_types(),
        drop_pending_updates=True,
    )
    logger.info("Webhook set: %s", settings.webhook_url)

    # Set visible bot commands
    await bot.set_my_commands(
        commands=_USER_COMMANDS,
        scope=BotCommandScopeAllPrivateChats(),
    )

    # Start APScheduler (NPS surveys, reminders, etc.)
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))

    yield

    # ── Shutdown ──────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    await bot.delete_webhook()
    await bot.session.close()
    await close_redis()
    await engine.dispose()
    logger.info("Connections closed.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(webhook_router.router)
app.include_router(products_router.router)
app.include_router(orders_router.router)
app.include_router(payments_router.router)


# ── Health Check ──────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}
