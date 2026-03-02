"""Orders API router.

POST /api/orders        — create a regular catalog order.
POST /api/orders/custom — create a custom bouquet order from the 2D constructor.
GET  /api/orders/my     — list current user's orders.
GET  /api/orders/{id}   — single order details (owner only).

Security:
  Total price is NEVER taken from the client.
  The server fetches current product/element prices from the DB and
  recalculates the total independently.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.security import get_current_twa_user
from backend.bot.services.notifications import notify_order_created
from backend.core.database import get_db
from backend.models.element import BouquetElement
from backend.models.order import Order, OrderItem
from backend.models.product import Product
from backend.models.user import User

router = APIRouter(prefix="/api/orders", tags=["orders"])


# ── Request schemas ────────────────────────────────────────────────────────────

class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=99)


class OrderIn(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)
    delivery_type: str = Field(pattern=r"^(pickup|delivery)$")
    # Required when delivery_type == "delivery"
    address: str | None = Field(default=None, max_length=500)
    delivery_date: str | None = Field(
        default=None,
        description="ISO date string: YYYY-MM-DD",
        max_length=10,
    )
    delivery_time_slot: str | None = Field(
        default=None,
        max_length=30,
        description="e.g. '14:00–16:00'",
    )
    recipient_name: str = Field(min_length=1, max_length=100)
    recipient_phone: str = Field(min_length=7, max_length=20)
    comment: str | None = Field(default=None, max_length=1000)
    # Bonus deduction: 1 bonus = 1 UAH discount (server validates)
    bonuses_used: int = Field(default=0, ge=0)

    @field_validator("address")
    @classmethod
    def address_required_for_delivery(cls, v, info):
        if info.data.get("delivery_type") == "delivery" and not v:
            raise ValueError("address is required for delivery orders")
        return v


# ── Response schemas ───────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: uuid.UUID | None
    product_name: str | None = None
    quantity: int
    price_at_order: float

    @field_serializer("price_at_order")
    def fmt(self, v): return round(float(v), 2)

    @field_serializer("product_id")
    def fmt_id(self, v): return str(v) if v else None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    delivery_type: str
    total_price: float
    qr_token: uuid.UUID | None
    items: list[OrderItemOut] = []

    @field_serializer("total_price")
    def fmt(self, v): return round(float(v), 2)

    @field_serializer("id", "qr_token")
    def fmt_uuid(self, v): return str(v) if v else None


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _resolve_db_user(
    session: AsyncSession,
    tg_user: dict,
) -> User:
    """Get or 404 the User row that matches the TWA Telegram user."""
    tg_id: int = tg_user["id"]
    result = await session.execute(
        select(User).where(User.tg_id == tg_id)
    )
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — open the bot first",
        )
    return db_user


# ── POST /api/orders ───────────────────────────────────────────────────────────

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: OrderIn,
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> OrderOut:
    """Create a new order.

    Steps:
    1. Resolve the User row from initData.
    2. Load all requested products from the DB (server-side prices).
    3. Validate: products exist, are available, are not deleted.
    4. Recalculate total_price server-side (never trust client price).
    5. Persist Order + OrderItems.
    6. Fire-and-forget: send Telegram notification.
    """
    db_user = await _resolve_db_user(session, tg_user)

    # ── 1. Load products ────────────────────────────────────────
    product_ids = list({item.product_id for item in body.items})
    result = await session.execute(
        select(Product).where(
            Product.id.in_(product_ids),
            Product.is_deleted.is_(False),
        )
    )
    products_by_id: dict[uuid.UUID, Product] = {
        p.id: p for p in result.scalars().all()
    }

    # ── 2. Validate availability ────────────────────────────────
    unavailable: list[str] = []
    missing: list[str] = []
    for item in body.items:
        product = products_by_id.get(item.product_id)
        if product is None:
            missing.append(str(item.product_id))
        elif not product.is_available:
            unavailable.append(product.name)

    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Products not found: {', '.join(missing)}",
        )
    if unavailable:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Products unavailable: {', '.join(unavailable)}",
        )

    # ── 3. Recalculate total (server-side) ──────────────────────
    total_price = Decimal("0")
    for item in body.items:
        price = Decimal(str(products_by_id[item.product_id].base_price))
        total_price += price * item.quantity

    # ── 3a. Apply bonus deduction ────────────────────────────────
    bonuses_used = 0
    if body.bonuses_used > 0:
        if body.bonuses_used > db_user.bonus_balance:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Insufficient bonus balance: have {db_user.bonus_balance}, requested {body.bonuses_used}",
            )
        bonuses_used = body.bonuses_used
        total_price = max(Decimal("50"), total_price - Decimal(str(bonuses_used)))

    # ── 4. Parse delivery_at from date string ───────────────────
    delivery_at: datetime | None = None
    if body.delivery_date:
        try:
            delivery_at = datetime.fromisoformat(body.delivery_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid delivery_date format. Use YYYY-MM-DD.",
            )

    # ── 5. Persist order ────────────────────────────────────────
    order = Order(
        user_id=db_user.id,
        type="ready",
        total_price=total_price,
        bonuses_used=bonuses_used,
        status="new",
        delivery_type=body.delivery_type,
        delivery_at=delivery_at,
        delivery_time_slot=body.delivery_time_slot,
        address=body.address if body.delivery_type == "delivery" else None,
        recipient_name=body.recipient_name,
        recipient_phone=body.recipient_phone,
        comment=body.comment,
        qr_token=uuid.uuid4(),
    )
    session.add(order)
    await session.flush()  # get order.id before adding items

    for item in body.items:
        product = products_by_id[item.product_id]
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            price_at_order=Decimal(str(product.base_price)),
        )
        session.add(order_item)

    # Deduct bonuses from user balance
    if bonuses_used > 0:
        db_user.bonus_balance -= bonuses_used

    await session.commit()
    await session.refresh(order)

    # Eagerly load relationships for the response + notification
    result2 = await session.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
        )
    )
    order = result2.scalar_one()

    # ── 6. Telegram notification (fire-and-forget) ──────────────
    await notify_order_created(order)

    # Build response items with product names
    items_out = [
        OrderItemOut(
            product_id=oi.product_id,
            product_name=oi.product.name if oi.product else None,
            quantity=oi.quantity,
            price_at_order=float(oi.price_at_order),
        )
        for oi in order.items
    ]

    return OrderOut(
        id=order.id,
        status=order.status,
        delivery_type=order.delivery_type,
        total_price=float(order.total_price),
        qr_token=order.qr_token,
        items=items_out,
    )


# ── POST /api/orders/custom ────────────────────────────────────────────────────


class CustomElementIn(BaseModel):
    element_id: uuid.UUID
    quantity: int = Field(ge=1, le=50)


class CustomOrderIn(BaseModel):
    """Payload for custom bouquets built in the 2D constructor."""
    elements: list[CustomElementIn] = Field(min_length=1, max_length=100)
    packaging_id: uuid.UUID | None = None  # selected base/packaging element
    delivery_type: str = Field(pattern=r"^(pickup|delivery)$")
    address: str | None = Field(default=None, max_length=500)
    delivery_date: str | None = Field(default=None, max_length=10)
    delivery_time_slot: str | None = Field(default=None, max_length=30)
    recipient_name: str = Field(min_length=1, max_length=100)
    recipient_phone: str = Field(min_length=7, max_length=20)
    comment: str | None = Field(default=None, max_length=1000)
    bonuses_used: int = Field(default=0, ge=0)


@router.post("/custom", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_custom_order(
    body: CustomOrderIn,
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> OrderOut:
    """
    Create a custom bouquet order from the 2D constructor.

    All element prices are fetched server-side; the client total is NOT trusted.
    The order.type is set to 'custom' to distinguish from catalog orders.
    """
    db_user = await _resolve_db_user(session, tg_user)

    # ── 1. Load all elements ─────────────────────────────────────────────────
    all_ids = list({item.element_id for item in body.elements})
    if body.packaging_id:
        all_ids.append(body.packaging_id)

    result = await session.execute(
        select(BouquetElement).where(
            BouquetElement.id.in_(all_ids),
            BouquetElement.is_available.is_(True),
        )
    )
    elements_by_id: dict[uuid.UUID, BouquetElement] = {
        el.id: el for el in result.scalars().all()
    }

    # ── 2. Validate all elements exist ───────────────────────────────────────
    missing = [
        str(item.element_id)
        for item in body.elements
        if item.element_id not in elements_by_id
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Elements not found or unavailable: {', '.join(missing)}",
        )

    # ── 3. Server-side price calculation ─────────────────────────────────────
    total_price = Decimal("0")
    for item in body.elements:
        el = elements_by_id[item.element_id]
        total_price += Decimal(str(el.price_per_unit)) * item.quantity

    if body.packaging_id and body.packaging_id in elements_by_id:
        packaging_el = elements_by_id[body.packaging_id]
        total_price += Decimal(str(packaging_el.price_per_unit))

    if total_price < Decimal("50"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Minimum custom bouquet cost is 50 UAH",
        )

    # ── 3a. Apply bonus deduction ─────────────────────────────────────────────
    custom_bonuses_used = 0
    if body.bonuses_used > 0:
        if body.bonuses_used > db_user.bonus_balance:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Insufficient bonus balance: have {db_user.bonus_balance}, requested {body.bonuses_used}",
            )
        custom_bonuses_used = body.bonuses_used
        total_price = max(Decimal("50"), total_price - Decimal(str(custom_bonuses_used)))

    # ── 4. Parse delivery_at ──────────────────────────────────────────────────
    delivery_at: datetime | None = None
    if body.delivery_date:
        try:
            delivery_at = datetime.fromisoformat(body.delivery_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid delivery_date format. Use YYYY-MM-DD.",
            )

    # ── 5. Persist order ──────────────────────────────────────────────────────
    order = Order(
        user_id=db_user.id,
        type="custom",
        total_price=total_price,
        bonuses_used=custom_bonuses_used,
        status="new",
        delivery_type=body.delivery_type,
        delivery_at=delivery_at,
        delivery_time_slot=body.delivery_time_slot,
        address=body.address if body.delivery_type == "delivery" else None,
        recipient_name=body.recipient_name,
        recipient_phone=body.recipient_phone,
        comment=body.comment,
        qr_token=uuid.uuid4(),
    )
    session.add(order)
    await session.flush()

    # Add element items
    for item in body.elements:
        el = elements_by_id[item.element_id]
        order_item = OrderItem(
            order_id=order.id,
            element_id=item.element_id,
            quantity=item.quantity,
            price_at_order=Decimal(str(el.price_per_unit)),
        )
        session.add(order_item)

    # Packaging as a separate item if provided
    if body.packaging_id and body.packaging_id in elements_by_id:
        packaging_el = elements_by_id[body.packaging_id]
        packing_item = OrderItem(
            order_id=order.id,
            element_id=body.packaging_id,
            quantity=1,
            price_at_order=Decimal(str(packaging_el.price_per_unit)),
        )
        session.add(packing_item)

    # Deduct bonuses from user balance
    if custom_bonuses_used > 0:
        db_user.bonus_balance -= custom_bonuses_used

    await session.commit()
    await session.refresh(order)

    result2 = await session.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.items),
            selectinload(Order.user),
        )
    )
    order = result2.scalar_one()
    await notify_order_created(order)

    return OrderOut(
        id=order.id,
        status=order.status,
        delivery_type=order.delivery_type,
        total_price=float(order.total_price),
        qr_token=order.qr_token,
        items=[
            OrderItemOut(
                product_id=None,
                product_name=elements_by_id.get(oi.element_id, None) and
                              elements_by_id[oi.element_id].name
                              if oi.element_id else None,
                quantity=oi.quantity,
                price_at_order=float(oi.price_at_order),
            )
            for oi in order.items
        ],
    )


# ── GET /api/orders/my ─────────────────────────────────────────────────────────

@router.get("/my", response_model=list[OrderOut])
async def get_my_orders(
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
    limit: int = 10,
    offset: int = 0,
) -> list[OrderOut]:
    """Return the current user's order history (newest first)."""
    db_user = await _resolve_db_user(session, tg_user)

    result = await session.execute(
        select(Order)
        .where(Order.user_id == db_user.id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    orders = result.scalars().all()

    return [
        OrderOut(
            id=o.id,
            status=o.status,
            delivery_type=o.delivery_type,
            total_price=float(o.total_price),
            qr_token=o.qr_token,
            items=[
                OrderItemOut(
                    product_id=oi.product_id,
                    product_name=oi.product.name if oi.product else None,
                    quantity=oi.quantity,
                    price_at_order=float(oi.price_at_order),
                )
                for oi in o.items
            ],
        )
        for o in orders
    ]


# ── GET /api/orders/{order_id} ─────────────────────────────────────────────────

@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    tg_user: Annotated[dict, Depends(get_current_twa_user)],
) -> OrderOut:
    """Get a single order. User can only access their own orders."""
    db_user = await _resolve_db_user(session, tg_user)

    result = await session.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
        )
    )
    order = result.scalar_one_or_none()

    if order is None or order.user_id != db_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    return OrderOut(
        id=order.id,
        status=order.status,
        delivery_type=order.delivery_type,
        total_price=float(order.total_price),
        qr_token=order.qr_token,
        items=[
            OrderItemOut(
                product_id=oi.product_id,
                product_name=oi.product.name if oi.product else None,
                quantity=oi.quantity,
                price_at_order=float(oi.price_at_order),
            )
            for oi in order.items
        ],
    )
