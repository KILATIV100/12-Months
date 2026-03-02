"""Admin /stats command — owner-only business dashboard.

Shows aggregated statistics for today / last 7 days / last 30 days:
  - Number of orders and revenue
  - Top-3 best-selling products
  - New users registered this month
"""
import logging
from datetime import datetime, timedelta, timezone

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.models.order import Order, OrderItem
from backend.models.product import Product
from backend.models.user import User

logger = logging.getLogger(__name__)
router = Router(name="admin_stats")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def _order_stats(session: AsyncSession, since: datetime) -> tuple[int, float]:
    """Returns (count, total_revenue) for orders created since `since`."""
    result = await session.execute(
        select(
            func.count(Order.id).label("cnt"),
            func.coalesce(func.sum(Order.total_price), 0).label("rev"),
        ).where(
            Order.created_at >= since,
            Order.status.notin_(["cancelled"]),
        )
    )
    row = result.one()
    return int(row.cnt), float(row.rev)


async def _top_products(session: AsyncSession, since: datetime, limit: int = 3) -> list[dict]:
    """Returns top N products by units sold since `since`."""
    result = await session.execute(
        select(
            Product.name,
            func.sum(OrderItem.quantity).label("units"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(
            Order.created_at >= since,
            Order.status.notin_(["cancelled"]),
            OrderItem.product_id.isnot(None),
        )
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )
    return [{"name": row.name, "units": int(row.units)} for row in result.all()]


async def _new_users_this_month(session: AsyncSession) -> int:
    """Count users registered in the current calendar month (UTC)."""
    now = _now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await session.execute(
        select(func.count(User.id)).where(User.created_at >= month_start)
    )
    return int(result.scalar_one())


# ── Handler ───────────────────────────────────────────────────────────────────

@router.message(Command("stats"))
async def cmd_stats(
    message: Message,
    user: User,
    session: AsyncSession,
) -> None:
    """Owner-only statistics dashboard."""
    if message.from_user is None or message.from_user.id != settings.owner_tg_id:
        await message.answer("⛔ Команда доступна лише власнику бота.")
        return

    now = _now_utc()
    today_start   = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start    = now - timedelta(days=7)
    month_start   = now - timedelta(days=30)

    # Parallel fetches (awaited sequentially — single-session constraint)
    today_cnt,  today_rev  = await _order_stats(session, today_start)
    week_cnt,   week_rev   = await _order_stats(session, week_start)
    month_cnt,  month_rev  = await _order_stats(session, month_start)
    top_prods              = await _top_products(session, month_start)
    new_users              = await _new_users_this_month(session)

    # ── Build message ─────────────────────────────────────────────────────────
    lines = [
        "📊 <b>Статистика магазину</b>",
        "",
        "🕐 <b>Сьогодні</b>",
        f"  Замовлень: <b>{today_cnt}</b>",
        f"  Виручка:   <b>{today_rev:,.0f} грн</b>",
        "",
        "📅 <b>Останні 7 днів</b>",
        f"  Замовлень: <b>{week_cnt}</b>",
        f"  Виручка:   <b>{week_rev:,.0f} грн</b>",
        "",
        "📆 <b>Останні 30 днів</b>",
        f"  Замовлень: <b>{month_cnt}</b>",
        f"  Виручка:   <b>{month_rev:,.0f} грн</b>",
        "",
        "🌟 <b>Топ-3 товари (30 днів)</b>",
    ]

    if top_prods:
        medals = ["🥇", "🥈", "🥉"]
        for i, p in enumerate(top_prods):
            medal = medals[i] if i < len(medals) else "•"
            lines.append(f"  {medal} {p['name']} — {p['units']} шт.")
    else:
        lines.append("  (немає продажів)")

    lines += [
        "",
        f"👥 <b>Нові користувачі цього місяця:</b> {new_users}",
    ]

    await message.answer("\n".join(lines), parse_mode="HTML")
    logger.info("Owner tg_id=%s requested /stats", message.from_user.id)
