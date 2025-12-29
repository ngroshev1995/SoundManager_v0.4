from pydantic import BaseModel
from typing import List, Optional
from .music import Recording

class PlaylistBase(BaseModel):
    name: str
    description: Optional[str] = None

class PlaylistCreate(PlaylistBase):
    is_system: bool = False

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_system: Optional[bool] = None

class Playlist(PlaylistBase):
    id: int
    owner_id: int
    is_system: Optional[bool] = False
    is_from_collection: bool = False
    cover_image_url: Optional[str] = None
    recordings: List[Recording] = []

    class Config:
        from_attributes = True