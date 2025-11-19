from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

# ИЗМЕНЕНИЕ: импортируем новую ассоциативную таблицу
from app.db.base import Base, recording_favorites_association


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    playlists = relationship("Playlist", back_populates="owner")

    # --- ИСПРАВЛЕНИЕ: Переименовываем связь и используем правильную таблицу/модель ---
    favorite_recordings = relationship(
        "Recording", # Связь теперь с моделью Recording
        secondary=recording_favorites_association,
        back_populates="favorited_by"
    )