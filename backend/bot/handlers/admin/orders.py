"""Admin order management handler.

Commands:
  /admin  — main admin menu with live order counts
  /orders — shortcut to new-orders list

Callbacks (AdminMenuCallback):
  new     — list orders with status "new"
  active  — list orders with status "in_work"
  ready   — list orders with status "ready"
  refresh — refresh the admin menu message

Callbacks (AdminOrderCallback):
  view      — show full order details
  in_work   — set status new → in_work
  ready     — set status in_work → ready
  delivered — set status ready → delivered (sets delivered_at)
  cancel    — set any status → cancelled
  back      — return to the status-filtered list

Status transitions:
  new → in_work → ready → delivered
  any → cancelled
"""
import logging
from datetime import datetime, timezone
from typing import Any

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.filters.callback_data import CallbackData
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.bot.filters.roles import IsAdmin
from backend.bot.services.notifications import notify_status_change
from backend.models.order import Order, OrderItem
from backend.models.user import User

logger = logging.getLogger(__name__)

router = Router(name="admin_orders")
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())


# ── CallbackData ───────────────────────────────────────────────────────────────

class AdminMenuCallback(CallbackData, prefix="adm_menu"):
    action: str  # new | active | ready | refresh


class AdminOrderCallback(CallbackData, prefix="adm_ord"):
    action: str        # view | in_work | ready | delivered | cancel | back
    order_id: str = ""
    back_to: str = "new"  # which list to return to on "back"


# ── Status helpers ─────────────────────────────────────────────────────────────

STATUS_LABELS = {
    "new":       "🆕 Нове",
    "in_work":   "🔄 В роботі",
    "ready":     "📦 Готово",
    "delivered": "✅ Доставлено",
    "cancelled": "❌ Скасовано",
}

# next allowed admin action per current status
STATUS_TRANSITIONS = {
    "new":     ("in_work",   "✅ Взяти в роботу"),
    "in_work": ("ready",     "📦 Готово до доставки"),
    "ready":   ("delivered", "🎉 Доставлено"),
}


def _short(order_id) -> str:
    return str(order_id).replace("-", "").upper()[-6:]


def _fmt_price(val) -> str:
    return f"{int(round(float(val)))} ₴"


# ── Keyboards ──────────────────────────────────────────────────────────────────

def _admin_menu_keyboard(counts: dict[str, int]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(
        text=f"📋 Нові ({counts.get('new', 0)})",
        callback_data=AdminMenuCallback(action="new").pack(),
    )
    b.button(
        text=f"🔄 В роботі ({counts.get('in_work', 0)})",
        callback_data=AdminMenuCallback(action="active").pack(),
    )
    b.button(
        text=f"📦 Готові ({counts.get('ready', 0)})",
        callback_data=AdminMenuCallback(action="ready").pack(),
    )
    b.button(
        text="🔃 Оновити",
        callback_data=AdminMenuCallback(action="refresh").pack(),
    )
    b.adjust(2, 2)
    return b.as_markup()


def _orders_list_keyboard(
    orders: list[Order],
    back_to: str,
) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for o in orders:
        label = f"#{_short(o.id)} · {o.recipient_name or '—'} · {_fmt_price(o.total_price)}"
        b.button(
            text=label[:60],
            callback_data=AdminOrderCallback(
                action="view",
                order_id=str(o.id),
                back_to=back_to,
            ).pack(),
        )
    b.button(
        text="◀️ Назад до меню",
        callback_data=AdminMenuCallback(action="refresh").pack(),
    )
    b.adjust(1)
    return b.as_markup()


def _order_detail_keyboard(order: Order, back_to: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    transition = STATUS_TRANSITIONS.get(order.status)
    if transition:
        next_status, label = transition
        b.button(
            text=label,
            callback_data=AdminOrderCallback(
                action=next_status,
                order_id=str(order.id),
                back_to=back_to,
            ).pack(),
        )
    if order.status not in ("delivered", "cancelled"):
        b.button(
            text="❌ Скасувати",
            callback_data=AdminOrderCallback(
                action="cancel",
                order_id=str(order.id),
                back_to=back_to,
            ).pack(),
        )
    b.button(
        text="◀️ Назад до списку",
        callback_data=AdminOrderCallback(
            action="back",
            order_id="",
            back_to=back_to,
        ).pack(),
    )
    b.adjust(1)
    return b.as_markup()


# ── Formatters ─────────────────────────────────────────────────────────────────

def _format_admin_menu(counts: dict[str, int]) -> str:
    total_active = counts.get("new", 0) + counts.get("in_work", 0) + counts.get("ready", 0)
    return (
        "🌿 <b>Адмін-панель 12 Місяців</b>\n\n"
        f"Активних замовлень: <b>{total_active}</b>\n"
        f"  🆕 Нових: {counts.get('new', 0)}\n"
        f"  🔄 В роботі: {counts.get('in_work', 0)}\n"
        f"  📦 Готових: {counts.get('ready', 0)}\n\n"
        "Оберіть розділ:"
    )


def _format_order_detail(order: Order) -> str:
    lines = [
        f"🧾 <b>Замовлення #{_short(order.id)}</b>",
        f"📦 Статус: {STATUS_LABELS.get(order.status, order.status)}",
        "",
    ]

    if order.user:
        name = order.user.name or "—"
        tg_id = order.user.tg_id
        lines.append(f"👤 Клієнт: {name} <code>(tg_id: {tg_id})</code>")

    if order.recipient_name:
        lines.append(f"📬 Отримувач: {order.recipient_name}")
    if order.recipient_phone:
        lines.append(f"📞 Телефон: {order.recipient_phone}")

    delivery_label = "🚗 Доставка" if order.delivery_type == "delivery" else "🏪 Самовивіз"
    lines.append(delivery_label)
    if order.address:
        lines.append(f"📍 Адреса: {order.address}")
    if order.delivery_time_slot:
        lines.append(f"🕐 Час: {order.delivery_time_slot}")
    if order.delivery_at:
        date_str = order.delivery_at.strftime("%d.%m.%Y")
        lines.append(f"📅 Дата: {date_str}")

    lines.append("")
    lines.append(f"💰 Сума: <b>{_fmt_price(order.total_price)}</b>")
    lines.append("")

    if order.items:
        lines.append("🛒 <b>Товари:</b>")
        for item in order.items:
            product_name = item.product.name if item.product else "Видалений товар"
            item_total = _fmt_price(float(item.price_at_order) * item.quantity)
            lines.append(f"  • {product_name} × {item.quantity} — {item_total}")

    if order.comment:
        lines.append("")
        lines.append(f"📝 <i>{order.comment}</i>")

    if order.paid_at:
        paid_str = order.paid_at.strftime("%d.%m %H:%M")
        lines.append(f"\n✅ Оплачено: {paid_str}")

    return "\n".join(lines)


# ── DB helpers ─────────────────────────────────────────────────────────────────

async def _count_by_status(session: AsyncSession) -> dict[str, int]:
    result = await session.execute(
        select(Order.status, func.count(Order.id))
        .where(Order.status.in_(["new", "in_work", "ready"]))
        .group_by(Order.status)
    )
    return {row[0]: row[1] for row in result.all()}


async def _get_orders_by_status(
    session: AsyncSession,
    status: str,
    limit: int = 10,
) -> list[Order]:
    result = await session.execute(
        select(Order)
        .where(Order.status == status)
        .options(selectinload(Order.user))
        .order_by(Order.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def _get_order_full(session: AsyncSession, order_id: str) -> Order | None:
    result = await session.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
    )
    return result.scalar_one_or_none()


# ── /admin command ─────────────────────────────────────────────────────────────

@router.message(Command("admin"))
async def cmd_admin(
    message: Message,
    session: AsyncSession,
    user: User,
) -> None:
    """Show the main admin panel with live order counts."""
    counts = await _count_by_status(session)
    await message.answer(
        _format_admin_menu(counts),
        parse_mode="HTML",
        reply_markup=_admin_menu_keyboard(counts),
    )


# ── /orders command (shortcut) ─────────────────────────────────────────────────

@router.message(Command("orders"))
async def cmd_orders(
    message: Message,
    session: AsyncSession,
    user: User,
) -> None:
    """Shortcut: show new orders list."""
    orders = await _get_orders_by_status(session, "new")
    if not orders:
        await message.answer("📭 Нових замовлень немає.")
        return
    await message.answer(
        f"📋 <b>Нові замовлення</b> ({len(orders)}):",
        parse_mode="HTML",
        reply_markup=_orders_list_keyboard(orders, back_to="new"),
    )


# ── Admin menu callbacks ───────────────────────────────────────────────────────

@router.callback_query(AdminMenuCallback.filter())
async def on_admin_menu(
    callback: CallbackQuery,
    callback_data: AdminMenuCallback,
    session: AsyncSession,
    **kwargs: Any,
) -> None:
    action = callback_data.action

    if action == "refresh":
        counts = await _count_by_status(session)
        await callback.message.edit_text(
            _format_admin_menu(counts),
            parse_mode="HTML",
            reply_markup=_admin_menu_keyboard(counts),
        )
        await callback.answer("Оновлено")
        return

    status_map = {"new": "new", "active": "in_work", "ready": "ready"}
    label_map = {
        "new":    "Нові замовлення",
        "active": "В роботі",
        "ready":  "Готові до доставки",
    }
    status = status_map.get(action, "new")
    orders = await _get_orders_by_status(session, status)

    if not orders:
        await callback.message.edit_text(
            f"📭 Замовлень зі статусом «{label_map.get(action)}» немає.",
            reply_markup=_orders_list_keyboard([], back_to=action),
        )
        await callback.answer()
        return

    await callback.message.edit_text(
        f"<b>{label_map.get(action)}</b> ({len(orders)}):",
        parse_mode="HTML",
        reply_markup=_orders_list_keyboard(orders, back_to=action),
    )
    await callback.answer()


# ── Order view callback ────────────────────────────────────────────────────────

@router.callback_query(AdminOrderCallback.filter(F.action == "view"))
async def on_order_view(
    callback: CallbackQuery,
    callback_data: AdminOrderCallback,
    session: AsyncSession,
    **kwargs: Any,
) -> None:
    order = await _get_order_full(session, callback_data.order_id)
    if order is None:
        await callback.answer("Замовлення не знайдено.")
        return

    await callback.message.edit_text(
        _format_order_detail(order),
        parse_mode="HTML",
        reply_markup=_order_detail_keyboard(order, back_to=callback_data.back_to),
    )
    await callback.answer()


# ── Status-change callbacks ────────────────────────────────────────────────────

@router.callback_query(
    AdminOrderCallback.filter(F.action.in_({"in_work", "ready", "delivered", "cancel"}))
)
async def on_order_status_change(
    callback: CallbackQuery,
    callback_data: AdminOrderCallback,
    session: AsyncSession,
    **kwargs: Any,
) -> None:
    action = callback_data.action
    new_status = "cancelled" if action == "cancel" else action

    order = await _get_order_full(session, callback_data.order_id)
    if order is None:
        await callback.answer("Замовлення не знайдено.")
        return

    # Guard: check the transition is still valid
    allowed_from = {
        "in_work":   {"new"},
        "ready":     {"in_work"},
        "delivered": {"ready"},
        "cancelled": {"new", "in_work", "ready"},
    }
    if order.status not in allowed_from.get(new_status, set()):
        await callback.answer(
            f"Статус вже змінено: {STATUS_LABELS.get(order.status)}",
            show_alert=True,
        )
        return

    # Apply the change
    order.status = new_status
    if new_status == "delivered":
        order.delivered_at = datetime.now(tz=timezone.utc)

    await session.commit()

    logger.info(
        "Admin set order %s → %s",
        _short(order.id),
        new_status,
    )

    # Reload relationships after commit for notification
    order = await _get_order_full(session, callback_data.order_id)
    await notify_status_change(order, new_status)

    # Refresh the message
    status_emoji = {
        "in_work":   "🔄",
        "ready":     "📦",
        "delivered": "✅",
        "cancelled": "❌",
    }.get(new_status, "✔️")
    await callback.answer(
        f"{status_emoji} Статус змінено: {STATUS_LABELS.get(new_status)}",
        show_alert=False,
    )
    await callback.message.edit_text(
        _format_order_detail(order),
        parse_mode="HTML",
        reply_markup=_order_detail_keyboard(order, back_to=callback_data.back_to),
    )


# ── Back to list callback ──────────────────────────────────────────────────────

@router.callback_query(AdminOrderCallback.filter(F.action == "back"))
async def on_order_back(
    callback: CallbackQuery,
    callback_data: AdminOrderCallback,
    session: AsyncSession,
    **kwargs: Any,
) -> None:
    status_map = {"new": "new", "active": "in_work", "ready": "ready"}
    label_map  = {"new": "Нові", "active": "В роботі", "ready": "Готові"}
    status = status_map.get(callback_data.back_to, "new")

    orders = await _get_orders_by_status(session, status)
    label = label_map.get(callback_data.back_to, "Замовлення")

    await callback.message.edit_text(
        f"<b>{label} замовлення</b> ({len(orders)}):",
        parse_mode="HTML",
        reply_markup=_orders_list_keyboard(orders, back_to=callback_data.back_to),
    )
    await callback.answer()
