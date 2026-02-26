"""NPS rating callback handler.

Handles NpsCallback — fired when a user taps one of the 1–5 star buttons
in the NPS survey message.

On tap:
  1. Load the order (verify it belongs to this user).
  2. Save nps_score if not already rated (idempotent guard).
  3. Edit the message — remove keyboard, show a thank-you note.
  4. Log the rating.
"""
import logging

from aiogram import Router
from aiogram.types import CallbackQuery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.bot.keyboards.inline import NpsCallback
from backend.models.order import Order
from backend.models.user import User

logger = logging.getLogger(__name__)

router = Router(name="nps")

SCORE_REACTIONS = {
    1: "😔 Жаль це чути. Ми обов'язково покращимось.",
    2: "😟 Дякуємо за відгук. Передамо флористу.",
    3: "🙂 Дякуємо! Будемо намагатися зробити краще.",
    4: "😊 Чудово! Дякуємо за довіру 🌿",
    5: "🤩 Ви зробили наш день! Дякуємо щиро 🌸",
}


@router.callback_query(NpsCallback.filter())
async def on_nps_rating(
    callback: CallbackQuery,
    callback_data: NpsCallback,
    session: AsyncSession,
    user: User,
) -> None:
    """Process a star rating tap from the NPS keyboard."""
    score: int = callback_data.score
    order_id: str = callback_data.order_id

    # Validate score range (1–5)
    if not 1 <= score <= 5:
        await callback.answer("Невірне значення оцінки.", show_alert=True)
        return

    # Load order — must belong to this user
    result = await session.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == user.id,
        )
    )
    order = result.scalar_one_or_none()

    if order is None:
        await callback.answer("Замовлення не знайдено.", show_alert=True)
        return

    # Idempotent: if already rated, just acknowledge
    if order.nps_score is not None:
        await callback.answer("Ви вже залишили оцінку 🌸", show_alert=False)
        # Remove keyboard silently
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        return

    # Save the score
    order.nps_score = score
    await session.commit()

    logger.info(
        "NPS: order=%s user_tg=%d score=%d",
        str(order.id)[-6:].upper(),
        user.tg_id,
        score,
    )

    # Edit message — remove buttons, show personalised thanks
    stars_display = "⭐" * score
    reaction = SCORE_REACTIONS.get(score, "Дякуємо!")
    thank_you = (
        f"{stars_display}\n\n"
        f"{reaction}\n\n"
        f"<i>12 Місяців чекає на вас знову 🌸</i>"
    )

    await callback.message.edit_text(
        thank_you,
        parse_mode="HTML",
        reply_markup=None,
    )
    await callback.answer()
