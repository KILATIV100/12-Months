"""User-facing handlers: /start onboarding, /order, /status, /history.

Onboarding FSM flow:
  /start
    └─ (new user)  → show 3 action buttons
    └─ (returning) → show main menu with TWA button

  User clicks action button
    └─ ask "Для кого букет?" (5 options)
    └─ OnboardingStates.waiting_for_occasion

  User selects occasion
    └─ save to user.onboard_answer
    └─ show TWA button
"""
import logging

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.bot.keyboards.inline import (
    MenuCallback,
    OccasionCallback,
    OrderRepeatCallback,
    StartCallback,
    get_history_keyboard,
    get_occasion_keyboard,
    get_start_keyboard,
    get_twa_keyboard,
)
from backend.bot.states.onboarding import OnboardingStates
from backend.models.order import Order
from backend.models.user import User

logger = logging.getLogger(__name__)
router = Router(name="user_start")

# Human-readable labels for occasion answers
OCCASION_LABELS: dict[str, str] = {
    "partner": "Коханій 💕",
    "mom": "Мамі 👩",
    "birthday": "на День народження 🎂",
    "office": "в Офіс 🏢",
    "just_because": "Просто так 🌸",
}

# Order status display
ORDER_STATUS_LABELS: dict[str, str] = {
    "new": "🆕 Прийнято",
    "in_work": "🔄 Флорист збирає",
    "ready": "✅ Готово до видачі",
    "delivered": "🎉 Доставлено",
    "cancelled": "❌ Скасовано",
}

ORDER_STATUS_EMOJI: dict[str, str] = {
    "new": "🆕", "in_work": "🔄", "ready": "✅",
    "delivered": "🎉", "cancelled": "❌",
}


# ══════════════════════════════════════════════════════════════
#  /start command
# ══════════════════════════════════════════════════════════════

@router.message(Command("start"))
async def cmd_start(
    message: Message,
    state: FSMContext,
    user: User,
) -> None:
    """Entry point. Clears any active FSM state and shows the main screen."""
    await state.clear()

    if user.onboard_answer:
        # Returning user — show main menu immediately
        label = OCCASION_LABELS.get(user.onboard_answer, "")
        await message.answer(
            f"З поверненням, <b>{user.name or 'друже'}</b>! 🌿\n\n"
            f"Ви обирали квіти <i>{label}</i>.\n"
            "Що підберемо сьогодні?",
            reply_markup=get_twa_keyboard(),
        )
    else:
        # New user — start onboarding
        await message.answer(
            "Вітаємо у <b>12 Months</b> 🌿\n"
            "<i>Преміальна доставка квітів у Telegram</i>\n\n"
            "Що вас цікавить сьогодні?",
            reply_markup=get_start_keyboard(),
        )


# ══════════════════════════════════════════════════════════════
#  Onboarding step 1 → show "Для кого?" question
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    StartCallback.filter(F.action.in_(["catalog", "constructor", "dates"]))
)
async def on_start_action(
    callback: CallbackQuery,
    state: FSMContext,
    callback_data: StartCallback,
) -> None:
    """User clicked one of the 3 main action buttons."""
    await callback.answer()

    # Store which action they clicked (to personalize catalog later)
    await state.update_data(start_action=callback_data.action)
    await state.set_state(OnboardingStates.waiting_for_occasion)

    await callback.message.edit_text(  # type: ignore[union-attr]
        "Для кого обираємо квіти? 🌸\n\n"
        "<i>Це допоможе нам підібрати найкращі варіанти</i>",
        reply_markup=get_occasion_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#  Onboarding step 2 → save occasion → show TWA
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    OccasionCallback.filter(),
    StateFilter(OnboardingStates.waiting_for_occasion),
)
async def on_occasion_selected(
    callback: CallbackQuery,
    callback_data: OccasionCallback,
    state: FSMContext,
    user: User,
    session: AsyncSession,
) -> None:
    """Save the occasion answer and transition to the main menu."""
    await callback.answer("Чудово! 🌸")

    # Persist to DB
    user.onboard_answer = callback_data.answer
    await session.commit()

    await state.clear()

    label = OCCASION_LABELS.get(callback_data.answer, "")
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"Чудово! Підберемо щось особливе <b>{label}</b> 🌿\n\n"
        "Натисніть кнопку нижче, щоб переглянути наш каталог 👇",
        reply_markup=get_twa_keyboard(),
    )
    logger.info(
        "User tg_id=%s onboarded with occasion=%s",
        user.tg_id,
        callback_data.answer,
    )


# ══════════════════════════════════════════════════════════════
#  Invalid input during onboarding
# ══════════════════════════════════════════════════════════════

@router.message(StateFilter(OnboardingStates.waiting_for_occasion))
async def on_occasion_wrong_input(message: Message) -> None:
    await message.answer(
        "Будь ласка, оберіть варіант нижче 👇\n"
        "<i>(натисніть одну з кнопок)</i>",
    )


# ══════════════════════════════════════════════════════════════
#  Menu callbacks — placeholder for future sprints
# ══════════════════════════════════════════════════════════════

@router.callback_query(MenuCallback.filter())
async def on_menu_action(
    callback: CallbackQuery,
    callback_data: MenuCallback,
) -> None:
    await callback.answer()
    action_names = {
        "dates": "📅 Календар важливих дат",
        "orders": "📦 Мої замовлення",
        "profile": "👤 Профіль",
        "subscribe": "🌸 Підписки",
    }
    name = action_names.get(callback_data.action, callback_data.action)
    await callback.message.answer(  # type: ignore[union-attr]
        f"{name} — буде доступно у наступному оновленні 🔜"
    )


# ══════════════════════════════════════════════════════════════
#  Global cancel handler (works in any FSM state)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "fsm:cancel")
async def on_fsm_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.answer("Скасовано")
    await callback.message.edit_text("❌ Дію скасовано.")  # type: ignore[union-attr]


# ══════════════════════════════════════════════════════════════
#  /order — quick open TWA
# ══════════════════════════════════════════════════════════════

@router.message(Command("order"))
async def cmd_order(message: Message, state: FSMContext) -> None:
    """Immediately open the TWA catalog."""
    await state.clear()
    await message.answer(
        "🌸 Відкрийте магазин і оберіть свій букет:",
        reply_markup=get_twa_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#  /status — current order status
# ══════════════════════════════════════════════════════════════

@router.message(Command("status"))
async def cmd_status(
    message: Message,
    user: User,
    session: AsyncSession,
) -> None:
    """Show status of the most recent order."""
    stmt = (
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    order = result.scalar_one_or_none()

    if not order:
        await message.answer(
            "У вас ще немає замовлень.\n"
            "Зробіть перше! 🌸",
            reply_markup=get_twa_keyboard(),
        )
        return

    delivery_label = (
        "🚚 Доставка" if order.delivery_type == "delivery" else "📍 Самовивіз"
    )
    status_label = ORDER_STATUS_LABELS.get(order.status, order.status)
    short_id = str(order.id)[:8]

    text = (
        f"📦 <b>Замовлення #{short_id}</b>\n\n"
        f"Статус:  {status_label}\n"
        f"Тип:     {delivery_label}\n"
        f"Сума:    <b>{order.total_price} грн</b>\n"
        f"Дата:    {order.created_at.strftime('%d.%m.%Y %H:%M')}"
    )

    if order.recipient_name:
        text += f"\nОтримувач: {order.recipient_name}"

    await message.answer(text)


# ══════════════════════════════════════════════════════════════
#  /history — last 5 orders with "Repeat" buttons
# ══════════════════════════════════════════════════════════════

@router.message(Command("history"))
async def cmd_history(
    message: Message,
    user: User,
    session: AsyncSession,
) -> None:
    """Show the last 5 orders with repeat buttons."""
    stmt = (
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    result = await session.execute(stmt)
    orders = result.scalars().all()

    if not orders:
        await message.answer(
            "У вас ще немає замовлень 🌸\n"
            "Зробіть перше у нашому магазині!",
            reply_markup=get_twa_keyboard(),
        )
        return

    text = "📋 <b>Останні замовлення:</b>\n\n"
    for order in orders:
        emoji = ORDER_STATUS_EMOJI.get(order.status, "❓")
        short_id = str(order.id)[:8]
        date_str = order.created_at.strftime("%d.%m.%Y")
        text += (
            f"{emoji} <code>#{short_id}</code> — "
            f"<b>{order.total_price} грн</b> · {date_str}\n"
        )

    await message.answer(text, reply_markup=get_history_keyboard(list(orders)))


@router.callback_query(OrderRepeatCallback.filter())
async def on_order_repeat(
    callback: CallbackQuery,
    callback_data: OrderRepeatCallback,
) -> None:
    """Repeat order — opens TWA with cart pre-filled (Sprint 4+)."""
    await callback.answer()
    await callback.message.answer(  # type: ignore[union-attr]
        "🔄 Повторення замовлень буде доступне у наступному оновленні.\n"
        "Поки що відкрийте магазин і оберіть знову 🌸",
        reply_markup=get_twa_keyboard(),
    )
