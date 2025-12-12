from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app import crud, models, schemas, utils
from app.api import deps
from app.db.session import get_db

router = APIRouter()

# Public routes
@router.get("/", response_model=List[schemas.Post])
def read_posts(
    skip: int = 0,
    limit: int = 20,
    tag: Optional[str] = None, # <-- Добавить параметр
    db: Session = Depends(get_db)
):
    return crud.crud_blog.get_posts(db, skip=skip, limit=limit, tag_name=tag)

@router.get("/tags", response_model=List[schemas.Tag])
def read_all_tags(db: Session = Depends(get_db)):
    """Возвращает список всех существующих тегов."""
    return crud.crud_blog.get_all_tags(db)

@router.get("/{slug}", response_model=schemas.Post)
def read_post(slug: str, db: Session = Depends(get_db)):
    post = crud.crud_blog.get_post_by_slug(db, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

# Admin routes
@router.post("/", response_model=schemas.Post)
def create_post(post_in: schemas.PostCreate, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    # Check slug uniqueness
    if crud.crud_blog.get_post_by_slug(db, post_in.slug):
        raise HTTPException(400, detail="Slug already exists")
    return crud.crud_blog.create_post(db, post_in)

@router.put("/{post_id}", response_model=schemas.Post)
def update_post(post_id: int, post_in: schemas.PostUpdate, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    post = crud.crud_blog.get_post(db, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    return crud.crud_blog.update_post(db, post, post_in)

@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    crud.crud_blog.delete_post(db, post_id)
    return {"status": "ok"}

@router.post("/{post_id}/cover", response_model=schemas.Post)
def upload_cover(post_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), u: models.User = Depends(deps.get_current_active_admin)):
    post = crud.crud_blog.get_post(db, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    url = utils.save_upload_file(file, "blog", f"post_{post_id}")
    return crud.crud_blog.update_cover(db, post_id, url)

@router.post("/upload-image", response_model=dict)
def upload_blog_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: models.User = Depends(deps.get_current_active_admin)
):
    # Сохраняем в папку static/blog_images
    url = utils.save_upload_file(file, "blog_images", "img")
    return {"url": url}