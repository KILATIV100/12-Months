"""APScheduler — daily sweep for date reminders per TZ §05."""
from __future__ import annotations

import logging
from datetime import date, timedelta

from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.db import async_session
from app.models import ImportantDate, User
from app.services.notifications import date_reminder

log = logging.getLogger(__name__)


async def _sweep_dates(bot: Bot) -> None:
    """For every active important_date, send a reminder if today matches one of reminder_days."""
    today = date.today()
    async with async_session() as session:
        stmt = select(ImportantDate, User).join(User, ImportantDate.user_id == User.id).where(ImportantDate.is_active.is_(True))
        rows = (await session.execute(stmt)).all()
        for d, u in rows:
            target = d.date
            if d.repeat_yearly:
                target = target.replace(year=today.year)
                if target < today:
                    target = target.replace(year=today.year + 1)
            days_left = (target - today).days
            if days_left in (d.reminder_days or [3, 1]) or days_left == 0:
                try:
                    await date_reminder(bot, u.tg_id, days_left, d.label, d.person_name)
                except Exception:
                    log.exception("Failed to push reminder to tg=%s", u.tg_id)


def make_scheduler(bot: Bot) -> AsyncIOScheduler:
    sched = AsyncIOScheduler(timezone="Europe/Kyiv")
    # 9:00 every day per common florist schedule.
    sched.add_job(_sweep_dates, CronTrigger(hour=9, minute=0), args=[bot], id="date_sweep")
    return sched


async def maybe_schedule_nps(bot: Bot, scheduler: AsyncIOScheduler, tg_id: int, order_no: str, after_seconds: int = 7200) -> None:
    """Schedule one-shot NPS request 2h after delivery per TZ §05."""
    from datetime import datetime, timedelta as td
    from app.services.notifications import nps_request

    run_at = datetime.utcnow() + td(seconds=after_seconds)
    scheduler.add_job(nps_request, "date", run_date=run_at, args=[bot, tg_id, order_no])
