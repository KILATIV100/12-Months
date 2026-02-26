import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.user import User


class ImportantDate(Base):
    __tablename__ = "important_dates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Назва події: "День народження", "Річниця", "8 березня" тощо
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    # Ім'я людини, для якої подія
    person_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Дата без року (рік ігнорується при щорічному повторенні)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    repeat_yearly: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Кількість днів до події для нагадування: [3, 1] → за 3 і за 1 день
    reminder_days: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, default=list
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="important_dates")

    def __repr__(self) -> str:
        return f"<ImportantDate label={self.label!r} date={self.date} person={self.person_name!r}>"
