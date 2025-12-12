from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int
    class Config:
        from_attributes = True

class PostBase(BaseModel):
    title: str
    slug: str
    content: str
    summary: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None

class PostCreate(PostBase):
    tags: Optional[List[str]] = []

class PostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = []

class Post(PostBase):
    id: int
    cover_image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: List[Tag] = []

    class Config:
        from_attributes = True