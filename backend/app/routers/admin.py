from __future__ import annotations

import csv
import io
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import require_roles
from app.models import ActivityLog, Assignment, User, UserRole
from app.schemas import ActivityLogOut, WorkloadRow

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _workload_rows(db: Session, cap: float) -> list[WorkloadRow]:
    agg = db.execute(
        select(Assignment.ta_user_id, func.sum(Assignment.assigned_hours)).group_by(Assignment.ta_user_id)
    ).all()
    totals = {int(tid): float(s or 0) for tid, s in agg}
    tas = db.scalars(select(User).where(User.role == UserRole.ta)).all()
    out: list[WorkloadRow] = []
    for ta in tas:
        th = totals.get(ta.id, 0.0)
        out.append(
            WorkloadRow(
                ta_user_id=ta.id,
                display_name=ta.display_name,
                email=ta.email,
                total_hours=th,
                overloaded=th > cap,
            )
        )
    out.sort(key=lambda r: r.total_hours, reverse=True)
    return out


@router.get("/workload", response_model=list[WorkloadRow])
def workload(
    user: Annotated[User, Depends(require_roles(UserRole.admin))],
    db: Session = Depends(get_db),
    max_hours: Optional[float] = None,
):
    cap = float(max_hours) if max_hours is not None else float(settings.max_ta_hours_default)
    return _workload_rows(db, cap)


@router.get("/workload/export.csv")
def workload_export_csv(
    user: Annotated[User, Depends(require_roles(UserRole.admin))],
    db: Session = Depends(get_db),
):
    cap = float(settings.max_ta_hours_default)
    rows = _workload_rows(db, cap)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ta_user_id", "display_name", "email", "total_hours", "overloaded"])
    for r in rows:
        w.writerow([r.ta_user_id, r.display_name, r.email, r.total_hours, r.overloaded])
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="ta_workload.csv"'},
    )


@router.get("/activity-logs", response_model=list[ActivityLogOut])
def activity_logs(
    user: Annotated[User, Depends(require_roles(UserRole.admin))],
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
):
    stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit)
    logs = db.scalars(stmt).all()
    return [ActivityLogOut.model_validate(x) for x in logs]
