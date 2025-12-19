from typing import List, Optional
from pydantic import BaseModel

class GenreBase(BaseModel):
    name: str

class GenreCreate(GenreBase):
    pass

class Genre(GenreBase):
    id: int
    class Config:
        from_attributes = True


class GenreTypoCheck(BaseModel):
    similar: Optional[str] = None


class ComposerBase(BaseModel):
    name: Optional[str] = None
    name_ru: Optional[str] = None
    original_name: Optional[str] = None
    year_born: Optional[int] = None
    year_died: Optional[int] = None
    notes: Optional[str] = None
    place_of_birth: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class WorkBase(BaseModel):
    name: Optional[str] = None
    name_ru: Optional[str] = None
    original_name: Optional[str] = None
    catalog_number: Optional[str] = None
    tonality: Optional[str] = None
    genre_id: Optional[int] = None
    nickname: Optional[str] = None
    is_no_catalog: Optional[bool] = False
    publication_year: Optional[int] = None
    publication_year_end: Optional[int] = None
    notes: Optional[str] = None


class CompositionBase(BaseModel):
    sort_order: Optional[int] = 0
    tonality: Optional[str] = None
    is_no_catalog: Optional[bool] = False
    title: Optional[str] = None
    title_ru: Optional[str] = None
    title_original: Optional[str] = None
    catalog_number: Optional[str] = None
    composition_year: Optional[int] = None
    notes: Optional[str] = None


class RecordingBase(BaseModel):
    performers: Optional[str] = None
    recording_year: Optional[int] = None
    youtube_url: Optional[str] = None
    conductor: Optional[str] = None
    license: Optional[str] = None
    source_text: Optional[str] = None
    source_url: Optional[str] = None
    lead_performer: Optional[str] = None


class VideoRecordingCreate(BaseModel):
    youtube_url: str
    performers: str
    lead_performer: Optional[str] = None
    conductor: Optional[str] = None
    recording_year: Optional[int] = None


class ComposerCreate(ComposerBase):
    name_ru: str
    name: Optional[str] = None


class WorkCreate(WorkBase):
    name_ru: str
    name: Optional[str] = None


class CompositionCreate(CompositionBase):
    title_ru: str
    title: Optional[str] = None


class RecordingCreate(RecordingBase):
    performers: Optional[str] = None


class ComposerUpdate(ComposerBase):
    pass


class WorkUpdate(WorkBase):
    pass


class CompositionUpdate(CompositionBase):
    pass


class RecordingUpdate(BaseModel):
    performers: Optional[str] = None
    recording_year: Optional[int] = None
    youtube_url: Optional[str] = None
    conductor: Optional[str] = None
    license: Optional[str] = None
    source_text: Optional[str] = None
    source_url: Optional[str] = None
    lead_performer: Optional[str] = None
    composer_name: Optional[str] = None
    work_name: Optional[str] = None
    composition_title: Optional[str] = None
    publication_year: Optional[int] = None
    composition_year: Optional[int] = None


class RecordingBulkUpdate(BaseModel):
    recording_ids: List[int]
    performers: Optional[str] = None
    recording_year: Optional[int] = None


class FullRecordingDetailsUpdate(BaseModel):
    performers: Optional[str] = None
    recording_year: Optional[int] = None
    youtube_url: Optional[str] = None
    title: Optional[str] = None
    title_ru: Optional[str] = None
    title_original: Optional[str] = None
    catalog_number: Optional[str] = None
    composition_year: Optional[int] = None
    work: Optional[str] = None
    work_ru: Optional[str] = None
    work_original: Optional[str] = None
    publication_year: Optional[int] = None
    composer: Optional[str] = None
    composer_ru: Optional[str] = None
    composer_original: Optional[str] = None


class BulkRecordingRequest(BaseModel):
    recording_ids: List[int]


class ComposerSimple(ComposerBase):
    id: int
    slug: Optional[str] = None
    portrait_url: Optional[str] = None
    epoch: str
    class Config:
        from_attributes = True

class WorkSimple(WorkBase):
    id: int
    slug: Optional[str] = None
    name_ru: Optional[str] = None
    genre: Optional[Genre] = None

    class Config:
        from_attributes = True


class RecordingSimple(RecordingBase):
    id: int
    duration: int
    file_path: str
    class Config:
        from_attributes = True

class CompositionSimple(CompositionBase):
    id: int
    slug: Optional[str] = None
    has_audio: bool = False
    has_video: bool = False
    recordings: List[RecordingSimple] = []
    class Config:
        from_attributes = True


class WorkWithComposer(WorkBase):
    id: int
    slug: Optional[str] = None
    composer_id: int
    cover_art_url: Optional[str] = None
    composer: ComposerSimple
    genre: Optional[Genre] = None
    class Config:
        from_attributes = True


class Composer(ComposerBase):
    id: int
    slug: Optional[str] = None
    portrait_url: Optional[str] = None
    epoch: str

    class Config:
        from_attributes = True


class Work(WorkBase):
    id: int
    slug: Optional[str] = None
    composer_id: int
    cover_art_url: Optional[str] = None
    composer: Composer
    compositions: List[CompositionSimple] = []
    genre: Optional[Genre] = None

    class Config:
        from_attributes = True


class Composition(CompositionBase):
    id: int
    slug: Optional[str] = None
    work_id: int
    cover_art_url: Optional[str] = None
    work: Work

    class Config:
        from_attributes = True


class Recording(RecordingBase):
    id: int
    duration: int
    file_path: str
    composition_id: int
    composition: Composition

    class Config:
        from_attributes = True


class RecordingPage(BaseModel):
    total: int
    recordings: List[Recording]


class WorkWithCompositions(Work):
    pass

class ComposerWithWorks(Composer):
    works: List[Work] = []

class CompositionReorder(BaseModel):
    composition_ids: List[int]


# 1. Специальная схема Произведения, включающая Композитора
class WorkForPlayer(WorkSimple):
    composer: ComposerSimple
    class Config:
        from_attributes = True

# 2. Специальная схема Части, включающая Произведение
class CompositionForPlayer(CompositionSimple):
    work: WorkForPlayer
    class Config:
        from_attributes = True

# 3. Обновленная схема Записи для библиотеки
class RecordingForLibrary(RecordingBase):
    id: int
    duration: int
    # Важно: используем расширенную схему CompositionForPlayer, а не CompositionSimple
    composition: CompositionForPlayer
    file_path: str

    class Config:
        from_attributes = True

class WorkLibraryItem(WorkBase):
    id: int
    slug: Optional[str] = None
    cover_art_url: Optional[str] = None
    composer: ComposerSimple
    recordings: List[RecordingForLibrary] = []
    genre: Optional[Genre] = None


    class Config:
        from_attributes = True

class LibraryPage(BaseModel):
    total: int
    items: List[WorkLibraryItem]