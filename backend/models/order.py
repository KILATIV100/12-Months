import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.user import User
    from backend.models.product import Product
    from backend.models.element import BouquetElement


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # ready = готовий букет з каталогу, custom = з конструктора
    type: Mapped[str] = mapped_column(
        Enum("ready", "custom", name="order_type"),
        nullable=False,
        default="ready",
    )
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("new", "in_work", "ready", "delivered", "cancelled", name="order_status"),
        nullable=False,
        default="new",
        index=True,
    )
    delivery_type: Mapped[str] = mapped_column(
        Enum("pickup", "delivery", name="delivery_type"),
        nullable=False,
        default="pickup",
    )
    delivery_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Текстовий тайм-слот для відображення: "14:00–16:00"
    delivery_time_slot: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    recipient_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recipient_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # UUID для QR-листівки, унікальний
    qr_token: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=True
    )
    # URL відео або текстової листівки в R2
    greeting_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Час підтвердження оплати (None = ще не оплачено)
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Час фактичного вручення/доставки
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Bonuses spent on this order (1 bonus = 1 UAH discount)
    bonuses_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # NPS — оцінка якості (1–5 зірок)
    nps_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    nps_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Greeting card: "text" | "video" | None
    greeting_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # Текст вітальної листівки (для типу "text")
    greeting_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Subscription this order was auto-created for (nullable for regular orders)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} status={self.status} total={self.total_price}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    # For custom bouquets built in the 2D constructor
    element_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bouquet_elements.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(nullable=False, default=1)
    # Ціна на момент замовлення — не змінюється при редагуванні product
    price_at_order: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # ── Relationships ─────────────────────────────────────────
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product | None"] = relationship(
        "Product", back_populates="order_items"
    )
    element: Mapped["BouquetElement | None"] = relationship("BouquetElement")

    def __repr__(self) -> str:
        return f"<OrderItem product_id={self.product_id} qty={self.quantity}>"
