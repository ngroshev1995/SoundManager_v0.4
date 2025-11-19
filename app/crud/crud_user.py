from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.security import get_password_hash


def get_user_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user: UserCreate) -> User:
    db_user = User(
        email=user.email,
        hashed_password=user.password
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
