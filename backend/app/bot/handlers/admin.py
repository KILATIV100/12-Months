"""TZ §06 — admin commands: /admin, /add (6 steps), /stock, /hide, /show, /price, /del, /stats, /orders."""
from __future__ import annotations

import io
import logging
from collections import Counter
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy import func, select

from app.bot.access import (
    can_edit_catalog,
    get_or_create_user,
    is_admin,
    is_owner,
)
from app.bot.keyboards import (
    admin_main,
    category_keyboard,
    confirm_add,
    confirm_delete,
    element_type_keyboard,
    order_actions,
    stock_grid,
)
from app.bot.states import AddFlower, AddProduct, EditPhoto
from app.db import async_session
from app.models import BouquetElement, ElementType, Order, OrderStatus, Product
from app.services.r2 import is_configured as r2_configured
from app.services.r2 import upload as r2_upload

log = logging.getLogger(__name__)
router = Router(name="admin")


STATUS_LABEL = {
    OrderStatus.new: "Нове",
    OrderStatus.in_work: "В роботі",
    OrderStatus.ready: "Готове",
    OrderStatus.delivered: "Доставлено",
    OrderStatus.cancelled: "Скасовано",
}


async def _download_photo(bot: Bot, file_id: str) -> bytes:
    file = await bot.get_file(file_id)
    buf = io.BytesIO()
    await bot.download_file(file.file_path, destination=buf)
    return buf.getvalue()


CATEGORY_LABELS = {
    "ready": "💐 Готові букети",
    "single": "🌹 Поштучно",
    "decor": "🎀 Декор",
    "green": "🌿 Зелень",
}


# ───────── /admin ─────────

async def _status_counts(session) -> dict[OrderStatus, int]:
    rows = (await session.execute(
        select(Order.status, func.count()).group_by(Order.status)
    )).all()
    return {status: count for status, count in rows}


@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
        if not is_admin(user):
            await message.answer("Недостатньо прав. Якщо ви адмін — попросіть власника надати доступ.")
            return
        counts = await _status_counts(session)
    await message.answer(
        "Меню адміна:",
        reply_markup=admin_main(
            new=counts.get(OrderStatus.new, 0),
            in_work=counts.get(OrderStatus.in_work, 0),
            ready=counts.get(OrderStatus.ready, 0),
        ),
    )


# ───────── /add — 6 steps per TZ §06 ─────────

@router.message(Command("add"))
async def cmd_add(message: Message, state: FSMContext, bot: Bot) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
    if not can_edit_catalog(user):
        await message.answer("Недостатньо прав для додавання товарів.")
        return
    await state.clear()
    await state.set_state(AddProduct.photo)
    await message.answer(
        "<b>КРОК 1/6 — ФОТО</b>\n📸 Надішліть фото букету.\nБажано квадрат або портрет, гарне освітлення.",
        parse_mode="HTML",
    )


@router.message(AddProduct.photo, F.photo)
async def add_photo(message: Message, state: FSMContext, bot: Bot) -> None:
    largest = message.photo[-1]
    url: str | None = None
    if r2_configured():
        try:
            raw = await _download_photo(bot, largest.file_id)
            url = await r2_upload(raw, key=f"products/{largest.file_unique_id}.jpg", content_type="image/jpeg")
        except Exception:
            log.exception("R2 upload failed for product photo")
    if url is None:
        await message.answer(
            "⚠️ Фото не вдалося завантажити (R2 не налаштований або помилка). "
            "Продовжуємо без фото — додасте пізніше через /photo.")
    await state.update_data(image_url=url)
    await state.set_state(AddProduct.name)
    await message.answer("✅ Крок 1 готовий!\n\n<b>КРОК 2/6 — НАЗВА</b>\n✏️ Введіть назву позиції:", parse_mode="HTML")


@router.message(AddProduct.photo)
async def add_photo_invalid(message: Message) -> None:
    await message.answer("Очікую фото. Або /cancel — щоб вийти.")


@router.message(AddProduct.name)
async def add_name(message: Message, state: FSMContext) -> None:
    name = message.text.strip()[:200]
    if not name:
        await message.answer("Назва не може бути пустою.")
        return
    await state.update_data(name=name)
    await state.set_state(AddProduct.price)
    await message.answer("<b>КРОК 3/6 — ЦІНА</b>\n💰 Вкажіть ціну в гривнях (тільки цифри):", parse_mode="HTML")


@router.message(AddProduct.price)
async def add_price(message: Message, state: FSMContext) -> None:
    try:
        price = Decimal(message.text.strip().replace(",", "."))
    except InvalidOperation:
        await message.answer("Не зрозумів ціну. Введіть число, наприклад 950.")
        return
    await state.update_data(price=str(price))
    await state.set_state(AddProduct.category)
    await message.answer("<b>КРОК 4/6 — КАТЕГОРІЯ</b>\n📂 Оберіть категорію:", parse_mode="HTML", reply_markup=category_keyboard())


@router.callback_query(AddProduct.category, F.data.startswith("cat:"))
async def add_category(cb: CallbackQuery, state: FSMContext) -> None:
    cat = cb.data.split(":", 1)[1]
    await state.update_data(category=cat)
    await state.set_state(AddProduct.composition)
    await cb.message.answer(
        "<b>КРОК 5/6 — СКЛАД / ТЕГИ</b>\n📝 Опишіть склад (побачить покупець):\n\nПриклад: Піони 5шт, евкаліпт, крафт",
        parse_mode="HTML",
    )
    await cb.answer()


@router.message(AddProduct.composition)
async def add_composition(message: Message, state: FSMContext) -> None:
    composition = message.text.strip()
    await state.update_data(composition=composition)
    data = await state.get_data()
    cat_label = CATEGORY_LABELS.get(data["category"], data["category"])
    summary = (
        "<b>КРОК 6/6 — ПІДТВЕРДЖЕННЯ</b>\nПеревірте:\n"
        f"📌 {data['name']}\n"
        f"💰 {data['price']} грн · {cat_label}\n"
        f"📝 {composition}"
    )
    await state.set_state(AddProduct.confirm)
    await message.answer(summary, parse_mode="HTML", reply_markup=confirm_add())


@router.callback_query(AddProduct.confirm, F.data == "add:publish")
async def add_publish(cb: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    async with async_session() as session:
        user = await get_or_create_user(session, cb.from_user.id, cb.from_user.full_name)
        product = Product(
            name=data["name"],
            category=data["category"],
            base_price=Decimal(data["price"]),
            composition=data["composition"],
            image_url=data.get("image_url"),
            tags=[],
            created_by=user.id,
            is_available=True,
        )
        session.add(product)
        await session.commit()
        await session.refresh(product)
    await state.clear()
    await cb.message.answer(f"✓ Букет «{product.name}» додано в каталог.")
    await cb.answer()


@router.callback_query(AddProduct.confirm, F.data == "add:cancel")
async def add_cancel(cb: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await cb.message.answer("Скасовано.")
    await cb.answer()


@router.callback_query(AddProduct.confirm, F.data == "add:edit")
async def add_edit(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AddProduct.name)
    await cb.message.answer("Окей, введіть нову назву:")
    await cb.answer()


# ───────── /photo — replace a product's photo ─────────

@router.message(Command("photo"))
async def cmd_photo(message: Message, command: CommandObject, state: FSMContext) -> None:
    if not command.args:
        await message.answer("Використання: /photo <id або назва позиції>")
        return
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        if not can_edit_catalog(user):
            await message.answer("Недостатньо прав.")
            return
        product = await _find_product(session, command.args)
        if not product:
            await message.answer("Не знайшов позицію.")
            return
        pid, pname = str(product.id), product.name
    await state.clear()
    await state.set_state(EditPhoto.waiting)
    await state.update_data(product_id=pid)
    await message.answer(f"📸 Надішліть нове фото для «{pname}».")


@router.message(EditPhoto.waiting, F.photo)
async def photo_received(message: Message, state: FSMContext, bot: Bot) -> None:
    if not r2_configured():
        await message.answer("⚠️ R2 не налаштований — фото неможливо зберегти.")
        await state.clear()
        return
    data = await state.get_data()
    largest = message.photo[-1]
    try:
        raw = await _download_photo(bot, largest.file_id)
        url = await r2_upload(raw, key=f"products/{largest.file_unique_id}.jpg", content_type="image/jpeg")
    except Exception:
        log.exception("R2 upload failed for /photo")
        await message.answer("Помилка завантаження. Спробуйте ще раз.")
        return
    async with async_session() as session:
        product = await session.get(Product, data["product_id"])
        if product:
            product.image_url = url
            await session.commit()
            name = product.name
        else:
            name = "?"
    await state.clear()
    await message.answer(f"✅ Фото оновлено для «{name}».")


@router.message(EditPhoto.waiting)
async def photo_invalid(message: Message) -> None:
    await message.answer("Очікую фото. Або /cancel.")


# ───────── /addflower — add a Constructor element ─────────

@router.message(Command("addflower"))
async def cmd_addflower(message: Message, state: FSMContext) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
    if not can_edit_catalog(user):
        await message.answer("Недостатньо прав.")
        return
    await state.clear()
    await state.set_state(AddFlower.photo)
    await message.answer(
        "<b>Новий елемент конструктора · КРОК 1/4 — ФОТО</b>\n"
        "📸 Надішліть фото квітки/основи/зелені/декору, або /skip щоб без фото.",
        parse_mode="HTML",
    )


@router.message(AddFlower.photo, F.photo)
async def addflower_photo(message: Message, state: FSMContext, bot: Bot) -> None:
    largest = message.photo[-1]
    url: str | None = None
    if r2_configured():
        try:
            raw = await _download_photo(bot, largest.file_id)
            url = await r2_upload(raw, key=f"elements/{largest.file_unique_id}.jpg", content_type="image/jpeg")
        except Exception:
            log.exception("R2 upload failed for element photo")
    await state.update_data(image_url=url)
    await state.set_state(AddFlower.name)
    await message.answer("<b>КРОК 2/4 — НАЗВА</b>\n✏️ Введіть назву елемента:", parse_mode="HTML")


@router.message(AddFlower.photo, Command("skip"))
async def addflower_skip_photo(message: Message, state: FSMContext) -> None:
    await state.update_data(image_url=None)
    await state.set_state(AddFlower.name)
    await message.answer("<b>КРОК 2/4 — НАЗВА</b>\n✏️ Введіть назву елемента:", parse_mode="HTML")


@router.message(AddFlower.photo)
async def addflower_photo_invalid(message: Message) -> None:
    await message.answer("Очікую фото або /skip.")


@router.message(AddFlower.name)
async def addflower_name(message: Message, state: FSMContext) -> None:
    name = message.text.strip()[:100]
    if not name:
        await message.answer("Назва не може бути пустою.")
        return
    await state.update_data(name=name)
    await state.set_state(AddFlower.type)
    await message.answer("<b>КРОК 3/4 — ТИП</b>\nОберіть тип:", parse_mode="HTML", reply_markup=element_type_keyboard())


@router.callback_query(AddFlower.type, F.data.startswith("eltype:"))
async def addflower_type(cb: CallbackQuery, state: FSMContext) -> None:
    el_type = cb.data.split(":", 1)[1]
    await state.update_data(type=el_type)
    await state.set_state(AddFlower.price)
    await cb.message.answer("<b>КРОК 4/4 — ЦІНА</b>\n💰 Ціна за одиницю (грн):", parse_mode="HTML")
    await cb.answer()


@router.message(AddFlower.price)
async def addflower_price(message: Message, state: FSMContext) -> None:
    try:
        price = Decimal(message.text.strip().replace(",", "."))
    except InvalidOperation:
        await message.answer("Не зрозумів ціну. Введіть число, наприклад 90.")
        return
    data = await state.get_data()
    async with async_session() as session:
        max_sort = await session.scalar(select(func.max(BouquetElement.sort_order))) or 0
        element = BouquetElement(
            name=data["name"],
            type=ElementType(data["type"]),
            price_per_unit=price,
            image_url=data.get("image_url"),
            emoji="🌸",
            color_tags=[],
            sort_order=max_sort + 1,
            is_available=True,
        )
        session.add(element)
        await session.commit()
        await session.refresh(element)
    await state.clear()
    await message.answer(f"✓ Елемент «{element.name}» додано в конструктор.")


# ───────── /cancel — abort any FSM flow ─────────

@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    current = await state.get_state()
    await state.clear()
    await message.answer("Скасовано." if current else "Немає активної дії.")


# ───────── /stock — morning stock check ─────────

@router.message(Command("stock"))
async def cmd_stock(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
    if not is_admin(user):
        await message.answer("Недостатньо прав.")
        return
    async with async_session() as session:
        rows = (await session.scalars(
            select(Product).where(Product.is_deleted.is_(False)).order_by(Product.name).limit(40)
        )).all()
    items = [(str(p.id), p.name, p.is_available) for p in rows]
    await message.answer(
        "Ранкове оновлення наявності.\nТапніть позицію, щоб переключити ✅/❌, потім «Зберегти».",
        reply_markup=stock_grid(items),
    )


@router.callback_query(F.data.startswith("st:t:"))
async def stock_toggle(cb: CallbackQuery) -> None:
    pid = cb.data.split(":", 2)[2]
    async with async_session() as session:
        product = await session.get(Product, pid)
        if product:
            product.is_available = not product.is_available
            await session.commit()
        rows = (await session.scalars(
            select(Product).where(Product.is_deleted.is_(False)).order_by(Product.name).limit(40)
        )).all()
    items = [(str(p.id), p.name, p.is_available) for p in rows]
    await cb.message.edit_reply_markup(reply_markup=stock_grid(items))
    await cb.answer()


@router.callback_query(F.data == "st:save")
async def stock_save(cb: CallbackQuery) -> None:
    await cb.message.answer("Збережено. Доброго ранку! ☕")
    await cb.answer()


# ───────── /hide /show /price /del — quick commands ─────────

async def _find_product(session, ref: str) -> Product | None:
    """Lookup product either by short id prefix or by name substring."""
    stmt = select(Product).where(Product.is_deleted.is_(False))
    products = (await session.scalars(stmt)).all()
    ref_low = ref.strip().lower()
    for p in products:
        if str(p.id).startswith(ref_low) or p.name.lower() == ref_low:
            return p
    for p in products:
        if ref_low in p.name.lower():
            return p
    return None


@router.message(Command("hide"))
async def cmd_hide(message: Message, command: CommandObject) -> None:
    if not command.args:
        await message.answer("Використання: /hide <id або назва>")
        return
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        if not can_edit_catalog(user):
            await message.answer("Недостатньо прав.")
            return
        product = await _find_product(session, command.args)
        if not product:
            await message.answer("Не знайшов позицію.")
            return
        product.is_available = False
        await session.commit()
    await message.answer(f"Знято з продажу: {product.name}")


@router.message(Command("show"))
async def cmd_show(message: Message, command: CommandObject) -> None:
    if not command.args:
        await message.answer("Використання: /show <id або назва>")
        return
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        if not can_edit_catalog(user):
            await message.answer("Недостатньо прав.")
            return
        product = await _find_product(session, command.args)
        if not product:
            await message.answer("Не знайшов позицію.")
            return
        product.is_available = True
        await session.commit()
    await message.answer(f"Повернуто у продаж: {product.name}")


@router.message(Command("price"))
async def cmd_price(message: Message, command: CommandObject) -> None:
    """/price <id|name> <amount>"""
    args = (command.args or "").rsplit(maxsplit=1)
    if len(args) != 2:
        await message.answer("Використання: /price <id або назва> <ціна>")
        return
    ref, raw = args
    try:
        amount = Decimal(raw.replace(",", "."))
    except InvalidOperation:
        await message.answer("Не зрозумів ціну.")
        return
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        if not can_edit_catalog(user):
            await message.answer("Недостатньо прав.")
            return
        product = await _find_product(session, ref)
        if not product:
            await message.answer("Не знайшов позицію.")
            return
        product.base_price = amount
        await session.commit()
    await message.answer(f"Ціну змінено: {product.name} → {amount} грн")


@router.message(Command("del"))
async def cmd_del(message: Message, command: CommandObject) -> None:
    if not command.args:
        await message.answer("Використання: /del <id або назва>")
        return
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        if not can_edit_catalog(user):
            await message.answer("Недостатньо прав.")
            return
        product = await _find_product(session, command.args)
        if not product:
            await message.answer("Не знайшов позицію.")
            return
        # Block delete if there are active orders
        active = await session.scalar(
            select(func.count())
            .select_from(Order)
            .join(Order.items)
            .where(
                Order.status.in_([OrderStatus.new, OrderStatus.in_work, OrderStatus.ready]),
            )
        )
    has_active = bool(active)
    note = (
        "⚠️ На позиції є активні замовлення. Радимо лише зняти з продажу — дані залишаться для звітності."
        if has_active
        else f"Видалити «{product.name}»? Дію не можна скасувати."
    )
    await message.answer(note, reply_markup=confirm_delete(str(product.id), has_active))


@router.callback_query(F.data.startswith("del:yes:"))
async def del_yes(cb: CallbackQuery) -> None:
    pid = cb.data.split(":", 2)[2]
    async with async_session() as session:
        product = await session.get(Product, pid)
        if product:
            product.is_deleted = True
            product.is_available = False
            await session.commit()
    await cb.message.answer("Видалено. (зберігається в архіві 30 днів)")
    await cb.answer()


@router.callback_query(F.data.startswith("del:hide:"))
async def del_hide(cb: CallbackQuery) -> None:
    pid = cb.data.split(":", 2)[2]
    async with async_session() as session:
        product = await session.get(Product, pid)
        if product:
            product.is_available = False
            await session.commit()
    await cb.message.answer("Знято з продажу. Дані збережено.")
    await cb.answer()


@router.callback_query(F.data == "del:no")
async def del_no(cb: CallbackQuery) -> None:
    await cb.message.answer("Скасовано.")
    await cb.answer()


# ───────── /orders /stats ─────────

@router.message(Command("orders"))
async def cmd_orders(message: Message) -> None:
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
        if not is_admin(user):
            await message.answer("Недостатньо прав.")
            return
        # Active orders: anything not delivered/cancelled, freshest first.
        active = (await session.scalars(
            select(Order)
            .where(Order.status.in_([OrderStatus.new, OrderStatus.in_work, OrderStatus.ready]))
            .order_by(Order.created_at.desc())
            .limit(15)
        )).all()
    if not active:
        await message.answer("Активних замовлень немає. 🌿")
        return
    await message.answer(f"<b>Активні замовлення: {len(active)}</b>", parse_mode="HTML")
    for o in active:
        addr = o.address or "Самовивіз"
        slot = f"{o.delivery_at:%d.%m %H:%M}" if o.delivery_at else "час не вказано"
        text = (
            f"№{str(o.id)[:8].upper()} · <b>{STATUS_LABEL.get(o.status, o.status)}</b>\n"
            f"💰 {o.total_price} грн\n"
            f"📍 {addr}\n"
            f"⏱ {slot}"
        )
        if o.recipient_name or o.recipient_phone:
            text += f"\n👤 {o.recipient_name or ''} {o.recipient_phone or ''}".rstrip()
        if o.comment:
            text += f"\n💬 {o.comment}"
        await message.answer(
            text,
            parse_mode="HTML",
            reply_markup=order_actions(str(o.id), o.status.value),
        )


@router.message(Command("stats"))
async def cmd_stats(message: Message, command: CommandObject) -> None:
    """Owner-only per TZ §05."""
    async with async_session() as session:
        user = await get_or_create_user(session, message.from_user.id, message.from_user.full_name)
        await session.commit()
    if not is_owner(user):
        await message.answer("Тільки для власника.")
        return
    period = (command.args or "day").strip().lower()
    if period in {"week", "тиждень"}:
        since = datetime.utcnow() - timedelta(days=7)
        label = "тиждень"
    elif period in {"month", "місяць"}:
        since = datetime.utcnow() - timedelta(days=30)
        label = "місяць"
    else:
        since = datetime.utcnow() - timedelta(days=1)
        label = "день"

    async with async_session() as session:
        orders = (await session.scalars(
            select(Order).where(Order.created_at >= since)
        )).all()
        order_ids = [o.id for o in orders]
        from app.models import OrderItem
        rows: list[tuple[Product, int]] = []
        if order_ids:
            stmt = (
                select(Product, func.sum(OrderItem.quantity))
                .join(OrderItem, OrderItem.product_id == Product.id)
                .where(OrderItem.order_id.in_(order_ids))
                .group_by(Product.id)
                .order_by(func.sum(OrderItem.quantity).desc())
                .limit(3)
            )
            rows = (await session.execute(stmt)).all()

    total = sum((o.total_price for o in orders), Decimal("0"))
    cnt = len(orders)
    avg = (total / cnt) if cnt else Decimal("0")
    top_label = ", ".join(f"{p.name}×{c}" for p, c in rows) or "—"
    await message.answer(
        f"<b>Статистика за {label}:</b>\n"
        f"Замовлень: {cnt}\n"
        f"Виручка: {total} грн\n"
        f"Середній чек: {avg:.0f} грн\n"
        f"Топ: {top_label}",
        parse_mode="HTML",
    )
