from sqlalchemy.orm import Session
from app.models.blog import Post
from app.schemas.blog import PostCreate, PostUpdate
from app.utils import delete_file_by_url

def get_posts(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Post).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()

def get_post_by_slug(db: Session, slug: str):
    return db.query(Post).filter(Post.slug == slug).first()

def get_post(db: Session, post_id: int):
    return db.query(Post).filter(Post.id == post_id).first()

def create_post(db: Session, post: PostCreate):
    db_obj = Post(**post.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_post(db: Session, db_obj: Post, obj_in: PostUpdate):
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_post(db: Session, post_id: int):
    obj = db.query(Post).get(post_id)
    if obj:
        if obj.cover_image_url:
            delete_file_by_url(obj.cover_image_url)
        db.delete(obj)
        db.commit()
    return obj

def update_cover(db: Session, post_id: int, url: str):
    post = get_post(db, post_id)
    if post:
        if post.cover_image_url:
            delete_file_by_url(post.cover_image_url)
        post.cover_image_url = url
        db.commit()
        db.refresh(post)
    return post