from sqlalchemy.orm import Session
from app.models.blog import Post, Tag
from app.schemas.blog import PostCreate, PostUpdate
from app.utils import delete_file_by_url

def _get_or_create_tags(db: Session, tag_names: list[str]) -> list[Tag]:
    """Находит теги по именам или создает новые, если их нет."""
    tags = []
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        db_tag = db.query(Tag).filter(Tag.name == name).first()
        if not db_tag:
            db_tag = Tag(name=name)
            db.add(db_tag)
            db.commit()
            db.refresh(db_tag)
        tags.append(db_tag)
    return tags

def get_posts(db: Session, skip: int = 0, limit: int = 20, tag_name: str = None):
    query = db.query(Post).order_by(Post.created_at.desc())
    if tag_name:
        query = query.join(Post.tags).filter(Tag.name == tag_name)
    return query.offset(skip).limit(limit).all()

def get_post_by_slug(db: Session, slug: str):
    return db.query(Post).filter(Post.slug == slug).first()

def get_post(db: Session, post_id: int):
    return db.query(Post).filter(Post.id == post_id).first()


def create_post(db: Session, post: PostCreate):
    post_data = post.dict(exclude={"tags"})
    db_obj = Post(**post_data)

    if post.tags:
        db_obj.tags = _get_or_create_tags(db, post.tags)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_post(db: Session, db_obj: Post, obj_in: PostUpdate):
    update_data = obj_in.dict(exclude_unset=True, exclude={"tags"})
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    if obj_in.tags is not None:
        db_obj.tags = _get_or_create_tags(db, obj_in.tags)

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

def get_all_tags(db: Session):
    return db.query(Tag).all()