# app/schemas/dashboard.py
from pydantic import BaseModel
from typing import List, Optional

# Локальные мини-схемы, чтобы не зависеть от music.py и его рекурсий
class DashComposer(BaseModel):
    id: int
    name: Optional[str] = None
    name_ru: Optional[str] = None
    class Config:
        from_attributes = True

class DashWork(BaseModel):
    id: int
    name: Optional[str] = None
    name_ru: Optional[str] = None
    cover_art_url: Optional[str] = None
    publication_year: Optional[int] = None
    publication_year_end: Optional[int] = None
    composer: DashComposer
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_recordings: int
    total_compositions: int
    total_works: int
    total_composers: int
    class Config:
        from_attributes = True

class DashboardSummary(BaseModel):
    stats: DashboardStats
    recently_added_works: List[DashWork]
    random_works: List[DashWork]
    class Config:
        from_attributes = True