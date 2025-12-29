from app.utils import generate_unique_slug, delete_file_by_url

import os
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, String, and_

from app import models, schemas


# --- Helper ---
def _delete_physical_files(file_paths: List[str]):
    """
    Удаляет физические файлы.
    """
    for path in file_paths:
        try:
            clean_path = path.lstrip("/")
            if os.path.exists(clean_path):
                os.remove(clean_path)
                print(f"Deleted file: {clean_path}")
        except Exception as e:
            print(f"Error deleting file {path}: {e}")


def get_library_works(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
        composer_id: Optional[int] = None,
        genre: Optional[str] = None,
        epoch: Optional[str] = None
):
    """
    Получает список Произведений (Work), у которых есть хотя бы одна аудиозапись.
    Подгружает записи жадно (Eager loading).
    """
    # 1. Сначала находим ID произведений
    query = (
        db.query(models.music.Work.id)
        .join(models.music.Composition)
        .join(models.music.Recording)
        .join(models.music.Composer)
        .outerjoin(models.music.Work.genre)
        .filter(models.music.Recording.duration > 0)
    )

    if q:
        from app.utils import switch_keyboard_layout  # Импорт внутри, чтобы избежать цикличности, если нужно

        search_terms = [q.lower()]
        switched = switch_keyboard_layout(q)
        if switched != q:
            search_terms.append(switched.lower())

        # Логика:
        # 1. Разбиваем запрос на слова (токенизация).
        # 2. Ищем совпадение ВСЕХ слов (AND) в ОДНОМ из полей или комбинации.
        # Для SQL LIKE это сложно сделать одним выражением, поэтому делаем упрощенно:
        # Ищем записи, где конкатенация всех полей содержит запрос.

        # Но для точности и поддержки "№11" vs "№ 11", лучше просто искать вхождение
        # хотя бы одного варианта (оригинал или свитч) в конкатенированной строке полей.

        # Собираем фильтры для каждого варианта раскладки (обычно их 1 или 2)
        or_filters = []

        for term in search_terms:
            # Разбиваем "sonata 14" -> ["sonata", "14"]
            tokens = term.split()
            token_filters = []

            for term in search_terms:
                # Разбиваем запрос на слова
                raw_tokens = term.split()
                token_filters = []

                for token in raw_tokens:
                    # Очищаем токен от пробелов (хотя split их уже убрал, но для гарантии логики)
                    clean_token = token.replace(" ", "")

                    # --- ЛОГИКА: Сравниваем строки БЕЗ ПРОБЕЛОВ ---
                    # func.replace(Field, ' ', '') превращает "Op. 55" в базе в "Op.55"
                    # И мы ищем там "Op.55". Это решает проблему пробелов.

                    token_filters.append(
                        or_(
                            # Обычный поиск (для текста)
                            func.lower_utf8(models.music.Work.name_ru).contains(token),
                            func.lower_utf8(models.music.Work.original_name).contains(token),
                            func.lower_utf8(models.music.Work.nickname).contains(token),
                            func.lower_utf8(models.music.Composer.name_ru).contains(token),
                            func.lower_utf8(models.music.Recording.performers).contains(token),

                            # "Безпробельный" поиск (для каталогов и номеров: kv 525 == kv525)
                            func.lower_utf8(func.replace(models.music.Work.catalog_number, ' ', '')).contains(
                                clean_token),
                            func.lower_utf8(func.replace(models.music.Work.name_ru, ' ', '')).contains(clean_token),
                            # Помогает найти "Симфония№5"

                            # Поиск по году
                            func.cast(models.music.Work.publication_year, String).contains(token)
                        )
                    )

                if token_filters:
                    or_filters.append(and_(*token_filters))

        # Объединяем варианты раскладок через OR
        if or_filters:
            query = query.filter(or_(*or_filters))

    if composer_id:
        query = query.filter(models.music.Work.composer_id == composer_id)

    if genre:
        query = query.filter(models.music.Genre.name == genre)

    if epoch:
        query = query.filter(models.music.Composer.epoch == epoch)

    query = query.group_by(models.music.Work.id).order_by(models.music.Work.id.desc())

    total = query.count()
    work_ids_tuples = query.offset(skip).limit(limit).all()
    work_ids = [t[0] for t in work_ids_tuples]

    if not work_ids:
        return {"total": 0, "items": []}

    # 2. Теперь делаем "тяжелый" запрос только для выбранных ID
    works = (
        db.query(models.music.Work)
        .options(
            joinedload(models.music.Work.composer),
            joinedload(models.music.Work.genre),
            joinedload(models.music.Work.compositions).joinedload(models.music.Composition.recordings)
        )
        .filter(models.music.Work.id.in_(work_ids))
        .order_by(models.music.Work.id.desc())
        .all()
    )

    # 3. Подготовка данных для Pydantic с дополнительной фильтрацией
    result_items = []
    for w in works:
        all_recs = []
        for comp in w.compositions:
            comp.work = w
            for rec in comp.recordings:
                if rec.duration > 0:
                    rec.composition = comp
                    all_recs.append(rec)

        if not all_recs:
            continue

        w.recordings = all_recs
        result_items.append(w)

    return {"total": total, "items": result_items}


# --- CREATE Functions ---

def create_composer(db: Session, composer_in: schemas.music.ComposerCreate) -> models.music.Composer:
    slug = generate_unique_slug(db, models.music.Composer, composer_in.name_ru)

    db_obj = models.music.Composer(
        slug=slug,  # <--
        name=composer_in.name,
        name_ru=composer_in.name_ru,
        original_name=composer_in.original_name,
        year_born=composer_in.year_born,
        year_died=composer_in.year_died,
        notes=composer_in.notes,
        place_of_birth=composer_in.place_of_birth,
        latitude=composer_in.latitude,
        longitude=composer_in.longitude
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def create_work_for_composer(db: Session, work_in: schemas.music.WorkCreate, composer_id: int) -> models.music.Work:
    composer = db.query(models.music.Composer).get(composer_id)
    base_name = f"{composer.name_ru} {work_in.name_ru}"
    slug = generate_unique_slug(db, models.music.Work, base_name)

    db_obj = models.music.Work(**work_in.dict(), composer_id=composer_id)
    db_obj.slug = slug  # <--
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def create_composition_for_work(db: Session, comp_in: schemas.music.CompositionCreate,
                                work_id: int) -> models.music.Composition:
    work = db.query(models.music.Work).get(work_id)
    base_name = f"{work.composer.name_ru} {work.name_ru} {comp_in.title_ru}"
    slug = generate_unique_slug(db, models.music.Composition, base_name)

    db_obj = models.music.Composition(**comp_in.dict(), work_id=work_id)
    db_obj.slug = slug  # <--
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_composer_by_slug(db: Session, slug: str) -> Optional[models.music.Composer]:
    return db.query(models.music.Composer).filter(models.music.Composer.slug == slug).first()


def get_work_by_slug(db: Session, slug: str) -> Optional[models.music.Work]:
    return db.query(models.music.Work).filter(models.music.Work.slug == slug).first()


def get_composition_by_slug(db: Session, slug: str) -> Optional[models.music.Composition]:
    return db.query(models.music.Composition).filter(models.music.Composition.slug == slug).first()


def get_recording_by_hash(db: Session, file_hash: str) -> Optional[models.music.Recording]:
    return db.query(models.music.Recording).filter(models.music.Recording.file_hash == file_hash).first()


def create_recording_for_composition(
        db: Session, rec_in: schemas.RecordingCreate, composition_id: int, duration: int, file_path: str, file_hash: str
) -> models.music.Recording:
    db_obj = models.music.Recording(
        performers=rec_in.performers,
        recording_year=rec_in.recording_year,
        youtube_url=rec_in.youtube_url,
        duration=duration,
        file_path=file_path,
        file_hash=file_hash,
        composition_id=composition_id,
        lead_performer = rec_in.lead_performer,
        conductor = rec_in.conductor,
        license = rec_in.license,
        source_text = rec_in.source_text,
        source_url = rec_in.source_url
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_recording(db: Session, recording_id: int) -> Optional[models.music.Recording]:
    return db.query(models.music.Recording).get(recording_id)


def add_recording_to_favorites(db: Session, user: models.User, recording: models.music.Recording):
    if recording not in user.favorite_recordings:
        user.favorite_recordings.append(recording)
        db.commit()


def remove_recording_from_favorites(db: Session, user: models.User, recording: models.music.Recording):
    if recording in user.favorite_recordings:
        user.favorite_recordings.remove(recording)
        db.commit()


def update_full_details(db: Session, recording: models.music.Recording, d: schemas.music.FullRecordingDetailsUpdate):
    if d.performers: recording.performers = d.performers
    if d.recording_year: recording.recording_year = d.recording_year
    if d.youtube_url is not None: recording.youtube_url = d.youtube_url
    db.commit()
    db.refresh(recording)
    return recording


# --- DELETE Functions (ИСПРАВЛЕННАЯ ЛОГИКА) ---

def delete_recording(db: Session, recording_id: int) -> bool:
    rec = db.query(models.music.Recording).get(recording_id)
    if not rec: return False

    path = rec.file_path
    db.delete(rec)
    db.commit()

    _delete_physical_files([path])
    return True


def delete_composition(db: Session, composition_id: int) -> bool:
    comp = db.query(models.music.Composition).get(composition_id)
    if not comp: return False

    files = [r.file_path for r in comp.recordings]

    db.delete(comp)
    db.commit()

    _delete_physical_files(files)
    return True


def delete_work(db: Session, work_id: int) -> bool:
    work = db.query(models.music.Work).get(work_id)
    if not work: return False

    files = []
    for comp in work.compositions:
        for rec in comp.recordings:
            files.append(rec.file_path)

    db.delete(work)
    db.commit()

    _delete_physical_files(files)
    return True


def delete_composer(db: Session, composer_id: int) -> bool:
    composer = db.query(models.music.Composer).get(composer_id)
    if not composer: return False

    recordings = (
        db.query(models.music.Recording)
        .join(models.music.Composition)
        .join(models.music.Work)
        .filter(models.music.Work.composer_id == composer_id)
        .all()
    )
    files = [r.file_path for r in recordings]

    db.delete(composer)
    db.commit()

    _delete_physical_files(files)
    return True


def get_composer(db: Session, composer_id: int) -> Optional[models.music.Composer]:
    return db.query(models.music.Composer).get(composer_id)


def get_work(db: Session, work_id: int) -> Optional[models.music.Work]:
    return db.query(models.music.Work).get(work_id)


def get_composition(db: Session, composition_id: int) -> Optional[models.music.Composition]:
    return db.query(models.music.Composition).get(composition_id)


def update_composer(db: Session, db_obj: models.music.Composer,
                    obj_in: schemas.music.ComposerUpdate) -> models.music.Composer:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_work(db: Session, db_obj: models.music.Work, obj_in: schemas.music.WorkUpdate) -> models.music.Work:
    update_data = obj_in.dict(exclude_unset=True)

    if update_data.get("is_no_catalog") is True:
        for comp in db_obj.compositions:
            comp.is_no_catalog = True
            comp.catalog_number = None

    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_composition(db: Session, db_obj: models.music.Composition,
                       obj_in: schemas.music.CompositionUpdate) -> models.music.Composition:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_recording(db: Session, db_obj: models.music.Recording,
                     obj_in: schemas.music.RecordingUpdate) -> models.music.Recording:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


# --- COVER MANAGEMENT ---

def update_composer_portrait(db: Session, composer_id: int, url: str):
    comp = get_composer(db, composer_id)
    if not comp: return None

    if comp.portrait_url:
        delete_file_by_url(comp.portrait_url)

    comp.portrait_url = url
    db.commit()
    db.refresh(comp)
    return comp


def update_work_cover(db: Session, work_id: int, url: str):
    work = get_work(db, work_id)
    if not work: return None

    old_work_url = work.cover_art_url

    if old_work_url:
        delete_file_by_url(old_work_url)

    work.cover_art_url = url

    for comp in work.compositions:
        if comp.cover_art_url and comp.cover_art_url != old_work_url:
            delete_file_by_url(comp.cover_art_url)

        comp.cover_art_url = url

    db.commit()
    db.refresh(work)
    return work


def update_composition_cover(db: Session, comp_id: int, url: str):
    comp = get_composition(db, comp_id)
    if not comp: return None
    work_cover = comp.work.cover_art_url

    if comp.cover_art_url and comp.cover_art_url != work_cover:
        delete_file_by_url(comp.cover_art_url)

    comp.cover_art_url = url
    db.commit()
    db.refresh(comp)
    return comp


def reorder_compositions(db: Session, work_id: int, new_order_ids: List[int]):
    work = get_work(db, work_id)
    if not work: return None

    comp_map = {c.id: c for c in work.compositions}

    for index, comp_id in enumerate(new_order_ids):
        if comp_id in comp_map:
            comp_map[comp_id].sort_order = index + 1

    db.commit()
    return True
