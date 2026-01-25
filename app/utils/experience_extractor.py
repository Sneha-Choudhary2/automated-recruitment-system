import re
from datetime import datetime
from app.utils.section_parser import split_into_sections

CURRENT_YEAR = datetime.now().year

EXPERIENCE_SECTIONS = [
    "experience",
    "work experience",
    "employment",
    "professional experience",
    "internship",
]


def estimate_experience_years(text: str) -> float:
    """
    Estimate PROFESSIONAL experience using section-based parsing.
    Education is excluded by design.
    """
    if not text:
        return 0.0

    sections = split_into_sections(text)
    total_months = 0

    for section_name, section_text in sections.items():
        if section_name not in EXPERIENCE_SECTIONS:
            continue

        section_text = section_text.lower()

        # Date ranges like: 2021 - 2023 or 2024 - Present
        for match in re.finditer(
            r"(19\d{2}|20\d{2})\s*[-–]\s*(present|19\d{2}|20\d{2})",
            section_text,
        ):
            start, end = match.groups()
            start_year = int(start)
            end_year = CURRENT_YEAR if end == "present" else int(end)
            if end_year >= start_year:
                total_months += (end_year - start_year) * 12

        # Explicit durations like: 2 years, 6 months
        years = re.findall(r"(\d+)\s+years?", section_text)
        months = re.findall(r"(\d+)\s+months?", section_text)

        for y in years:
            total_months += int(y) * 12
        for m in months:
            total_months += int(m)

    return round(total_months / 12, 1)
