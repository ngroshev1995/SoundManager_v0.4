from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api import deps
from app.db.session import get_db
from typing import List, Optional
from sqlalchemy import func
import re
from thefuzz import fuzz

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

    all_composers = db.query(models.music.Composer).all()
    found_composers = [
                          c for c in all_composers
                          if is_match(c.name_ru, search_term) or
                             is_match(c.original_name, search_term)
                      ][:10]

    all_works = db.query(models.music.Work).options(joinedload(models.music.Work.composer)).all()
    found_works = [
                      w for w in all_works
                      if is_match(w.name_ru, search_term) or
                         is_match(w.original_name, search_term) or
                         is_match(w.nickname, search_term)
                  ][:20]

    all_compositions = db.query(models.music.Composition).options(
        joinedload(models.music.Composition.work).joinedload(models.music.Work.composer)
    ).all()

    found_compositions = [
                             c for c in all_compositions
                             if is_match(c.title_ru, search_term) or
                                is_match(c.title_original, search_term) or
                                is_match(c.catalog_number, search_term)
                         ][:20]

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


def normalize_for_comparison(text: str) -> str:
    """Очищает строку для сравнения, удаляя лишние символы и слова."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace('ё', 'е')
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


@router.get("/check-duplicates", response_model=List[schemas.music.WorkSimple])
def check_for_duplicates(
        entity_type: str = Query(..., description="Тип сущности: composer, work, composition"),
        query: str = Query(..., min_length=3, description="Поисковый запрос"),
        composer_id: Optional[int] = Query(None),
        work_id: Optional[int] = Query(None),
        db: Session = Depends(get_db),
):
    """Ищет похожие сущности для проверки на дубликаты, используя нечеткий поиск."""
    normalized_query = normalize_for_comparison(query)
    if not normalized_query:
        return []

    duplicates = []

    SIMILARITY_THRESHOLD = 85

    if entity_type == "composer":
        all_items = db.query(models.music.Composer).all()
        for c in all_items:
            score = fuzz.partial_ratio(normalized_query, normalize_for_comparison(c.name_ru))
            if score >= SIMILARITY_THRESHOLD:
                duplicates.append({"id": c.id, "name_ru": c.name_ru, "slug": c.slug})

    elif entity_type == "work" and composer_id:
        all_items = db.query(models.music.Work).filter(models.music.Work.composer_id == composer_id).all()
        for w in all_items:
            score = fuzz.partial_ratio(normalized_query, normalize_for_comparison(w.name_ru))
            if score >= SIMILARITY_THRESHOLD:
                duplicates.append({"id": w.id, "name_ru": w.name_ru, "slug": w.slug})

    elif entity_type == "composition" and work_id:
        all_items = db.query(models.music.Composition).filter(models.music.Composition.work_id == work_id).all()
        for c in all_items:
            score = fuzz.partial_ratio(normalized_query, normalize_for_comparison(c.title_ru))
            if score >= SIMILARITY_THRESHOLD:
                duplicates.append({"id": c.id, "name_ru": c.title_ru, "slug": c.slug})

    return duplicates[:5]