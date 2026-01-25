from app.utils.skill_extractor import extract_skills
from app.utils.jd_experience_parser import extract_experience_requirements
from app.utils.jd_quality import evaluate_jd_quality

def build_jd_intelligence(jd_text: str):
    """
    Build deterministic, explainable intelligence from Job Description text.
    """

    skills = extract_skills(jd_text)
    experience = extract_experience_requirements(jd_text)
    quality = evaluate_jd_quality(jd_text, skills)

    return {
        "skills": skills,
        "experience_requirements": experience,
        "quality": quality
    }
