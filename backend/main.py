"""
12 Months — FastAPI Application Entry Point
Sprint 1: Skeleton. Handlers will be added in Sprint 2+.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.core.database import engine
from backend.core.redis import close_redis, get_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────
    # Перевірка підключення до Redis
    r = await get_redis()
    await r.ping()
    print(f"[startup] Redis OK — {settings.redis_url}")
    print(f"[startup] DB URL — {settings.database_url}")
    print(f"[startup] Webhook — {settings.webhook_url}")

    yield

    # ── Shutdown ──────────────────────────────────────────────
    await close_redis()
    await engine.dispose()
    print("[shutdown] Connections closed.")


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


# ── Health Check ──────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}


# ── Routers (підключаються в наступних спринтах) ──────────────
# from backend.api.routers import webhook, products, orders, ...
# app.include_router(webhook.router)
# app.include_router(products.router, prefix="/api/v1")
