from sqlalchemy.orm import DeclarativeBase
from app.db.session import engine

class Base(DeclarativeBase):
    pass

# IMPORTANT: import models here
from app.models.job_description import JobDescription

# Create tables
Base.metadata.create_all(bind=engine)
