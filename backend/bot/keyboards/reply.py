"""Reply keyboard builders.

Reply keyboards appear as persistent bottom panels.
For this bot, most interaction is via inline keyboards and TWA.
Reply keyboards are used sparingly (e.g., phone number request).
"""
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove


def get_remove_keyboard() -> ReplyKeyboardRemove:
    """Remove the reply keyboard (show default Telegram input)."""
    return ReplyKeyboardRemove()


def get_phone_request_keyboard() -> ReplyKeyboardMarkup:
    """Request user's phone number (used during checkout)."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="📱 Поділитися номером телефону",
                    request_contact=True,
                )
            ],
            [KeyboardButton(text="❌ Скасувати")],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
