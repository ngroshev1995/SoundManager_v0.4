from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserStats(BaseModel):
    favorites_count: int
    playlists_count: int

class UserAccount(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool
    created_at: datetime
    stats: UserStats

    class Config:
        from_attributes = True

class UserUpdateProfile(BaseModel):
    display_name: Optional[str] = None

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool = False
    display_name: Optional[str] = None

    class Config:
        from_attributes = True