from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.deps import require_roles
from app.models import Application, User, UserRole
from app.routers.jobs import _application_out
from app.schemas import ApplicationOut, MarkReadBody, NotificationOut, TAProfileUpdate, UserMe

router = APIRouter(prefix="/api/ta", tags=["ta"])


@router.get("/profile", response_model=UserMe)
def get_profile(user: Annotated[User, Depends(require_roles(UserRole.ta))]):
    return user


@router.patch("/profile", response_model=UserMe)
def patch_profile(
    body: TAProfileUpdate,
    user: Annotated[User, Depends(require_roles(UserRole.ta))],
    db: Session = Depends(get_db),
):
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.student_id is not None:
        user.student_id = body.student_id.strip() or None
    if body.email is not None:
        other = db.scalars(select(User).where(User.email == str(body.email))).first()
        if other and other.id != user.id:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = str(body.email)
    if body.skills is not None:
        user.skills = body.skills
    if body.cv_file_path is not None:
        user.cv_file_path = body.cv_file_path
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        actor_user_id=user.id,
        action="profile_updated",
        entity_type="user",
        entity_id=user.id,
        payload={},
    )
    db.commit()
    return user


@router.get("/applications", response_model=list[ApplicationOut])
def my_applications(
    user: Annotated[User, Depends(require_roles(UserRole.ta))],
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Application).where(Application.ta_user_id == user.id).order_by(Application.created_at.desc())
    ).scalars().all()
    return [_application_out(db, a) for a in rows]


router_notifications = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router_notifications.get("", response_model=list[NotificationOut])
def list_notifications(
    user: Annotated[User, Depends(require_roles(UserRole.ta))],
    db: Session = Depends(get_db),
):
    from app.models import Notification

    rows = db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).scalars().all()
    return [NotificationOut.model_validate(n) for n in rows]


@router_notifications.post("/mark-read")
def mark_read(
    body: MarkReadBody,
    user: Annotated[User, Depends(require_roles(UserRole.ta))],
    db: Session = Depends(get_db),
):
    from app.models import Notification

    stmt = select(Notification).where(Notification.user_id == user.id)
    if body.notification_ids:
        stmt = stmt.where(Notification.id.in_(body.notification_ids))
    rows = db.execute(stmt).scalars().all()
    for n in rows:
        n.read = True
        db.add(n)
    db.commit()
    return {"ok": True}
