from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.get("/me/favorites", response_model=List[schemas.music.Recording])
def read_user_favorite_recordings(
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    return current_user.favorite_recordings