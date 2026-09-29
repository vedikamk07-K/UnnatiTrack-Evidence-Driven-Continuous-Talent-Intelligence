"""Use-case layer shared by the routers. Every read is scoped by the caller's session."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .engine.analyze import SOURCES, analyze_org, cycle_of
from .engine.evidence import normalise_evidence
from .models import Comment, Employee, Evidence, Resume, Setting


def as_of(db: Session) -> str:
    return db.get(Setting, "as_of").value


def set_as_of(db: Session, d: str) -> None:
    db.get(Setting, "as_of").value = d


def evidence_rows(db: Session, employee_id: str | None = None) -> list[dict]:
    q = db.query(Evidence)
    if employee_id:
        q = q.filter(Evidence.employee_id == employee_id)
    return [e.to_dict() for e in q.order_by(Evidence.date, Evidence.id)]


def dataset(db: Session, session: dict) -> dict:
    hr = session["role"] == "hr"
    emp_id = None if hr else session["employeeId"]
    emps = db.query(Employee).order_by(Employee.name) if hr else db.query(Employee).filter(Employee.id == emp_id)
    comments_q = db.query(Comment) if hr else db.query(Comment).filter(Comment.employee_id == emp_id, Comment.visibility == "employee")
    res_q = db.query(Resume) if hr else db.query(Resume).filter(Resume.employee_id == emp_id)
    return {"scope": "organization" if hr else "self", "asOf": as_of(db), "employees": [e.to_dict() for e in emps], "evidence": evidence_rows(db, emp_id),
            "comments": [c.to_dict() for c in comments_q.order_by(Comment.date.desc())], "activity": [], "resumes": [r.to_dict() for r in res_q]}


def org_analysis(db: Session) -> dict:
    return analyze_org([e.to_dict() for e in db.query(Employee)], evidence_rows(db), as_of(db))


def add_evidence(db: Session, body: dict, self_reported: bool = False) -> dict:
    """Pipeline: validate → normalise → store. Skill state is recomputed from evidence on every read.
    Resume claims are only created by the resume upload (self_reported=True), never entered by hand."""
    if SOURCES.get(body.get("source"), {}).get("selfReported") and not self_reported:
        raise HTTPException(422, "Resume claims come from an uploaded resume, not manual entry.")
    emp = db.get(Employee, body["employeeId"])
    if not emp or body["competencyId"] not in emp.competencies:
        raise HTTPException(422, "Unknown employee or competency")
    try:
        n = normalise_evidence({**body, "date": body.get("date") or as_of(db)})
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    d = n["date"]
    seq = (db.query(func.max(Evidence.seq)).scalar() or 0) + 1
    row = Evidence(id=f"ev-new-{seq}", seq=seq, employee_id=emp.id, competency_id=body["competencyId"], source=n["source"], date=d, cycle=cycle_of(d), raw=n["raw"], scale=n["scale"],
                   value=n["value"], title=body.get("title") or SOURCES[n["source"]]["label"], note=body.get("note"), author=body.get("author") or "Added by HR", is_new=True,
                   reliability=n.get("reliability"), relevance=n.get("relevance"))
    db.add(row)
    if d > as_of(db):
        set_as_of(db, d)
    db.commit()
    return {"item": row.to_dict()}


def add_comment(db: Session, emp_id: str, text: str, visibility: str, author: str) -> dict:
    if not text.strip():
        raise HTTPException(422, "Write a comment first")
    c = Comment(id=f"c{db.query(Comment).count() + 1}-{emp_id[:6]}", employee_id=emp_id, visibility=visibility, author=f"{author} · HR", date=as_of(db), text=text.strip())
    db.add(c)
    db.commit()
    return c.to_dict()


# ---- employees & resumes -----------------------------------------------------------------
def create_employee(db: Session, body: dict) -> dict:
    """HR adds an employee; they can sign in with the demo password."""
    import re

    from .engine.analyze import COMPETENCIES
    from .models import User
    from .security import hash_password

    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    comps = [c for c in body.get("competencies") or [] if c in COMPETENCIES]
    if len(name) < 2 or not (body.get("role") or "").strip():
        raise HTTPException(422, "Name and role are required.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(422, "Enter a valid work email.")
    if not comps:
        raise HTTPException(422, "Choose at least one competency to track.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with that email already exists.")
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "employee"
    emp_id, n = base, 2
    while db.get(Employee, emp_id):
        emp_id, n = f"{base}-{n}", n + 1
    e = Employee(id=emp_id, name=name, role=body["role"].strip(), team=(body.get("team") or "Unassigned").strip(), location=(body.get("location") or "Pune").strip(),
                 experience=(body.get("experience") or "—").strip(), manager=(body.get("manager") or "—").strip(), email=email, competencies=comps)
    db.add(e)
    db.flush()
    db.add(User(id=emp_id, email=email, name=name, title=f"{e.role} · {e.team}", role="employee", employee_id=emp_id, password_hash=hash_password("demo")))
    db.commit()
    return e.to_dict()


def parse_resume_file(filename: str, data: bytes, tracked: list[str] | None = None) -> dict:
    from .engine.resume import parse_resume
    from .resume_files import extract_text

    return {"filename": filename, **parse_resume(extract_text(filename, data), tracked or [])}


def upload_resume(db: Session, emp_id: str, filename: str, content_type: str, data: bytes, by: str) -> dict:
    """Store the file, replace earlier resume claims, and add one claim per tracked competency."""
    from .engine.resume import parse_resume, resume_evidence
    from .resume_files import TYPES, ext_of, extract_text

    e = db.get(Employee, emp_id)
    if not e:
        raise HTTPException(404, "Employee not found")
    text = extract_text(filename, data)
    parsed = parse_resume(text, e.competencies)
    old = db.get(Resume, emp_id)
    if old:
        db.query(Evidence).filter(Evidence.employee_id == emp_id, Evidence.source == "resume").delete()
        db.delete(old)
        db.flush()
    today = as_of(db)
    ids = [add_evidence(db, x, self_reported=True)["item"]["id"] for x in resume_evidence(parsed, emp_id, today, filename)]
    r = Resume(employee_id=emp_id, filename=filename[:200], content_type=content_type or TYPES[ext_of(filename)], size=len(data), data=data, text=text, uploaded_at=today,
               uploaded_by=by, parsed=parsed, evidence_ids=ids)
    db.add(r)
    db.commit()
    return r.to_dict()


def delete_resume(db: Session, emp_id: str) -> None:
    r = db.get(Resume, emp_id)
    if not r:
        raise HTTPException(404, "No resume on file")
    db.query(Evidence).filter(Evidence.employee_id == emp_id, Evidence.source == "resume").delete()
    db.delete(r)
    db.commit()
