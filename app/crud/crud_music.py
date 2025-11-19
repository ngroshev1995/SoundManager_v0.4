# app/api/endpoints/recordings.py
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


# --- СОЗДАНИЕ ---

@router.post("/composers", response_model=schemas.music.Composer, status_code=status.HTTP_201_CREATED)
def create_new_composer(composer_in: schemas.music.ComposerCreate, db: Session = Depends(get_db),
                        u=Depends(deps.get_current_user)):
    return crud.music.create_composer(db, composer_in=composer_in)


@router.post("/composers/{composer_id}/works", response_model=schemas.music.Work, status_code=status.HTTP_201_CREATED)
def create_new_work(composer_id: int, work_in: schemas.music.WorkCreate, db: Session = Depends(get_db),
                    u=Depends(deps.get_current_user)):
    if not db.query(models.music.Composer).get(composer_id):
        raise HTTPException(404, "Composer not found")
    return crud.music.create_work_for_composer(db, work_in=work_in, composer_id=composer_id)


@router.post("/works/{work_id}/compositions", response_model=schemas.music.Composition,
             status_code=status.HTTP_201_CREATED)
def create_new_composition(work_id: int, comp_in: schemas.music.CompositionCreate, db: Session = Depends(get_db),
                           u=Depends(deps.get_current_user)):
    if not db.query(models.music.Work).get(work_id):
        raise HTTPException(404, "Work not found")
    return crud.music.create_composition_for_work(db, comp_in=comp_in, work_id=work_id)


@router.post("/compositions/{composition_id}/upload", response_model=schemas.music.Recording,
             status_code=status.HTTP_201_CREATED)
def upload_recording(
        composition_id: int, performers: str = Form(...), recording_year: Optional[int] = Form(None),
        file: UploadFile = File(...), db: Session = Depends(get_db), u=Depends(deps.get_current_user)
):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(400, "Invalid file type")
    if not db.query(models.music.Composition).get(composition_id):
        raise HTTPException(404, "Composition not found")

    temp_path, duration, file_hash = audio_processor.save_and_process_audio(db, upload_file=file)
    try:
        if crud.music.get_recording_by_hash(db, file_hash):
            raise HTTPException(409, "Duplicate file")

        rec_data = schemas.RecordingCreate(performers=performers, recording_year=recording_year)
        new_rec = crud.music.create_recording_for_composition(
            db, rec_in=rec_data, composition_id=composition_id, duration=duration, file_path="temp", file_hash=file_hash
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


# --- ЧТЕНИЕ ---

@router.get("/composers", response_model=List[schemas.music.Composer])
def get_composers(db: Session = Depends(get_db)):
    return db.query(models.music.Composer).order_by(models.music.Composer.name_ru).all()


@router.get("/composers/{cid}", response_model=schemas.music.Composer)
def get_composer(cid: int, db: Session = Depends(get_db)):
    c = db.query(models.music.Composer).get(cid)
    if not c: raise HTTPException(404, "Not found")
    return c


@router.get("/composers/{cid}/works", response_model=List[schemas.music.Work])
def get_composer_works(cid: int, db: Session = Depends(get_db)):
    return db.query(models.music.Work).filter(models.music.Work.composer_id == cid).order_by(
        models.music.Work.name_ru).all()


@router.get("/works/{wid}", response_model=schemas.music.Work)
def get_work(wid: int, db: Session = Depends(get_db)):
    w = db.query(models.music.Work).options(joinedload(models.music.Work.compositions)).filter(
        models.music.Work.id == wid).first()
    if not w: raise HTTPException(404, "Not found")
    return w


@router.get("/compositions/{cid}", response_model=schemas.music.Composition)
def get_composition(cid: int, db: Session = Depends(get_db)):
    c = db.query(models.music.Composition).options(
        joinedload(models.music.Composition.work).joinedload(models.music.Work.composer)
    ).filter(models.music.Composition.id == cid).first()
    if not c: raise HTTPException(404, "Not found")
    return c


@router.get("/compositions/{cid}/recordings", response_model=List[schemas.music.Recording])
def get_comp_recordings(cid: int, db: Session = Depends(get_db)):
    return db.query(models.music.Recording).filter(models.music.Recording.composition_id == cid).all()


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


# --- УДАЛЕНИЕ (ИСПРАВЛЕНО: ВОЗВРАТ 204) ---

@router.delete("/composers/{cid}", status_code=204)
def delete_composer(cid: int, db: Session = Depends(get_db), u=Depends(deps.get_current_user)):
    if not crud.music.delete_composer(db, cid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


@router.delete("/works/{wid}", status_code=204)
def delete_work(wid: int, db: Session = Depends(get_db), u=Depends(deps.get_current_user)):
    if not crud.music.delete_work(db, wid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


@router.delete("/compositions/{cid}", status_code=204)
def delete_composition(cid: int, db: Session = Depends(get_db), u=Depends(deps.get_current_user)):
    if not crud.music.delete_composition(db, cid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


@router.delete("/{rid}", status_code=204)
def delete_recording(rid: int, db: Session = Depends(get_db), u=Depends(deps.get_current_user)):
    if not crud.music.delete_recording(db, rid): raise HTTPException(404, "Not found")
    return Response(status_code=204)


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


@router.put("/{rid}/details", response_model=schemas.music.Recording)
def update_details(rid: int, d: schemas.music.FullRecordingDetailsUpdate, db: Session = Depends(get_db),
                   u=Depends(deps.get_current_user)):
    if r := crud.music.get_recording(db, rid): return crud.music.update_full_details(db, r, d)
    raise HTTPException(404, "Not found")