from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.session import engine
from app.db.base import Base

# ✅ Import ALL models before create_all
from app.db.models.user import User  # noqa
from app.db.models.audit_log import AuditLog  # noqa
import app.db.models.resume  # noqa
import app.db.models.job_description  # noqa

from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.resumes import router as resumes_router
from app.api.jobs import router as jobs_router
from app.api.ats_routes import router as ats_router
from app.api.routes.ai_assist import router as ai_assist_router



app = FastAPI(
    title="AI-Assisted Automated Recruitment System",
    version="0.1.0"
)

# ✅ CORS (Frontend allowed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Optional: serve frontend from backend
app.mount("/frontend", StaticFiles(directory="frontend_html"), name="frontend")
# ✅ Create tables
Base.metadata.create_all(bind=engine)

# ✅ Register routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(ats_router)
app.include_router(ai_assist_router)



@app.get("/health")
def health_check():
    return {"status": "ok"}
