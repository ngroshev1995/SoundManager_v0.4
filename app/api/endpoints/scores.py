from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas
from app.api import deps
from app.db.session import get_db
from app.models.score import Score

router = APIRouter()


@router.post("/", response_model=schemas.Score)
def create_score(
        score_in: schemas.ScoreCreate,
        db: Session = Depends(get_db),
        u: models.User = Depends(deps.get_current_active_admin)
):
    """
    Добавить ссылку на ноты.
    """
    if not score_in.work_id and not score_in.composition_id:
        raise HTTPException(400, "Must be attached to a work or composition")

    db_obj = Score(**score_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/{score_id}", response_model=schemas.Score)
def update_score(
        score_id: int,
        score_in: schemas.ScoreUpdate,
        db: Session = Depends(get_db),
        u: models.User = Depends(deps.get_current_active_admin)
):
    """
    Обновить информацию о нотах.
    """
    score = db.query(Score).get(score_id)
    if not score:
        raise HTTPException(404, "Score not found")

    # Явно обновляем каждое поле, если оно было передано в запросе
    update_data = score_in.dict(exclude_unset=True)

    if "score_type" in update_data:
        score.score_type = update_data["score_type"]
    if "editor" in update_data:
        score.editor = update_data["editor"]
    if "license" in update_data:
        score.license = update_data["license"]
    if "source_text" in update_data:
        score.source_text = update_data["source_text"]
    if "url" in update_data:
        score.url = update_data["url"]

    db.add(score)
    db.commit()
    db.refresh(score)
    return score


@router.delete("/{score_id}", status_code=204)
def delete_score(
        score_id: int,
        db: Session = Depends(get_db),
        u: models.User = Depends(deps.get_current_active_admin)
):
    score = db.query(Score).get(score_id)
    if not score:
        raise HTTPException(404, "Score not found")

    db.delete(score)
    db.commit()
    return