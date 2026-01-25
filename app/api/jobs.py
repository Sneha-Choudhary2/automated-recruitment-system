from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job_description import JobDescription
from app.schemas.job import JobCreate

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/create")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    jd = JobDescription(
    title=job.title,
    raw_text=job.raw_text,
    application_deadline=job.application_deadline
)

    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd

