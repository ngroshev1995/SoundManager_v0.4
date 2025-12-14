from sqlalchemy.orm import Session
from typing import List, Optional

from app.models import playlist, user, music
from app.schemas.playlist import PlaylistCreate
from app.db.base import PlaylistRecording


def get_playlist(db: Session, playlist_id: int) -> Optional[playlist.Playlist]:
    return db.query(playlist.Playlist).filter(playlist.Playlist.id == playlist_id).first()


def create_user_playlist(db: Session, playlist_data: PlaylistCreate, user_id: int) -> playlist.Playlist:
    db_playlist = playlist.Playlist(name=playlist_data.name, owner_id=user_id)
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    return db_playlist


def add_recording_to_playlist(db: Session, db_playlist: playlist.Playlist,
                              db_recording: music.Recording) -> playlist.Playlist:
    for assoc in db_playlist.recording_associations:
        if assoc.recording_id == db_recording.id:
            return db_playlist

    max_order = 0
    if db_playlist.recording_associations:
        max_order = max(assoc.recording_order for assoc in db_playlist.recording_associations)

    new_association = PlaylistRecording(
        playlist=db_playlist,
        recording=db_recording,
        recording_order=max_order + 1
    )
    db.add(new_association)
    db.commit()
    db.refresh(db_playlist)
    return db_playlist


def remove_recordings_from_playlist(db: Session, playlist_id: int, recording_ids: List[int]) -> Optional[
    playlist.Playlist]:
    db_playlist = get_playlist(db, playlist_id)
    if not db_playlist: return None

    associations_to_remove = [
        assoc for assoc in db_playlist.recording_associations if assoc.recording_id in recording_ids
    ]

    if not associations_to_remove: return db_playlist

    for assoc in associations_to_remove:
        db.delete(assoc)

    db.commit()
    db.refresh(db_playlist)
    return db_playlist


def reorder_playlist_recordings(db: Session, db_playlist: playlist.Playlist,
                                ordered_recording_ids: List[int]) -> playlist.Playlist:
    assoc_map = {assoc.recording_id: assoc for assoc in db_playlist.recording_associations}

    for index, recording_id in enumerate(ordered_recording_ids):
        if recording_id in assoc_map:
            assoc_map[recording_id].recording_order = index + 1

    db.commit()
    db.refresh(db_playlist)
    return db_playlist


def delete_playlist(db: Session, playlist_id: int) -> Optional[playlist.Playlist]:
    db_playlist = get_playlist(db, playlist_id)
    if not db_playlist: return None
    db.delete(db_playlist)
    db.commit()
    return db_playlist


def update_playlist(db: Session, playlist_id: int, new_name: str) -> Optional[playlist.Playlist]:
    db_playlist = get_playlist(db, playlist_id)
    if not db_playlist: return None
    db_playlist.name = new_name
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    return db_playlist


def get_playlists_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[playlist.Playlist]:
    return db.query(playlist.Playlist).filter(playlist.Playlist.owner_id == user_id).offset(skip).limit(limit).all()