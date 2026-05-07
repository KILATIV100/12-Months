"""FastAPI app + bot webhook per TZ §02."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from aiogram.types import Update
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import ai, dates, greetings, orders, products, swipes
from app.bot.bot import make_bot, make_dispatcher
from app.config import settings
from app.services.scheduler import make_scheduler

logging.basicConfig(level=logging.INFO if not settings.debug else logging.DEBUG)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    bot = make_bot()
    dp = await make_dispatcher()
    app.state.bot = bot
    app.state.dp = dp

    await bot.set_webhook(
        url=settings.webhook_url,
        secret_token=settings.secret_key,
        drop_pending_updates=True,
    )
    log.info("webhook registered: %s", settings.webhook_url)

    scheduler = make_scheduler(bot)
    scheduler.start()
    app.state.scheduler = scheduler

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        await bot.delete_webhook(drop_pending_updates=False)
        await bot.session.close()


app = FastAPI(title="12 Months API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.twa_url] if settings.twa_url else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(orders.router)
app.include_router(dates.router)
app.include_router(swipes.router)
app.include_router(ai.router)
app.include_router(greetings.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "env": settings.environment}


@app.post(settings.webhook_path)
async def telegram_webhook(request: Request) -> dict:
    """aiogram webhook entry. Validates Telegram secret token."""
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret != settings.secret_key:
        return {"ok": False, "error": "bad secret"}
    data = await request.json()
    update = Update.model_validate(data)
    await app.state.dp.feed_update(app.state.bot, update)
    return {"ok": True}
