"""TZ §05: /order, /status, /history quick commands."""
from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select

from app.bot.access import get_or_create_user
from app.bot.keyboards import open_twa
from app.db import async_session
from app.models import Order, OrderStatus

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
