from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app import models, schemas, crud, utils
from app.api import deps
from app.security import get_password_hash, verify_password

router = APIRouter()


@router.get("/me", response_model=schemas.UserAccount)
def read_user_me(
        current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user profile with stats.
    """
    stats = schemas.UserStats(
        favorites_count=len(current_user.favorite_recordings),
        playlists_count=len(current_user.playlists)
    )
    user_data = {
        "email": current_user.email,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at,
        "stats": stats
    }
    return schemas.UserAccount.model_validate(user_data)


@router.put("/me", response_model=schemas.UserAccount)
def update_user_me(
        *,
        db: Session = Depends(deps.get_db),
        user_in: schemas.UserUpdateProfile,
        current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update own user profile (display_name).
    """
    # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    # Вызываем правильную функцию из crud_user.py
    user = crud.user.update_user(db=db, db_obj=current_user, obj_in=user_in)
    # --------------------------

    stats = schemas.UserStats(
        favorites_count=len(user.favorite_recordings),
        playlists_count=len(user.playlists)
    )
    user_data = {
        "email": user.email,
        "display_name": user.display_name,
        "is_admin": user.is_admin,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at,
        "stats": stats
    }
    return schemas.UserAccount.model_validate(user_data)


@router.post("/me/change-password")
def change_user_password(
        *,
        db: Session = Depends(deps.get_db),
        passwords: schemas.UserPasswordChange,
        current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Change own password.
    """
    if not verify_password(passwords.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )
    if len(passwords.new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен быть не менее 4 символов",
        )

    hashed_password = get_password_hash(passwords.new_password)
    current_user.hashed_password = hashed_password
    db.add(current_user)
    db.commit()

    return {"message": "Пароль успешно изменен"}


@router.get("/me/favorites", response_model=List[schemas.music.Recording])
def read_user_favorite_recordings(
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Get user's favorite recordings.
    """
    return current_user.favorite_recordings


@router.post("/me/avatar")
def upload_user_avatar(
        file: UploadFile = File(...),
        db: Session = Depends(deps.get_db),
        current_user: models.User = Depends(deps.get_current_user),
):
    """
    Upload or replace user avatar.
    """
    # 1. Удаляем старый аватар, если он есть
    if current_user.avatar_url:
        utils.delete_file_by_url(current_user.avatar_url)

    # 2. Сохраняем новый через утилиту (она сама сожмет и сгенерирует имя)
    # Файлы будут лежать в static/covers/avatars (единый стиль с обложками)
    url = utils.save_upload_file(file, "avatars", f"user_{current_user.id}")

    # 3. Обновляем БД
    current_user.avatar_url = url
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"avatar_url": current_user.avatar_url}


@router.delete("/me/avatar")
def delete_user_avatar(
        db: Session = Depends(deps.get_db),
        current_user: models.User = Depends(deps.get_current_user),
):
    """
    Delete user avatar from disk and DB.
    """
    if current_user.avatar_url:
        utils.delete_file_by_url(current_user.avatar_url)

    current_user.avatar_url = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"message": "Avatar deleted"}