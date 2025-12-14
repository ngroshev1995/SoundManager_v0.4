import shutil
from pathlib import Path
from fastapi import UploadFile
from mutagen import File as MutagenFile
from sqlalchemy.orm import Session
import hashlib

from app.schemas.music import RecordingCreate
from app import crud

MUSIC_DIR = Path("static/music")
COVERS_DIR = Path("static/covers/recordings")
WORKS_COVERS_DIR = Path("static/covers/works")
MUSIC_DIR.mkdir(parents=True, exist_ok=True)
COVERS_DIR.mkdir(parents=True, exist_ok=True)
WORKS_COVERS_DIR.mkdir(parents=True, exist_ok=True)


def calculate_file_hash(file_path: Path) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def save_and_process_audio(db: Session, upload_file: UploadFile):
    """
    Сохраняет аудиофайл, извлекает ТОЛЬКО длительность и хэш.
    Метаданные полностью игнорируются.
    """
    temp_dir = Path("temp_uploads")
    temp_dir.mkdir(exist_ok=True)
    temp_path = temp_dir / upload_file.filename

    try:
        with temp_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        file_hash = calculate_file_hash(temp_path)

        duration = 0
        try:
            audio = MutagenFile(temp_path)
            if audio:
                duration = int(audio.info.length)
        except Exception as e:
            print(f"[ERROR] Could not read duration for {upload_file.filename}: {e}")

        return temp_path, duration, file_hash

    finally:
        upload_file.file.close()