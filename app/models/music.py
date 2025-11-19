# app/models/music.py
from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.associationproxy import association_proxy
from app.db.base import Base, recording_favorites_association


class Composer(Base):
    __tablename__ = "composers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=True)
    name_ru = Column(String, index=True, nullable=False)

    original_name = Column(String, nullable=True)
    year_born = Column(Integer, nullable=True)
    year_died = Column(Integer, nullable=True)
    portrait_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    # Каскад: удаляем композитора -> удаляются произведения
    works = relationship("Work", back_populates="composer", cascade="all, delete")


class Work(Base):
    __tablename__ = "works"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    name_ru = Column(String, index=True, nullable=False)

    original_name = Column(String, nullable=True)
    publication_year = Column(Integer, nullable=True)
    publication_year_end = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    cover_art_url = Column(String, nullable=True)

    composer_id = Column(Integer, ForeignKey("composers.id"), nullable=False)
    composer = relationship("Composer", back_populates="works")

    # Каскад: удаляем произведение -> удаляются части (composition)
    compositions = relationship("Composition", back_populates="work", cascade="all, delete")


class Composition(Base):
    __tablename__ = "compositions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=True)
    title_ru = Column(String, index=True, nullable=False)

    title_original = Column(String, nullable=True)
    catalog_number = Column(String, index=True, nullable=True)
    composition_year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    cover_art_url = Column(String, nullable=True)

    work_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    work = relationship("Work", back_populates="compositions")

    # Каскад: удаляем часть -> удаляются записи
    recordings = relationship("Recording", back_populates="composition", cascade="all, delete")


class Recording(Base):
    __tablename__ = "recordings"
    id = Column(Integer, primary_key=True, index=True)
    performers = Column(String, nullable=True)
    recording_year = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=False)
    file_path = Column(String, unique=True, nullable=False)
    file_hash = Column(String, unique=True, index=True, nullable=True)

    composition_id = Column(Integer, ForeignKey("compositions.id"), nullable=False)
    composition = relationship("Composition", back_populates="recordings")

    # Удаляем связи с плейлистами при удалении записи
    playlist_associations = relationship(
        "PlaylistRecording",
        back_populates="recording",
        cascade="all, delete"
    )
    playlists = association_proxy("playlist_associations", "playlist")

    favorited_by = relationship(
        "User",
        secondary=recording_favorites_association,
        back_populates="favorite_recordings"
    )