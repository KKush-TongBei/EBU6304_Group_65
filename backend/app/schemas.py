from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import ApplicationStatus, JobStatus, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole
    display_name: str = ""
    student_id: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    display_name: str
    student_id: Optional[str]
    skills: str
    cv_file_path: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserOut):
    pass


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TAProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    student_id: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[str] = None
    cv_file_path: Optional[str] = None


class JobCreate(BaseModel):
    module_name: str = Field(min_length=1, max_length=255)
    requirements: str = ""
    deadline: str = ""
    skill_tags: str = ""
    assigned_hours: float = Field(default=5.0, ge=0)


class JobUpdate(BaseModel):
    module_name: Optional[str] = None
    requirements: Optional[str] = None
    deadline: Optional[str] = None
    skill_tags: Optional[str] = None
    assigned_hours: Optional[float] = Field(default=None, ge=0)


class JobOut(BaseModel):
    id: int
    module_name: str
    requirements: str
    deadline: str
    skill_tags: str
    status: JobStatus
    assigned_hours: float
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    ta_user_id: int
    status: ApplicationStatus
    created_at: datetime
    decided_at: Optional[datetime]
    job: Optional[JobOut] = None
    ta_display_name: Optional[str] = None
    ta_email: Optional[str] = None
    ta_student_id: Optional[str] = None

    model_config = {"from_attributes": True}


class ApplicationDecision(BaseModel):
    status: ApplicationStatus


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    application_id: Optional[int]
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MarkReadBody(BaseModel):
    notification_ids: Optional[List[int]] = None


class WorkloadRow(BaseModel):
    ta_user_id: int
    display_name: str
    email: str
    total_hours: float
    overloaded: bool


class ActivityLogOut(BaseModel):
    id: int
    actor_user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[int]
    payload: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}
