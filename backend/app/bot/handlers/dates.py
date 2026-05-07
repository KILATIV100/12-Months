"""TZ §05 /dates — manage important dates."""
from __future__ import annotations

from datetime import date

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy import select

from app.bot.access import get_or_create_user
from app.bot.states import AddDate
from app.db import async_session
from app.models import ImportantDate

router = Router(name="dates")


def _list_keyboard(items: list[ImportantDate]) -> InlineKeyboardMarkup:
    rows = [[InlineKeyboardButton(text=f"🗑 {d.label} · {d.date:%d.%m}", callback_data=f"dt:del:{d.id}")] for d in items]
    rows.append([InlineKeyboardButton(text="➕ Додати дату", callback_data="dt:add")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@router.message(Command("dates"))
async def cmd_dates(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
        items = (await session.scalars(
            select(ImportantDate).where(ImportantDate.user_id == user.id, ImportantDate.is_active.is_(True))
        )).all()
    if not items:
        await message.answer(
            "Поки немає важливих дат. Додайте першу — і я нагадаю за 3 дні та за 1 день до події.",
            reply_markup=_list_keyboard([]),
        )
        return
    await message.answer("Ваші важливі дати:", reply_markup=_list_keyboard(items))


@router.callback_query(F.data == "dt:add")
async def on_add_start(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AddDate.label)
    await cb.message.answer("Назва події (напр. День мами, Річниця):")
    await cb.answer()


@router.message(AddDate.label)
async def on_label(message: Message, state: FSMContext) -> None:
    await state.update_data(label=message.text.strip()[:100])
    await state.set_state(AddDate.person)
    await message.answer("Кого вітаємо? (ім'я або «—»)")


@router.message(AddDate.person)
async def on_person(message: Message, state: FSMContext) -> None:
    person = message.text.strip()[:100]
    await state.update_data(person=None if person in {"-", "—", "пропустити"} else person)
    await state.set_state(AddDate.date)
    await message.answer("Дата у форматі ДД.ММ.РРРР (напр. 08.05.2026):")


@router.message(AddDate.date)
async def on_date(message: Message, state: FSMContext) -> None:
    try:
        d = date(*reversed([int(x) for x in message.text.strip().split(".")]))
    except (ValueError, TypeError):
        await message.answer("Не зрозумів формат. Спробуйте ДД.ММ.РРРР, наприклад 08.05.2026.")
        return
    await state.update_data(date=d.isoformat())
    await state.set_state(AddDate.reminder_days)
    await message.answer(
        "За скільки днів нагадати? Напишіть числа через пробіл (напр. «3 1»). "
        "Стандартно — за 3 дні та за 1 день."
    )


@router.message(AddDate.reminder_days)
async def on_reminder(message: Message, state: FSMContext) -> None:
    raw = message.text.strip()
    try:
        days = [int(x) for x in raw.split()] if raw else [3, 1]
    except ValueError:
        days = [3, 1]
    data = await state.get_data()
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        item = ImportantDate(
            user_id=user.id,
            label=data["label"],
            person_name=data.get("person"),
            date=date.fromisoformat(data["date"]),
            reminder_days=days,
            repeat_yearly=True,
        )
        session.add(item)
        await session.commit()
    await state.clear()
    await message.answer(f"Додано! Нагадаю за {', '.join(str(d) for d in days)} днів. /dates — щоб переглянути всі.")


@router.callback_query(F.data.startswith("dt:del:"))
async def on_delete(cb: CallbackQuery) -> None:
    item_id = cb.data.split(":", 2)[2]
    async with async_session() as session:
        item = await session.get(ImportantDate, item_id)
        if item:
            item.is_active = False
            await session.commit()
    await cb.answer("Дату видалено")
    await cmd_dates(cb.message)
