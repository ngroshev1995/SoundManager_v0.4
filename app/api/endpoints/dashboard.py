from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func, desc
from sqlalchemy import func

from app import models, schemas, crud
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
):
    # 1. Статистика
    total_recordings = db.query(models.music.Recording).count()
    total_compositions = db.query(models.music.Composition).count()
    total_works = db.query(models.music.Work).filter(models.music.Work.name_ru != "Без сборника").count()
    total_composers = db.query(models.music.Composer).count()
    total_seconds = db.query(func.sum(models.music.Recording.duration)).scalar() or 0

    stats = schemas.DashboardStats(
        total_recordings=total_recordings,
        total_compositions=total_compositions,
        total_works=total_works,
        total_composers=total_composers,
        total_duration=int(total_seconds)
    )

    # 2. Недавно добавленные
    recently_added_works = (
        db.query(models.music.Work)
        .options(joinedload(models.music.Work.composer))
        .filter(models.music.Work.name_ru != "Без сборника")
        .order_by(models.music.Work.id.desc())
        .limit(10)
        .all()
    )

    # 3. Случайные произведения (для секции "В центре внимания")
    random_func = func.random()
    if db.bind.dialect.name == 'mysql':
        random_func = func.rand()

    random_works = (
        db.query(models.music.Work)
        .options(joinedload(models.music.Work.composer))
        .filter(models.music.Work.name_ru != "Без сборника")
        .order_by(random_func)
        .limit(12)
        .all()
    )

    # 4. Подборки
    collections = crud.playlist.get_system_playlists(db, limit=10)


    return schemas.DashboardSummary(
        stats=stats,
        recently_added_works=recently_added_works,
        random_works=random_works,
        collections=collections
    )