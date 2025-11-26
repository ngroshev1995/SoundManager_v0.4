from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.associationproxy import association_proxy
from app.db.base import Base, recording_favorites_association


# --- COMPOSER ---
class Composer(Base):
    __tablename__ = "composers"
    id = Column(Integer, primary_key=True, index=True)

    # НОВОЕ ПОЛЕ
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

    name = Column(String, index=True, nullable=True)  # Original name (технически)
    name_ru = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=True)  # Явное поле для оригинала

    # === НОВЫЕ ПОЛЯ ===
    tonality = Column(String, nullable=True)
    genre = Column(String, index=True, nullable=True)
    nickname = Column(String, nullable=True)
    # ==================

    catalog_number = Column(String, index=True, nullable=True)
    publication_year = Column(Integer, nullable=True)
    publication_year_end = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    cover_art_url = Column(String, nullable=True)

    composer_id = Column(Integer, ForeignKey("composers.id"), nullable=False)
    composer = relationship("Composer", back_populates="works")
    compositions = relationship("Composition", back_populates="work", cascade="all, delete-orphan")


# --- COMPOSITION ---
class Composition(Base):
    __tablename__ = "compositions"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)

    # === НОВОЕ ПОЛЕ ===
    sort_order = Column(Integer, default=0, index=True)  # Порядковый номер
    tonality = Column(String, nullable=True)  # Тональность части
    # ==================

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


# --- RECORDING (Оставляем ID, так как на записи прямых ссылок обычно нет, они внутри) ---
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
    composition = relationship("Composition", back_populates="recordings")

    playlist_associations = relationship(
        "PlaylistRecording",
        back_populates="recording",
        cascade="all, delete-orphan"
    )
    playlists = association_proxy("playlist_associations", "playlist")

    favorited_by = relationship(
        "User",
        secondary=recording_favorites_association,
        back_populates="favorite_recordings"
    )