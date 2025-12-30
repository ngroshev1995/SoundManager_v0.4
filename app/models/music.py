from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, select, func, Float, case, and_
from sqlalchemy.orm import relationship, column_property
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.hybrid import hybrid_property
from app.db.base import Base, recording_favorites_association

class Genre(Base):
    __tablename__ = "genres"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    works = relationship("Work", back_populates="genre")


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
    place_of_birth = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    works = relationship("Work", back_populates="composer", cascade="all, delete-orphan")

    @hybrid_property
    def epoch(self) -> str:
        """Определяет музыкальную эпоху на основе годов жизни (Python логика)."""
        if not self.year_born and not self.year_died:
            return "default"

        peak_year = 0
        if self.year_born and self.year_died:
            peak_year = (self.year_born + self.year_died) // 2
        else:
            peak_year = self.year_born or self.year_died

        if peak_year < 1750:
            return "baroque"
        if peak_year < 1820:
            return "classical"
        if peak_year < 1910:
            return "romantic"

        return "modern"

    @epoch.expression
    def epoch(cls):
        """
        Объясняет базе данных, как вычислять эпоху в SQL-запросе.
        Используется для фильтрации: .filter(Composer.epoch == 'romantic')
        """
        # Логика: если есть оба года, берем среднее. Иначе берем тот, который есть.
        peak_year = case(
            (
                and_(cls.year_born.isnot(None), cls.year_died.isnot(None)),
                (cls.year_born + cls.year_died) / 2
            ),
            else_=func.coalesce(cls.year_born, cls.year_died, 0)
        )

        return case(
            (peak_year == 0, "default"),
            (peak_year < 1750, "baroque"),
            (peak_year < 1820, "classical"),
            (peak_year < 1910, "romantic"),
            else_="modern"
        )


class Work(Base):
    __tablename__ = "works"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, index=True, nullable=True)
    name_ru = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=True)
    tonality = Column(String, nullable=True)
    genre_id = Column(Integer, ForeignKey("genres.id"), nullable=True)
    genre = relationship("Genre", back_populates="works")
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
    scores = relationship("Score", back_populates="work", cascade="all, delete-orphan")


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

    conductor = Column(String, nullable=True)
    license = Column(String, nullable=True)
    source_text = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    lead_performer = Column(String, nullable=True)
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


class Composition(Base):
    __tablename__ = "compositions"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)

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
    scores = relationship("Score", back_populates="composition", cascade="all, delete-orphan")