from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models import ActivityLog, utcnow


def log_activity(
    db: Session,
    *,
    actor_user_id: Optional[int],
    action: str,
    entity_type: str = "",
    entity_id: Optional[int] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    row = ActivityLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
        created_at=utcnow(),
    )
    db.add(row)
