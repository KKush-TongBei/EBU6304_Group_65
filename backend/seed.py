"""Populate demo data. Run: cd backend && PYTHONPATH=. python seed.py"""

from sqlalchemy import select

from app.auth_utils import hash_password
from app.database import SessionLocal, engine
from app.models import (
    Application,
    ApplicationStatus,
    Assignment,
    Base,
    Job,
    JobStatus,
    User,
    UserRole,
)


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalars(select(User).where(User.email == "admin@example.com")).first():
            print("Seed already applied (admin@example.com exists). Skipping.")
            return

        admin = User(
            email="admin@example.com",
            password_hash=hash_password("admin123"),
            role=UserRole.admin,
            display_name="Admin User",
            student_id=None,
            skills="",
            cv_file_path="",
        )
        mo = User(
            email="mo@example.com",
            password_hash=hash_password("mo123456"),
            role=UserRole.mo,
            display_name="Dr. Module",
            student_id=None,
            skills="",
            cv_file_path="",
        )
        ta1 = User(
            email="ta1@example.com",
            password_hash=hash_password("ta123456"),
            role=UserRole.ta,
            display_name="Alice TA",
            student_id="2021001",
            skills="Python, SQL, Teaching",
            cv_file_path="/demo/cv_alice.pdf",
        )
        ta2 = User(
            email="ta2@example.com",
            password_hash=hash_password("ta123456"),
            role=UserRole.ta,
            display_name="Bob TA",
            student_id="2021002",
            skills="Java, Networks",
            cv_file_path="/demo/cv_bob.pdf",
        )
        db.add_all([admin, mo, ta1, ta2])
        db.commit()
        db.refresh(mo)
        db.refresh(ta1)
        db.refresh(ta2)

        job1 = Job(
            module_name="Software Engineering",
            requirements="Grade A in SE course; good communication.",
            deadline="2026-05-01",
            skill_tags="Python, Agile",
            status=JobStatus.open,
            assigned_hours=8.0,
            created_by=mo.id,
        )
        job2 = Job(
            module_name="Computer Networks",
            requirements="Lab support experience preferred.",
            deadline="2026-05-15",
            skill_tags="Networks, Linux",
            status=JobStatus.open,
            assigned_hours=6.0,
            created_by=mo.id,
        )
        db.add_all([job1, job2])
        db.commit()
        db.refresh(job1)
        db.refresh(job2)

        app1 = Application(job_id=job1.id, ta_user_id=ta1.id, status=ApplicationStatus.pending)
        app2 = Application(job_id=job1.id, ta_user_id=ta2.id, status=ApplicationStatus.accepted)
        db.add_all([app1, app2])
        db.commit()
        db.refresh(app2)

        asg = Assignment(
            ta_user_id=ta2.id,
            job_id=job1.id,
            application_id=app2.id,
            assigned_hours=job1.assigned_hours,
        )
        db.add(asg)
        db.commit()

        print("Seed OK. Accounts:")
        print("  admin@example.com / admin123")
        print("  mo@example.com / mo123456")
        print("  ta1@example.com, ta2@example.com / ta123456")
    finally:
        db.close()


if __name__ == "__main__":
    main()
