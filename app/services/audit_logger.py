from sqlalchemy.orm import Session
from app.db.models.audit_log import AuditLog


def log_action(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    reason: str | None = None
):
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        reason=reason
    )
    db.add(audit)
    db.commit()
