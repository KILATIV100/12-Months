"""Telegram notification service.

Sends status-change messages to users via the bot.
All functions are fire-and-forget: errors are logged, never raised,
so a notification failure never breaks the business transaction.

Usage:
    from backend.bot.services.notifications import notify_order_paid
    await notify_order_paid(order)
"""
import logging
from decimal import Decimal

from backend.bot.instance import bot
from backend.models.order import Order

logger = logging.getLogger(__name__)

# Short order ID shown in messages — last 6 hex chars of UUID
def _short_id(order: Order) -> str:
    return str(order.id).replace("-", "").upper()[-6:]


def _fmt_price(amount: Decimal | float) -> str:
    return f"{int(round(float(amount)))} ₴"


async def _send(tg_id: int, text: str) -> None:
    """Fire-and-forget bot.send_message wrapper."""
    try:
        await bot.send_message(
            chat_id=tg_id,
            text=text,
            parse_mode="HTML",
        )
    except Exception as exc:
        logger.error("Notification failed for tg_id=%d: %s", tg_id, exc)


# ── Public notification functions ──────────────────────────────────────────────

async def notify_order_created(order: Order) -> None:
    """Called right after order is persisted in the DB."""
    tg_id: int = order.user.tg_id
    text = (
        f"🌸 <b>Замовлення оформлено!</b>\n\n"
        f"Номер: <code>#{_short_id(order)}</code>\n"
        f"Сума: <b>{_fmt_price(order.total_price)}</b>\n\n"
        f"Очікуємо підтвердження оплати…"
    )
    await _send(tg_id, text)


async def notify_order_paid(order: Order) -> None:
    """Called when LiqPay/Monobank confirms successful payment."""
    tg_id: int = order.user.tg_id
    delivery_line = (
        f"📍 Доставка: {order.address}"
        if order.delivery_type == "delivery" and order.address
        else "📍 Самовивіз"
    )
    slot_line = (
        f"\n🕐 Час: {order.delivery_time_slot}" if order.delivery_time_slot else ""
    )
    text = (
        f"✅ <b>Замовлення #{_short_id(order)} успішно оплачено!</b>\n\n"
        f"Сума: <b>{_fmt_price(order.total_price)}</b>\n"
        f"{delivery_line}{slot_line}\n\n"
        f"Флорист вже приступає до роботи 🌿"
    )
    await _send(tg_id, text)


async def notify_order_in_work(order: Order) -> None:
    """Called when the florist starts working on the order."""
    tg_id: int = order.user.tg_id
    text = (
        f"🎨 <b>Флорист розпочав роботу!</b>\n\n"
        f"Замовлення <code>#{_short_id(order)}</code> вже у процесі.\n"
        f"Ми повідомимо вас, коли букет буде готовий 🌹"
    )
    await _send(tg_id, text)


async def notify_order_ready(order: Order) -> None:
    """Called when the bouquet is ready for pickup/delivery."""
    tg_id: int = order.user.tg_id
    if order.delivery_type == "pickup":
        action = "Ви можете забрати його у нас 📍"
    else:
        slot = f" ({order.delivery_time_slot})" if order.delivery_time_slot else ""
        action = f"Кур'єр вже в дорозі{slot} 🚗"

    text = (
        f"📦 <b>Ваш букет готовий!</b>\n\n"
        f"Замовлення <code>#{_short_id(order)}</code>\n"
        f"{action}"
    )
    await _send(tg_id, text)


async def notify_order_delivered(order: Order) -> None:
    """Called when the order is marked as delivered."""
    tg_id: int = order.user.tg_id
    text = (
        f"🎉 <b>Доставлено!</b>\n\n"
        f"Замовлення <code>#{_short_id(order)}</code> успішно вручено.\n\n"
        f"Дякуємо, що обираєте 12 Місяців 🌸\n"
        f"Будемо раді бачити вас знову!"
    )
    await _send(tg_id, text)


async def notify_order_cancelled(order: Order, reason: str | None = None) -> None:
    """Called when an order is cancelled."""
    tg_id: int = order.user.tg_id
    reason_line = f"\nПричина: {reason}" if reason else ""
    text = (
        f"❌ <b>Замовлення #{_short_id(order)} скасовано.</b>{reason_line}\n\n"
        f"Якщо у вас є питання — напишіть нам."
    )
    await _send(tg_id, text)


# ── Generic dispatcher — for admin status-change panel (Sprint 5) ─────────────

async def notify_status_change(order: Order, new_status: str) -> None:
    """Route to the correct notification based on the new status string."""
    handlers = {
        "in_work":   notify_order_in_work,
        "ready":     notify_order_ready,
        "delivered": notify_order_delivered,
        "cancelled": notify_order_cancelled,
    }
    handler = handlers.get(new_status)
    if handler:
        await handler(order)
