# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean  # <-- Добавь Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base, recording_favorites_association


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # НОВОЕ ПОЛЕ
    is_admin = Column(Boolean, default=False)

    playlists = relationship("Playlist", back_populates="owner")

    favorite_recordings = relationship(
        "Recording",
        secondary=recording_favorites_association,
        back_populates="favorited_by"
    )