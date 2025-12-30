import app.utils as utils
import uuid
from typing import List, Any, Optional, Literal, Union
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form, Response, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import func, or_, and_
import os
import shutil
from pathlib import Path
import re
import random

from app import crud, models, schemas
from app.api import deps
from app.db.session import get_db
from app.services import audio_processor

router = APIRouter()

# --- СОЗДАНИЕ (ТОЛЬКО АДМИН) ---

@router.post("/composers", response_model=schemas.music.Composer, status_code=status.HTTP_201_CREATED)
def create_new_composer(
    composer_in: schemas.music.ComposerCreate,
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin) # <--- ЗАЩИТА
):
    return crud.music.create_composer(db, composer_in=composer_in)


@router.post("/composers/{composer_id}/works", response_model=schemas.music.Work, status_code=status.HTTP_201_CREATED)
def create_new_work(
    composer_id: int,
    work_in: schemas.music.WorkCreate,
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    if not db.query(models.music.Composer).get(composer_id):
        raise HTTPException(404, "Composer not found")
    return crud.music.create_work_for_composer(db, work_in=work_in, composer_id=composer_id)


@router.post("/works/{work_id}/compositions", response_model=schemas.music.Composition, status_code=status.HTTP_201_CREATED)
def create_new_composition(
    work_id: int,
    comp_in: schemas.music.CompositionCreate,
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    if not db.query(models.music.Work).get(work_id):
        raise HTTPException(404, "Work not found")
    return crud.music.create_composition_for_work(db, comp_in=comp_in, work_id=work_id)


@router.post("/compositions/{composition_id}/upload", response_model=schemas.music.Recording,
             status_code=status.HTTP_201_CREATED)
def upload_audio_recording(
        composition_id: int,
        file: UploadFile = File(...),
        performers: Optional[str] = Form(None),
        lead_performer: Optional[str] = Form(None),
        conductor: Optional[str] = Form(None),
        recording_year: Optional[int] = Form(None),
        license: Optional[str] = Form(None),
        source_text: Optional[str] = Form(None),
        source_url: Optional[str] = Form(None),
        db: Session = Depends(get_db),
        u: models.User = Depends(deps.get_current_active_admin)
):
    if not db.query(models.music.Composition).get(composition_id):
        raise HTTPException(404, "Composition not found")

    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(400, "Invalid file type. Only audio files are allowed.")

    temp_path, duration, file_hash = audio_processor.save_and_process_audio(db, upload_file=file)

    try:
        if crud.music.get_recording_by_hash(db, file_hash):
            raise HTTPException(409, "Duplicate file (hash match)")

        if performers and duration > 0:
            potential_duplicate = db.query(models.music.Recording).filter(
                and_(
                    models.music.Recording.composition_id == composition_id,
                    func.lower_utf8(models.music.Recording.performers) == performers.lower(),
                    models.music.Recording.duration.between(duration - 2, duration + 2)
                )
            ).first()
            if potential_duplicate:
                raise HTTPException(
                    status_code=409,
                    detail=f"Possible duplicate performance by {performers} found (duration match)."
                )

        rec_data = schemas.RecordingCreate(
            performers=performers,
            lead_performer=lead_performer,
            conductor=conductor,
            recording_year=recording_year,
            license=license,
            source_text=source_text,
            source_url=source_url
        )

        new_rec = crud.music.create_recording_for_composition(
            db, rec_in=rec_data, composition_id=composition_id, duration=duration, file_path="temp",
            file_hash=file_hash
        )

        ext = Path(file.filename).suffix.lower() or ".mp3"
        final_path = audio_processor.MUSIC_DIR / f"{new_rec.id}{ext}"
        shutil.move(str(temp_path), str(final_path))

        new_rec.file_path = f"/{final_path.as_posix()}"
        db.commit()
        db.refresh(new_rec)
        return new_rec
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)


@router.post("/compositions/{composition_id}/add-video", response_model=schemas.music.Recording,
             status_code=status.HTTP_201_CREATED)
def add_video_recording(
        composition_id: int,
        video_in: schemas.music.VideoRecordingCreate,
        db: Session = Depends(get_db),
        u: models.User = Depends(deps.get_current_active_admin)
):
    if not db.query(models.music.Composition).get(composition_id):
        raise HTTPException(404, "Composition not found")

    youtube_id_match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', video_in.youtube_url)
    if not youtube_id_match:
        raise HTTPException(400, "Invalid YouTube URL")

    youtube_id = youtube_id_match.group(1)
    existing_video = db.query(models.music.Recording).filter(
        models.music.Recording.youtube_url.contains(youtube_id)
    ).first()
    if existing_video:
        raise HTTPException(409, "This YouTube video is already in the library.")

    unique_id = str(uuid.uuid4())
    fake_path = f"youtube_only_{unique_id}"
    fake_hash = f"yt_{unique_id}"

    rec_data = schemas.RecordingCreate(**video_in.dict())

    new_rec = crud.music.create_recording_for_composition(
        db,
        rec_in=rec_data,
        composition_id=composition_id,
        duration=0,
        file_path=fake_path,
        file_hash=fake_hash
    )
    return new_rec


# --- ОБНОВЛЕНИЕ (ТОЛЬКО АДМИН) ---

@router.put("/composers/{cid}", response_model=schemas.music.Composer)
def update_composer(cid: int, comp_in: schemas.music.ComposerUpdate, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    c = crud.music.get_composer(db, cid)
    if not c: raise HTTPException(404, "Not found")
    return crud.music.update_composer(db, c, comp_in)

@router.put("/works/{wid}", response_model=schemas.music.Work)
def update_work(wid: int, work_in: schemas.music.WorkUpdate, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    w = crud.music.get_work(db, wid)
    if not w: raise HTTPException(404, "Not found")
    return crud.music.update_work(db, w, work_in)

@router.put("/compositions/{cid}", response_model=schemas.music.Composition)
def update_composition(cid: int, comp_in: schemas.music.CompositionUpdate, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    c = crud.music.get_composition(db, cid)
    if not c: raise HTTPException(404, "Not found")
    return crud.music.update_composition(db, c, comp_in)

@router.put("/{rid}", response_model=schemas.music.Recording)
def update_recording(rid: int, rec_in: schemas.music.RecordingUpdate, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    r = crud.music.get_recording(db, rid)
    if not r: raise HTTPException(404, "Not found")
    return crud.music.update_recording(db, r, rec_in)


# --- УДАЛЕНИЕ (ТОЛЬКО АДМИН) ---

@router.delete("/composers/{cid}", status_code=204)
def delete_composer(cid: int, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    if not crud.music.delete_composer(db, cid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


@router.delete("/works/{wid}", status_code=204)
def delete_work(wid: int, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    if not crud.music.delete_work(db, wid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


@router.delete("/compositions/{cid}", status_code=204)
def delete_composition(cid: int, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    if not crud.music.delete_composition(db, cid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


@router.delete("/{rid}", status_code=204)
def delete_recording(rid: int, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    if not crud.music.delete_recording(db, rid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


# --- ЧТЕНИЕ (ПУБЛИЧНОЕ) ---

@router.get("/composers", response_model=List[schemas.music.Composer])
def get_composers(
    skip: int = 0,       # <-- Добавлено
    limit: int = 12,     # <-- Добавлено (по умолчанию 12 штук)
    db: Session = Depends(get_db)
):
    return db.query(models.music.Composer).order_by(models.music.Composer.name_ru).offset(skip).limit(limit).all()

@router.get("/composers/{slug}", response_model=schemas.music.Composer)
def get_composer(slug: str, db: Session = Depends(get_db)):
    c = crud.music.get_composer_by_slug(db, slug)
    if not c and slug.isdigit(): c = db.query(models.music.Composer).get(int(slug))
    if not c: raise HTTPException(404, "Not found")
    return c

@router.get("/composers/{slug}/works", response_model=List[schemas.music.Work])
def get_composer_works(slug: str, db: Session = Depends(get_db)):
    c = crud.music.get_composer_by_slug(db, slug)
    if not c and slug.isdigit(): c = db.query(models.music.Composer).get(int(slug))
    if not c: raise HTTPException(404, "Composer not found")
    return db.query(models.music.Work).filter(models.music.Work.composer_id == c.id).order_by(models.music.Work.name_ru).all()


@router.get("/works/{slug}", response_model=schemas.music.Work)
def get_work(slug: str, db: Session = Depends(get_db)):
    w = crud.music.get_work_by_slug(db, slug)
    if not w and slug.isdigit():
        w = db.query(models.music.Work).get(int(slug))
    if not w:
        raise HTTPException(404, "Not found")

    # Формируем запрос поэтапно, чтобы избежать ошибки связывания путей
    query = db.query(models.music.Work)

    # 1. Загружаем ноты самого произведения (Work -> Scores)
    query = query.options(joinedload(models.music.Work.scores))

    # 2. Загружаем части и их записи (Work -> Compositions -> Recordings)
    query = query.options(
        joinedload(models.music.Work.compositions)
        .joinedload(models.music.Composition.recordings)
    )

    # 3. Загружаем ноты для частей (Work -> Compositions -> Scores)
    query = query.options(
        joinedload(models.music.Work.compositions)
        .joinedload(models.music.Composition.scores)
    )

    return query.filter(models.music.Work.id == w.id).first()

@router.get("/compositions/{slug}", response_model=schemas.music.Composition)
def get_composition(slug: str, db: Session = Depends(get_db)):
    c = crud.music.get_composition_by_slug(db, slug)
    if not c and slug.isdigit(): c = db.query(models.music.Composition).get(int(slug))
    if not c: raise HTTPException(404, "Not found")
    return db.query(models.music.Composition).options(
        joinedload(models.music.Composition.work).joinedload(models.music.Work.composer)
    ).filter(models.music.Composition.id == c.id).first()

@router.get("/compositions/{slug}/recordings", response_model=List[schemas.music.Recording])
def get_comp_recordings(slug: str, db: Session = Depends(get_db)):
    c = crud.music.get_composition_by_slug(db, slug)
    if not c and slug.isdigit(): c = db.query(models.music.Composition).get(int(slug))
    if not c: raise HTTPException(404, "Composition not found")
    return db.query(models.music.Recording).filter(models.music.Recording.composition_id == c.id).all()


@router.get("/random-playable", response_model=schemas.music.Work)
def get_random_playable_work(
        db: Session = Depends(get_db),
        exclude_ids: Optional[List[int]] = Query(None)
):
    """
    Возвращает одно случайное произведение, обогащенное записями
    ТОЛЬКО ОДНОГО случайного исполнения.
    """
    random_func = func.random()
    if db.bind.dialect.name == 'mysql':
        random_func = func.rand()

    # 1. Находим случайное произведение, у которого есть аудиозаписи
    query = (
        db.query(models.music.Work)
        .join(models.music.Work.compositions)
        .join(models.music.Composition.recordings)
        .filter(models.music.Recording.duration > 0)
    )

    if exclude_ids:
        query = query.filter(models.music.Work.id.notin_(exclude_ids))

    work = query.order_by(random_func).first()

    # Если с исключением ничего не нашлось, ищем без исключения
    if not work:
        work = (
            db.query(models.music.Work)
            .join(models.music.Work.compositions)
            .join(models.music.Composition.recordings)
            .filter(models.music.Recording.duration > 0)
            .order_by(random_func).first()
        )

    if not work:
        raise HTTPException(status_code=404, detail="No playable works found")

    # 2. Загружаем это произведение со всеми его аудиозаписями
    full_work = (
        db.query(models.music.Work)
        .options(
            joinedload(models.music.Work.composer),
            joinedload(models.music.Work.compositions)
            .joinedload(models.music.Composition.recordings)
        )
        .filter(models.music.Work.id == work.id)
        .first()
    )

    # 3. В Python группируем записи по исполнению (исполнитель + год)
    performances = {}
    for comp in full_work.compositions:
        for rec in comp.recordings:
            if rec.duration > 0:
                key = (rec.performers or "Unknown", rec.recording_year or "N/A")
                if key not in performances:
                    performances[key] = []
                # Важно: добавляем полную запись, а не только ID
                rec.composition = comp  # Добавляем связь для Pydantic
                performances[key].append(rec)

    if not performances:
        raise HTTPException(status_code=404, detail="No performances found for the work")

    # 4. Выбираем случайное исполнение
    random_performance_key = random.choice(list(performances.keys()))
    selected_recordings = performances[random_performance_key]

    # 5. "Обманываем" Pydantic: подменяем полный список записей на отфильтрованный
    selected_rec_ids = {rec.id for rec in selected_recordings}

    # Теперь отфильтруем их прямо в объекте SQLAlchemy
    for comp in full_work.compositions:
        # Оставляем только те записи, которые принадлежат выбранному исполнению
        comp.recordings = [rec for rec in comp.recordings if rec.id in selected_rec_ids]

    return full_work


@router.get("/", response_model=Union[schemas.music.RecordingPage, schemas.music.LibraryPage])
def list_recordings(
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
        media_type: Optional[Literal["audio", "video"]] = None,
        group_by: Optional[Literal["work", "recording"]] = "recording",
        composer_id: Optional[int] = None,
        genre: Optional[str] = None,
        epoch: Optional[str] = None, # <--- 1. ДОБАВИЛИ ПАРАМЕТР
        sort_by: Optional[Literal["newest", "oldest"]] = "newest",
        db: Session = Depends(get_db)
):
    # РЕЖИМ 1: ГРУППИРОВКА ПО ПРОИЗВЕДЕНИЯМ (Только для Аудио/Медиатеки)
    if group_by == "work" and (media_type == "audio" or media_type is None):
        # <--- 2. ПЕРЕДАЕМ EPOCH В CRUD
        # ВНИМАНИЕ: Если файл app/crud/music.py не обновлен, здесь будет ошибка!
        # Вам нужно будет скинуть мне app/crud/music.py следующим сообщением.
        return crud.music.get_library_works(
            db, skip=skip, limit=limit, q=q, composer_id=composer_id, genre=genre, epoch=epoch
        )

    # РЕЖИМ 2: ПЛОСКИЙ СПИСОК (Старая логика)
    query = (
        db.query(models.music.Recording)
        .join(models.music.Composition, models.music.Recording.composition_id == models.music.Composition.id)
        .join(models.music.Work, models.music.Composition.work_id == models.music.Work.id)
        .join(models.music.Composer, models.music.Work.composer_id == models.music.Composer.id)
    )

    query = query.options(
        contains_eager(models.music.Recording.composition)
        .contains_eager(models.music.Composition.work)
        .contains_eager(models.music.Work.composer)
    )

    if media_type == "audio":
        query = query.filter(models.music.Recording.duration > 0)
    elif media_type == "video":
        query = query.filter(models.music.Recording.duration == 0)

    if q:
        search_term = q.lower()
        query = query.filter(
            or_(
                func.lower_utf8(models.music.Recording.performers).contains(search_term),
                func.lower_utf8(models.music.Composition.title_ru).contains(search_term),
                func.lower_utf8(models.music.Work.name_ru).contains(search_term),
                func.lower_utf8(models.music.Composer.name_ru).contains(search_term)
            )
        )

    if composer_id:
        query = query.filter(models.music.Work.composer_id == composer_id)

    if genre:
        query = query.filter(models.music.Work.genre == genre)

    # <--- 3. ФИЛЬТРАЦИЯ ПО ЭПОХЕ (ДЛЯ ПЛОСКОГО СПИСКА)
    if epoch:
        query = query.filter(models.music.Composer.epoch == epoch)

    if sort_by == "newest":
        query = query.order_by(models.music.Recording.id.desc())
    elif sort_by == "oldest":
        query = query.order_by(models.music.Recording.id.asc())

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return {"total": total, "recordings": items, "items": []}

# --- ПРОЧЕЕ ---
@router.get("/stream/{rid}")
def stream(rid: int, db: Session = Depends(get_db)):
    rec = crud.music.get_recording(db, rid)
    if not rec or not os.path.exists(rec.file_path.lstrip('/')): raise HTTPException(404, "Not found")
    return FileResponse(rec.file_path.lstrip('/'))

@router.post("/{rid}/favorite", status_code=204)
def fav_add(rid: int, db: Session = Depends(get_db), u=Depends(deps.get_current_user)):
    if r := crud.music.get_recording(db, rid): crud.music.add_recording_to_favorites(db, u, r)

@router.delete("/{rid}/favorite", status_code=204)
def fav_del(rid: int, db: Session = Depends(get_db), u=Depends(deps.get_current_user)):
    if r := crud.music.get_recording(db, rid): crud.music.remove_recording_from_favorites(db, u, r)


# --- ЗАГРУЗКА ОБЛОЖЕК ---

@router.post("/composers/{id}/cover", response_model=schemas.music.Composer)
def upload_composer_cover(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    if not crud.music.get_composer(db, id): raise HTTPException(404, "Composer not found")
    url = utils.save_upload_file(file, "composers", f"comp_{id}")
    return crud.music.update_composer_portrait(db, id, url)

@router.post("/works/{id}/cover", response_model=schemas.music.Work)
def upload_work_cover(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    if not crud.music.get_work(db, id): raise HTTPException(404, "Work not found")
    url = utils.save_upload_file(file, "works", f"work_{id}")
    return crud.music.update_work_cover(db, id, url)

@router.post("/compositions/{id}/cover", response_model=schemas.music.Composition)
def upload_composition_cover(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    if not crud.music.get_composition(db, id): raise HTTPException(404, "Composition not found")
    url = utils.save_upload_file(file, "compositions", f"part_{id}")
    return crud.music.update_composition_cover(db, id, url)


@router.put("/works/{work_id}/reorder-compositions", status_code=200)
def reorder_work_compositions(
    work_id: int,
    payload: schemas.music.CompositionReorder,
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    crud.music.reorder_compositions(db, work_id, payload.composition_ids)
    return {"status": "ok"}

@router.get("/random-interactive", response_model=schemas.music.Work)
def get_random_work_for_interactive(db: Session = Depends(get_db)):
    """
    Возвращает одно случайное произведение со всеми его аудиозаписями
    для интерактивного блока "Случайный выбор".
    """
    random_func = func.random()
    if db.bind.dialect.name == 'mysql':
        random_func = func.rand()

    # 1. Находим случайное произведение, у которого есть хоть одна аудиозапись
    work = (
        db.query(models.music.Work)
        .join(models.music.Work.compositions)
        .join(models.music.Composition.recordings)
        .filter(models.music.Recording.duration > 0)
        .order_by(random_func)
        .first()
    )
    if not work:
        raise HTTPException(status_code=404, detail="No playable works found")

    # 2. Загружаем это произведение со всеми его данными, включая записи
    full_work = (
        db.query(models.music.Work)
        .options(
            joinedload(models.music.Work.composer),
            joinedload(models.music.Work.compositions)
            .joinedload(models.music.Composition.recordings)
        )
        .filter(models.music.Work.id == work.id)
        .first()
    )

    return full_work