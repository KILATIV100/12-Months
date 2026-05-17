"""TZ §05 /start — onboarding."""
from __future__ import annotations

from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from app.bot.access import get_or_create_user, is_admin
from app.bot.keyboards import main_reply_kb, occasion_keyboard, onboarding_main, open_twa
from app.config import settings
from app.db import async_session
from app.models import UserRole

router = Router(name="start")


WELCOME = (
    "Вітаємо у 12 Months 🌿\n"
    "Ми робимо букети, які пам'ятають дати. Оберіть, з чого почати:"
)


async def _auto_promote_owner(session, user) -> None:
    """First time the configured OWNER_TG_ID writes /start, promote them."""
    if user.tg_id == settings.owner_tg_id and user.role != UserRole.owner:
        user.role = UserRole.owner


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await _auto_promote_owner(session, user)
        await session.commit()
    # First send the persistent keyboard so it sticks below the input field,
    # then the welcome inline keyboard with the main onboarding choices.
    await message.answer("Кнопки внизу екрана — щоб не шукати команди 👇", reply_markup=main_reply_kb(is_admin=is_admin(user)))
    await message.answer(WELCOME, reply_markup=onboarding_main())


# ── Reply-keyboard taps (text equals the button label) ──

@router.message(F.text == "💐 Замовити")
async def kb_order(message: Message) -> None:
    await message.answer("Обирайте букет у каталозі:", reply_markup=open_twa("Каталог", "catalog"))


@router.message(F.text == "📅 Мої дати")
async def kb_dates(message: Message) -> None:
    # Lazy import — avoids circular dependency at module load.
    from app.bot.handlers.dates import cmd_dates
    await cmd_dates(message)


@router.message(F.text == "🧾 Історія")
async def kb_history(message: Message) -> None:
    from app.bot.handlers.quick import cmd_history
    await cmd_history(message)


@router.message(F.text == "🔁 Абонемент")
async def kb_subscribe(message: Message) -> None:
    from app.bot.handlers.subscribe import cmd_subscribe
    await cmd_subscribe(message)


@router.message(F.text == "⚙️ Адмін")
async def kb_admin(message: Message) -> None:
    from app.bot.handlers.admin import cmd_admin
    await cmd_admin(message)


@router.message(F.text == "📋 Замовлення")
async def kb_orders(message: Message) -> None:
    from app.bot.handlers.admin import cmd_orders
    await cmd_orders(message)


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
