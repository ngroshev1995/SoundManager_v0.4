from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func, desc
from sqlalchemy import func

from app import models, schemas
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

    stats = schemas.DashboardStats(
        total_recordings=total_recordings,
        total_compositions=total_compositions,
        total_works=total_works,
        total_composers=total_composers
    )

    top_composers_query = (
        db.query(
            models.music.Composer,
            func.count(models.music.Work.id).label('works_count')
        )
        .outerjoin(models.music.Work)
        .group_by(models.music.Composer.id)
        .order_by(desc('works_count'))
        .limit(4)
        .all()
    )

    popular_composers = []
    for comp, count in top_composers_query:
        comp.works_count = count
        popular_composers.append(comp)

    recently_added_works = (
        db.query(models.music.Work)
        .options(joinedload(models.music.Work.composer))
        .filter(models.music.Work.name_ru != "Без сборника")
        .order_by(models.music.Work.id.desc())
        .limit(12)
        .all()
    )

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

    return schemas.DashboardSummary(
        stats=stats,
        popular_composers=popular_composers,
        recently_added_works=recently_added_works,
        random_works=random_works,
    )