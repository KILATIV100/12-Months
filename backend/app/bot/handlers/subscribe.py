"""TZ §05 /subscribe — flower subscription management."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

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
from app.bot.states import Subscribe
from app.db import async_session
from app.models import Subscription, SubscriptionFrequency

router = Router(name="subscribe")


def _menu(active: Subscription | None) -> InlineKeyboardMarkup:
    if active is None:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="🗓 Щотижня", callback_data="sub:freq:weekly"),
                 InlineKeyboardButton(text="🗓 Раз на 2 тижні", callback_data="sub:freq:biweekly")],
            ]
        )
    rows = [
        [InlineKeyboardButton(text="⏸ Пауза 30 днів", callback_data="sub:pause")],
        [InlineKeyboardButton(text="✏️ Змінити частоту", callback_data="sub:edit")],
        [InlineKeyboardButton(text="❌ Скасувати", callback_data="sub:cancel")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


@router.message(Command("subscribe"))
async def cmd_subscribe(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
        sub = await session.scalar(
            select(Subscription).where(Subscription.user_id == user.id, Subscription.is_active.is_(True))
        )
    if sub is None:
        await message.answer(
            "Квітковий абонемент: букет щотижня або раз на 2 тижні. Оберіть частоту:",
            reply_markup=_menu(None),
        )
    else:
        freq = "Щотижня" if sub.frequency == SubscriptionFrequency.weekly else "Раз на 2 тижні"
        paused = f"\nНа паузі до {sub.paused_until:%d.%m}" if sub.paused_until else ""
        await message.answer(
            f"Активна підписка: <b>{freq}</b>\nНаступна доставка: {sub.next_delivery:%d.%m}{paused}",
            reply_markup=_menu(sub),
            parse_mode="HTML",
        )


@router.callback_query(F.data.startswith("sub:freq:"))
async def on_freq(cb: CallbackQuery, state: FSMContext) -> None:
    freq = cb.data.split(":")[2]
    await state.update_data(frequency=freq)
    await state.set_state(Subscribe.address)
    await cb.message.answer("Адреса доставки:")
    await cb.answer()


@router.message(Subscribe.address)
async def on_address(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    freq = SubscriptionFrequency(data["frequency"])
    delta = 7 if freq == SubscriptionFrequency.weekly else 14
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        sub = Subscription(
            user_id=user.id,
            frequency=freq,
            price=Decimal("850.00"),
            next_delivery=date.today() + timedelta(days=delta),
            address=message.text.strip(),
            is_active=True,
        )
        session.add(sub)
        await session.commit()
    await state.clear()
    await message.answer(f"Абонемент активовано! Наступна доставка через {delta} днів.")


@router.callback_query(F.data == "sub:pause")
async def on_pause(cb: CallbackQuery) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, cb.from_user.id, cb.from_user.full_name)
        sub = await session.scalar(
            select(Subscription).where(Subscription.user_id == user.id, Subscription.is_active.is_(True))
        )
        if sub:
            sub.paused_until = date.today() + timedelta(days=30)
            await session.commit()
    await cb.message.answer("Підписку поставлено на паузу на 30 днів.")
    await cb.answer()


@router.callback_query(F.data == "sub:cancel")
async def on_cancel(cb: CallbackQuery) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, cb.from_user.id, cb.from_user.full_name)
        sub = await session.scalar(
            select(Subscription).where(Subscription.user_id == user.id, Subscription.is_active.is_(True))
        )
        if sub:
            sub.is_active = False
            await session.commit()
    await cb.message.answer("Підписку скасовано. Можете оформити нову командою /subscribe.")
    await cb.answer()
