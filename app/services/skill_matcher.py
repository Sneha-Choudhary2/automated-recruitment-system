from typing import Dict, List

def match_skills(resume_skills: Dict[str, List[str]], jd_skills: Dict[str, List[str]]):
    """
    Compare resume skills with job description skills.
    Returns matched, missing, and extra skills.
    """

    resume_skill_set = set(resume_skills.keys())
    jd_skill_set = set(jd_skills.keys())

    matched = sorted(list(resume_skill_set & jd_skill_set))
    missing = sorted(list(jd_skill_set - resume_skill_set))
    extra = sorted(list(resume_skill_set - jd_skill_set))

    return {
        "matched": matched,
        "missing": missing,
        "extra": extra
    }
