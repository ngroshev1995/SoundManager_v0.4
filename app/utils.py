from slugify import slugify
from sqlalchemy.orm import Session
from typing import Type
import uuid
import os
import shutil
from pathlib import Path
from fastapi import UploadFile
from PIL import Image, ImageOps

COVERS_DIR = Path("static/covers")
COVERS_DIR.mkdir(parents=True, exist_ok=True)

def generate_unique_slug(db: Session, model: Type, base_text: str, old_slug: str = None) -> str:
    """
    Генерирует уникальный slug. Если занят, добавляет хеш.
    """
    if not base_text:
        return str(uuid.uuid4())[:8]

    slug = slugify(base_text)

    if old_slug and slug == old_slug:
        return slug

    obj = db.query(model).filter(model.slug == slug).first()

    if obj:
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"

    return slug


def save_upload_file(upload_file: UploadFile, subfolder: str, prefix: str) -> str:
    """
    Сохраняет файл с сжатием и изменением размера (через Pillow).
    """

    folder = COVERS_DIR / subfolder
    folder.mkdir(parents=True, exist_ok=True)

    filename = f"{prefix}_{uuid.uuid4()}.jpg"
    file_path = folder / filename

    try:
        image = Image.open(upload_file.file)
        image = ImageOps.exif_transpose(image)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        max_size = (1200, 1200)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        image.save(file_path, format="JPEG", quality=80, optimize=True)

    except Exception as e:
        print(f"Error compressing image: {e}")
        upload_file.file.seek(0)
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

    return f"/static/covers/{subfolder}/{filename}"


def delete_file_by_url(url: str):
    """Удаляет файл по URL (если он существует)"""
    if not url: return

    clean_path = url.lstrip("/")

    try:
        if os.path.exists(clean_path):
            os.remove(clean_path)
            print(f"Deleted old cover: {clean_path}")
    except Exception as e:
        print(f"Error deleting cover {clean_path}: {e}")