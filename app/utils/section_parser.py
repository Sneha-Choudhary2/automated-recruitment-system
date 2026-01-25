import re
from typing import Dict

SECTION_HEADERS = [
    "experience",
    "work experience",
    "employment",
    "professional experience",
    "internship",
    "education",
    "projects",
    "skills",
]


def split_into_sections(text: str) -> Dict[str, str]:
    """
    Split resume text into sections based on simple heading detection.
    Headings are matched when a line equals a known section header.
    """
    if not text:
        return {}

    text_lower = text.lower()
    sections: Dict[str, str] = {}
    current_section = "unknown"
    buffer = []

    for line in text_lower.splitlines():
        line_clean = line.strip()

        # exact-line header match keeps this deterministic & explainable
        if line_clean in SECTION_HEADERS:
            if buffer:
                sections[current_section] = "\n".join(buffer).strip()
            current_section = line_clean
            buffer = []
        else:
            buffer.append(line)

    if buffer:
        sections[current_section] = "\n".join(buffer).strip()

    return sections
