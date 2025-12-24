from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, crud
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.post("/send", status_code=status.HTTP_201_CREATED)
def send_feedback_message(
    *,
    db: Session = Depends(get_db),
    feedback_in: schemas.feedback.FeedbackCreate,
    token: Optional[str] = Depends(deps.reusable_oauth2)
):
    """
    Публичный эндпоинт для отправки сообщения.
    """
    user_id = None
    if token:
        user = deps.get_user_from_token(db=db, token=token)
        if user:
            user_id = user.id

    crud.feedback.create_feedback(db=db, feedback_in=feedback_in, user_id=user_id)
    return {"message": "Спасибо за ваше сообщение! Мы скоро с вами свяжемся."}


@router.get("/", response_model=List[schemas.feedback.Feedback])
def read_feedback_messages(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Получить все сообщения (только для админа).
    """
    messages = crud.feedback.get_feedback_messages(db, skip=skip, limit=limit)
    return messages


# --- ПЕРЕМЕЩЕНО СЮДА ---
@router.get("/unread-count", response_model=int)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Получить количество непрочитанных сообщений (только для админа).
    """
    return crud.feedback.count_unread_messages(db)
# -----------------------


@router.get("/{message_id}", response_model=schemas.feedback.Feedback)
def read_feedback_message(
        message_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Получить одно сообщение по ID (только для админа).
    """
    message = crud.feedback.get_message_by_id(db, message_id=message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")

    if not message.is_read:
        crud.feedback.mark_as_read(db, message=message)

    return message


@router.patch("/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Пометить сообщение как прочитанное (только для админа).
    """
    message = crud.feedback.get_message_by_id(db, message_id=message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    crud.feedback.mark_as_read(db, message=message)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feedback_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Удалить сообщение (только для админа).
    """
    if not crud.feedback.delete_message(db, message_id=message_id):
        raise HTTPException(status_code=404, detail="Сообщение не найдено")


@router.patch("/{message_id}/unread", status_code=status.HTTP_204_NO_CONTENT)
def mark_message_as_unread(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Пометить сообщение как НЕпрочитанное (только для админа).
    """
    message = crud.feedback.get_message_by_id(db, message_id=message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    crud.feedback.mark_as_unread(db, message=message)