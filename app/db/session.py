# app/db/session.py
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.core import config

# Создаем движок
engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False}
)


# === МАГИЯ ЗДЕСЬ ===
# Мы регистрируем событие "connect". Как только база подключается,
# мы добавляем в неё новую SQL-функцию "lower_utf8".
# Она использует питоновский .lower(), который отлично знает русский язык.
@event.listens_for(engine, "connect")
def add_custom_functions(dbapi_connection, connection_record):
    # Включаем внешние ключи (на всякий случай)
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

    # Создаем функцию lower_utf8, которая принимает 1 аргумент
    # Если строка есть, делаем ей .lower(), иначе возвращаем None
    dbapi_connection.create_function("lower_utf8", 1, lambda s: s.lower() if s else None)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()