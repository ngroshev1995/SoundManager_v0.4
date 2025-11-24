from slugify import slugify
from sqlalchemy.orm import Session
from typing import Type
import uuid
import os
import shutil
from pathlib import Path
from fastapi import UploadFile

COVERS_DIR = Path("static/covers")
COVERS_DIR.mkdir(parents=True, exist_ok=True)

def generate_unique_slug(db: Session, model: Type, base_text: str, old_slug: str = None) -> str:
    """
    Генерирует уникальный slug. Если занят - добавляет хеш.
    """
    if not base_text:
        return str(uuid.uuid4())[:8]

    # Транслитерация: "Чайковский" -> "tchaikovsky"
    slug = slugify(base_text)

    if old_slug and slug == old_slug:
        return slug

    # Проверка на уникальность
    # Пытаемся найти такой же slug в БД
    obj = db.query(model).filter(model.slug == slug).first()

    # Если существует и это не тот же самый объект - добавляем уникальность
    if obj:
        # Простая стратегия: добавляем короткий хеш
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"

    return slug


def save_upload_file(upload_file: UploadFile, subfolder: str, prefix: str) -> str:
    """Сохраняет файл и возвращает URL"""
    folder = COVERS_DIR / subfolder
    folder.mkdir(parents=True, exist_ok=True)

    # Генерируем уникальное имя (чтобы избежать кеширования браузером)
    import uuid
    ext = Path(upload_file.filename).suffix
    if not ext: ext = ".jpg"
    filename = f"{prefix}_{uuid.uuid4()}{ext}"

    file_path = folder / filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    # Возвращаем путь от корня static (для URL)
    return f"/static/covers/{subfolder}/{filename}"


def delete_file_by_url(url: str):
    """Удаляет файл по URL (если он существует)"""
    if not url: return

    # URL: /static/covers/works/image.jpg -> Path: static/covers/works/image.jpg
    # Убираем первый слэш
    clean_path = url.lstrip("/")

    try:
        if os.path.exists(clean_path):
            os.remove(clean_path)
            print(f"Deleted old cover: {clean_path}")
    except Exception as e:
        print(f"Error deleting cover {clean_path}: {e}")