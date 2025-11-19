# app/api/endpoints/search.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api import deps
from app.db.session import get_db
from typing import List, Optional

router = APIRouter()

def is_match(text: Optional[str], term: str) -> bool:
    """Вспомогательная функция для регистронезависимого сравнения в Python."""
    if text is None:
        return False
    return term in text.casefold()

@router.get("/", response_model=schemas.search.SearchResults)
def universal_search(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return schemas.search.SearchResults(query=q)

    # Приводим поисковый запрос к нижнему регистру ОДИН раз
    search_term = q.casefold()

    # --- ИЗМЕНЕНИЕ: Загружаем все данные и фильтруем в Python ---

    # 1. Поиск Композиторов
    all_composers = db.query(models.music.Composer).all()
    found_composers = [
        c for c in all_composers
        if is_match(c.name, search_term) or
           is_match(c.name_ru, search_term) or
           is_match(c.original_name, search_term)
    ][:10] # Ограничиваем результат

    # 2. Поиск Произведений
    all_works = db.query(models.music.Work).options(joinedload(models.music.Work.composer)).all()
    found_works = [
        w for w in all_works
        if is_match(w.name, search_term) or
           is_match(w.name_ru, search_term) or
           is_match(w.original_name, search_term)
    ][:20]

    # 3. Поиск Записей
    all_recordings = db.query(models.music.Recording).options(
        joinedload(models.music.Recording.composition)
        .joinedload(models.music.Composition.work)
        .joinedload(models.music.Work.composer)
    ).all()
    found_recordings = [
        r for r in all_recordings
        if is_match(r.performers, search_term) or
           (r.composition and (
               is_match(r.composition.title, search_term) or
               is_match(r.composition.title_ru, search_term) or
               is_match(r.composition.title_original, search_term)
           ))
    ][:50]

    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

    return schemas.search.SearchResults(
        query=q,
        composers=found_composers,
        works=found_works,
        recordings=found_recordings
    )