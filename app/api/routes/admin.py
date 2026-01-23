from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.roles import require_role
from app.db.models.user import User
from app.services.audit_logger import log_action

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/test-action")
def admin_test_action(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin"))
):
    log_action(
        db=db,
        user_id=user.id,
        action="ADMIN_TEST_ACTION",
        entity_type="system",
        entity_id=0,
        reason="Verifying audit logging and role enforcement"
    )

    return {"message": "Admin action logged successfully"}
