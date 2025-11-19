# app/models/playlist.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.associationproxy import association_proxy
from app.db.base import Base

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="playlists")

    recording_associations = relationship(
        "PlaylistRecording",
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="PlaylistRecording.recording_order"
    )

    recordings = association_proxy("recording_associations", "recording")