from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core import config
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False
)

def get_current_user(
        db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, config.SECRET_KEY, algorithms=[config.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = crud.user.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


def get_current_active_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_current_user_or_none(
        db: Session = Depends(get_db), token: Optional[str] = Depends(reusable_oauth2)
) -> Optional[models.User]:
    """
    Возвращает объект пользователя, если токен валиден, иначе возвращает None.
    Не выбрасывает исключение, если токен отсутствует или невалиден.
    """
    if token is None:
        return None
    try:
        payload = jwt.decode(
            token, config.SECRET_KEY, algorithms=[config.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            return None
        token_data = schemas.TokenData(email=email)
    except (JWTError, ValueError):
        # ValueError может возникнуть, если токен пустой или некорректный
        return None

    user = crud.user.get_user_by_email(db, email=token_data.email)
    return user


def get_user_from_token(db: Session, token: str) -> Optional[models.User]:
    """
    Декодирует токен и возвращает пользователя, если он валиден.
    Возвращает None в случае любой ошибки.
    """
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except (JWTError, ValueError):
        return None

    user = crud.user.get_user_by_email(db, email=email)
    return user