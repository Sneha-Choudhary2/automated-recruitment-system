from typing import Dict
from app.utils.section_parser import split_into_sections


def analyze_resume_quality(text: str, extracted_skills: Dict) -> Dict:
    """
    Analyze basic resume quality signals.
    """
    if not text:
        return {
            "length": 0,
            "sections_present": [],
            "skill_density": 0.0,
            "flags": ["empty_resume"],
        }

    text_length = len(text)

    sections = split_into_sections(text)
    sections_present = [s for s in sections.keys() if s != "unknown"]

    total_skills = len(extracted_skills)
    skill_density = round((total_skills / max(text_length, 1)) * 1000, 2)

    flags = []

    if text_length < 500:
        flags.append("too_short")

    if "experience" not in sections_present and "work experience" not in sections_present:
        flags.append("missing_experience_section")

    if total_skills == 0:
        flags.append("no_detected_skills")

    return {
        "length": text_length,
        "sections_present": sections_present,
        "skill_density": skill_density,
        "flags": flags,
    }
