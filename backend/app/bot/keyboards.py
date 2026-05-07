from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from app.config import settings

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


def open_twa(label: str = "Відкрити 12 Months ↗", path: str = "") -> InlineKeyboardMarkup:
    url = settings.twa_url
    if path:
        url = url.rstrip("/") + "/" + path.lstrip("/")
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=label, web_app=WebAppInfo(url=url))]]
    )


# ── Admin (TZ §06) ──

def admin_main() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📋 Замовлення", callback_data="adm:orders")],
            [InlineKeyboardButton(text="🌸 Асортимент", callback_data="adm:catalog")],
            [InlineKeyboardButton(text="📦 Оновити наявність", callback_data="adm:stock")],
            [InlineKeyboardButton(text="📊 Статистика", callback_data="adm:stats")],
            [InlineKeyboardButton(text="⚙️ Налаштування", callback_data="adm:settings")],
        ]
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
