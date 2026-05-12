"""TZ §05: /order, /status, /history quick commands."""
from __future__ import annotations

import logging
import uuid

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select

from app.bot.access import get_or_create_user, is_admin
from app.bot.keyboards import open_twa
from app.db import async_session
from app.models import Order, OrderStatus

log = logging.getLogger(__name__)
router = Router(name="quick")


STATUS_LABEL = {
    OrderStatus.new: "Прийнято",
    OrderStatus.in_work: "В роботі",
    OrderStatus.ready: "Готово",
    OrderStatus.delivered: "Доставлено",
    OrderStatus.cancelled: "Скасовано",
}


@router.message(Command("order"))
async def cmd_order(message: Message) -> None:
    await message.answer("Обирайте букет у каталозі:", reply_markup=open_twa("Каталог", "catalog"))


@router.message(Command("status"))
async def cmd_status(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
        stmt = select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(1)
        order = await session.scalar(stmt)
    if not order:
        await message.answer("У вас ще немає замовлень. Команда /order — щоб почати.")
        return
    await message.answer(
        f"Замовлення #{str(order.id)[:8]}\n"
        f"Статус: <b>{STATUS_LABEL.get(order.status, str(order.status))}</b>\n"
        f"Сума: {order.total_price} грн",
        parse_mode="HTML",
    )


@router.message(Command("history"))
async def cmd_history(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
        stmt = select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(5)
        orders = (await session.scalars(stmt)).all()
    if not orders:
        await message.answer("Поки немає історії замовлень.")
        return
    lines = ["Останні замовлення:"]
    for o in orders:
        lines.append(
            f"• #{str(o.id)[:8]} · {o.total_price} грн · {STATUS_LABEL.get(o.status, str(o.status))}"
        )
    lines.append("\nЩоб повторити — /order")
    await message.answer("\n".join(lines))


# ── NPS callback: nps:<order_id>:<rating> ──

@router.callback_query(F.data.startswith("nps:"))
async def on_nps(cb: CallbackQuery) -> None:
    try:
        _, _order_id, rating = cb.data.split(":")
        rating_int = int(rating)
    except (ValueError, IndexError):
        await cb.answer()
        return
    log.info("NPS received: order=%s rating=%s tg=%s", _order_id, rating_int, cb.from_user.id)
    if rating_int >= 4:
        await cb.message.answer(f"Дякуємо за {rating_int} ⭐ Будемо раді бачити вас знову! 💐")
    else:
        await cb.message.answer(
            f"Дякуємо за чесну оцінку ({rating_int} ⭐). Напишіть, що можна покращити — нам важливо.")
    await cb.answer("Записано")


# ── Order status transitions: ord:<step>:<order_id> ──
# Buttons attached to the owner's new-order notification let them move the
# status forward without leaving the chat. Each transition pings the buyer.

_STATUS_FLOW = {
    "work": (OrderStatus.in_work, "🌸 Флорист почав збирати ваш букет", "▶️ Готово"),
    "ready": (OrderStatus.ready, "✅ Букет готовий! Кур'єр виїхав / чекає на самовивіз", "🚚 Доставлено"),
    "delivered": (OrderStatus.delivered, "🎉 Букет доставлено. Дякуємо!", None),
}
_NEXT_STEP = {"work": "ready", "ready": "delivered", "delivered": None}


@router.callback_query(F.data.startswith("ord:"))
async def on_order_action(cb: CallbackQuery) -> None:
    try:
        _, step, order_id_str = cb.data.split(":", 2)
        order_id = uuid.UUID(order_id_str)
    except (ValueError, IndexError):
        await cb.answer()
        return
    if step not in _STATUS_FLOW:
        await cb.answer()
        return

    async with async_session() as session:
        actor = await get_or_create_user(session, cb.from_user.id, cb.from_user.full_name)
        if not is_admin(actor):
            await cb.answer("Недостатньо прав", show_alert=True)
            return
        order = await session.get(Order, order_id)
        if order is None:
            await cb.answer("Замовлення не знайдено", show_alert=True)
            return
        new_status, buyer_msg, next_label = _STATUS_FLOW[step]
        order.status = new_status
        from app.models import User as UserModel
        buyer = await session.get(UserModel, order.user_id)
        buyer_tg_id = buyer.tg_id if buyer else None
        await session.commit()

    # Notify buyer.
    if buyer_tg_id and cb.bot:
        try:
            await cb.bot.send_message(buyer_tg_id, f"{buyer_msg}\nЗамовлення №{str(order_id)[:8].upper()}")
        except Exception:
            log.exception("Failed to notify buyer of order %s status change", order_id)

    # Update the owner's keyboard to show the next button (or remove it on terminal state).
    next_step = _NEXT_STEP[step]
    if next_step:
        from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
        next_status_label = _STATUS_FLOW[next_step][2] or "✓"
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text=next_status_label, callback_data=f"ord:{next_step}:{order_id}")
        ]])
        try:
            await cb.message.edit_reply_markup(reply_markup=kb)
        except Exception:
            pass
    else:
        try:
            await cb.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    await cb.answer(f"Статус: {new_status.value}")
