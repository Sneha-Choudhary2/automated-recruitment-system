from fastapi import FastAPI

from app.db.session import engine
from app.db.base import Base

# Import ALL models before create_all
from app.db.models.user import User  # noqa
from app.db.models.audit_log import AuditLog  # noqa
import app.db.models.resume  # noqa

from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.resumes import router as resumes_router
from app.api import jobs




app = FastAPI(
    title="AI-Assisted Automated Recruitment System",
    version="0.1.0"
)

# Create tables
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(resumes_router)
app.include_router(jobs.router)




@app.get("/health")
def health_check():
    return {"status": "ok"}
