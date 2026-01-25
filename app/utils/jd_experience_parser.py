import re
from typing import Optional, Dict

def extract_experience_requirements(text: str) -> Dict[str, Optional[int]]:
    """
    Extract minimum experience requirement from Job Description text.
    Returns conservative, explainable values only.
    """

    patterns = [
        r"(\d+)\+?\s*years",
        r"minimum\s*(\d+)\s*years",
        r"at\s*least\s*(\d+)\s*years",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return {
                "min_years": int(match.group(1)),
                "max_years": None
            }

    if re.search(r"fresher", text, re.IGNORECASE):
        return {
            "min_years": 0,
            "max_years": None
        }

    return {
        "min_years": None,
        "max_years": None
    }
