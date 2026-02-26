import os
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models.resume import Resume
from app.utils.text_extractor import extract_text

router = APIRouter(prefix="/resumes", tags=["resumes"])


# ===============================
# UPLOAD RESUME
# ===============================

@router.post("/upload")
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are allowed",
        )

    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    try:
        extracted_text = extract_text(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract resume text: {str(e)}",
        )

    resume = Resume(
        user_id=1,  # temporary until login is implemented
        filename=file.filename,
        file_path=file_path,
        extracted_text=extracted_text,
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "resume_id": resume.id,
        "uploaded_by_user_id": resume.user_id,
        "original_filename": file.filename,
        "message": "Resume uploaded, text extracted, and saved successfully",
    }


# ===============================
# GET ALL RESUMES
# ===============================

@router.get("/")
def get_resumes(db: Session = Depends(get_db)):
    resumes = db.query(Resume).all()

    return [
        {
            "id": r.id,
            "filename": r.filename,
            "file_path": r.file_path,
            "extracted_text": r.extracted_text,
            "uploaded_at": r.uploaded_at,  # ✅ correct column name
        }
        for r in resumes
    ]