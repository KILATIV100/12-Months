"""
// filepath: backend/core/scheduler.py

APScheduler setup for 12 Months.

Creates a single AsyncIOScheduler instance that is started/stopped
inside the FastAPI lifespan in backend/main.py.

Jobs registered here:
  - nps_survey      : every 15 min — NPS rating requests for delivered orders
  - daily_reminders : daily at 09:00 Kyiv — calendar event push notifications
"""
import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# Singleton scheduler — imported by main.py
_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="Europe/Kyiv")
    return _scheduler


def setup_scheduler() -> AsyncIOScheduler:
    """Register all jobs and return the configured scheduler (not yet started)."""
    from backend.bot.notifications.nps import send_nps_surveys

    scheduler = get_scheduler()

    # ── NPS survey: every 15 minutes ─────────────────────────────────────────
    scheduler.add_job(
        send_nps_surveys,
        trigger=IntervalTrigger(minutes=15),
        id="nps_survey",
        replace_existing=True,
        max_instances=1,        # never run in parallel
        misfire_grace_time=60,  # allow up to 60 s late start
    )

    # ── Daily event reminders: 09:00 Kyiv time ───────────────────────────────
    scheduler.add_job(
        _run_daily_reminders,
        trigger=CronTrigger(
            hour=9,
            minute=0,
            timezone="Europe/Kyiv",
        ),
        id="daily_reminders",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=300,  # allow up to 5 min late start
    )

    logger.info("Scheduler configured: %d jobs", len(scheduler.get_jobs()))
    return scheduler


# ── Daily reminder job ────────────────────────────────────────────────────────

async def _run_daily_reminders() -> None:
    """
    Runs daily at 09:00 Kyiv.

    Algorithm:
      1. Calculate target_3 = today+3 days, target_1 = today+1 day.
      2. Query ImportantDate:
         - repeat_yearly=True  → match EXTRACT(month) + EXTRACT(day)
         - repeat_yearly=False → match exact date
      3. For each 3-day event: fetch user order history, call Claude AI for
         personalised bouquet suggestions, send rich push.
      4. For each 1-day event: send urgent push.
    """
    import asyncio

    from sqlalchemy import and_, extract, or_, select

    from backend.bot.notifications.reminders import (
        send_1day_reminder,
        send_3day_reminder,
    )
    from backend.core.database import async_session_factory
    from backend.models.date import ImportantDate
    from backend.models.order import Order, OrderItem
    from backend.models.product import Product
    from backend.models.user import User
    from backend.services.ai_service import generate_event_suggestions

    today  = date.today()
    day_3  = today + timedelta(days=3)
    day_1  = today + timedelta(days=1)

    logger.info(
        "Daily reminders started — day+3=%s, day+1=%s", day_3, day_1
    )

    async with async_session_factory() as session:

        # ── Build helper: query events whose next occurrence = target_date ────
        async def fetch_events_for(target: date) -> list[ImportantDate]:
            res = await session.execute(
                select(ImportantDate).where(
                    ImportantDate.is_active == True,
                    or_(
                        # Yearly: match month + day regardless of year
                        and_(
                            ImportantDate.repeat_yearly == True,
                            extract("month", ImportantDate.date) == target.month,
                            extract("day",   ImportantDate.date) == target.day,
                        ),
                        # One-time: exact date match
                        and_(
                            ImportantDate.repeat_yearly == False,
                            ImportantDate.date == target,
                        ),
                    ),
                )
            )
            return list(res.scalars().all())

        # ── Fetch available catalog once (reused for AI calls) ────────────────
        catalog_rows = await session.execute(
            select(Product).where(
                Product.is_available == True,
                Product.is_deleted == False,
            ).limit(40)
        )
        catalog_json: list[dict] = [
            {
                "id":         str(p.id),
                "name":       p.name,
                "category":   p.category,
                "base_price": float(p.base_price),
            }
            for p in catalog_rows.scalars().all()
        ]

        # ── Helper: get user's purchase history ───────────────────────────────
        async def user_history(user_id) -> list[str]:
            res = await session.execute(
                select(Product.name)
                .join(OrderItem, OrderItem.product_id == Product.id)
                .join(Order,     Order.id == OrderItem.order_id)
                .where(
                    Order.user_id == user_id,
                    Order.status.in_(["delivered", "ready"]),
                )
                .order_by(Order.created_at.desc())
                .limit(5)
            )
            return list(res.scalars().all())

        # ── Process 3-day events ──────────────────────────────────────────────
        events_3 = await fetch_events_for(day_3)
        for event in events_3:
            user = await session.get(User, event.user_id)
            if not user:
                continue

            label = f"{event.label} для {event.person_name}" if event.person_name else event.label
            history = await user_history(user.id)

            suggestions = await generate_event_suggestions(
                event_label=label,
                user_history=history,
                catalog=catalog_json,
            )

            await send_3day_reminder(
                user=user,
                event=event,
                suggested_products=suggestions,
            )
            await asyncio.sleep(0.3)  # Telegram flood protection

        # ── Process 1-day events ──────────────────────────────────────────────
        events_1 = await fetch_events_for(day_1)
        for event in events_1:
            user = await session.get(User, event.user_id)
            if not user:
                continue

            await send_1day_reminder(user=user, event=event)
            await asyncio.sleep(0.3)

    logger.info(
        "Daily reminders done — 3-day: %d sent, 1-day: %d sent",
        len(events_3), len(events_1),
    )
