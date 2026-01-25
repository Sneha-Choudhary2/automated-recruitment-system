from typing import Dict

SKILL_WEIGHT = 50
EXPERIENCE_WEIGHT = 30
QUALITY_WEIGHT = 20

def calculate_match_score(match_result, resume_quality: Dict):
    """
    Calculate an explainable, rule-based match score.
    This score is informational only.
    """

    score = 0
    breakdown = {}

    # --- Skill score ---
    total_required = len(match_result.skill_match.missing) + len(match_result.skill_match.matched)
    if total_required > 0:
        skill_score = (len(match_result.skill_match.matched) / total_required) * SKILL_WEIGHT
    else:
        skill_score = 0

    score += skill_score
    breakdown["skills"] = f"Matched {len(match_result.skill_match.matched)} of {total_required} required skills"

    # --- Experience score ---
    exp_status = match_result.experience_match.status

    if exp_status == "matched" or exp_status == "overqualified":
        exp_score = EXPERIENCE_WEIGHT
        breakdown["experience"] = "Meets or exceeds experience requirement"
    elif exp_status == "underqualified":
        exp_score = EXPERIENCE_WEIGHT * 0.5
        breakdown["experience"] = "Below required experience"
    else:
        exp_score = EXPERIENCE_WEIGHT * 0.5
        breakdown["experience"] = "Experience requirement unclear"

    score += exp_score

    # --- Quality score (simple for now) ---
    if resume_quality.get("warnings"):
        quality_score = QUALITY_WEIGHT * 0.5
        breakdown["quality"] = "Resume has quality warnings"
    else:
        quality_score = QUALITY_WEIGHT
        breakdown["quality"] = "Resume quality acceptable"

    score += quality_score

    return {
        "score": round(score),
        "breakdown": breakdown
    }
