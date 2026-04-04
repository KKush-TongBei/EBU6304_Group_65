from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Application, ApplicationStatus, Job, JobStatus, User, UserRole
from app.schemas import ApplicationOut, JobOut

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _job_to_out(job: Job) -> JobOut:
    return JobOut.model_validate(job)


@router.get("", response_model=list[JobOut])
def list_jobs(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    skill: Optional[str] = None,
    status: Optional[str] = Query(
        default=None,
        description="open | closed | all; default open for TA, all for MO/Admin",
    ),
):
    stmt = select(Job)
    eff = status
    if eff is None:
        eff = "open" if user.role == UserRole.ta else "all"
    if eff == "open":
        stmt = stmt.where(Job.status == JobStatus.open)
    elif eff == "closed":
        stmt = stmt.where(Job.status == JobStatus.closed)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Job.module_name.ilike(like), Job.requirements.ilike(like))
        )
    if skill and skill.strip():
        sk = skill.strip().lower()
        like_skill = f"%{sk}%"
        stmt = stmt.where(
            or_(Job.skill_tags.ilike(like_skill), Job.requirements.ilike(like_skill))
        )
    stmt = stmt.order_by(Job.created_at.desc())
    rows = db.execute(stmt).scalars().all()
    return [_job_to_out(j) for j in rows]


@router.post("/{job_id}/apply", response_model=ApplicationOut)
def apply_job(
    job_id: int,
    user: Annotated[User, Depends(require_roles(UserRole.ta))],
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.open:
        raise HTTPException(status_code=400, detail="Job is closed for applications")
    existing = db.execute(
        select(Application).where(
            and_(Application.job_id == job_id, Application.ta_user_id == user.id)
        )
    ).scalar_one_or_none()
    if existing and existing.status not in (ApplicationStatus.withdrawn,):
        if existing.status == ApplicationStatus.pending:
            raise HTTPException(status_code=400, detail="Already applied")
        if existing.status in (ApplicationStatus.accepted, ApplicationStatus.rejected):
            raise HTTPException(status_code=400, detail="Application already decided")
    if existing and existing.status == ApplicationStatus.withdrawn:
        existing.status = ApplicationStatus.pending
        existing.decided_at = None
        db.add(existing)
        db.commit()
        db.refresh(existing)
        log_activity(
            db,
            actor_user_id=user.id,
            action="application_submitted",
            entity_type="application",
            entity_id=existing.id,
            payload={"job_id": job_id},
        )
        db.commit()
        return _application_out(db, existing)

    app_row = Application(job_id=job_id, ta_user_id=user.id, status=ApplicationStatus.pending)
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    log_activity(
        db,
        actor_user_id=user.id,
        action="application_submitted",
        entity_type="application",
        entity_id=app_row.id,
        payload={"job_id": job_id},
    )
    db.commit()
    return _application_out(db, app_row)


def _application_out(db: Session, a: Application) -> ApplicationOut:
    job = db.get(Job, a.job_id)
    ta = db.get(User, a.ta_user_id)
    return ApplicationOut(
        id=a.id,
        job_id=a.job_id,
        ta_user_id=a.ta_user_id,
        status=a.status,
        created_at=a.created_at,
        decided_at=a.decided_at,
        job=JobOut.model_validate(job) if job else None,
        ta_display_name=ta.display_name if ta else None,
        ta_email=ta.email if ta else None,
        ta_student_id=ta.student_id if ta else None,
    )
