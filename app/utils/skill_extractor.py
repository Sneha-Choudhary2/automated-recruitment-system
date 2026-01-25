import re
from typing import Dict, List

from app.config.skills import SKILLS


def extract_skills(text: str) -> Dict[str, List[str]]:
    """
    Extract skills from resume text using rule-based matching.
    Returns a dict: {canonical_skill: [matched_variants]}
    """
    if not text:
        return {}

    text_lower = text.lower()
    extracted = {}

    for canonical, variants in SKILLS.items():
        matches = []
        for variant in variants:
            pattern = r"\b" + re.escape(variant) + r"\b"
            if re.search(pattern, text_lower):
                matches.append(variant)

        if matches:
            extracted[canonical] = matches

    return extracted
