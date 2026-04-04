from __future__ import annotations

import csv
import io
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.deps import require_roles
from app.models import (
    Application,
    ApplicationStatus,
    Assignment,
    Job,
    JobStatus,
    Notification,
    User,
    UserRole,
    utcnow,
)
from app.routers.jobs import _application_out
from app.schemas import ApplicationDecision, ApplicationOut, JobCreate, JobOut, JobUpdate

router = APIRouter(prefix="/api/mo", tags=["mo"])


def _ensure_own_job(db: Session, job_id: int, mo_id: int) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by != mo_id:
        raise HTTPException(status_code=403, detail="Not your job")
    return job


@router.get("/jobs", response_model=list[JobOut])
def my_jobs(
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Job).where(Job.created_by == user.id).order_by(Job.created_at.desc())
    ).scalars().all()
    return [JobOut.model_validate(j) for j in rows]


@router.post("/jobs", response_model=JobOut)
def create_job(
    body: JobCreate,
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    job = Job(
        module_name=body.module_name,
        requirements=body.requirements,
        deadline=body.deadline,
        skill_tags=body.skill_tags,
        assigned_hours=body.assigned_hours,
        created_by=user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    log_activity(
        db,
        actor_user_id=user.id,
        action="job_created",
        entity_type="job",
        entity_id=job.id,
        payload={"module_name": job.module_name},
    )
    db.commit()
    return JobOut.model_validate(job)


@router.patch("/jobs/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    body: JobUpdate,
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    job = _ensure_own_job(db, job_id, user.id)
    if body.module_name is not None:
        job.module_name = body.module_name
    if body.requirements is not None:
        job.requirements = body.requirements
    if body.deadline is not None:
        job.deadline = body.deadline
    if body.skill_tags is not None:
        job.skill_tags = body.skill_tags
    if body.assigned_hours is not None:
        job.assigned_hours = body.assigned_hours
    job.updated_at = utcnow()
    db.add(job)
    db.commit()
    db.refresh(job)
    log_activity(
        db,
        actor_user_id=user.id,
        action="job_updated",
        entity_type="job",
        entity_id=job.id,
        payload={},
    )
    db.commit()
    return JobOut.model_validate(job)


@router.post("/jobs/{job_id}/close", response_model=JobOut)
def close_job(
    job_id: int,
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    job = _ensure_own_job(db, job_id, user.id)
    job.status = JobStatus.closed
    job.updated_at = utcnow()
    db.add(job)
    db.commit()
    db.refresh(job)
    log_activity(
        db,
        actor_user_id=user.id,
        action="job_closed",
        entity_type="job",
        entity_id=job.id,
        payload={},
    )
    db.commit()
    return JobOut.model_validate(job)


@router.get("/jobs/{job_id}/applications", response_model=list[ApplicationOut])
def list_applicants(
    job_id: int,
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    _ensure_own_job(db, job_id, user.id)
    rows = db.execute(
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    ).scalars().all()
    return [_application_out(db, a) for a in rows]


def _create_notification(
    db: Session, *, user_id: int, title: str, body: str, application_id: Optional[int]
):
    n = Notification(
        user_id=user_id,
        title=title,
        body=body,
        application_id=application_id,
        read=False,
    )
    db.add(n)


@router.patch("/applications/{application_id}", response_model=ApplicationOut)
def decide_application(
    application_id: int,
    body: ApplicationDecision,
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    if body.status not in (ApplicationStatus.accepted, ApplicationStatus.rejected):
        raise HTTPException(status_code=400, detail="Only accepted or rejected allowed")
    app_row = db.get(Application, application_id)
    if app_row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    job = _ensure_own_job(db, app_row.job_id, user.id)
    if app_row.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail="Application is not pending")
    app_row.status = body.status
    app_row.decided_at = utcnow()
    db.add(app_row)
    ta = db.get(User, app_row.ta_user_id)
    title = "Application decision"
    body_text = f'Your application for "{job.module_name}" was {body.status.value}.'
    _create_notification(
        db,
        user_id=app_row.ta_user_id,
        title=title,
        body=body_text,
        application_id=app_row.id,
    )
    if body.status == ApplicationStatus.accepted:
        dup = db.execute(
            select(Assignment).where(
                Assignment.application_id == app_row.id
            )
        ).scalar_one_or_none()
        if dup is None:
            asg = Assignment(
                ta_user_id=app_row.ta_user_id,
                job_id=job.id,
                application_id=app_row.id,
                assigned_hours=job.assigned_hours,
            )
            db.add(asg)
    db.commit()
    db.refresh(app_row)
    log_activity(
        db,
        actor_user_id=user.id,
        action=f"application_{body.status.value}",
        entity_type="application",
        entity_id=app_row.id,
        payload={"job_id": job.id, "ta_id": app_row.ta_user_id},
    )
    db.commit()
    return _application_out(db, app_row)


@router.get("/jobs/{job_id}/export.csv")
def export_job_csv(
    job_id: int,
    user: Annotated[User, Depends(require_roles(UserRole.mo))],
    db: Session = Depends(get_db),
):
    job = _ensure_own_job(db, job_id, user.id)
    rows = db.execute(select(Application).where(Application.job_id == job_id)).scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["display_name", "email", "student_id", "status", "applied_at"])
    for a in rows:
        ta = db.get(User, a.ta_user_id)
        w.writerow(
            [
                ta.display_name if ta else "",
                ta.email if ta else "",
                ta.student_id if ta else "",
                a.status.value,
                a.created_at.isoformat() if a.created_at else "",
            ]
        )
    log_activity(
        db,
        actor_user_id=user.id,
        action="job_export_csv",
        entity_type="job",
        entity_id=job.id,
        payload={},
    )
    db.commit()
    filename = f"job_{job_id}_applicants.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
