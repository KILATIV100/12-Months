from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from app.config import settings


# ── Always-visible reply keyboards (buttons at the bottom of the chat) ──

def main_reply_kb(is_admin: bool = False) -> ReplyKeyboardMarkup:
    """Buttons that stay below the input field — no need to type commands.

    Tap labels are matched in handlers/start.py by exact text equality.
    """
    rows = [
        [KeyboardButton(text="💐 Замовити"), KeyboardButton(text="📅 Мої дати")],
        [KeyboardButton(text="🧾 Історія"), KeyboardButton(text="🔁 Абонемент")],
    ]
    if is_admin:
        rows.append([KeyboardButton(text="⚙️ Адмін"), KeyboardButton(text="📋 Замовлення")])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, is_persistent=True)


# ── Onboarding (TZ §05 /start) ──

def onboarding_main() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💘 Підібрати букет", callback_data="ob:pick")],
            [InlineKeyboardButton(text="🎨 Зібрати свій", callback_data="ob:build")],
            [InlineKeyboardButton(text="📅 Нагадування про дати", callback_data="ob:dates")],
        ]
    )


def occasion_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❤️ Коханій", callback_data="oc:lover"),
             InlineKeyboardButton(text="🌷 Мамі", callback_data="oc:mom")],
            [InlineKeyboardButton(text="🎂 День народження", callback_data="oc:bday"),
             InlineKeyboardButton(text="💼 В офіс", callback_data="oc:office")],
            [InlineKeyboardButton(text="✨ Просто так", callback_data="oc:just")],
        ]
    )


def open_twa(label: str = "Відкрити 12 Months ↗", tab: str = "") -> InlineKeyboardMarkup:
    """Build either a WebApp button (preferred) or a regular URL button.

    When TWA_URL isn't configured the WebApp button would render but be
    unresponsive on tap, so fall back to a plain URL link to surface that
    something is misconfigured rather than the bot looking broken.
    """
    base = settings.twa_url
    url = f"{base}/?tab={tab}" if (base and tab) else (base or "")
    if base:
        button = InlineKeyboardButton(text=label, web_app=WebAppInfo(url=url))
    else:
        button = InlineKeyboardButton(text=f"{label} (TWA_URL not set)", url="https://t.me/")
    return InlineKeyboardMarkup(inline_keyboard=[[button]])


# ── Admin (TZ §06) ──

def admin_main(new: int = 0, in_work: int = 0, ready: int = 0) -> InlineKeyboardMarkup:
    """Admin menu. Counts are baked into the button labels per TZ §06 mock."""
    orders_label = "📋 Замовлення"
    badges = []
    if new:
        badges.append(f"{new} нових")
    if in_work:
        badges.append(f"{in_work} в роботі")
    if ready:
        badges.append(f"{ready} готових")
    if badges:
        orders_label += f" · {', '.join(badges)}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=orders_label, callback_data="adm:orders")],
            [InlineKeyboardButton(text="🌸 Асортимент", callback_data="adm:catalog")],
            [InlineKeyboardButton(text="➕ Додати букет", callback_data="adm:add"),
             InlineKeyboardButton(text="🌷 Додати елемент", callback_data="adm:addflower")],
            [InlineKeyboardButton(text="📦 Оновити наявність", callback_data="adm:stock")],
            [InlineKeyboardButton(text="📊 Статистика", callback_data="adm:stats")],
            [InlineKeyboardButton(text="⚙️ Налаштування", callback_data="adm:settings")],
        ]
    )


def back_to_admin() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="⬅️ Меню адміна", callback_data="adm:menu")]]
    )


def category_keyboard() -> InlineKeyboardMarkup:
    cats = [
        ("💐 Готові букети", "ready"),
        ("🌹 Поштучно", "single"),
        ("🎀 Декор", "decor"),
        ("🌿 Зелень", "green"),
    ]
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=label, callback_data=f"cat:{key}")] for label, key in cats]
    )


def element_type_keyboard() -> InlineKeyboardMarkup:
    """Bouquet element types for /addflower (maps to ElementType enum)."""
    types = [
        ("🌹 Квітка", "flower"),
        ("📦 Основа", "base"),
        ("🌿 Зелень", "green"),
        ("🎀 Декор", "decor"),
    ]
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=label, callback_data=f"eltype:{key}")] for label, key in types]
    )


def order_actions(order_id: str, status: str) -> InlineKeyboardMarkup:
    """Per-order inline buttons for the /orders list — drives the status flow."""
    next_step = {"new": "work", "in_work": "ready", "ready": "delivered"}.get(status)
    next_label = {
        "work": "▶️ Взяти в роботу",
        "ready": "✅ Готово",
        "delivered": "🚚 Доставлено",
    }.get(next_step or "")
    rows: list[list[InlineKeyboardButton]] = []
    if next_step and next_label:
        rows.append([InlineKeyboardButton(text=next_label, callback_data=f"ord:{next_step}:{order_id}")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_add() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✅ Опублікувати", callback_data="add:publish")],
            [InlineKeyboardButton(text="✏️ Редагувати", callback_data="add:edit"),
             InlineKeyboardButton(text="❌ Скасувати", callback_data="add:cancel")],
        ]
    )


def stock_grid(items: list[tuple[str, str, bool]]) -> InlineKeyboardMarkup:
    """TZ §06 ranished /stock — inline list, single tap toggles availability."""
    rows: list[list[InlineKeyboardButton]] = []
    for product_id, name, available in items:
        mark = "✅" if available else "❌"
        rows.append([InlineKeyboardButton(text=f"{mark} {name}", callback_data=f"st:t:{product_id}")])
    rows.append([InlineKeyboardButton(text="💾 Зберегти", callback_data="st:save")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_delete(product_id: str, has_active_orders: bool) -> InlineKeyboardMarkup:
    """TZ §06 — protect deletion when there are active orders."""
    rows: list[list[InlineKeyboardButton]] = []
    if has_active_orders:
        rows.append([InlineKeyboardButton(text="🚫 Зняти з продажу", callback_data=f"del:hide:{product_id}")])
    else:
        rows.append([InlineKeyboardButton(text="✅ Так, видалити", callback_data=f"del:yes:{product_id}")])
    rows.append([InlineKeyboardButton(text="◀️ Скасувати", callback_data="del:no")])
    return InlineKeyboardMarkup(inline_keyboard=rows)
