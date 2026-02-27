"""
// filepath: backend/bot/handlers/dates.py

Bot handler for the /dates command.

Sends a beautiful message with a WebApp button that opens the
Calendar page in the TWA.
"""
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from backend.core.config import settings

router = Router(name="dates")


def _calendar_keyboard() -> InlineKeyboardMarkup:
    """Inline keyboard with a single button that opens the TWA /calendar page."""
    calendar_url = f"{settings.webhook_host.rstrip('/')}/calendar"
    builder = InlineKeyboardBuilder()
    builder.button(
        text="📅 Відкрити Мій Календар",
        web_app=WebAppInfo(url=calendar_url),
    )
    builder.adjust(1)
    return builder.as_markup()


@router.message(Command("dates"))
async def cmd_dates(message: Message) -> None:
    """
    /dates — Show the user's important dates summary and open the TWA calendar.
    """
    text = (
        "📅 <b>Мій Календар важливих дат</b>\n\n"
        "Ніколи не забудь про важливі моменти — ні про <b>День народження</b> коханої, "
        "ні про <b>Річницю</b>, ні про <b>8 Березня</b>.\n\n"
        "🔔 <b>Як це працює:</b>\n"
        "  • Додайте дату і ім'я людини\n"
        "  • За <b>3 дні</b> до події — AI підбере 3 ідеальних букети\n"
        "  • За <b>1 день</b> — нагадаємо ще раз, щоб встигли замовити\n\n"
        "Натисніть кнопку нижче, щоб відкрити свій Календар 👇"
    )

    await message.answer(
        text=text,
        parse_mode="HTML",
        reply_markup=_calendar_keyboard(),
    )
