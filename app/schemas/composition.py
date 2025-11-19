from pydantic import BaseModel, Field
from typing import Optional, List


class ComposerBase(BaseModel):
    name: str


class Composer(ComposerBase):
    id: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WorkBase(BaseModel):
    name: str
    publication_year: Optional[int] = None
    cover_art_url: Optional[str] = None
    notes: Optional[str] = None


class Work(WorkBase):
    id: int
    composer: Composer

    class Config:
        from_attributes = True


class CompositionBase(BaseModel):
    title: str
    performers: Optional[str] = None
    composition_year: Optional[int] = None
    notes: Optional[str] = None


class CompositionCreate(CompositionBase):
    composer: str
    work: str
    publication_year: Optional[int] = None


class CompositionUpdate(BaseModel):
    title: Optional[str] = None
    composer_name: Optional[str] = Field(None, alias="composer")
    work_name: Optional[str] = Field(None, alias="work")
    performers: Optional[str] = None
    composition_year: Optional[int] = None
    publication_year: Optional[int] = None
    notes: Optional[str] = None


class Composition(CompositionBase):
    id: int
    duration: int
    file_path: str
    work: Work

    class Config:
        from_attributes = True


class CompositionPage(BaseModel):
    total: int
    compositions: List[Composition]


class WorkInfo(BaseModel):
    name: str
    publication_year: Optional[int] = None
    cover_art_url: Optional[str] = None

    class Config:
        from_attributes = True


class BulkCompositionRequest(BaseModel):
    composition_ids: List[int]


class CompositionBulkUpdate(BaseModel):
    composition_ids: List[int]
    composer_name: Optional[str] = Field(None, alias="composer")
    work_name: Optional[str] = Field(None, alias="work")
    composition_year: Optional[int] = None
    publication_year: Optional[int] = None


class ComposerSimple(ComposerBase):
    id: int
    class Config:
        from_attributes = True

class WorkWithComposer(WorkBase):
    id: int
    composer: ComposerSimple
    class Config:
        from_attributes = True