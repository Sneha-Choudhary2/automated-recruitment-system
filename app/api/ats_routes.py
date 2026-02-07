from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.ml.inference import ats_evaluate_resume, rank_resumes_against_jd

router = APIRouter(prefix="/ats", tags=["ATS"])


# ============================
# REQUEST SCHEMAS
# ============================

class EvaluateResumeRequest(BaseModel):
    resume_text: str
    jd_text: str


class RankResumesRequest(BaseModel):
    resumes: List[str]
    jd_text: str
    top_n: int = 5


# ============================
# ENDPOINTS
# ============================

@router.post("/evaluate-resume")
def evaluate_resume(data: EvaluateResumeRequest):
    """
    Evaluate a single resume against a job description.
    Decision-support only.
    """
    return ats_evaluate_resume(
        resume_text=data.resume_text,
        jd_text=data.jd_text
    )


@router.post("/rank-resumes")
def rank_resumes(data: RankResumesRequest):
    """
    Rank multiple resumes against a single job description.
    """
    return rank_resumes_against_jd(
        resume_texts=data.resumes,
        jd_text=data.jd_text,
        top_n=data.top_n
    )
