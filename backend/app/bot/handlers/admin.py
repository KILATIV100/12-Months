"""TZ §06 — admin commands + inline-button equivalents.

Every action exists both as a slash command and as a button in the /admin
menu. The slash handlers and the adm:* callback handlers share the same
private render/start helpers so behaviour can't drift.
"""
from __future__ import annotations

import io
import logging
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy import func, select

from app.bot.access import can_edit_catalog, get_or_create_user, is_admin, is_owner
from app.bot.keyboards import (
    admin_main,
    back_to_admin,
    category_keyboard,
    confirm_add,
    confirm_delete,
    element_type_keyboard,
    order_actions,
    stock_grid,
)
from app.bot.states import AddFlower, AddProduct, EditPhoto
from app.db import async_session
from app.models import BouquetElement, ElementType, Order, OrderItem, OrderStatus, Product, User
from app.services.r2 import is_configured as r2_configured
from app.services.r2 import upload as r2_upload

log = logging.getLogger(__name__)
router = Router(name="admin")


CATEGORY_LABELS = {
    "ready": "💐 Готові букети",
    "single": "🌹 Поштучно",
    "decor": "🎀 Декор",
    "green": "🌿 Зелень",
}
STATUS_LABEL = {
    OrderStatus.new: "Нове",
    OrderStatus.in_work: "В роботі",
    OrderStatus.ready: "Готове",
    OrderStatus.delivered: "Доставлено",
    OrderStatus.cancelled: "Скасовано",
}


# ─────────────────────────── shared helpers ───────────────────────────

async def _load_user(tg_id: int, name: str | None) -> User:
    async with async_session() as session:
        user = await get_or_create_user(session, tg_id, name)
        await session.commit()
        return user


async def _download_photo(bot: Bot, file_id: str) -> bytes:
    file = await bot.get_file(file_id)
    buf = io.BytesIO()
    await bot.download_file(file.file_path, destination=buf)
    return buf.getvalue()


async def _status_counts(session) -> dict[OrderStatus, int]:
    rows = (await session.execute(select(Order.status, func.count()).group_by(Order.status))).all()
    return {status: count for status, count in rows}


async def _find_product(session, ref: str) -> Product | None:
    """Lookup product either by short id prefix or by name substring."""
    products = (await session.scalars(select(Product).where(Product.is_deleted.is_(False)))).all()
    ref_low = ref.strip().lower()
    for p in products:
        if str(p.id).startswith(ref_low) or p.name.lower() == ref_low:
            return p
    for p in products:
        if ref_low in p.name.lower():
            return p
    return None


# ── render helpers: take a Message to reply into (works for cb.message too) ──

async def _render_admin_menu(target: Message) -> None:
    async with async_session() as session:
        counts = await _status_counts(session)
    await target.answer(
        "Меню адміна:",
        reply_markup=admin_main(
            new=counts.get(OrderStatus.new, 0),
            in_work=counts.get(OrderStatus.in_work, 0),
            ready=counts.get(OrderStatus.ready, 0),
        ),
    )


async def _render_orders(target: Message) -> None:
    async with async_session() as session:
        active = (await session.scalars(
            select(Order)
            .where(Order.status.in_([OrderStatus.new, OrderStatus.in_work, OrderStatus.ready]))
            .order_by(Order.created_at.desc())
            .limit(15)
        )).all()
    if not active:
        await target.answer("Активних замовлень немає. 🌿", reply_markup=back_to_admin())
        return
    await target.answer(f"<b>Активні замовлення: {len(active)}</b>", parse_mode="HTML")
    for o in active:
        addr = o.address or "Самовивіз"
        slot = f"{o.delivery_at:%d.%m %H:%M}" if o.delivery_at else "час не вказано"
        text = (
            f"№{str(o.id)[:8].upper()} · <b>{STATUS_LABEL.get(o.status, o.status)}</b>\n"
            f"💰 {o.total_price} грн\n📍 {addr}\n⏱ {slot}"
        )
        if o.recipient_name or o.recipient_phone:
            text += f"\n👤 {o.recipient_name or ''} {o.recipient_phone or ''}".rstrip()
        if o.comment:
            text += f"\n💬 {o.comment}"
        await target.answer(text, parse_mode="HTML", reply_markup=order_actions(str(o.id), o.status.value))
    await target.answer("———", reply_markup=back_to_admin())


async def _render_catalog(target: Message) -> None:
    async with async_session() as session:
        products = (await session.scalars(
            select(Product).where(Product.is_deleted.is_(False)).order_by(Product.name)
        )).all()
    if not products:
        await target.answer("Каталог порожній. Додайте перший букет.", reply_markup=back_to_admin())
        return
    lines = [f"<b>Асортимент ({len(products)}):</b>"]
    for p in products:
        mark = "✅" if p.is_available else "❌"
        photo = "🖼" if p.image_url else "▫️"
        lines.append(f"{mark}{photo} {p.name} · {p.base_price} грн · <code>{str(p.id)[:8]}</code>")
    lines.append("\n/photo &lt;id&gt; — оновити фото\n/price &lt;id&gt; &lt;грн&gt; — змінити ціну\n/hide /show /del &lt;id&gt;")
    await target.answer("\n".join(lines), parse_mode="HTML", reply_markup=back_to_admin())


async def _render_stock(target: Message) -> None:
    async with async_session() as session:
        rows = (await session.scalars(
            select(Product).where(Product.is_deleted.is_(False)).order_by(Product.name).limit(40)
        )).all()
    items = [(str(p.id), p.name, p.is_available) for p in rows]
    if not items:
        await target.answer("Немає позицій для оновлення.", reply_markup=back_to_admin())
        return
    await target.answer(
        "Ранкове оновлення наявності.\nТапніть позицію, щоб переключити ✅/❌, потім «Зберегти».",
        reply_markup=stock_grid(items),
    )


async def _render_stats(target: Message, period: str = "day") -> None:
    if period in {"week", "тиждень"}:
        since, label = datetime.utcnow() - timedelta(days=7), "тиждень"
    elif period in {"month", "місяць"}:
        since, label = datetime.utcnow() - timedelta(days=30), "місяць"
    else:
        since, label = datetime.utcnow() - timedelta(days=1), "день"
    async with async_session() as session:
        orders = (await session.scalars(select(Order).where(Order.created_at >= since))).all()
        order_ids = [o.id for o in orders]
        rows: list[tuple[Product, int]] = []
        if order_ids:
            rows = (await session.execute(
                select(Product, func.sum(OrderItem.quantity))
                .join(OrderItem, OrderItem.product_id == Product.id)
                .where(OrderItem.order_id.in_(order_ids))
                .group_by(Product.id)
                .order_by(func.sum(OrderItem.quantity).desc())
                .limit(3)
            )).all()
    total = sum((o.total_price for o in orders), Decimal("0"))
    cnt = len(orders)
    avg = (total / cnt) if cnt else Decimal("0")
    top_label = ", ".join(f"{p.name}×{c}" for p, c in rows) or "—"
    await target.answer(
        f"<b>Статистика за {label}:</b>\n"
        f"Замовлень: {cnt}\nВиручка: {total} грн\nСередній чек: {avg:.0f} грн\nТоп: {top_label}",
        parse_mode="HTML",
        reply_markup=back_to_admin(),
    )


# ── FSM starters ──

async def _start_add(target: Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(AddProduct.photo)
    await target.answer(
        "<b>КРОК 1/6 — ФОТО</b>\n📸 Надішліть фото букету.\nБажано квадрат або портрет, гарне освітлення.",
        parse_mode="HTML",
    )


async def _start_addflower(target: Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(AddFlower.photo)
    await target.answer(
        "<b>Новий елемент конструктора · КРОК 1/4 — ФОТО</b>\n"
        "📸 Надішліть фото квітки/основи/зелені/декору, або /skip щоб без фото.",
        parse_mode="HTML",
    )


# ─────────────────────────── /admin + adm:* callbacks ───────────────────────────

@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not is_admin(user):
        await message.answer("Недостатньо прав. Якщо ви адмін — попросіть власника надати доступ.")
        return
    await _render_admin_menu(message)


@router.callback_query(F.data == "adm:menu")
async def cb_menu(cb: CallbackQuery) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not is_admin(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await _render_admin_menu(cb.message)
    await cb.answer()


@router.callback_query(F.data == "adm:orders")
async def cb_orders(cb: CallbackQuery) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not is_admin(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await _render_orders(cb.message)
    await cb.answer()


@router.callback_query(F.data == "adm:catalog")
async def cb_catalog(cb: CallbackQuery) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not is_admin(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await _render_catalog(cb.message)
    await cb.answer()


@router.callback_query(F.data == "adm:stock")
async def cb_stock(cb: CallbackQuery) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not is_admin(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await _render_stock(cb.message)
    await cb.answer()


@router.callback_query(F.data == "adm:stats")
async def cb_stats(cb: CallbackQuery) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not is_owner(user):
        await cb.answer("Статистика — лише для власника", show_alert=True)
        return
    await _render_stats(cb.message, "day")
    await cb.answer()


@router.callback_query(F.data == "adm:settings")
async def cb_settings(cb: CallbackQuery) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not is_admin(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await cb.message.answer(
        "<b>⚙️ Налаштування</b>\n"
        f"Роль: {user.role.value}\n"
        f"R2 для фото: {'підключено' if r2_configured() else '❌ не налаштовано'}\n\n"
        "Керування адмінами — у наступних версіях.",
        parse_mode="HTML",
        reply_markup=back_to_admin(),
    )
    await cb.answer()


@router.callback_query(F.data == "adm:add")
async def cb_add(cb: CallbackQuery, state: FSMContext) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not can_edit_catalog(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await _start_add(cb.message, state)
    await cb.answer()


@router.callback_query(F.data == "adm:addflower")
async def cb_addflower(cb: CallbackQuery, state: FSMContext) -> None:
    user = await _load_user(cb.from_user.id, cb.from_user.full_name)
    if not can_edit_catalog(user):
        await cb.answer("Недостатньо прав", show_alert=True)
        return
    await _start_addflower(cb.message, state)
    await cb.answer()


# ─────────────────────────── /add — 6 steps ───────────────────────────

@router.message(Command("add"))
async def cmd_add(message: Message, state: FSMContext) -> None:
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not can_edit_catalog(user):
        await message.answer("Недостатньо прав для додавання товарів.")
        return
    await _start_add(message, state)


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
        f"📌 {data['name']}\n💰 {data['price']} грн · {cat_label}\n📝 {composition}"
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
    await cb.message.answer(f"✓ Букет «{product.name}» додано в каталог.", reply_markup=back_to_admin())
    await cb.answer()


@router.callback_query(AddProduct.confirm, F.data == "add:cancel")
async def add_cancel(cb: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await cb.message.answer("Скасовано.", reply_markup=back_to_admin())
    await cb.answer()


@router.callback_query(AddProduct.confirm, F.data == "add:edit")
async def add_edit(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AddProduct.name)
    await cb.message.answer("Окей, введіть нову назву:")
    await cb.answer()


# ─────────────────────────── /photo ───────────────────────────

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
    await message.answer(f"✅ Фото оновлено для «{name}».", reply_markup=back_to_admin())


@router.message(EditPhoto.waiting)
async def photo_invalid(message: Message) -> None:
    await message.answer("Очікую фото. Або /cancel.")


# ─────────────────────────── /addflower ───────────────────────────

@router.message(Command("addflower"))
async def cmd_addflower(message: Message, state: FSMContext) -> None:
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not can_edit_catalog(user):
        await message.answer("Недостатньо прав.")
        return
    await _start_addflower(message, state)


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
    await message.answer(f"✓ Елемент «{element.name}» додано в конструктор.", reply_markup=back_to_admin())


# ─────────────────────────── /cancel ───────────────────────────

@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    current = await state.get_state()
    await state.clear()
    await message.answer("Скасовано." if current else "Немає активної дії.")


# ─────────────────────────── /stock ───────────────────────────

@router.message(Command("stock"))
async def cmd_stock(message: Message) -> None:
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not is_admin(user):
        await message.answer("Недостатньо прав.")
        return
    await _render_stock(message)


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
    await cb.message.answer("Збережено. Доброго ранку! ☕", reply_markup=back_to_admin())
    await cb.answer()


# ─────────────────────────── /hide /show /price /del ───────────────────────────

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
        active = await session.scalar(
            select(func.count())
            .select_from(Order)
            .join(Order.items)
            .where(Order.status.in_([OrderStatus.new, OrderStatus.in_work, OrderStatus.ready]))
        )
        pid, pname = str(product.id), product.name
    has_active = bool(active)
    note = (
        "⚠️ На позиції є активні замовлення. Радимо лише зняти з продажу — дані залишаться для звітності."
        if has_active
        else f"Видалити «{pname}»? Дію не можна скасувати."
    )
    await message.answer(note, reply_markup=confirm_delete(pid, has_active))


@router.callback_query(F.data.startswith("del:yes:"))
async def del_yes(cb: CallbackQuery) -> None:
    pid = cb.data.split(":", 2)[2]
    async with async_session() as session:
        product = await session.get(Product, pid)
        if product:
            product.is_deleted = True
            product.is_available = False
            await session.commit()
    await cb.message.answer("Видалено. (зберігається в архіві 30 днів)", reply_markup=back_to_admin())
    await cb.answer()


@router.callback_query(F.data.startswith("del:hide:"))
async def del_hide(cb: CallbackQuery) -> None:
    pid = cb.data.split(":", 2)[2]
    async with async_session() as session:
        product = await session.get(Product, pid)
        if product:
            product.is_available = False
            await session.commit()
    await cb.message.answer("Знято з продажу. Дані збережено.", reply_markup=back_to_admin())
    await cb.answer()


@router.callback_query(F.data == "del:no")
async def del_no(cb: CallbackQuery) -> None:
    await cb.message.answer("Скасовано.")
    await cb.answer()


# ─────────────────────────── /orders /stats ───────────────────────────

@router.message(Command("orders"))
async def cmd_orders(message: Message) -> None:
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not is_admin(user):
        await message.answer("Недостатньо прав.")
        return
    await _render_orders(message)


@router.message(Command("stats"))
async def cmd_stats(message: Message, command: CommandObject) -> None:
    """Owner-only per TZ §05."""
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not is_owner(user):
        await message.answer("Тільки для власника.")
        return
    await _render_stats(message, (command.args or "day").strip().lower())


# ─────────────────────────── Test triggers (owner only) ───────────────────────────

@router.message(Command("testreminder"))
async def cmd_test_reminder(message: Message, bot: Bot) -> None:
    """Force the daily date-reminder sweep right now (otherwise it waits for 09:00)."""
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not is_owner(user):
        await message.answer("Тільки для власника.")
        return
    from app.services.scheduler import sweep_dates
    await message.answer("⏱ Запускаю sweep нагадувань…")
    try:
        await sweep_dates(bot)
        await message.answer("✅ Sweep завершено. Якщо у когось сьогодні reminder — повідомлення вже надіслане.")
    except Exception as e:
        log.exception("test reminder failed")
        await message.answer(f"❌ Помилка: {e}")


@router.message(Command("testsub"))
async def cmd_test_sub(message: Message, bot: Bot) -> None:
    """Force the subscription auto-order sweep right now."""
    user = await _load_user(message.from_user.id, message.from_user.full_name)
    if not is_owner(user):
        await message.answer("Тільки для власника.")
        return
    from app.services.scheduler import sweep_subscriptions
    await message.answer("⏱ Запускаю sweep підписок…")
    try:
        await sweep_subscriptions(bot)
        await message.answer("✅ Sweep завершено.")
    except Exception as e:
        log.exception("test sub failed")
        await message.answer(f"❌ Помилка: {e}")
