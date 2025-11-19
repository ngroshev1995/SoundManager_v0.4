# app/api/endpoints/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # 1. Статистика (Убрали фильтры по name != 'temp')
    total_recordings = db.query(models.music.Recording).count()
    total_compositions = db.query(models.music.Composition).count()
    total_works = db.query(models.music.Work).filter(models.music.Work.name_ru != "Без сборника").count()
    total_composers = db.query(models.music.Composer).count() # Считаем всех

    stats = schemas.DashboardStats(
        total_recordings=total_recordings,
        total_compositions=total_compositions,
        total_works=total_works,
        total_composers=total_composers
    )

    # 2. Недавно добавленные (Убрали фильтр, добавили сортировку по ID)
    recently_added_works = (
        db.query(models.Work)
        .options(joinedload(models.Work.composer))
        .filter(models.Work.name_ru != "Без сборника")
        .order_by(models.Work.id.desc())
        .limit(12)
        .all()
    )

    # 3. Случайные (Убрали фильтр)
    random_func = func.random()
    if db.bind.dialect.name == 'mysql':
        random_func = func.rand()

    random_works = (
        db.query(models.Work)
        .options(joinedload(models.Work.composer))
        .filter(models.Work.name_ru != "Без сборника")
        .order_by(random_func)
        .limit(12)
        .all()
    )

    return schemas.DashboardSummary(
        stats=stats,
        recently_added_works=recently_added_works,
        random_works=random_works,
    )