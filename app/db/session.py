from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.core import config

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

@event.listens_for(engine, "connect")
def add_custom_functions(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

    dbapi_connection.create_function("lower_utf8", 1, lambda s: s.lower() if s else None)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()