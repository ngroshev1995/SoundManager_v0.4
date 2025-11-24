# app/schemas/music.py
from typing import List, Optional
from pydantic import BaseModel


# --- Shared Properties ---
class ComposerBase(BaseModel):
    name: Optional[str] = None
    name_ru: Optional[str] = None
    original_name: Optional[str] = None
    year_born: Optional[int] = None
    year_died: Optional[int] = None
    notes: Optional[str] = None


class WorkBase(BaseModel):
    name: Optional[str] = None
    name_ru: Optional[str] = None
    original_name: Optional[str] = None
    catalog_number: Optional[str] = None
    publication_year: Optional[int] = None
    publication_year_end: Optional[int] = None
    notes: Optional[str] = None


class CompositionBase(BaseModel):
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


# --- Create (Input) ---
class ComposerCreate(ComposerBase):
    name_ru: str  # Обязательно
    name: Optional[str] = None  # Опционально


class WorkCreate(WorkBase):
    name_ru: str  # Обязательно
    name: Optional[str] = None


class CompositionCreate(CompositionBase):
    title_ru: str  # Обязательно
    title: Optional[str] = None


class RecordingCreate(RecordingBase):
    performers: Optional[str] = None  # Теперь опционально


# --- Update (Input) ---
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
    composer_name: Optional[str] = None
    work_name: Optional[str] = None
    composition_title: Optional[str] = None
    publication_year: Optional[int] = None
    composition_year: Optional[int] = None


class RecordingBulkUpdate(BaseModel):
    recording_ids: List[int]
    performers: Optional[str] = None
    recording_year: Optional[int] = None


# --- Сложное обновление (через модалку) ---
class FullRecordingDetailsUpdate(BaseModel):
    # Запись
    performers: Optional[str] = None
    recording_year: Optional[int] = None
    youtube_url: Optional[str] = None

    # Композиция
    title: Optional[str] = None
    title_ru: Optional[str] = None
    title_original: Optional[str] = None
    catalog_number: Optional[str] = None
    composition_year: Optional[int] = None

    # Произведение
    work: Optional[str] = None
    work_ru: Optional[str] = None
    work_original: Optional[str] = None
    publication_year: Optional[int] = None

    # Композитор
    composer: Optional[str] = None
    composer_ru: Optional[str] = None
    composer_original: Optional[str] = None


# --- Bulk Requests ---
class BulkRecordingRequest(BaseModel):
    recording_ids: List[int]


# --- Read (Output) - SIMPLE VERSIONS ---
# Определяем их ПЕРЕД основными классами, чтобы можно было ссылаться
class ComposerSimple(ComposerBase):
    id: int
    slug: Optional[str] = None
    portrait_url: Optional[str] = None
    class Config:
        from_attributes = True

class WorkSimple(WorkBase):
    id: int
    slug: Optional[str] = None
    class Config:
        from_attributes = True

class CompositionSimple(CompositionBase):
    id: int
    slug: Optional[str] = None
    class Config:
        from_attributes = True

# Used for Dashboard and Search to avoid recursion
class WorkWithComposer(WorkBase):
    id: int
    slug: Optional[str] = None
    composer_id: int
    cover_art_url: Optional[str] = None
    composer: ComposerSimple
    class Config:
        from_attributes = True


# --- Read (Output) - FULL VERSIONS ---
class Composer(ComposerBase):
    id: int
    slug: Optional[str] = None
    portrait_url: Optional[str] = None
    # works здесь не обязательны, так как мы грузим их отдельным запросом

    class Config:
        from_attributes = True


class Work(WorkBase):
    id: int
    slug: Optional[str] = None
    composer_id: int
    cover_art_url: Optional[str] = None
    composer: Composer
    # ВАЖНО: Добавляем список композиций, чтобы он возвращался при запросе Произведения
    compositions: List[CompositionSimple] = []

    class Config:
        from_attributes = True


class Composition(CompositionBase):
    id: int
    slug: Optional[str] = None
    work_id: int
    cover_art_url: Optional[str] = None
    work: Work # Здесь work полная, но так как в Work compositions=Simple, рекурсии не будет (почти, но лучше использовать WorkSimple если будут ошибки)
    # Чтобы перестраховаться от рекурсии: Work -> Composition -> Work...
    # Если Pydantic ругается, можно заменить Work на WorkSimple, но пока оставим Work.

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


# Обновляем модели Work/Composer для вложенности (если нужно для API)
class WorkWithCompositions(Work):
    pass # Work уже содержит compositions

class ComposerWithWorks(Composer):
    works: List[Work] = []