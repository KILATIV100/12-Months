import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.order import Order
    from backend.models.date import ImportantDate
    from backend.models.swipe import SwipeSession
    from backend.models.subscription import Subscription
    from backend.models.product import Product


class UserRole(str):
    USER = "user"
    FLORIST = "florist"
    MANAGER = "manager"
    OWNER = "owner"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum("user", "florist", "manager", "owner", name="user_role"),
        default="user",
        nullable=False,
    )
    # Відповідь на питання онбордингу: "Коханій", "Мамі", "День народження" тощо
    onboard_answer: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Referral system
    referred_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    bonus_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="user")
    important_dates: Mapped[list["ImportantDate"]] = relationship(
        "ImportantDate", back_populates="user"
    )
    swipe_sessions: Mapped[list["SwipeSession"]] = relationship(
        "SwipeSession", back_populates="user"
    )
    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription", back_populates="user"
    )
    created_products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="creator"
    )

    def __repr__(self) -> str:
        return f"<User tg_id={self.tg_id} role={self.role}>"

    @property
    def is_admin(self) -> bool:
        return self.role in ("manager", "owner")

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"

    @property
    def is_florist(self) -> bool:
        return self.role in ("florist", "manager", "owner")
