from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import DateTime
from app.db.base import Base

class FeedbackMessage(Base):
    __tablename__ = "feedback_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User")