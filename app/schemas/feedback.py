from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class FeedbackCreate(BaseModel):
    name: str
    email: EmailStr
    message: str

class Feedback(FeedbackCreate):
    id: int
    created_at: datetime
    is_read: bool
    user_id: Optional[int] = None

    class Config:
        from_attributes = True