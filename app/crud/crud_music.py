from app.utils import generate_unique_slug, delete_file_by_url

import os
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session

from app import models, schemas


# --- Helper ---
def _delete_physical_files(file_paths: List[str]):
    """
    Удаляет физические файлы. Обернуто в try/except, чтобы
    ошибка доступа к файлу (например, он играет сейчас) не ломала сервер.
    """
    for path in file_paths:
        try:
            # Путь в БД хранится как "/static/music/...", нам нужен относительный путь
            clean_path = path.lstrip("/")
            if os.path.exists(clean_path):
                os.remove(clean_path)
                print(f"Deleted file: {clean_path}")
        except Exception as e:
            print(f"Error deleting file {path}: {e}")


# --- CREATE Functions ---
# (Эти функции нужны, так как они вызываются из endpoints, которые ты прислал)

def create_composer(db: Session, composer_in: schemas.music.ComposerCreate) -> models.music.Composer:
    # Генерируем slug из name_ru
    slug = generate_unique_slug(db, models.music.Composer, composer_in.name_ru)

    db_obj = models.music.Composer(
        slug=slug,  # <--
        name=composer_in.name,
        name_ru=composer_in.name_ru,
        original_name=composer_in.original_name,
        year_born=composer_in.year_born,
        year_died=composer_in.year_died,
        notes=composer_in.notes
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def create_work_for_composer(db: Session, work_in: schemas.music.WorkCreate, composer_id: int) -> models.music.Work:
    # Для произведений добавляем имя композитора в slug для уникальности
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
    # Для частей добавляем название произведения
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
        composition_id=composition_id
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

    # Собираем пути файлов
    files = [r.file_path for r in comp.recordings]

    db.delete(comp)  # Cascade удалит записи из БД
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

    db.delete(work)  # Cascade удалит части и записи
    db.commit()

    _delete_physical_files(files)
    return True


def delete_composer(db: Session, composer_id: int) -> bool:
    composer = db.query(models.music.Composer).get(composer_id)
    if not composer: return False

    # Чтобы не делать кучу запросов в цикле, сделаем один JOIN запрос для получения путей
    recordings = (
        db.query(models.music.Recording)
        .join(models.music.Composition)
        .join(models.music.Work)
        .filter(models.music.Work.composer_id == composer_id)
        .all()
    )
    files = [r.file_path for r in recordings]

    db.delete(composer)  # Cascade удалит всё дерево в БД
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
    # Проходимся по полям, если поле пришло (!= None), обновляем его
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_work(db: Session, db_obj: models.music.Work, obj_in: schemas.music.WorkUpdate) -> models.music.Work:
    update_data = obj_in.dict(exclude_unset=True)

    # === ЛОГИКА: Если поставили "б/н" произведению, ставим и всем частям ===
    if update_data.get("is_no_catalog") is True:
        for comp in db_obj.compositions:
            comp.is_no_catalog = True
            comp.catalog_number = None  # Очищаем старый номер, если был
    # =======================================================================

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

    # 1. Удаляем старую обложку
    if comp.portrait_url:
        delete_file_by_url(comp.portrait_url)

    # 2. Ставим новую
    comp.portrait_url = url
    db.commit()
    db.refresh(comp)
    return comp


def update_work_cover(db: Session, work_id: int, url: str):
    work = get_work(db, work_id)
    if not work: return None

    old_work_url = work.cover_art_url

    # 1. Удаляем старую обложку ПРОИЗВЕДЕНИЯ
    if old_work_url:
        delete_file_by_url(old_work_url)

    # 2. Обновляем обложку произведения
    work.cover_art_url = url

    # 3. ЛОГИКА НАСЛЕДОВАНИЯ: Обновляем все части
    # Если у части была СВОЯ уникальная обложка (не совпадающая со старой обложкой произведения),
    # мы её тоже удаляем, чтобы не плодить мусор, так как обложка произведения "главнее".
    for comp in work.compositions:
        if comp.cover_art_url and comp.cover_art_url != old_work_url:
            delete_file_by_url(comp.cover_art_url)

        # Присваиваем новую обложку всем частям
        comp.cover_art_url = url

    db.commit()
    db.refresh(work)
    return work


def update_composition_cover(db: Session, comp_id: int, url: str):
    comp = get_composition(db, comp_id)
    if not comp: return None

    # Если у части была обложка, удаляем файл (но только если это не обложка Родительского произведения!)
    # Иначе мы удалим обложку у всего произведения.
    work_cover = comp.work.cover_art_url

    if comp.cover_art_url and comp.cover_art_url != work_cover:
        delete_file_by_url(comp.cover_art_url)

    comp.cover_art_url = url
    db.commit()
    db.refresh(comp)
    return comp
