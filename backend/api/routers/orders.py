"""Orders API router.

POST /api/orders — create a new order.
GET  /api/orders/{order_id} — get order details (owner only).
GET  /api/orders/my — list of current user's orders.

Security:
  Total price is NEVER taken from the client.
  The server fetches current product prices from the DB and
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
