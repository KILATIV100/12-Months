"""
// filepath: backend/bot/notifications/reminders.py

Event-reminder push notifications.

Called by the daily APScheduler job in backend/core/scheduler.py.

Two reminder types:
  - 3 days before: AI picks 3 relevant bouquets → rich message + TWA button
  - 1 day before:  urgent nudge with a direct TWA link
"""
import logging
from datetime import date

from aiogram.types import InlineKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from backend.bot.instance import bot
from backend.core.config import settings
from backend.models.date import ImportantDate
from backend.models.user import User

logger = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _catalog_twa_keyboard(
    label: str = "🌸 Відкрити каталог",
    url_suffix: str = "",
) -> InlineKeyboardMarkup:
    """Inline button that opens the TWA."""
    twa_url = f"{settings.webhook_host.rstrip('/')}/catalog{url_suffix}"
    builder = InlineKeyboardBuilder()
    builder.button(text=label, web_app=WebAppInfo(url=twa_url))
    builder.adjust(1)
    return builder.as_markup()


def _format_product_list(products: list[dict]) -> str:
    """Format up to 3 products as a short text block."""
    if not products:
        return ""
    lines = []
    for i, p in enumerate(products[:3], start=1):
        price = int(float(p.get("base_price", 0)))
        lines.append(f"  {i}. {p['name']} — {price} грн")
    return "\n".join(lines)


# ── 3-day reminder ────────────────────────────────────────────────────────────

async def send_3day_reminder(
    user: User,
    event: ImportantDate,
    suggested_products: list[dict],
) -> bool:
    """
    Send an AI-personalised 3-day advance reminder.

    Args:
        user:               User model (must have tg_id).
        event:              ImportantDate being reminded about.
        suggested_products: Up to 3 product dicts from ai_service.

    Returns:
        True if the message was sent successfully, False otherwise.
    """
    event_full = event.label
    if event.person_name:
        event_full = f"{event.label} для {event.person_name}"

    product_block = _format_product_list(suggested_products)
    product_section = (
        f"\n\n🌷 <b>Спеціально для цієї події ми підібрали:</b>\n{product_block}"
        if product_block
        else ""
    )

    text = (
        f"⏳ <b>Через 3 дні — {event_full}!</b>\n\n"
        f"Час подбати про незабутній букет 🌸"
        f"{product_section}\n\n"
        f"Замовте заздалегідь — флорист встигне зібрати ідеальну композицію."
    )

    keyboard = _catalog_twa_keyboard("💐 Переглянути підбірку")

    try:
        await bot.send_message(
            chat_id=user.tg_id,
            text=text,
            parse_mode="HTML",
            reply_markup=keyboard,
        )
        logger.info(
            "3-day reminder sent to tg_id=%s for event '%s'",
            user.tg_id, event.label,
        )
        return True
    except Exception as exc:
        logger.warning(
            "Failed to send 3-day reminder to tg_id=%s: %s",
            user.tg_id, exc,
        )
        return False


# ── 1-day reminder ────────────────────────────────────────────────────────────

async def send_1day_reminder(
    user: User,
    event: ImportantDate,
) -> bool:
    """
    Send an urgent 1-day advance reminder.

    Args:
        user:  User model.
        event: ImportantDate being reminded about.

    Returns:
        True on success, False on failure.
    """
    event_full = event.label
    if event.person_name:
        event_full = f"{event.label} для {event.person_name}"

    # Format the event date nicely
    event_date_str = event.date.strftime("%-d %B").lower()
    # Replace English month with Ukrainian (basic mapping for top months)
    _ua_months = {
        "january": "січня", "february": "лютого", "march": "березня",
        "april": "квітня",  "may": "травня",       "june": "червня",
        "july": "липня",    "august": "серпня",    "september": "вересня",
        "october": "жовтня","november": "листопада","december": "грудня",
    }
    for en, ua in _ua_months.items():
        event_date_str = event_date_str.replace(en, ua)

    text = (
        f"⚡ <b>Завтра — {event_full}!</b>\n\n"
        f"Ще є час замовити квіти з доставкою на {event_date_str}.\n"
        f"Не пропустіть момент 🌹"
    )

    keyboard = _catalog_twa_keyboard("🚀 Замовити зараз")

    try:
        await bot.send_message(
            chat_id=user.tg_id,
            text=text,
            parse_mode="HTML",
            reply_markup=keyboard,
        )
        logger.info(
            "1-day reminder sent to tg_id=%s for event '%s'",
            user.tg_id, event.label,
        )
        return True
    except Exception as exc:
        logger.warning(
            "Failed to send 1-day reminder to tg_id=%s: %s",
            user.tg_id, exc,
        )
        return False
