"""
// filepath: backend/bot/handlers/subscribe.py

Bot handler for the /subscribe command.

Shows the user's active subscription status (or "no subscriptions") and
provides inline buttons to open the TWA subscription management page.
"""
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from backend.core.config import settings

router = Router(name="subscribe")


def _subscribe_keyboard() -> InlineKeyboardMarkup:
    """Inline keyboard with a single button that opens the TWA /subscribe page."""
    url = f"{settings.webhook_host.rstrip('/')}/subscribe"
    builder = InlineKeyboardBuilder()
    builder.button(
        text="🌸 Управляти підпискою",
        web_app=WebAppInfo(url=url),
    )
    builder.adjust(1)
    return builder.as_markup()


@router.message(Command("subscribe"))
async def cmd_subscribe(message: Message) -> None:
    """
    /subscribe — Show subscription info and open the TWA management page.
    """
    text = (
        "🌸 <b>Квіткова підписка</b>\n\n"
        "Отримуйте свіжі букети автоматично — щотижня або раз на два тижні.\n\n"
        "🎁 <b>Варіанти підписки:</b>\n"
        "  • <b>S</b> — маленький букет від <b>599 грн</b>\n"
        "  • <b>M</b> — середній букет від <b>799 грн</b>\n"
        "  • <b>L</b> — великий букет від <b>1 099 грн</b>\n\n"
        "🔔 <b>Як це працює:</b>\n"
        "  • Ви обираєте частоту та розмір\n"
        "  • За 2 дні до доставки — надсилаємо посилання на оплату\n"
        "  • Після оплати флорист збирає ваш букет\n"
        "  • Можна поставити на паузу або скасувати в будь-який момент\n\n"
        "Натисніть кнопку нижче, щоб керувати підпискою 👇"
    )

    await message.answer(
        text=text,
        parse_mode="HTML",
        reply_markup=_subscribe_keyboard(),
    )
