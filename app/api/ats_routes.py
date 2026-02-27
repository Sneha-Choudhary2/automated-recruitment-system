from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import re

from app.db.session import get_db
from app.db.models.resume import Resume
from app.db.models.job_description import JobDescription

from app.ml.inference import (
    ats_evaluate_resume,
    rank_resumes_against_jd
)

from app.config.skills import SKILLS  # ✅ import your skills dictionary

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
# SKILL HELPERS
# ============================

def _normalize(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[^a-z0-9\+\#\.\s]", " ", text)  # keep c++, c#, .net-like tokens
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_skills(text: str) -> set:
    """Return canonical skill names that appear in the text."""
    text_norm = _normalize(text)
    found = set()

    for canonical, variants in SKILLS.items():
        for v in variants:
            v_norm = _normalize(v)
            # word-boundary-ish match for phrases
            if re.search(rf"(^| )({re.escape(v_norm)})( |$)", text_norm):
                found.add(canonical)
                break

    return found


def skill_overlap_score(jd_skills: set, resume_skills: set):
    """Returns (overlap_ratio 0-1, matched_skills list, missing_skills list)."""
    if not jd_skills:
        return 0.0, [], []

    matched = sorted(list(jd_skills.intersection(resume_skills)))
    missing = sorted(list(jd_skills.difference(resume_skills)))

    ratio = len(matched) / max(len(jd_skills), 1)
    return ratio, matched, missing


def compute_final_score(similarity_0_1: float, skill_overlap_0_1: float, alpha: float = 0.65) -> float:
    """
    Weighted score:
    alpha * skill_overlap + (1-alpha) * similarity
    alpha=0.65 makes scores more human-believable for ATS demos.
    """
    similarity_0_1 = max(0.0, min(1.0, similarity_0_1))
    skill_overlap_0_1 = max(0.0, min(1.0, skill_overlap_0_1))
    final = alpha * skill_overlap_0_1 + (1.0 - alpha) * similarity_0_1

    # Optional gentle calibration (prevents everything looking too low)
    # You can comment this out if you want pure weighted result.
    final = (final - 0.05) / 0.95
    final = max(0.0, min(1.0, final))

    return final


# ============================
# EVALUATE SINGLE RESUME
# ============================

@router.post("/evaluate-resume")
def evaluate_resume(data: EvaluateResumeRequest):
    # Keep your existing output
    result = ats_evaluate_resume(
        resume_text=data.resume_text,
        jd_text=data.jd_text
    )

    # Add skill overlap + calibrated score to evaluation too
    jd_sk = extract_skills(data.jd_text)
    rs_sk = extract_skills(data.resume_text)
    overlap, matched, missing = skill_overlap_score(jd_sk, rs_sk)

    similarity = result.get("resume_jd_match", {}).get("match_score", 0.0)  # expected 0-1
    final = compute_final_score(similarity, overlap)

    result["resume_jd_match"]["similarity_score"] = round(similarity * 100, 2)
    result["resume_jd_match"]["skill_match_score"] = round(overlap * 100, 2)
    result["resume_jd_match"]["final_score"] = round(final * 100, 2)
    result["resume_jd_match"]["matched_skills"] = matched
    result["resume_jd_match"]["missing_skills"] = missing

    # Also update interpretation based on final_score
    fs = result["resume_jd_match"]["final_score"]
    if fs >= 75:
        interpretation = "Strong match"
    elif fs >= 55:
        interpretation = "Good match"
    elif fs >= 35:
        interpretation = "Fair match"
    else:
        interpretation = "Weak match"

    result["resume_jd_match"]["interpretation"] = interpretation

    return result


# ============================
# RANK RESUMES AGAINST JOB
# ============================

@router.post("/rank-resumes")
def rank_resumes(data: RankByJobRequest, db: Session = Depends(get_db)):

    # 1️⃣ Fetch Job
    job = db.query(JobDescription).filter(JobDescription.id == data.job_id).first()
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
        raise HTTPException(status_code=400, detail="No extracted resume text found")

    # ✅ Extract JD skills once
    jd_skills = extract_skills(job.raw_text)

    # 4️⃣ Run ML ranking (assumed to return similarity 0-1)
    scores = rank_resumes_against_jd(
        resume_texts=resume_texts,
        jd_text=job.raw_text,
        top_n=data.top_n
    )

    ranked_output = []

    for rank_position, item in enumerate(scores, start=1):
        resume_index = item["resume_id"]
        similarity = float(item["match_score"])  # 0-1

        resume_obj = resume_map.get(resume_index)
        if not resume_obj:
            continue

        # ✅ Extract resume skills + overlap
        resume_skills = extract_skills(resume_obj.extracted_text)
        overlap, matched, missing = skill_overlap_score(jd_skills, resume_skills)

        final = compute_final_score(similarity, overlap)

        ranked_output.append({
            "rank": rank_position,
            "resume_id": resume_obj.id,
            "filename": resume_obj.filename,

            # Keep existing field name for UI compatibility (final score %)
            "match_score": round(final * 100, 2),

            # Extra fields for your UI/polish/skill-gap page
            "similarity_score": round(similarity * 100, 2),
            "skill_match_score": round(overlap * 100, 2),
            "matched_skills": matched,
            "missing_skills": missing,
            "total_required_skills": len(jd_skills)
        })

    # Sort again by final match_score (just to be safe)
    ranked_output.sort(key=lambda x: x["match_score"], reverse=True)

    # Fix rank numbers after sorting
    for i, r in enumerate(ranked_output, start=1):
        r["rank"] = i

    return ranked_output