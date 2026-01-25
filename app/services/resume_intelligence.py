from typing import Dict

from app.utils.skill_extractor import extract_skills
from app.utils.experience_extractor import estimate_experience_years
from app.utils.resume_quality import analyze_resume_quality


def build_resume_intelligence(resume_text: str) -> Dict:
    """
    Build explainable resume intelligence object.
    """
    skills = extract_skills(resume_text)
    experience_years = estimate_experience_years(resume_text)
    quality = analyze_resume_quality(resume_text, skills)

    return {
        "skills": skills,
        "experience_years": experience_years,
        "quality": quality,
    }
