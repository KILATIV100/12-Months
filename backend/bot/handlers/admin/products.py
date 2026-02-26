"""Admin product management handlers.

Commands:
  /add   — 6-step FSM to add a new product (photo, name, price,
            category, composition, confirmation)
  /hide  — hide product from catalog (by name search)
  /show  — restore product to catalog (by name search)
  /price — change product price (by name and new price)
  /del   — soft-delete product (checks active orders first)

All commands require IsAdmin filter.
"""
import logging
import uuid

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, PhotoSize
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.bot.filters.roles import IsAdmin
from backend.bot.keyboards.inline import (
    AddConfirmCallback,
    CategoryCallback,
    DelConfirmCallback,
    ProductActionCallback,
    get_add_confirmation_keyboard,
    get_cancel_keyboard,
    get_category_keyboard,
    get_del_confirm_keyboard,
    get_products_select_keyboard,
)
from backend.bot.states.add_product import AddProductStates
from backend.models.order import Order, OrderItem
from backend.models.product import Product
from backend.models.user import User

logger = logging.getLogger(__name__)
router = Router(name="admin_products")

# Display labels for categories
CATEGORY_LABELS: dict[str, str] = {
    "bouquets": "💐 Готові букети",
    "single": "🌹 Поштучно",
    "decor": "🎀 Декор",
    "green": "🌿 Зелень",
}


# ══════════════════════════════════════════════════════════════
#  Helpers
# ══════════════════════════════════════════════════════════════

async def _find_products_by_name(
    session: AsyncSession,
    name: str,
    include_unavailable: bool = True,
) -> list[Product]:
    """Search non-deleted products by name (case-insensitive partial match)."""
    stmt = select(Product).where(
        Product.is_deleted == False,  # noqa: E712
        Product.name.ilike(f"%{name}%"),
    )
    if not include_unavailable:
        stmt = stmt.where(Product.is_available == True)  # noqa: E712
    stmt = stmt.order_by(Product.created_at.desc()).limit(10)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def _count_active_orders(session: AsyncSession, product_id: uuid.UUID) -> int:
    """Count orders with this product that are not yet delivered/cancelled."""
    stmt = (
        select(func.count(OrderItem.id))
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            OrderItem.product_id == product_id,
            Order.status.in_(["new", "in_work", "ready"]),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one()


# ══════════════════════════════════════════════════════════════
#  /add — Step 1: Photo
# ══════════════════════════════════════════════════════════════

@router.message(Command("add"), IsAdmin())
async def cmd_add(
    message: Message,
    state: FSMContext,
) -> None:
    """Start the 6-step product creation FSM."""
    await state.clear()
    await state.set_state(AddProductStates.waiting_for_photo)
    await message.answer(
        "📸 <b>КРОК 1/6 — ФОТО</b>\n\n"
        "Надішліть фото букету.\n"
        "Бажано: квадрат або портрет, гарне освітлення.",
        reply_markup=get_cancel_keyboard(),
    )


@router.message(
    StateFilter(AddProductStates.waiting_for_photo),
    F.photo,
)
async def on_product_photo(message: Message, state: FSMContext) -> None:
    """Save the largest photo's file_id and move to name step."""
    best_photo: PhotoSize = message.photo[-1]  # type: ignore[index]
    await state.update_data(photo_file_id=best_photo.file_id)
    await state.set_state(AddProductStates.waiting_for_name)
    await message.answer(
        "✅ Фото збережено!\n\n"
        "✏️ <b>КРОК 2/6 — НАЗВА</b>\n\n"
        "Введіть назву позиції:",
        reply_markup=get_cancel_keyboard(),
    )


@router.message(
    StateFilter(AddProductStates.waiting_for_photo),
    ~F.photo,
)
async def on_photo_wrong_type(message: Message) -> None:
    await message.answer(
        "📸 Будь ласка, надішліть саме <b>фото</b> (не файл, не посилання)."
    )


# ══════════════════════════════════════════════════════════════
#  /add — Step 2: Name
# ══════════════════════════════════════════════════════════════

@router.message(StateFilter(AddProductStates.waiting_for_name), F.text)
async def on_product_name(message: Message, state: FSMContext) -> None:
    name = message.text.strip()  # type: ignore[union-attr]
    if len(name) < 2:
        await message.answer("Назва задовга коротка. Введіть мінімум 2 символи.")
        return
    if len(name) > 200:
        await message.answer("Назва задовга. Максимум 200 символів.")
        return

    await state.update_data(name=name)
    await state.set_state(AddProductStates.waiting_for_price)
    await message.answer(
        f"✅ Назва: <b>{name}</b>\n\n"
        "💰 <b>КРОК 3/6 — ЦІНА</b>\n\n"
        "Вкажіть ціну в гривнях (тільки ціле число):",
        reply_markup=get_cancel_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#  /add — Step 3: Price
# ══════════════════════════════════════════════════════════════

@router.message(StateFilter(AddProductStates.waiting_for_price), F.text)
async def on_product_price(message: Message, state: FSMContext) -> None:
    raw = message.text.strip()  # type: ignore[union-attr]
    try:
        price = float(raw.replace(",", ".").replace(" ", ""))
        if price <= 0:
            raise ValueError("Price must be positive")
        if price > 100_000:
            raise ValueError("Price too large")
    except ValueError:
        await message.answer(
            "❌ Невірний формат ціни.\n"
            "Введіть ціле число, наприклад: <code>950</code>"
        )
        return

    await state.update_data(price=price)
    await state.set_state(AddProductStates.waiting_for_category)
    await message.answer(
        f"✅ Ціна: <b>{price:.0f} грн</b>\n\n"
        "📂 <b>КРОК 4/6 — КАТЕГОРІЯ</b>\n\n"
        "Оберіть категорію:",
        reply_markup=get_category_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#  /add — Step 4: Category (inline keyboard)
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    CategoryCallback.filter(),
    StateFilter(AddProductStates.waiting_for_category),
)
async def on_product_category(
    callback: CallbackQuery,
    callback_data: CategoryCallback,
    state: FSMContext,
) -> None:
    await callback.answer()
    category_label = CATEGORY_LABELS.get(callback_data.name, callback_data.name)
    await state.update_data(category=callback_data.name, category_label=category_label)
    await state.set_state(AddProductStates.waiting_for_composition)
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"✅ Категорія: <b>{category_label}</b>\n\n"
        "📝 <b>КРОК 5/6 — СКЛАД</b>\n\n"
        "Опишіть склад букету (побачить покупець):\n\n"
        "<i>Приклад: Піони рожеві 5шт, гілочки евкаліпту 3, крафтове пакування</i>",
        reply_markup=get_cancel_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#  /add — Step 5: Composition
# ══════════════════════════════════════════════════════════════

@router.message(StateFilter(AddProductStates.waiting_for_composition), F.text)
async def on_product_composition(message: Message, state: FSMContext) -> None:
    composition = message.text.strip()  # type: ignore[union-attr]
    if len(composition) < 3:
        await message.answer("Опис задовга короткий. Введіть мінімум 3 символи.")
        return

    await state.update_data(composition=composition)
    await state.set_state(AddProductStates.waiting_for_confirmation)

    data = await state.get_data()
    # Show confirmation with photo
    await message.answer_photo(
        photo=data["photo_file_id"],
        caption=(
            "📋 <b>КРОК 6/6 — ПІДТВЕРДЖЕННЯ</b>\n\n"
            "Перевірте дані перед публікацією:\n\n"
            f"📌 <b>Назва:</b> {data['name']}\n"
            f"💰 <b>Ціна:</b> {data['price']:.0f} грн\n"
            f"📂 <b>Категорія:</b> {data['category_label']}\n"
            f"📝 <b>Склад:</b> {data['composition']}"
        ),
        reply_markup=get_add_confirmation_keyboard(),
    )


# ══════════════════════════════════════════════════════════════
#  /add — Step 6: Confirmation
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    AddConfirmCallback.filter(F.action == "publish"),
    StateFilter(AddProductStates.waiting_for_confirmation),
)
async def on_add_publish(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    user: User,
) -> None:
    """Publish the product to the catalog."""
    await callback.answer("Публікую...")
    data = await state.get_data()

    product = Product(
        name=data["name"],
        category=data["category"],
        base_price=data["price"],
        # Store Telegram file_id as image_url for MVP.
        # Sprint 6 will upload to Cloudflare R2 and replace this.
        image_url=data["photo_file_id"],
        composition=data["composition"],
        is_available=True,
        is_deleted=False,
        created_by=user.id,
    )
    session.add(product)
    await session.commit()
    await session.refresh(product)

    await state.clear()
    short_id = str(product.id)[:8]
    await callback.message.edit_caption(  # type: ignore[union-attr]
        caption=(
            f"✅ <b>Опубліковано!</b>\n\n"
            f"📌 {product.name}\n"
            f"💰 {product.base_price:.0f} грн\n"
            f"📂 {CATEGORY_LABELS.get(product.category, product.category)}\n\n"
            f"<code>ID: {short_id}...</code>\n\n"
            "Позиція вже доступна у каталозі 🌸"
        ),
    )
    logger.info(
        "Product created: id=%s name=%r by admin tg_id=%s",
        product.id,
        product.name,
        user.tg_id,
    )


@router.callback_query(
    AddConfirmCallback.filter(F.action == "edit"),
    StateFilter(AddProductStates.waiting_for_confirmation),
)
async def on_add_edit(callback: CallbackQuery, state: FSMContext) -> None:
    """Restart the /add flow from step 1."""
    await callback.answer()
    await state.clear()
    await state.set_state(AddProductStates.waiting_for_photo)
    await callback.message.answer(  # type: ignore[union-attr]
        "🔄 Починаємо заново.\n\n"
        "📸 <b>КРОК 1/6 — ФОТО</b>\n\n"
        "Надішліть нове фото букету:",
        reply_markup=get_cancel_keyboard(),
    )


@router.callback_query(
    AddConfirmCallback.filter(F.action == "cancel"),
    StateFilter(AddProductStates.waiting_for_confirmation),
)
async def on_add_cancel_confirm(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer("Скасовано")
    await state.clear()
    await callback.message.edit_caption(caption="❌ Додавання скасовано.")  # type: ignore[union-attr]


# ══════════════════════════════════════════════════════════════
#  Global FSM cancel (covers all admin states)
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    F.data == "fsm:cancel",
    StateFilter(
        AddProductStates.waiting_for_photo,
        AddProductStates.waiting_for_name,
        AddProductStates.waiting_for_price,
        AddProductStates.waiting_for_category,
        AddProductStates.waiting_for_composition,
    ),
)
async def on_add_fsm_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.answer("Скасовано")
    await callback.message.edit_text("❌ Додавання товару скасовано.")  # type: ignore[union-attr]


# ══════════════════════════════════════════════════════════════
#  /hide — hide product from catalog
# ══════════════════════════════════════════════════════════════

@router.message(Command("hide"), IsAdmin())
async def cmd_hide(message: Message, session: AsyncSession) -> None:
    """Hide product(s) by name. Usage: /hide <name>"""
    parts = message.text.split(maxsplit=1)  # type: ignore[union-attr]
    if len(parts) < 2:
        await message.answer(
            "📖 Використання: <code>/hide Назва товару</code>\n\n"
            "Приклад: <code>/hide Ніжність</code>\n\n"
            "Або скористайтесь /stock для масового управління."
        )
        return

    name = parts[1].strip()
    products = await _find_products_by_name(session, name, include_unavailable=True)
    available = [p for p in products if p.is_available]

    if not available:
        await message.answer(
            f"❌ Немає активних позицій з назвою «{name}»\n\n"
            "Можливо, позицію вже знято з продажу або назва не збігається."
        )
        return

    if len(available) == 1:
        product = available[0]
        product.is_available = False
        await session.commit()
        await message.answer(
            f"✅ <b>{product.name}</b> — знято з продажу.\n\n"
            f"<code>/show {product.name}</code> — щоб повернути."
        )
        logger.info("Product hidden: id=%s name=%r", product.id, product.name)
    else:
        await message.answer(
            f"Знайдено {len(available)} позицій. Оберіть яку зняти:",
            reply_markup=get_products_select_keyboard(available, "hide"),
        )


@router.callback_query(ProductActionCallback.filter(F.action == "hide"), IsAdmin())
async def on_product_hide_selected(
    callback: CallbackQuery,
    callback_data: ProductActionCallback,
    session: AsyncSession,
) -> None:
    """Hide a specific product selected from the list."""
    await callback.answer()
    stmt = select(Product).where(
        Product.id == uuid.UUID(callback_data.product_id),
        Product.is_deleted == False,  # noqa: E712
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        await callback.message.edit_text("❌ Позицію не знайдено.")  # type: ignore[union-attr]
        return

    product.is_available = False
    await session.commit()
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"✅ <b>{product.name}</b> — знято з продажу."
    )


# ══════════════════════════════════════════════════════════════
#  /show — restore product to catalog
# ══════════════════════════════════════════════════════════════

@router.message(Command("show"), IsAdmin())
async def cmd_show(message: Message, session: AsyncSession) -> None:
    """Restore hidden product(s) by name. Usage: /show <name>"""
    parts = message.text.split(maxsplit=1)  # type: ignore[union-attr]
    if len(parts) < 2:
        await message.answer(
            "📖 Використання: <code>/show Назва товару</code>\n\n"
            "Приклад: <code>/show Ніжність</code>"
        )
        return

    name = parts[1].strip()
    products = await _find_products_by_name(session, name, include_unavailable=True)
    hidden = [p for p in products if not p.is_available]

    if not hidden:
        await message.answer(
            f"❌ Немає схованих позицій з назвою «{name}»\n\n"
            "Можливо, позиція вже активна або назва не збігається."
        )
        return

    if len(hidden) == 1:
        product = hidden[0]
        product.is_available = True
        await session.commit()
        await message.answer(f"✅ <b>{product.name}</b> — повернуто у продаж!")
        logger.info("Product shown: id=%s name=%r", product.id, product.name)
    else:
        await message.answer(
            f"Знайдено {len(hidden)} схованих позицій. Оберіть яку відновити:",
            reply_markup=get_products_select_keyboard(hidden, "show"),
        )


@router.callback_query(ProductActionCallback.filter(F.action == "show"), IsAdmin())
async def on_product_show_selected(
    callback: CallbackQuery,
    callback_data: ProductActionCallback,
    session: AsyncSession,
) -> None:
    await callback.answer()
    stmt = select(Product).where(
        Product.id == uuid.UUID(callback_data.product_id),
        Product.is_deleted == False,  # noqa: E712
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        await callback.message.edit_text("❌ Позицію не знайдено.")  # type: ignore[union-attr]
        return

    product.is_available = True
    await session.commit()
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"✅ <b>{product.name}</b> — повернуто у продаж!"
    )


# ══════════════════════════════════════════════════════════════
#  /price — change product price
# ══════════════════════════════════════════════════════════════

@router.message(Command("price"), IsAdmin())
async def cmd_price(message: Message, session: AsyncSession) -> None:
    """Change product price. Usage: /price <name> <new_price>

    Example: /price Ніжність весни 1200
    The last word is treated as price; everything in between as the name.
    """
    parts = message.text.split()  # type: ignore[union-attr]
    if len(parts) < 3:
        await message.answer(
            "📖 Використання: <code>/price Назва товару 1200</code>\n\n"
            "Приклад: <code>/price Ніжність весни 950</code>"
        )
        return

    # Last token = price, middle tokens = name
    price_str = parts[-1]
    name = " ".join(parts[1:-1]).strip()

    try:
        new_price = float(price_str.replace(",", "."))
        if new_price <= 0 or new_price > 100_000:
            raise ValueError
    except ValueError:
        await message.answer(
            f"❌ Невірний формат ціни: <code>{price_str}</code>\n"
            "Введіть число, наприклад: <code>950</code>"
        )
        return

    products = await _find_products_by_name(session, name)

    if not products:
        await message.answer(f"❌ Позицій з назвою «{name}» не знайдено.")
        return

    if len(products) == 1:
        product = products[0]
        old_price = product.base_price
        product.base_price = new_price
        await session.commit()
        await message.answer(
            f"✅ <b>{product.name}</b>\n"
            f"Ціна: <s>{old_price:.0f} грн</s> → <b>{new_price:.0f} грн</b>"
        )
        logger.info(
            "Product price changed: id=%s %s→%s",
            product.id,
            old_price,
            new_price,
        )
    else:
        await message.answer(
            f"Знайдено {len(products)} позицій з назвою «{name}».\n"
            "Уточніть назву для точного збігу."
        )


# ══════════════════════════════════════════════════════════════
#  /del — soft-delete product
# ══════════════════════════════════════════════════════════════

@router.message(Command("del"), IsAdmin())
async def cmd_del(message: Message, session: AsyncSession) -> None:
    """Soft-delete a product. Usage: /del <name>

    Checks for active orders first. If found, suggests hiding instead.
    """
    parts = message.text.split(maxsplit=1)  # type: ignore[union-attr]
    if len(parts) < 2:
        await message.answer(
            "📖 Використання: <code>/del Назва товару</code>\n\n"
            "Приклад: <code>/del Ніжність весни</code>\n\n"
            "⚠️ Видалення незворотнє. Для тимчасового зняття використовуйте /hide"
        )
        return

    name = parts[1].strip()
    products = await _find_products_by_name(session, name)

    if not products:
        await message.answer(f"❌ Позицій з назвою «{name}» не знайдено.")
        return

    if len(products) == 1:
        product = products[0]
        await _send_del_confirmation(message, session, product)
    else:
        await message.answer(
            f"Знайдено {len(products)} позицій. Оберіть яку видалити:",
            reply_markup=get_products_select_keyboard(products, "del"),
        )


async def _send_del_confirmation(
    message: Message,
    session: AsyncSession,
    product: Product,
) -> None:
    """Send deletion confirmation with active orders check."""
    active_count = await _count_active_orders(session, product.id)
    product_id_str = str(product.id)

    if active_count > 0:
        # Has active orders — warn and offer hide instead
        await message.answer(
            f"⚠️ <b>{product.name}</b> має <b>{active_count}</b> активних замовлень.\n\n"
            "Видалення неможливе поки є активні замовлення.\n"
            "Рекомендуємо зняти з продажу замість видалення.",
            reply_markup=get_del_confirm_keyboard(product_id_str),
        )
    else:
        await message.answer(
            f"🗑 <b>Видалити позицію?</b>\n\n"
            f"📌 {product.name}\n"
            f"💰 {product.base_price:.0f} грн\n\n"
            "Дані зберігаються в архіві 30 днів для звітності.",
            reply_markup=get_del_confirm_keyboard(product_id_str),
        )


@router.callback_query(ProductActionCallback.filter(F.action == "del"), IsAdmin())
async def on_product_del_selected(
    callback: CallbackQuery,
    callback_data: ProductActionCallback,
    session: AsyncSession,
) -> None:
    """Show deletion confirmation for a product selected from a list."""
    await callback.answer()
    stmt = select(Product).where(
        Product.id == uuid.UUID(callback_data.product_id),
        Product.is_deleted == False,  # noqa: E712
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        await callback.message.edit_text("❌ Позицію не знайдено.")  # type: ignore[union-attr]
        return

    active_count = await _count_active_orders(session, product.id)
    product_id_str = str(product.id)

    if active_count > 0:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"⚠️ <b>{product.name}</b> має <b>{active_count}</b> активних замовлень.\n\n"
            "Рекомендуємо зняти з продажу замість видалення.",
            reply_markup=get_del_confirm_keyboard(product_id_str),
        )
    else:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"🗑 <b>Видалити позицію?</b>\n\n{product.name} — {product.base_price:.0f} грн",
            reply_markup=get_del_confirm_keyboard(product_id_str),
        )


@router.callback_query(DelConfirmCallback.filter(F.action == "confirm"), IsAdmin())
async def on_del_confirmed(
    callback: CallbackQuery,
    callback_data: DelConfirmCallback,
    session: AsyncSession,
    user: User,
) -> None:
    """Perform soft deletion (set is_deleted = True)."""
    await callback.answer()
    stmt = select(Product).where(
        Product.id == uuid.UUID(callback_data.product_id),
        Product.is_deleted == False,  # noqa: E712
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        await callback.message.edit_text("❌ Позицію вже видалено або не знайдено.")  # type: ignore[union-attr]
        return

    # Check once more for active orders (race condition guard)
    active_count = await _count_active_orders(session, product.id)
    if active_count > 0:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"⚠️ Неможливо видалити: є {active_count} активних замовлень.\n"
            "Знімайте з продажу через /hide або зачекайте завершення замовлень."
        )
        return

    product.is_deleted = True
    product.is_available = False
    await session.commit()

    await callback.message.edit_text(  # type: ignore[union-attr]
        f"🗑 <b>{product.name}</b> видалено.\n"
        "Дані збережено в архіві на 30 днів."
    )
    logger.info(
        "Product soft-deleted: id=%s name=%r by admin tg_id=%s",
        product.id,
        product.name,
        user.tg_id,
    )


@router.callback_query(
    DelConfirmCallback.filter(F.action == "hide_instead"),
    IsAdmin(),
)
async def on_del_hide_instead(
    callback: CallbackQuery,
    callback_data: DelConfirmCallback,
    session: AsyncSession,
) -> None:
    """Hide instead of deleting (safer option for products with orders)."""
    await callback.answer()
    stmt = select(Product).where(
        Product.id == uuid.UUID(callback_data.product_id),
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        await callback.message.edit_text("❌ Позицію не знайдено.")  # type: ignore[union-attr]
        return

    product.is_available = False
    await session.commit()
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"✅ <b>{product.name}</b> знято з продажу.\n"
        "Активні замовлення на цю позицію залишаться без змін."
    )


@router.callback_query(
    DelConfirmCallback.filter(F.action == "cancel"),
    IsAdmin(),
)
async def on_del_cancelled(callback: CallbackQuery) -> None:
    await callback.answer("Скасовано")
    await callback.message.edit_text("❌ Видалення скасовано.")  # type: ignore[union-attr]
