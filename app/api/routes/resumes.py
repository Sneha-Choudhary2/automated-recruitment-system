import os
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.resume import Resume
from app.utils.text_extractor import extract_text

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload")
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
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

    # Ensure upload directory exists
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate safe unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file to disk
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    # 🔹 Extract text from resume
    try:
        extracted_text = extract_text(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract resume text: {str(e)}",
        )

    # 🔹 Save to database
    resume = Resume(
        user_id=user.id,
        filename=file.filename,
        file_path=file_path,
        extracted_text=extracted_text,
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "resume_id": resume.id,
        "uploaded_by_user_id": user.id,
        "original_filename": file.filename,
        "message": "Resume uploaded, text extracted, and saved successfully",
    }
