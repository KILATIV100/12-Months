"""APScheduler — daily sweeps for date reminders + subscription auto-orders per TZ §05 / §07."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.config import settings
from app.db import async_session
from app.models import (
    DeliveryType,
    ImportantDate,
    Order,
    OrderType,
    Product,
    Subscription,
    User,
)
from app.services import claude
from app.services.notifications import date_reminder

log = logging.getLogger(__name__)


# ─────────────── Date reminders + AI picks ───────────────

async def _send_ai_picks(bot: Bot, tg_id: int, event_label: str, person: str | None) -> None:
    """TZ §08 Scenario 03: 3 days before an event, ask Claude for 3 best matches."""
    async with async_session() as session:
        catalog_rows = (await session.scalars(
            select(Product).where(
                Product.is_available.is_(True), Product.is_deleted.is_(False)
            ).limit(20)
        )).all()
        if not catalog_rows:
            return
        catalog = [
            {"id": str(p.id), "name": p.name, "price": float(p.base_price),
             "tags": p.tags or [], "composition": p.composition or ""}
            for p in catalog_rows
        ]
        user = await session.scalar(select(User).where(User.tg_id == tg_id))
        history = []
        if user:
            past = (await session.scalars(
                select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(5)
            )).all()
            history = [{"total": float(o.total_price)} for o in past]

    result = await claude.reminder_picks(history, event_label, catalog)
    items = result.get("items", [])[:3]
    if not items:
        return
    by_id = {str(p.id): p for p in catalog_rows}
    lines = [f"🎁 До «{event_label}{' · ' + person if person else ''}» залишилось 3 дні. Ось добірка:"]
    rows: list[list[InlineKeyboardButton]] = []
    for it in items:
        prod = by_id.get(it.get("id", ""))
        if not prod:
            continue
        lines.append(f"\n💐 <b>{prod.name}</b> · {prod.base_price} грн\n<i>{it.get('reason', '')}</i>")
        if settings.twa_url:
            from aiogram.types import WebAppInfo
            url = f"{settings.twa_url}/?tab=catalog"
            rows.append([InlineKeyboardButton(text=f"Замовити «{prod.name}»", web_app=WebAppInfo(url=url))])
    kb = InlineKeyboardMarkup(inline_keyboard=rows) if rows else None
    await bot.send_message(tg_id, "\n".join(lines), parse_mode="HTML", reply_markup=kb)


async def sweep_dates(bot: Bot) -> None:
    """For every active important_date, send a reminder if today matches one of reminder_days."""
    today = date.today()
    async with async_session() as session:
        stmt = (
            select(ImportantDate, User)
            .join(User, ImportantDate.user_id == User.id)
            .where(ImportantDate.is_active.is_(True))
        )
        rows = (await session.execute(stmt)).all()
    for d, u in rows:
        target = d.date
        if d.repeat_yearly:
            target = target.replace(year=today.year)
            if target < today:
                target = target.replace(year=today.year + 1)
        days_left = (target - today).days
        if days_left not in (d.reminder_days or [3, 1]) and days_left != 0:
            continue
        try:
            await date_reminder(bot, u.tg_id, days_left, d.label, d.person_name)
            if days_left == 3:
                try:
                    await _send_ai_picks(bot, u.tg_id, d.label, d.person_name)
                except Exception:
                    log.exception("AI picks for tg=%s failed", u.tg_id)
        except Exception:
            log.exception("Failed to push reminder to tg=%s", u.tg_id)


# ─────────────── Subscription auto-orders ───────────────

async def sweep_subscriptions(bot: Bot) -> None:
    """Auto-create an Order for every active subscription due today."""
    today = date.today()
    async with async_session() as session:
        active = (await session.scalars(
            select(Subscription).where(
                Subscription.is_active.is_(True),
                Subscription.next_delivery <= today,
            )
        )).all()
        for sub in active:
            # Honour pause: if paused_until is in the future, skip and roll the next delivery.
            if sub.paused_until and sub.paused_until > today:
                sub.next_delivery = sub.paused_until
                continue
            user = await session.get(User, sub.user_id)
            if user is None:
                continue
            order = Order(
                user_id=sub.user_id,
                type=OrderType.custom,
                total_price=sub.price or Decimal("0"),
                delivery_type=DeliveryType.delivery,
                delivery_at=datetime.combine(sub.next_delivery, datetime.min.time().replace(hour=14)),
                address=sub.address,
                comment=f"Абонемент ({sub.frequency.value})",
            )
            session.add(order)
            # Advance next_delivery according to frequency.
            step = 7 if sub.frequency.value == "weekly" else 14
            sub.next_delivery = today + timedelta(days=step)
            await session.commit()
            await session.refresh(order)
            try:
                await bot.send_message(
                    user.tg_id,
                    f"🔁 За підпискою сформовано замовлення №{str(order.id)[:8].upper()} на {sub.next_delivery - timedelta(days=step):%d.%m}.\n"
                    f"Наступне — {sub.next_delivery:%d.%m}.",
                )
            except Exception:
                log.exception("Failed to notify tg=%s about subscription order", user.tg_id)


# ─────────────── Scheduler setup ───────────────

def make_scheduler(bot: Bot) -> AsyncIOScheduler:
    sched = AsyncIOScheduler(timezone="Europe/Kyiv")
    sched.add_job(sweep_dates, CronTrigger(hour=9, minute=0), args=[bot], id="date_sweep")
    sched.add_job(sweep_subscriptions, CronTrigger(hour=9, minute=10), args=[bot], id="sub_sweep")
    return sched


async def maybe_schedule_nps(bot: Bot, scheduler: AsyncIOScheduler, tg_id: int, order_no: str, after_seconds: int = 7200) -> None:
    """Schedule one-shot NPS request 2h after delivery per TZ §05."""
    from datetime import datetime as dt, timedelta as td
    from app.services.notifications import nps_request

    run_at = dt.utcnow() + td(seconds=after_seconds)
    scheduler.add_job(nps_request, "date", run_date=run_at, args=[bot, tg_id, order_no])
