"""Inline keyboard builders for the 12 Months bot.

All keyboard functions return InlineKeyboardMarkup.
CallbackData classes provide type-safe, structured callback payloads.
"""
from aiogram.filters.callback_data import CallbackData
from aiogram.types import InlineKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from backend.core.config import settings


# ══════════════════════════════════════════════════════════════
#  CallbackData Classes
# ══════════════════════════════════════════════════════════════

class StartCallback(CallbackData, prefix="start"):
    action: str  # catalog | constructor | dates


class OccasionCallback(CallbackData, prefix="occasion"):
    answer: str  # partner | mom | birthday | office | just_because


class MenuCallback(CallbackData, prefix="menu"):
    action: str  # dates | orders | profile | subscribe


class CategoryCallback(CallbackData, prefix="category"):
    name: str  # bouquets | single | decor | green


class AddConfirmCallback(CallbackData, prefix="add_confirm"):
    action: str  # publish | edit | cancel


class ProductActionCallback(CallbackData, prefix="product_action"):
    action: str    # hide | show | del
    product_id: str


class DelConfirmCallback(CallbackData, prefix="del_confirm"):
    action: str    # confirm | cancel
    product_id: str


class StockCallback(CallbackData, prefix="stock"):
    action: str    # toggle | save | cancel
    product_id: str = ""


class OrderRepeatCallback(CallbackData, prefix="order_repeat"):
    order_id: str


class NpsCallback(CallbackData, prefix="nps"):
    score: int      # 1–5 stars
    order_id: str   # UUID as string


# ══════════════════════════════════════════════════════════════
#  Onboarding Keyboards
# ══════════════════════════════════════════════════════════════

def get_start_keyboard() -> InlineKeyboardMarkup:
    """Initial greeting — 3 action buttons."""
    builder = InlineKeyboardBuilder()
    builder.button(
        text="💐 Підібрати букет",
        callback_data=StartCallback(action="catalog").pack(),
    )
    builder.button(
        text="🎨 Зібрати свій",
        callback_data=StartCallback(action="constructor").pack(),
    )
    builder.button(
        text="📅 Нагадування про дати",
        callback_data=StartCallback(action="dates").pack(),
    )
    builder.adjust(1)
    return builder.as_markup()


def get_occasion_keyboard() -> InlineKeyboardMarkup:
    """'Для кого букет?' — 5 occasion options."""
    builder = InlineKeyboardBuilder()
    occasions = [
        ("💕 Коханій", "partner"),
        ("👩 Мамі", "mom"),
        ("🎂 День народження", "birthday"),
        ("🏢 В офіс", "office"),
        ("🌸 Просто так", "just_because"),
    ]
    for text, answer in occasions:
        builder.button(
            text=text,
            callback_data=OccasionCallback(answer=answer).pack(),
        )
    builder.adjust(2)
    return builder.as_markup()


def get_twa_keyboard() -> InlineKeyboardMarkup:
    """Main menu after onboarding — TWA button + quick links."""
    twa_url = f"{settings.webhook_host}/app"
    builder = InlineKeyboardBuilder()
    builder.button(
        text="🌸 Відкрити магазин",
        web_app=WebAppInfo(url=twa_url),
    )
    builder.button(
        text="📅 Мої дати",
        callback_data=MenuCallback(action="dates").pack(),
    )
    builder.button(
        text="📦 Мої замовлення",
        callback_data=MenuCallback(action="orders").pack(),
    )
    builder.adjust(1)
    return builder.as_markup()


# ══════════════════════════════════════════════════════════════
#  Admin — /add FSM Keyboards
# ══════════════════════════════════════════════════════════════

def get_cancel_keyboard() -> InlineKeyboardMarkup:
    """Single cancel button for any FSM step."""
    builder = InlineKeyboardBuilder()
    builder.button(text="❌ Скасувати", callback_data="fsm:cancel")
    return builder.as_markup()


def get_category_keyboard() -> InlineKeyboardMarkup:
    """Step 4 of /add — product category selection."""
    builder = InlineKeyboardBuilder()
    categories = [
        ("💐 Готові букети", "bouquets"),
        ("🌹 Поштучно", "single"),
        ("🎀 Декор", "decor"),
        ("🌿 Зелень", "green"),
    ]
    for text, name in categories:
        builder.button(
            text=text,
            callback_data=CategoryCallback(name=name).pack(),
        )
    builder.button(text="❌ Скасувати", callback_data="fsm:cancel")
    builder.adjust(2, 2, 1)
    return builder.as_markup()


def get_add_confirmation_keyboard() -> InlineKeyboardMarkup:
    """Step 6 of /add — review and confirm."""
    builder = InlineKeyboardBuilder()
    builder.button(
        text="✅ Опублікувати",
        callback_data=AddConfirmCallback(action="publish").pack(),
    )
    builder.button(
        text="✏️ Редагувати (заново)",
        callback_data=AddConfirmCallback(action="edit").pack(),
    )
    builder.button(
        text="❌ Скасувати",
        callback_data=AddConfirmCallback(action="cancel").pack(),
    )
    builder.adjust(1)
    return builder.as_markup()


# ══════════════════════════════════════════════════════════════
#  Admin — Quick Commands Keyboards
# ══════════════════════════════════════════════════════════════

def get_products_select_keyboard(
    products: list,
    action: str,
) -> InlineKeyboardMarkup:
    """Shows a list of products for the admin to select.
    Used when /hide or /del matches multiple products."""
    builder = InlineKeyboardBuilder()
    for product in products:
        name_short = product.name[:32]
        price = int(product.base_price)
        avail = "✅" if product.is_available else "❌"
        builder.button(
            text=f"{avail} {name_short} — {price} грн",
            callback_data=ProductActionCallback(
                action=action,
                product_id=str(product.id),
            ).pack(),
        )
    builder.button(text="❌ Скасувати", callback_data="fsm:cancel")
    builder.adjust(1)
    return builder.as_markup()


def get_del_confirm_keyboard(product_id: str) -> InlineKeyboardMarkup:
    """Deletion confirmation for /del command."""
    builder = InlineKeyboardBuilder()
    builder.button(
        text="🗑 Так, видалити",
        callback_data=DelConfirmCallback(
            action="confirm",
            product_id=product_id,
        ).pack(),
    )
    builder.button(
        text="🚫 Зняти з продажу (безпечніше)",
        callback_data=DelConfirmCallback(
            action="hide_instead",
            product_id=product_id,
        ).pack(),
    )
    builder.button(
        text="❌ Скасувати",
        callback_data=DelConfirmCallback(
            action="cancel",
            product_id=product_id,
        ).pack(),
    )
    builder.adjust(1)
    return builder.as_markup()


# ══════════════════════════════════════════════════════════════
#  Admin — /stock Keyboard
# ══════════════════════════════════════════════════════════════

def get_stock_keyboard(
    products: list,
    changes: dict[str, bool],
) -> InlineKeyboardMarkup:
    """Stock management keyboard.

    For each product shows current availability with pending changes applied.
    'changes' dict: {str(product_id): new_bool_value}
    """
    builder = InlineKeyboardBuilder()

    for product in products:
        product_id = str(product.id)
        # Use pending change if exists, otherwise current DB state
        is_available = changes.get(product_id, product.is_available)
        status = "✅" if is_available else "❌"
        name_short = product.name[:28]

        builder.button(
            text=f"{status} {name_short}",
            callback_data=StockCallback(
                action="toggle",
                product_id=product_id,
            ).pack(),
        )

    # Save + Cancel buttons
    changes_count = len(changes)
    save_label = f"💾 Зберегти ({changes_count} змін)" if changes_count else "💾 Зберегти"
    builder.button(
        text=save_label,
        callback_data=StockCallback(action="save").pack(),
    )
    builder.button(
        text="❌ Скасувати",
        callback_data=StockCallback(action="cancel").pack(),
    )
    builder.adjust(1)
    return builder.as_markup()


# ══════════════════════════════════════════════════════════════
#  User — Order History Keyboard
# ══════════════════════════════════════════════════════════════

def get_history_keyboard(orders: list) -> InlineKeyboardMarkup:
    """Repeat buttons for order history."""
    builder = InlineKeyboardBuilder()
    for order in orders:
        short_id = str(order.id)[:8]
        builder.button(
            text=f"🔄 Повторити #{short_id}",
            callback_data=OrderRepeatCallback(order_id=str(order.id)).pack(),
        )
    builder.adjust(1)
    return builder.as_markup()
