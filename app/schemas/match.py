from pydantic import BaseModel
from typing import Dict, List, Optional

class SkillMatch(BaseModel):
    matched: List[str]
    missing: List[str]
    extra: List[str]

class ExperienceMatch(BaseModel):
    resume_years: Optional[float]
    required_years: Optional[int]
    status: str  # underqualified | matched | overqualified | unknown

class MatchResult(BaseModel):
    resume_id: int
    job_id: int
    skill_match: SkillMatch
    experience_match: ExperienceMatch
    notes: List[str]
