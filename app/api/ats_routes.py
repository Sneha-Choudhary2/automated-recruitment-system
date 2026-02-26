from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.resume import Resume
from app.db.models.job_description import JobDescription

from app.ml.inference import (
    ats_evaluate_resume,
    rank_resumes_against_jd
)

router = APIRouter(prefix="/ats", tags=["ATS"])


# ============================
# REQUEST SCHEMAS
# ============================

class EvaluateResumeRequest(BaseModel):
    resume_text: str
    jd_text: str


class RankByJobRequest(BaseModel):
    job_id: int
    top_n: int = 5


# ============================
# EVALUATE SINGLE RESUME
# ============================

@router.post("/evaluate-resume")
def evaluate_resume(data: EvaluateResumeRequest):
    return ats_evaluate_resume(
        resume_text=data.resume_text,
        jd_text=data.jd_text
    )


# ============================
# RANK RESUMES AGAINST JOB
# ============================

@router.post("/rank-resumes")
def rank_resumes(data: RankByJobRequest, db: Session = Depends(get_db)):

    # 1️⃣ Fetch Job
    job = db.query(JobDescription).filter(
        JobDescription.id == data.job_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2️⃣ Fetch Resumes
    resumes = db.query(Resume).all()

    if not resumes:
        raise HTTPException(status_code=400, detail="No resumes uploaded")

    # 3️⃣ Create mapping: index → resume object
    resume_map = {}
    resume_texts = []

    for index, resume in enumerate(resumes):
        if resume.extracted_text:
            resume_map[index] = resume
            resume_texts.append(resume.extracted_text)

    if not resume_texts:
        raise HTTPException(
            status_code=400,
            detail="No extracted resume text found"
        )

    # 4️⃣ Run ML ranking
    scores = rank_resumes_against_jd(
        resume_texts=resume_texts,
        jd_text=job.raw_text,
        top_n=data.top_n
    )

    # 5️⃣ Attach metadata safely
    ranked_output = []

    for rank_position, item in enumerate(scores, start=1):

        resume_index = item["resume_id"]
        match_score = round(item["match_score"] * 100, 2)

        resume_obj = resume_map.get(resume_index)

        if not resume_obj:
            continue

        ranked_output.append({
            "rank": rank_position,
            "resume_id": resume_obj.id,
            "filename": resume_obj.filename,
            "match_score": match_score
        })

    return ranked_output