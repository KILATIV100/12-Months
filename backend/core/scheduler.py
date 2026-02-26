"""APScheduler setup for 12 Months.

Creates a single AsyncIOScheduler instance that is started/stopped
inside the FastAPI lifespan in backend/main.py.

Jobs registered here:
  - nps_survey   : every 15 min — send NPS rating requests for delivered orders
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
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

    scheduler.add_job(
        send_nps_surveys,
        trigger=IntervalTrigger(minutes=15),
        id="nps_survey",
        replace_existing=True,
        max_instances=1,        # never run in parallel
        misfire_grace_time=60,  # allow up to 60 s late start
    )

    logger.info("Scheduler configured: %d jobs", len(scheduler.get_jobs()))
    return scheduler
