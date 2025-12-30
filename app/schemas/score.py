from pydantic import BaseModel, HttpUrl
from typing import Optional

class ScoreBase(BaseModel):
    score_type: str
    editor: Optional[str] = None
    license: Optional[str] = None
    source_text: str  # Анкор (например: "IMSLP", "Нотный архив")
    url: str          # Ссылка (например: "https://imslp.org/...")

class ScoreCreate(ScoreBase):
    work_id: Optional[int] = None
    composition_id: Optional[int] = None

class ScoreUpdate(BaseModel):
    score_type: Optional[str] = None
    editor: Optional[str] = None
    license: Optional[str] = None
    source_text: Optional[str] = None
    url: Optional[str] = None

class Score(ScoreBase):
    id: int
    work_id: Optional[int] = None
    composition_id: Optional[int] = None

    class Config:
        from_attributes = True