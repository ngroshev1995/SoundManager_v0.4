from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import Levenshtein

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.music.Genre])
def get_all_genres(db: Session = Depends(get_db)):
    """Получить список всех жанров из базы."""
    return db.query(models.music.Genre).order_by(models.music.Genre.name).all()

@router.post("/check-create", response_model=schemas.music.Genre)
def check_and_create_genre(
    genre_in: schemas.music.GenreCreate,
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    """
    Проверяет жанр на дубликаты/опечатки и создает, если он уникален.
    Возвращает существующий или только что созданный объект жанра.
    """
    clean_name = genre_in.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Genre name cannot be empty")

    # 1. Точный поиск (без учета регистра)
    existing_genre = db.query(models.music.Genre).filter(models.music.Genre.name.ilike(clean_name)).first()
    if existing_genre:
        return existing_genre

    # 2. Поиск опечаток (расстояние Левенштейна)
    all_genres = db.query(models.music.Genre).all()
    for genre in all_genres:
        distance = Levenshtein.distance(clean_name.lower(), genre.name.lower())
        # Если слово короткое, нужна 1 опечатка, если длинное - 2
        threshold = 1 if len(clean_name) < 8 else 2
        if distance <= threshold:
            raise HTTPException(
                status_code=409, # Conflict
                detail=f"Жанр '{clean_name}' очень похож на существующий: '{genre.name}'. Возможно, это опечатка."
            )

    # 3. Если все проверки пройдены - создаем
    new_genre = models.music.Genre(name=clean_name)
    db.add(new_genre)
    db.commit()
    db.refresh(new_genre)
    return new_genre


@router.post("/check-typo", response_model=schemas.music.GenreTypoCheck)
def check_genre_typo(
        genre_in: schemas.music.GenreCreate,
        db: Session = Depends(get_db)
):
    """
    Проверяет жанр на опечатки и возвращает похожий, если найден.
    """
    clean_name = genre_in.name.strip()
    if not clean_name:
        return {"similar": None}

    # Поиск опечаток
    all_genres = db.query(models.music.Genre).all()
    for genre in all_genres:
        # Игнорируем точное совпадение (без учета регистра)
        if clean_name.lower() == genre.name.lower():
            continue

        distance = Levenshtein.distance(clean_name.lower(), genre.name.lower())
        threshold = 1 if len(clean_name) < 8 else 2
        if distance <= threshold:
            return {"similar": genre.name}

    return {"similar": None}