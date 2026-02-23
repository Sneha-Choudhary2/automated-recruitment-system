from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.job_description import JobDescription
from app.schemas.job import JobCreate

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# CREATE JOB
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


# GET ALL JOBS
@router.get("/")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(JobDescription).order_by(JobDescription.id.desc()).all()
    return jobs


# UPDATE JOB
@router.put("/{job_id}")
def update_job(job_id: int, job: JobCreate, db: Session = Depends(get_db)):

    jd = db.query(JobDescription).filter(JobDescription.id == job_id).first()

    if not jd:
        raise HTTPException(status_code=404, detail="Job not found")

    jd.title = job.title
    jd.raw_text = job.raw_text
    jd.application_deadline = job.application_deadline

    db.commit()
    db.refresh(jd)

    return jd


# DELETE JOB
@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):

    jd = db.query(JobDescription).filter(JobDescription.id == job_id).first()

    if not jd:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(jd)
    db.commit()

    return {"message": "Job deleted successfully"}