from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base

# Import models so SQLAlchemy knows them
from app.db.models.user import User  # noqa

app = FastAPI(
    title="AI-Assisted Automated Recruitment System",
    version="0.1.0"
)

Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok"}
