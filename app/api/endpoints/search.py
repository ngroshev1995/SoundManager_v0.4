from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api import deps
from app.db.session import get_db
from typing import List, Optional
from sqlalchemy import func
import re
from thefuzz import fuzz
from app.utils import switch_keyboard_layout

router = APIRouter()


def normalize_text_smart(text: Optional[str]) -> str:
    """
    1. Приводит к нижнему регистру.
    2. Вставляет пробелы между буквами и цифрами (kv525 -> kv 525).
    3. Удаляет лишние спецсимволы.
    """
    if not text:
        return ""
    text = text.lower()
    # Вставляем пробел между буквой и цифрой (kv525 -> kv 525)
    text = re.sub(r'([a-zа-яё])(\d)', r'\1 \2', text)
    # Вставляем пробел между цифрой и буквой (525kv -> 525 kv)
    text = re.sub(r'(\d)([a-zа-яё])', r'\1 \2', text)
    # Заменяем все не-буквы и не-цифры на пробелы
    text = re.sub(r'[^\w\d]+', ' ', text)
    return text.strip()


def is_fuzzy_match(target_text: str, query_tokens: List[str]) -> bool:
    """
    Проверяет нечеткое вхождение токенов.
    Позволяет опечатки (ratio > 80).
    """
    if not target_text:
        return False

    # Нормализуем цель (разбиваем kv525 -> kv 525)
    norm_target = normalize_text_smart(target_text)

    for token in query_tokens:
        # 1. Точное вхождение (быстро и надежно)
        if token in norm_target:
            continue

        # 2. Нечеткое вхождение (для опечаток: сната -> соната)
        # partial_ratio ищет лучшее вхождение подстроки
        score = fuzz.partial_ratio(token, norm_target)

        # Если слово короткое (< 4 букв), требуем точного совпадения или очень высокого скора
        if len(token) < 4:
            if score < 100: return False
        # Для длинных слов допускаем опечатки (порог 80/100)
        elif score < 80:
            return False

    return True


@router.get("/", response_model=schemas.search.SearchResults)
def universal_search(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return schemas.search.SearchResults(query=q)

    # 1. Подготовка запроса
    original_q = q.strip()
    switched_q = switch_keyboard_layout(original_q)

    # Разбиваем на токены с учетом "умной" нормализации (kv525 -> [kv, 525])
    tokens_orig = normalize_text_smart(original_q).split()
    tokens_switched = normalize_text_smart(switched_q).split()

    # Функция-хелпер
    def check_obj(obj_texts: List[Optional[str]]) -> bool:
        full_text = " ".join([t for t in obj_texts if t])

        if is_fuzzy_match(full_text, tokens_orig):
            return True
        if tokens_orig != tokens_switched and is_fuzzy_match(full_text, tokens_switched):
            return True
        return False

    # 2. Поиск Композиторов
    all_composers = db.query(models.music.Composer).all()
    found_composers = [
                          c for c in all_composers
                          if check_obj([c.name_ru, c.original_name])
                      ][:10]

    # 3. Поиск Произведений (Расширенные поля)
    all_works = db.query(models.music.Work).options(joinedload(models.music.Work.composer)).all()
    found_works = [
                      w for w in all_works
                      if check_obj([
            w.name_ru, w.original_name, w.nickname,
            w.catalog_number, str(w.publication_year or ''),
            w.composer.name_ru  # Ищем и по композитору тоже
        ])
                  ][:20]

    # 4. Поиск Частей
    all_compositions = db.query(models.music.Composition).options(
        joinedload(models.music.Composition.work).joinedload(models.music.Work.composer)
    ).all()

    found_compositions = [
                             c for c in all_compositions
                             if check_obj([
            c.title_ru, c.title_original, c.catalog_number,
            c.work.name_ru  # Контекст произведения
        ])
                         ][:20]

    # 5. Поиск Записей
    all_recordings = db.query(models.music.Recording).options(
        joinedload(models.music.Recording.composition)
        .joinedload(models.music.Composition.work)
        .joinedload(models.music.Work.composer)
    ).all()

    found_recordings = [
                           r for r in all_recordings
                           if check_obj([
            r.performers, r.conductor, r.lead_performer,
            str(r.recording_year or ''),
            r.composition.title_ru,  # Название части
            r.composition.work.name_ru,  # Название произведения
            r.composition.work.nickname  # Прозвище
        ])
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