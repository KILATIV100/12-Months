"""NPS survey job — runs every 15 minutes via APScheduler.

Finds all orders that:
  - status == "delivered"
  - nps_sent == False
  - delivered_at <= now() - 2 hours  (only after cooling-off period)

For each eligible order, sends the user a Telegram message with
1–5 star inline buttons and marks nps_sent = True.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.bot.instance import bot
from backend.bot.keyboards.inline import NpsCallback
from backend.core.database import AsyncSessionLocal
from backend.models.order import Order

logger = logging.getLogger(__name__)

NPS_COOLOFF_HOURS = 2


def _nps_keyboard(order_id: str):
    """Build 1–5 star inline keyboard for NPS rating."""
    from aiogram.utils.keyboard import InlineKeyboardBuilder

    builder = InlineKeyboardBuilder()
    stars = ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"]
    for score, label in enumerate(stars, start=1):
        builder.button(
            text=label,
            callback_data=NpsCallback(score=score, order_id=order_id).pack(),
        )
    builder.adjust(5)
    return builder.as_markup()


def _short(order_id) -> str:
    return str(order_id).replace("-", "").upper()[-6:]


async def send_nps_surveys() -> None:
    """Scheduled job: send NPS messages to eligible delivered orders."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=NPS_COOLOFF_HOURS)

    async with AsyncSessionLocal() as session:
        stmt = (
            select(Order)
            .where(
                Order.status == "delivered",
                Order.nps_sent.is_(False),
                Order.delivered_at.isnot(None),
                Order.delivered_at <= cutoff,
            )
            .options(selectinload(Order.user))
            .limit(50)  # cap per run to avoid rate-limit bursts
        )
        result = await session.execute(stmt)
        orders = list(result.scalars().all())

    if not orders:
        logger.debug("NPS job: no eligible orders found")
        return

    logger.info("NPS job: sending surveys to %d orders", len(orders))

    sent_ids: list = []
    for order in orders:
        if not order.user:
            continue
        try:
            await bot.send_message(
                chat_id=order.user.tg_id,
                text=(
                    f"🌸 <b>Як вам наш букет?</b>\n\n"
                    f"Замовлення <code>#{_short(order.id)}</code> доставлено.\n"
                    f"Ваша оцінка допомагає нам ставати кращими 💚\n\n"
                    f"Оцініть якість від 1 до 5:"
                ),
                parse_mode="HTML",
                reply_markup=_nps_keyboard(str(order.id)),
            )
            sent_ids.append(order.id)
        except Exception as exc:
            logger.error("NPS: failed to message tg_id=%d: %s", order.user.tg_id, exc)

    if not sent_ids:
        return

    # Mark as sent in a single UPDATE
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Order).where(Order.id.in_(sent_ids))
        )
        for order in result.scalars().all():
            order.nps_sent = True
        await session.commit()

    logger.info("NPS job: marked %d orders as nps_sent=True", len(sent_ids))
