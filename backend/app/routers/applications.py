from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.deps import require_roles
from app.models import Application, ApplicationStatus, User, UserRole
from app.routers.jobs import _application_out
from app.schemas import ApplicationOut

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("/{application_id}/withdraw", response_model=ApplicationOut)
def withdraw(
    application_id: int,
    user: Annotated[User, Depends(require_roles(UserRole.ta))],
    db: Session = Depends(get_db),
):
    app_row = db.get(Application, application_id)
    if app_row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_row.ta_user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your application")
    if app_row.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending applications can be withdrawn")
    app_row.status = ApplicationStatus.withdrawn
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    log_activity(
        db,
        actor_user_id=user.id,
        action="application_withdrawn",
        entity_type="application",
        entity_id=app_row.id,
        payload={"job_id": app_row.job_id},
    )
    db.commit()
    return _application_out(db, app_row)
