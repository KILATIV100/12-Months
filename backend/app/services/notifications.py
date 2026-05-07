"""Service notifications and reminders sent via the bot per TZ §05."""
from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal

from aiogram import Bot

log = logging.getLogger(__name__)


async def order_accepted(bot: Bot, tg_id: int, order_no: str, total: Decimal, when: datetime) -> None:
    text = (
        f"✨ Замовлення №{order_no} прийнято!\n"
        f"Сума: {total} грн\n"
        f"Доставка: {when:%d.%m %H:%M}"
    )
    await bot.send_message(tg_id, text)


async def order_in_work(bot: Bot, tg_id: int, order_no: str) -> None:
    await bot.send_message(tg_id, f"🌸 Замовлення №{order_no} — флорист почав збирати ваш букет.")


async def order_ready(bot: Bot, tg_id: int, order_no: str, is_delivery: bool) -> None:
    tail = "Кур'єр виїхав." if is_delivery else "Чекає на самовивіз."
    await bot.send_message(tg_id, f"✅ Букет №{order_no} готовий! {tail}")


async def nps_request(bot: Bot, tg_id: int, order_no: str) -> None:
    """Sent ~2h after delivery per TZ §05."""
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="⭐", callback_data=f"nps:{order_no}:1"),
             InlineKeyboardButton(text="⭐⭐", callback_data=f"nps:{order_no}:2"),
             InlineKeyboardButton(text="⭐⭐⭐", callback_data=f"nps:{order_no}:3"),
             InlineKeyboardButton(text="⭐⭐⭐⭐", callback_data=f"nps:{order_no}:4"),
             InlineKeyboardButton(text="⭐⭐⭐⭐⭐", callback_data=f"nps:{order_no}:5")],
        ]
    )
    await bot.send_message(tg_id, f"Як вам букет №{order_no}? Оцініть від 1 до 5 ⭐", reply_markup=kb)


async def date_reminder(bot: Bot, tg_id: int, days_left: int, event: str, person: str | None) -> None:
    """TZ §05 push: за 3 дні / за 1 день / у день події."""
    name = f" {person}" if person else ""
    if days_left >= 3:
        text = f"Через {days_left} дні {event}{name}. Ми вже підібрали добірку! Натисніть, щоб обрати."
    elif days_left == 1:
        text = f"⚡ Завтра {event}{name}! Є час замовити з доставкою сьогодні."
    else:
        text = f"🎉 Сьогодні {event}{name}! Не забудьте привітати 💐"
    await bot.send_message(tg_id, text)
