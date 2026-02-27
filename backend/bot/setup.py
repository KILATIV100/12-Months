"""
// filepath: backend/bot/setup.py

Central registration of middlewares and routers on the Dispatcher.

Called by both:
  - backend/main.py        (FastAPI + webhook mode)
  - backend/bot_runner.py  (polling mode for local dev)
"""
from aiogram import Dispatcher

from backend.bot.middlewares.auth import AuthMiddleware
from backend.bot.handlers.start           import router as start_router
from backend.bot.handlers.admin.products  import router as admin_products_router
from backend.bot.handlers.admin.stock     import router as admin_stock_router
from backend.bot.handlers.admin.orders    import router as admin_orders_router
from backend.bot.handlers.nps             import router as nps_router
from backend.bot.handlers.dates           import router as dates_router
from backend.bot.handlers.subscribe       import router as subscribe_router


def setup_dispatcher(dp: Dispatcher) -> None:
    """Register all middlewares and routers on the given dispatcher.

    Order of middleware registration matters — outer middlewares run first.
    Order of router registration matters — first matching handler wins.
    """
    # ── Middlewares ────────────────────────────────────────────
    # AuthMiddleware: creates DB session + gets/creates User for every update
    dp.update.outer_middleware(AuthMiddleware())

    # ── Routers ───────────────────────────────────────────────
    # Admin routers first — stricter filters (IsAdmin) take priority
    dp.include_router(admin_products_router)
    dp.include_router(admin_stock_router)
    dp.include_router(admin_orders_router)

    # NPS router — any user can rate their own order
    dp.include_router(nps_router)

    # Sprint 7: /dates command
    dp.include_router(dates_router)

    # Sprint 8: /subscribe command
    dp.include_router(subscribe_router)

    # User-facing router last
    dp.include_router(start_router)
