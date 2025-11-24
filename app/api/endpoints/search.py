# app/api/endpoints/search.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api import deps
from app.db.session import get_db
from typing import List, Optional

router = APIRouter()


def is_match(text: Optional[str], term: str) -> bool:
    """Проверяет вхождение строки (регистронезависимо)"""
    if not text:
        return False
    return term in text.lower()


@router.get("/", response_model=schemas.search.SearchResults)
def universal_search(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return schemas.search.SearchResults(query=q)

    search_term = q.lower().strip()

    # 1. Композиторы (ищем в RU и Orig)
    all_composers = db.query(models.music.Composer).all()
    found_composers = [
                          c for c in all_composers
                          if is_match(c.name_ru, search_term) or
                             is_match(c.original_name, search_term)
                      ][:10]

    # 2. Произведения (ищем в RU и Orig)
    all_works = db.query(models.music.Work).options(joinedload(models.music.Work.composer)).all()
    found_works = [
                      w for w in all_works
                      if is_match(w.name_ru, search_term) or
                         is_match(w.original_name, search_term)
                  ][:20]

    # 3. Части (Compositions) - Ищем по названию части
    all_compositions = db.query(models.music.Composition).options(
        joinedload(models.music.Composition.work).joinedload(models.music.Work.composer)
    ).all()

    found_compositions = [
                             c for c in all_compositions
                             if is_match(c.title_ru, search_term) or
                                is_match(c.title_original, search_term) or
                                is_match(c.catalog_number, search_term)
                         ][:20]

    # 4. Записи (Ищем по исполнителям)
    # (Поиск по названию произведения уже покрыт пунктами 2 и 3,
    # здесь ищем именно исполнения)
    all_recordings = db.query(models.music.Recording).options(
        joinedload(models.music.Recording.composition)
        .joinedload(models.music.Composition.work)
        .joinedload(models.music.Work.composer)
    ).all()

    found_recordings = [
                           r for r in all_recordings
                           if is_match(r.performers, search_term)
                       ][:50]

    return schemas.search.SearchResults(
        query=q,
        composers=found_composers,
        works=found_works,
        compositions=found_compositions,
        recordings=found_recordings
    )