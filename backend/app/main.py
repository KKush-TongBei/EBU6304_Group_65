from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import admin, applications, auth, jobs, mo, ta

if settings.database_url.startswith("sqlite:///"):
    _raw = settings.database_url.replace("sqlite:///", "", 1)
    _dir = os.path.dirname(os.path.abspath(_raw))
    if _dir:
        os.makedirs(_dir, exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TA Recruitment System", version="1.0.0")

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(ta.router)
app.include_router(ta.router_notifications)
app.include_router(applications.router)
app.include_router(mo.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
