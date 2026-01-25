from typing import Optional

def match_experience(
    resume_years: Optional[float],
    required_years: Optional[int]
):
    """
    Compare resume experience with job requirement.
    Returns explainable status.
    """

    if resume_years is None or required_years is None:
        return {
            "resume_years": resume_years,
            "required_years": required_years,
            "status": "unknown"
        }

    if resume_years < required_years:
        status = "underqualified"
    elif resume_years == required_years:
        status = "matched"
    else:
        status = "overqualified"

    return {
        "resume_years": resume_years,
        "required_years": required_years,
        "status": status
    }
