from typing import Optional
from sqlalchemy.orm import Session
from app.models.feedback import FeedbackMessage
from app.schemas.feedback import FeedbackCreate

def create_feedback(db: Session, *, feedback_in: FeedbackCreate, user_id: Optional[int] = None) -> FeedbackMessage:
    db_obj = FeedbackMessage(
        name=feedback_in.name,
        email=feedback_in.email,
        message=feedback_in.message,
        user_id=user_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_feedback_messages(db: Session, skip: int = 0, limit: int = 100):
    return db.query(FeedbackMessage).order_by(FeedbackMessage.id.desc()).offset(skip).limit(limit).all()

def count_unread_messages(db: Session) -> int:
    return db.query(FeedbackMessage).filter(FeedbackMessage.is_read == False).count()

# --- ДОБАВЛЕННЫЕ НЕДОСТАЮЩИЕ ФУНКЦИИ ---
def get_message_by_id(db: Session, message_id: int) -> Optional[FeedbackMessage]:
    return db.query(FeedbackMessage).filter(FeedbackMessage.id == message_id).first()

def mark_as_read(db: Session, message: FeedbackMessage) -> FeedbackMessage:
    message.is_read = True
    db.commit()
    return message

def delete_message(db: Session, message_id: int) -> bool:
    message = get_message_by_id(db, message_id=message_id)
    if message:
        db.delete(message)
        db.commit()
        return True
    return False


def mark_as_unread(db: Session, message: FeedbackMessage) -> FeedbackMessage:
    message.is_read = False
    db.commit()
    return message