import app.utils as utils
import uuid
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
import os
import shutil
from pathlib import Path

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
def upload_recording(
        composition_id: int,
        performers: Optional[str] = Form(None),
        recording_year: Optional[int] = Form(None),
        youtube_url: Optional[str] = Form(None),
        file: UploadFile = File(None),  # Файл необязателен
        db: Session = Depends(get_db),
        u: models.User = Depends(deps.get_current_active_admin)
):
    # 1. Валидация: Должен быть либо файл, либо ссылка
    if not file and not youtube_url:
        raise HTTPException(400, "Must provide either an audio file or a YouTube URL")

    if not db.query(models.music.Composition).get(composition_id):
        raise HTTPException(404, "Composition not found")

    # Сценарий А: ЕСТЬ АУДИОФАЙЛ
    if file:
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(400, "Invalid file type")

        temp_path, duration, file_hash = audio_processor.save_and_process_audio(db, upload_file=file)

        try:
            if crud.music.get_recording_by_hash(db, file_hash):
                raise HTTPException(409, "Duplicate file")

            rec_data = schemas.RecordingCreate(
                performers=performers,
                recording_year=recording_year,
                youtube_url=youtube_url
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

    # Сценарий Б: ТОЛЬКО YOUTUBE (Файла нет)
    else:
        # Генерируем уникальный ID для этой записи
        unique_id = str(uuid.uuid4())

        # Создаем уникальные фейковые данные, чтобы БД не ругалась на дубликаты
        fake_path = f"youtube_only_{unique_id}"
        fake_hash = f"yt_{unique_id}"

        rec_data = schemas.RecordingCreate(
            performers=performers,
            recording_year=recording_year,
            youtube_url=youtube_url
        )

        new_rec = crud.music.create_recording_for_composition(
            db,
            rec_in=rec_data,
            composition_id=composition_id,
            duration=0,  # Длительность 0
            file_path=fake_path,  # Уникальный путь
            file_hash=fake_hash  # Уникальный хеш
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
# Убрана зависимость от get_current_user

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
    if not w and slug.isdigit(): w = db.query(models.music.Work).get(int(slug))
    if not w: raise HTTPException(404, "Not found")
    return db.query(models.music.Work).options(joinedload(models.music.Work.compositions)).filter(models.music.Work.id == w.id).first()

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

@router.get("/", response_model=schemas.music.RecordingPage)
def list_recordings(skip: int = 0, limit: int = 20, q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.music.Recording).options(
        joinedload(models.music.Recording.composition).joinedload(models.music.Composition.work).joinedload(
            models.music.Work.composer)
    )
    if q:
        st = f"%{q.lower()}%"
        query = query.join(models.music.Composition).filter(
            or_(models.music.Recording.performers.ilike(st), models.music.Composition.title_ru.ilike(st))
        )
    total = query.count()
    items = query.order_by(models.music.Recording.id.desc()).offset(skip).limit(limit).all()
    return {"total": total, "recordings": items}


# --- ПРОЧЕЕ ---
# Стрим доступен всем
@router.get("/stream/{rid}")
def stream(rid: int, db: Session = Depends(get_db)):
    rec = crud.music.get_recording(db, rid)
    if not rec or not os.path.exists(rec.file_path.lstrip('/')): raise HTTPException(404, "Not found")
    return FileResponse(rec.file_path.lstrip('/'))

# Лайки только для юзеров
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