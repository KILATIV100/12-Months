"""
// filepath: backend/main.py

12 Months — FastAPI Application Entry Point (webhook + API mode).

Sprint 2: Webhook endpoint wired up; bot handlers registered.
Sprint 3: Products API router added.
Sprint 4: Orders + Payments routers added.
Sprint 5: APScheduler (NPS surveys) integrated.
Sprint 6: Media (greetings/QR) + Swipes (Tinder mode) routers added.
Sprint 7: Dates (calendar events) router added; daily reminder job registered.
Sprint 8: Subscriptions router added; subscription renewal scheduler job registered.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from aiogram.types import BotCommandScopeAllPrivateChats, BotCommand
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import webhook  as webhook_router
from backend.api.routers import products as products_router
from backend.api.routers import orders   as orders_router
from backend.api.routers import payments as payments_router
from backend.api.routers import media    as media_router
from backend.api.routers import swipes   as swipes_router
from backend.api.routers import dates         as dates_router
from backend.api.routers import subscriptions as subscriptions_router
from backend.api.routers import elements      as elements_router
from backend.api.routers import ai            as ai_router
from backend.api.routers import users         as users_router
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


_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def _resolve_frontend_path(subpath: str) -> Path | None:
    candidate = (_FRONTEND_DIST / subpath).resolve()
    try:
        candidate.relative_to(_FRONTEND_DIST.resolve())
    except ValueError:
        return None
    return candidate


# ── Bot commands registered in Telegram UI ────────────────────────────────────
_USER_COMMANDS = [
    BotCommand(command="start",   description="🌸 Головне меню"),
    BotCommand(command="order",   description="🛒 Зробити замовлення"),
    BotCommand(command="status",  description="📦 Статус останнього замовлення"),
    BotCommand(command="history", description="🗂 Історія замовлень"),
    BotCommand(command="dates",     description="📅 Мій календар подій"),
    BotCommand(command="subscribe", description="🌸 Квіткова підписка"),
]

_ADMIN_COMMANDS = _USER_COMMANDS + [
    BotCommand(command="admin", description="🛠 Адмін-панель"),
    BotCommand(command="add",   description="➕ Додати товар"),
    BotCommand(command="stock", description="🌿 Оновити наявність"),
    BotCommand(command="hide",  description="🚫 Зняти з продажу"),
    BotCommand(command="show",  description="✅ Повернути у продаж"),
    BotCommand(command="price", description="💰 Змінити ціну"),
    BotCommand(command="del",   description="🗑 Видалити товар"),
    BotCommand(command="stats", description="📊 Статистика магазину"),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────
    r = await get_redis()
    await r.ping()
    logger.info("Redis OK — %s", settings.redis_url)
    logger.info("DB URL   — %s", settings.database_url)
    logger.info("Webhook  — %s", settings.webhook_url)

    setup_dispatcher(dp)

    secret = getattr(settings, "webhook_secret", None)
    await bot.set_webhook(
        url=settings.webhook_url,
        secret_token=secret,
        allowed_updates=dp.resolve_used_update_types(),
        drop_pending_updates=True,
    )
    logger.info("Webhook set: %s", settings.webhook_url)

    await bot.set_my_commands(
        commands=_USER_COMMANDS,
        scope=BotCommandScopeAllPrivateChats(),
    )

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
    docs_url="/docs"  if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(webhook_router.router)
app.include_router(products_router.router)
app.include_router(orders_router.router)
app.include_router(payments_router.router)
app.include_router(media_router.router)    # Sprint 6: greeting cards + QR
app.include_router(swipes_router.router)   # Sprint 6: Tinder mode
app.include_router(dates_router.router)         # Sprint 7: calendar events
app.include_router(subscriptions_router.router) # Sprint 8: flower subscriptions
app.include_router(elements_router.router)      # Sprint 9: bouquet elements (constructor)
app.include_router(ai_router.router)            # Sprint 9: AI florist hints
app.include_router(users_router.router)         # Sprint 10: user profile + bonuses


@app.get("/app", include_in_schema=False)
@app.get("/app/{path:path}", include_in_schema=False)
async def telegram_web_app(path: str = ""):
    """Serve Telegram Mini App SPA from frontend/dist.

    - Static files under /app/assets/...
    - SPA fallback for client routes (/app/profile, /app/payment/result, etc.)
    """
    index_file = _FRONTEND_DIST / "index.html"
    if not index_file.exists():
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Frontend build not found. Build frontend/dist before serving /app.",
            },
        )

    normalized = path.strip("/")
    if normalized:
        target = _resolve_frontend_path(normalized)
        if target and target.exists() and target.is_file():
            return FileResponse(target)

    return FileResponse(index_file)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}
