from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base

from app.db.models.user import User  # noqa
from app.api.routes.auth import router as auth_router

app = FastAPI(
    title="AI-Assisted Automated Recruitment System",
    version="0.1.0"
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
