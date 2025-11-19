from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()


@router.post("/", response_model=schemas.Playlist, status_code=status.HTTP_201_CREATED)
def create_playlist(
        *,
        db: Session = Depends(get_db),
        playlist_in: schemas.PlaylistCreate,
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Создает новый плейлист для текущего пользователя.
    """
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
    Возвращает список плейлистов, принадлежащих текущему пользователю.
    """
    playlists = crud.playlist.get_playlists_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return playlists


@router.get("/{playlist_id}", response_model=schemas.Playlist)
def read_playlist(
        playlist_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Возвращает конкретный плейлист по его ID.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
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
    Обновляет имя плейлиста.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    if playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    if not playlist_in.name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New name not provided")

    updated_playlist = crud.playlist.update_playlist(
        db, playlist_id=playlist_id, new_name=playlist_in.name
    )
    return updated_playlist


@router.delete("/{playlist_id}", response_model=schemas.Playlist)
def delete_playlist(
        playlist_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Удаляет плейлист.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    # ИСПРАВЛЕНИЕ: Добавлена проверка владельца
    if playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    deleted_playlist = crud.playlist.delete_playlist(db, playlist_id=playlist_id)
    return deleted_playlist


@router.post("/{playlist_id}/recordings/{recording_id}", response_model=schemas.Playlist)
def add_recording_to_playlist(
        playlist_id: int,
        recording_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Добавляет одну запись (Recording) в плейлист.
    """
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
    """
    Удаляет несколько записей (Recordings) из плейлиста.
    """
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
    """
    Удаляет одну запись (Recording) из плейлиста.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    # Для простоты и консистентности вызываем bulk-метод с одним ID
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
    """
    Обновляет порядок записей в плейлисте.
    """
    playlist = crud.playlist.get_playlist(db, playlist_id=playlist_id)
    if not playlist or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    updated_playlist = crud.playlist.reorder_playlist_recordings(
        db, db_playlist=playlist, ordered_recording_ids=recordings_in.recording_ids
    )
    return updated_playlist