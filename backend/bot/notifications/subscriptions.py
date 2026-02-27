"""
// filepath: backend/bot/notifications/subscriptions.py

Subscription payment reminder push notification.

Called by the daily APScheduler job in backend/core/scheduler.py
two days before the next scheduled delivery.

The job creates the Order and generates a LiqPay checkout URL,
then calls send_subscription_payment_reminder() to push the message.
"""
import logging

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from backend.bot.instance import bot
from backend.models.subscription import Subscription
from backend.models.user import User

logger = logging.getLogger(__name__)


def _payment_keyboard(checkout_url: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="💳 Оплатити доставку", url=checkout_url)
    builder.adjust(1)
    return builder.as_markup()


async def send_subscription_payment_reminder(
    user: User,
    subscription: Subscription,
    checkout_url: str,
) -> bool:
    """
    Send a payment reminder for an upcoming subscription delivery.

    Args:
        user:         User model (must have tg_id).
        subscription: Subscription being renewed.
        checkout_url: LiqPay checkout URL for the auto-created order.

    Returns:
        True on success, False on failure.
    """
    freq_ua = "щотижня" if subscription.frequency == "weekly" else "раз на 2 тижні"

    if subscription.product_id:
        what = "ваш букет за підпискою"
    else:
        size_names = {"S": "маленький", "M": "середній", "L": "великий"}
        size = size_names.get(subscription.bouquet_size or "M", "")
        what = f"{size} букет за підпискою"

    delivery_str = subscription.next_delivery.strftime("%-d.%m")

    text = (
        f"🌸 <b>Час оплатити наступну доставку!</b>\n\n"
        f"Ваша підписка <b>{freq_ua}</b> — наступна доставка <b>{delivery_str}</b>.\n\n"
        f"Оплатіть зараз, щоб флорист встиг зібрати {what} вчасно 🌷"
    )

    keyboard = _payment_keyboard(checkout_url)

    try:
        await bot.send_message(
            chat_id=user.tg_id,
            text=text,
            parse_mode="HTML",
            reply_markup=keyboard,
        )
        logger.info(
            "Subscription payment reminder sent to tg_id=%s sub_id=%s",
            user.tg_id,
            subscription.id,
        )
        return True
    except Exception as exc:
        logger.warning(
            "Failed to send subscription reminder to tg_id=%s: %s",
            user.tg_id,
            exc,
        )
        return False
