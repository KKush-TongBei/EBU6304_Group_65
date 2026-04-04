from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.auth_utils import create_access_token, hash_password, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import User, UserRole
from app.schemas import LoginBody, Token, UserCreate, UserMe

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.scalars(select(User).where(User.email == body.email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role == UserRole.ta and not (body.student_id and body.student_id.strip()):
        raise HTTPException(status_code=400, detail="TA accounts require student_id")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        display_name=body.display_name or body.email.split("@")[0],
        student_id=body.student_id.strip() if body.student_id else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        actor_user_id=user.id,
        action="register",
        entity_type="user",
        entity_id=user.id,
        payload={"email": user.email, "role": user.role.value},
    )
    db.commit()
    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.scalars(select(User).where(User.email == body.email)).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    log_activity(
        db,
        actor_user_id=user.id,
        action="login",
        entity_type="user",
        entity_id=user.id,
        payload={"email": user.email},
    )
    db.commit()
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserMe)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user
