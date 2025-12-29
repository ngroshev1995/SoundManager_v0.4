from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File
from sqlalchemy.orm import Session

from app import crud, models, schemas, utils
from app.api import deps
from app.db.session import get_db

router = APIRouter()


# 1. Эндпоинты без параметров (фиксированные пути)

@router.get("/system", response_model=List[schemas.Playlist])
def read_system_playlists(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    """
    Публичный эндпоинт: Получить список тематических подборок.
    """
    return crud.playlist.get_system_playlists(db, skip=skip, limit=limit)


@router.post("/", response_model=schemas.Playlist, status_code=status.HTTP_201_CREATED)
def create_playlist(
        *,
        db: Session = Depends(get_db),
        playlist_in: schemas.PlaylistCreate,
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Создает новый плейлист.
    """
    # Запрещаем обычным юзерам создавать системные плейлисты
    if playlist_in.is_system and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can create system playlists")

    playlist = crud.playlist.create_user_playlist(
        db=db, playlist_data=playlist_in, user_id=current_user.id
    )
    return playlist


@router.get("/", response_model=List[schemas.Playlist])
def read_playlists(
        db: Session = Depends(get_db),
        skip: int = 0,
        limit: int = 100,
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Возвращает список "Мои плейлисты" (только ЛИЧНЫЕ, исключая системные).
    """
    # --- ИЗМЕНЕНИЕ: Добавлен фильтр is_system == False ---
    playlists = db.query(models.Playlist).filter(
        models.Playlist.owner_id == current_user.id,
        models.Playlist.is_system == False
    ).offset(skip).limit(limit).all()
    # -----------------------------------------------------
    return playlists


# 2. Эндпоинты с параметрами (должны быть ниже фиксированных путей типа /system)

@router.post("/{playlist_id}/clone", response_model=schemas.Playlist)
def clone_existing_playlist(
        playlist_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
):
    """
    Копировать чужой или системный плейлист себе.
    """
    new_pl = crud.playlist.clone_playlist(db, original_playlist_id=playlist_id, new_owner_id=current_user.id)
    if not new_pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return new_pl


@router.get("/{playlist_id}", response_model=schemas.Playlist)
def read_playlist(
        playlist_id: int,
        db: Session = Depends(get_db),
        current_user: Optional[models.User] = Depends(deps.get_current_user_or_none)
) -> Any:
    """
    Возвращает конкретный плейлист по его ID.
    Доступен гостям, если is_system=True.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    # Логика доступа
    if playlist.is_system:
        return playlist

    # Если приватный - нужна авторизация и права владельца
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    if playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    return playlist


@router.put("/{playlist_id}", response_model=schemas.Playlist)
def update_playlist(
        playlist_id: int,
        playlist_in: schemas.PlaylistUpdate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Обновляет плейлист.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    if playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    # Только админ может менять статус is_system
    if playlist_in.is_system is not None and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can change system status")

    updated_playlist = crud.playlist.update_playlist(
        db, playlist_id=playlist_id, new_name=playlist_in.name
    )
    # Тут можно добавить обновление description и is_system, если расширить crud.update_playlist
    return updated_playlist


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(
        playlist_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
):
    """
    Удаляет плейлист.
    Возвращает 204 No Content, чтобы избежать ошибок сериализации удаленного объекта.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    if playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    crud.playlist.delete_playlist(db, playlist_id=playlist_id)

    # ВОТ ГЛАВНОЕ ИЗМЕНЕНИЕ: Возвращаем пустой ответ
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{playlist_id}/recordings/{recording_id}", response_model=schemas.Playlist)
def add_recording_to_playlist(
        playlist_id: int,
        recording_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    recording = crud.music.get_recording(db, recording_id=recording_id)
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

    updated_playlist = crud.playlist.add_recording_to_playlist(db, db_playlist=playlist, db_recording=recording)
    return updated_playlist


@router.post("/{playlist_id}/recordings-bulk-delete", response_model=schemas.Playlist)
def remove_multiple_recordings_from_playlist(
        playlist_id: int,
        recordings_in: schemas.music.BulkRecordingRequest,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    updated_playlist = crud.playlist.remove_recordings_from_playlist(
        db, playlist_id=playlist_id, recording_ids=recordings_in.recording_ids
    )
    if updated_playlist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found during recording removal")

    return updated_playlist


@router.delete("/{playlist_id}/recordings/{recording_id}", response_model=schemas.Playlist)
def remove_recording_from_playlist(
        playlist_id: int,
        recording_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    updated_playlist = crud.playlist.remove_recordings_from_playlist(
        db, playlist_id=playlist_id, recording_ids=[recording_id]
    )
    return updated_playlist


@router.put("/{playlist_id}/reorder", response_model=schemas.Playlist)
def reorder_playlist(
        playlist_id: int,
        recordings_in: schemas.music.BulkRecordingRequest,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
):
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    updated_playlist = crud.playlist.reorder_playlist_recordings(
        db, db_playlist=playlist, ordered_recording_ids=recordings_in.recording_ids
    )
    return updated_playlist

# --- УПРАВЛЕНИЕ ОБЛОЖКАМИ ---

@router.post("/{playlist_id}/cover", response_model=schemas.Playlist)
def upload_playlist_cover(
        playlist_id: int,
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
):
    """
    Загрузить или обновить обложку плейлиста/подборки.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Проверка прав:
    # 1. Если это системный плейлист (подборка) - только админ.
    # 2. Если личный плейлист - только владелец.
    if playlist.is_system:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can manage collection covers")
    else:
        if playlist.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    # Удаляем старую, если была
    if playlist.cover_image_url:
        utils.delete_file_by_url(playlist.cover_image_url)

    # Сохраняем новую (папка static/covers/playlists)
    url = utils.save_upload_file(file, "playlists", f"pl_{playlist_id}")

    playlist.cover_image_url = url
    db.commit()
    db.refresh(playlist)
    return playlist


@router.delete("/{playlist_id}/cover", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist_cover(
        playlist_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
):
    """
    Удалить обложку плейлиста.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Проверка прав (аналогично загрузке)
    if playlist.is_system:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can manage collection covers")
    else:
        if playlist.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    if playlist.cover_image_url:
        utils.delete_file_by_url(playlist.cover_image_url)
        playlist.cover_image_url = None
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)