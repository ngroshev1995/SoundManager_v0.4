# app/models/music.py

from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, select, func
from sqlalchemy.orm import relationship, column_property
from sqlalchemy.ext.associationproxy import association_proxy
from app.db.base import Base, recording_favorites_association


# --- COMPOSER ---
class Composer(Base):
    __tablename__ = "composers"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, unique=True, index=True, nullable=True)
    name_ru = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=True)
    year_born = Column(Integer, nullable=True)
    year_died = Column(Integer, nullable=True)
    portrait_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    works = relationship("Work", back_populates="composer", cascade="all, delete-orphan")


# --- WORK ---
class Work(Base):
    __tablename__ = "works"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, index=True, nullable=True)
    name_ru = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=True)
    tonality = Column(String, nullable=True)
    genre = Column(String, index=True, nullable=True)
    nickname = Column(String, nullable=True)
    is_no_catalog = Column(Boolean, default=False)
    catalog_number = Column(String, index=True, nullable=True)
    publication_year = Column(Integer, nullable=True)
    publication_year_end = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    cover_art_url = Column(String, nullable=True)
    composer_id = Column(Integer, ForeignKey("composers.id"), nullable=False)
    composer = relationship("Composer", back_populates="works")
    compositions = relationship("Composition", back_populates="work", cascade="all, delete-orphan")


# --- RECORDING (ПЕРЕНЕСЛИ ВВЕРХ) ---
class Recording(Base):
    __tablename__ = "recordings"
    id = Column(Integer, primary_key=True, index=True)
    performers = Column(String, nullable=True)
    recording_year = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=False)
    youtube_url = Column(String, nullable=True)
    file_path = Column(String, unique=True, nullable=False)
    file_hash = Column(String, unique=True, index=True, nullable=True)
    composition_id = Column(Integer, ForeignKey("compositions.id"), nullable=False)

    # SQLAlchemy умный: когда имя класса в кавычках ("Composition"), он найдет его позже.
    composition = relationship("Composition", back_populates="recordings")

    playlist_associations = relationship(
        "PlaylistRecording",
        back_populates="recording",
        cascade="all, delete-orphan"
    )
    playlists = association_proxy("playlist_associations", "playlist")

    # SQLAlchemy также найдет "User" позже.
    favorited_by = relationship(
        "User",
        secondary=recording_favorites_association,
        back_populates="favorite_recordings"
    )


# --- COMPOSITION (ТЕПЕРЬ ИДЕТ ПОСЛЕ RECORDING) ---
class Composition(Base):
    __tablename__ = "compositions"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)

    # Теперь Python знает, что такое Recording, и ошибки нет.
    has_audio = column_property(
        select(func.count(1))
        .where(Recording.composition_id == id)
        .where(Recording.duration > 0)
        .correlate_except(Recording)
        .as_scalar() > 0
    )
    has_video = column_property(
        select(func.count(1))
        .where(Recording.composition_id == id)
        .where(Recording.duration == 0)
        .correlate_except(Recording)
        .as_scalar() > 0
    )

    sort_order = Column(Integer, default=0, index=True)
    tonality = Column(String, nullable=True)
    is_no_catalog = Column(Boolean, default=False)
    title = Column(String, index=True, nullable=True)
    title_ru = Column(String, index=True, nullable=False)
    title_original = Column(String, nullable=True)
    catalog_number = Column(String, index=True, nullable=True)
    composition_year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    cover_art_url = Column(String, nullable=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    work = relationship("Work", back_populates="compositions")
    recordings = relationship("Recording", back_populates="composition", cascade="all, delete-orphan")