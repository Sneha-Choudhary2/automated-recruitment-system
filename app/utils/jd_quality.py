from typing import Dict, List

def evaluate_jd_quality(text: str, skills: Dict) -> Dict:
    """
    Evaluate basic quality signals for a Job Description.
    Returns warnings only (no decisions).
    """

    warnings: List[str] = []
    word_count = len(text.split())

    if word_count < 100:
        warnings.append("jd_too_short")

    if not skills:
        warnings.append("no_skills_detected")

    return {
        "word_count": word_count,
        "warnings": warnings
    }
