from app.services.skill_matcher import match_skills
from app.services.experience_matcher import match_experience
from app.schemas.match import MatchResult, SkillMatch, ExperienceMatch

def build_match_result(
    resume_id: int,
    job_id: int,
    resume_intelligence: dict,
    jd_intelligence: dict
):
    """
    Combine skill and experience matches into a unified match result.
    """

    skill_result = match_skills(
        resume_intelligence.get("skills", {}),
        jd_intelligence.get("skills", {})
    )

    experience_result = match_experience(
        resume_intelligence.get("experience_years"),
        jd_intelligence.get("experience_requirements", {}).get("min_years")
    )

    notes = []

    if experience_result["status"] == "underqualified":
        notes.append("Candidate has less experience than required")

    if experience_result["status"] == "overqualified":
        notes.append("Candidate exceeds required experience")

    return MatchResult(
        resume_id=resume_id,
        job_id=job_id,
        skill_match=SkillMatch(**skill_result),
        experience_match=ExperienceMatch(**experience_result),
        notes=notes
    )
