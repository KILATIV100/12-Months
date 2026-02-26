"""Admin stock handler — /stock morning availability update.

Flow:
1. Admin sends /stock
2. Bot queries all non-deleted products and renders an inline keyboard
   where each product button shows current availability (✅/❌).
3. Admin taps buttons to toggle pending changes (stored in FSM data).
   The keyboard is refreshed after each tap to reflect the new state.
4. On "💾 Зберегти" — all changes are applied to DB in one transaction.
5. On "❌ Скасувати" — FSM state is cleared with no DB writes.
"""
import logging
import uuid
from typing import Any

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.bot.filters.roles import IsAdmin
from backend.bot.keyboards.inline import StockCallback, get_stock_keyboard
from backend.bot.states.stock import StockStates
from backend.models.product import Product
from backend.models.user import User

logger = logging.getLogger(__name__)

router = Router(name="admin_stock")
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())


# ══════════════════════════════════════════════════════════════
#  Helpers
# ══════════════════════════════════════════════════════════════

async def _get_active_products(session: AsyncSession) -> list[Product]:
    """Return all non-deleted products ordered by category then name."""
    stmt = (
        select(Product)
        .where(Product.is_deleted.is_(False))
        .order_by(Product.category, Product.name)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


def _build_stock_message(products: list[Product], changes: dict[str, bool]) -> str:
    """Build a summary text for the /stock keyboard message."""
    available_after = sum(
        1 for p in products
        if changes.get(str(p.id), p.is_available)
    )
    total = len(products)
    lines = [
        "🌿 <b>Управління наявністю товарів</b>",
        "",
        f"Всього: <b>{total}</b>  |  Буде в наявності: <b>{available_after}</b>",
        "",
        "Натисніть на товар щоб змінити наявність.",
        "Коли готово — натисніть <b>Зберегти</b>.",
    ]
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#  /stock — Entry point
# ══════════════════════════════════════════════════════════════

@router.message(Command("stock"))
async def cmd_stock(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
    user: User,
) -> None:
    """Open the stock management panel."""
    products = await _get_active_products(session)

    if not products:
        await message.answer("📭 Немає жодного активного товару в базі.")
        return

    # Initialise FSM with empty pending-changes dict
    await state.set_state(StockStates.editing)
    await state.update_data(changes={})

    text = _build_stock_message(products, {})
    await message.answer(
        text,
        parse_mode="HTML",
        reply_markup=get_stock_keyboard(products, {}),
    )
    logger.info("Admin tg_id=%s opened /stock (%d products)", user.tg_id, len(products))


# ══════════════════════════════════════════════════════════════
#  Toggle a product's pending availability
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    StockStates.editing,
    StockCallback.filter(F.action == "toggle"),
)
async def on_stock_toggle(
    callback: CallbackQuery,
    callback_data: StockCallback,
    state: FSMContext,
    session: AsyncSession,
    **kwargs: Any,
) -> None:
    """Flip the pending availability for one product and refresh the keyboard."""
    product_id = callback_data.product_id
    if not product_id:
        await callback.answer("Помилка: відсутній ID товару.")
        return

    # Load the product to know its current DB state
    stmt = select(Product).where(
        Product.id == product_id,
        Product.is_deleted.is_(False),
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()

    if product is None:
        await callback.answer("❌ Товар не знайдено або вже видалений.")
        return

    # Get current pending changes from FSM
    fsm_data = await state.get_data()
    changes: dict[str, bool] = fsm_data.get("changes", {})

    # Toggle: if already in changes use that, else use DB state — then flip
    current = changes.get(product_id, product.is_available)
    new_value = not current

    # If new_value == original DB value, no pending change needed — remove it
    if new_value == product.is_available:
        changes.pop(product_id, None)
    else:
        changes[product_id] = new_value

    await state.update_data(changes=changes)

    # Reload all products to re-render the keyboard
    products = await _get_active_products(session)
    text = _build_stock_message(products, changes)

    await callback.message.edit_text(
        text,
        parse_mode="HTML",
        reply_markup=get_stock_keyboard(products, changes),
    )
    status_label = "✅ в наявності" if new_value else "❌ немає в наявності"
    await callback.answer(f"{product.name[:30]}: {status_label}")


# ══════════════════════════════════════════════════════════════
#  Save all pending changes
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    StockStates.editing,
    StockCallback.filter(F.action == "save"),
)
async def on_stock_save(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    user: User,
    **kwargs: Any,
) -> None:
    """Apply all pending changes to the DB in one transaction."""
    fsm_data = await state.get_data()
    changes: dict[str, bool] = fsm_data.get("changes", {})

    if not changes:
        await state.clear()
        await callback.message.edit_text(
            "ℹ️ Змін не було. Панель наявності закрита.",
            reply_markup=None,
        )
        await callback.answer()
        return

    # Fetch all affected products in one query
    product_ids = [uuid.UUID(pid) for pid in changes]
    stmt = select(Product).where(
        Product.id.in_(product_ids),
        Product.is_deleted.is_(False),
    )
    result = await session.execute(stmt)
    products_to_update = result.scalars().all()

    updated_count = 0
    for product in products_to_update:
        pid_str = str(product.id)
        if pid_str in changes:
            product.is_available = changes[pid_str]
            updated_count += 1

    await session.commit()
    await state.clear()

    logger.info(
        "Admin tg_id=%s saved stock changes: %d products updated",
        user.tg_id,
        updated_count,
    )

    # Build a short summary of what changed
    now_available = [
        pid for pid, val in changes.items() if val
    ]
    now_unavailable = [
        pid for pid, val in changes.items() if not val
    ]
    lines = [
        f"✅ <b>Збережено!</b> Оновлено {updated_count} товар(ів).",
        "",
    ]
    if now_available:
        lines.append(f"▶️ В наявності: {len(now_available)} шт.")
    if now_unavailable:
        lines.append(f"⏸️ Зупинено: {len(now_unavailable)} шт.")

    await callback.message.edit_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=None,
    )
    await callback.answer("💾 Збережено!")


# ══════════════════════════════════════════════════════════════
#  Cancel without saving
# ══════════════════════════════════════════════════════════════

@router.callback_query(
    StockStates.editing,
    StockCallback.filter(F.action == "cancel"),
)
async def on_stock_cancel(
    callback: CallbackQuery,
    state: FSMContext,
    **kwargs: Any,
) -> None:
    """Discard all pending changes and close the panel."""
    fsm_data = await state.get_data()
    changes: dict[str, bool] = fsm_data.get("changes", {})
    discarded = len(changes)

    await state.clear()
    msg = "❌ Скасовано. Зміни не збережені."
    if discarded:
        msg += f" (відкинуто {discarded} змін)"

    await callback.message.edit_text(msg, reply_markup=None)
    await callback.answer()
