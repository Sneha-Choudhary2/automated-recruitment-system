import os
import pdfplumber
from docx import Document


def extract_text(file_path: str) -> str:
    """
    Extract raw text from PDF or DOCX file.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError("Resume file not found")

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext == ".pdf":
        return _extract_pdf_text(file_path)

    if ext == ".docx":
        return _extract_docx_text(file_path)

    raise ValueError("Unsupported file format for text extraction")


def _extract_pdf_text(file_path: str) -> str:
    text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)

    return "\n".join(text)


def _extract_docx_text(file_path: str) -> str:
    doc = Document(file_path)
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n".join(paragraphs)
