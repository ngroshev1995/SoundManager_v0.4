from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)

    score_type = Column(String, nullable=False)  # full_score, part, etc.
    editor = Column(String, nullable=True)  # Издание / Редакция
    license = Column(String, nullable=True)  # Лицензия
    source_text = Column(String, nullable=False)  # Текст ссылки (анкор)
    url = Column(String, nullable=False)  # Ссылка на файл или ресурс

    work_id = Column(Integer, ForeignKey("works.id"), nullable=True)
    composition_id = Column(Integer, ForeignKey("compositions.id"), nullable=True)

    work = relationship("Work", back_populates="scores")
    composition = relationship("Composition", back_populates="scores")