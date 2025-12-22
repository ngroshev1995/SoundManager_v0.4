from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdateProfile
from app.security import get_password_hash


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user: UserCreate) -> User:
    default_display_name = user.email.split('@')[0]
    db_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        display_name=default_display_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, db_obj: User, obj_in: UserUpdateProfile) -> User:
    """
    Обновляет отображаемое имя пользователя.
    """
    # Мы обновляем только одно поле, поэтому делаем это явно
    if obj_in.display_name is not None:
        db_obj.display_name = obj_in.display_name

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj