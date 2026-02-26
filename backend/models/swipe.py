import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.user import User


class SwipeSession(Base):
    __tablename__ = "swipe_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # UUID-и продуктів, які сподобались (свайп вправо / ♥)
    liked_ids: Mapped[list[str] | None] = mapped_column(ARRAY(UUID), nullable=True)
    # UUID-и продуктів, які не сподобались (свайп вліво / ✕)
    disliked_ids: Mapped[list[str] | None] = mapped_column(ARRAY(UUID), nullable=True)
    # Теги, які визначив алгоритм після аналізу свайпів
    result_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    # Текстове резюме від Claude AI: "Вам подобається: пастельні кольори..."
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="swipe_sessions")

    def __repr__(self) -> str:
        liked_count = len(self.liked_ids) if self.liked_ids else 0
        return f"<SwipeSession user_id={self.user_id} liked={liked_count}>"
