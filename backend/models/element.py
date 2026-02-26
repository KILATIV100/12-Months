import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database import Base


class BouquetElement(Base):
    """Елемент для 2D-конструктора букетів.

    Типи:
    - flower  : квіти (троянда, піон, тюльпан...)
    - base    : основа (крафт-папір, коробка, кошик...)
    - decor   : декор (стрічка, бантик...)
    - green   : зелень (евкаліпт, аспарагус...)
    """

    __tablename__ = "bouquet_elements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("flower", "base", "decor", "green", name="element_type"),
        nullable=False,
        index=True,
    )
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # URL зображення елемента в R2 (прозорий PNG)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Кольорові теги для AI-підбору гармонії: ["рожевий", "пастельний"]
    color_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    # Emoji для відображення в боті та простому UI
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # Порядок відображення в конструкторі
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<BouquetElement name={self.name!r} type={self.type} price={self.price_per_unit}>"
