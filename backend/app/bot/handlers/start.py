"""TZ §05 /start — onboarding."""
from __future__ import annotations

from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from app.bot.access import get_or_create_user
from app.bot.keyboards import occasion_keyboard, onboarding_main, open_twa
from app.db import async_session

router = Router(name="start")


WELCOME = (
    "Вітаємо у 12 Months 🌿\n"
    "Ми робимо букети, які пам'ятають дати. Оберіть, з чого почати:"
)


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    async with async_session() as session:
        await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
    await message.answer(WELCOME, reply_markup=onboarding_main())


@router.callback_query(F.data.startswith("ob:"))
async def on_onboarding(cb: CallbackQuery) -> None:
    choice = cb.data.split(":", 1)[1]
    if choice == "dates":
        await cb.message.answer(
            "Розкажіть, які дати важливі. Команда /dates — щоб додати, переглянути або видалити.",
            reply_markup=open_twa("Відкрити календар", "calendar"),
        )
    else:
        await cb.message.answer(
            "Для кого букет? Це допоможе персоналізувати добірку:",
            reply_markup=occasion_keyboard(),
        )
    await cb.answer()


@router.callback_query(F.data.startswith("oc:"))
async def on_occasion(cb: CallbackQuery) -> None:
    occasion = cb.data.split(":", 1)[1]
    async with async_session() as session:
        user = await get_or_create_user(session, cb.from_user.id, cb.from_user.full_name)
        user.onboard_answer = occasion
        await session.commit()
    await cb.message.answer(
        "Чудово. Зараз відкриємо застосунок — там можна свайпати картки, як у Tinder.",
        reply_markup=open_twa("Відкрити 12 Months ↗", "tinder"),
    )
    await cb.answer()
