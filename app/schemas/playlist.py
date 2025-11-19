# app/schemas/playlist.py
from pydantic import BaseModel
from typing import List, Optional
from .music import Recording # Изменено

class PlaylistBase(BaseModel):
    name: str

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None

class Playlist(PlaylistBase):
    id: int
    owner_id: int
    recordings: List[Recording] = [] # Изменено

    class Config:
        from_attributes = True