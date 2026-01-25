from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    application_deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
