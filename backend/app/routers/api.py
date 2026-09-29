from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import seed, services
from ..db import get_db
from ..engine.analyze import analyze_employee
from ..models import Employee, Resume
from ..security import can_view, current_session, require_hr

router = APIRouter(prefix="/api/v1", tags=["unnatitrack"])


class EvidenceIn(BaseModel):
    employeeId: str
    competencyId: str
    source: str
    raw: float
    scale: int | None = None
    reliability: float | None = None
    relevance: float | None = None
    date: str | None = None
    title: str | None = None
    note: str | None = None
    author: str | None = None


class CommentIn(BaseModel):
    text: str
    visibility: str = "employee"


class EmployeeEvidenceIn(BaseModel):
    competencyId: str
    source: str
    raw: float
    scale: int | None = None
    date: str | None = None
    reliability: float | None = None
    relevance: float | None = None
    title: str | None = None
    note: str | None = None


def _emp(db: Session, emp_id: str) -> dict:
    e = db.get(Employee, emp_id)
    if not e:
        raise HTTPException(404, "Employee not found")
    return e.to_dict()


@router.get("/dataset")
def dataset(session: dict = Depends(current_session), db: Session = Depends(get_db)):
    """Role-scoped payload: an employee receives only their own records."""
    return services.dataset(db, session)


# ---- employees -----------------------------------------------------------------------
@router.get("/employees", dependencies=[Depends(require_hr)])
def employees(db: Session = Depends(get_db)):
    org = services.org_analysis(db)
    return [{**a["employee"], "counts": a["counts"], "gaps": a["gaps"], "confidence": a["confidence"]} for a in org["byEmployee"].values()]


class EmployeeIn(BaseModel):
    name: str
    email: str
    role: str
    team: str | None = None
    location: str | None = None
    experience: str | None = None
    manager: str | None = None
    competencies: list[str]


@router.post("/employees", status_code=201, dependencies=[Depends(require_hr)])
def create_employee(body: EmployeeIn, db: Session = Depends(get_db)):
    return services.create_employee(db, body.model_dump())


# ---- resumes -------------------------------------------------------------------------
@router.post("/resumes/parse", dependencies=[Depends(require_hr)])
async def parse_resume(file: UploadFile = File(...)):
    """Preview only (nothing stored): extracted skills, email and name for the Add-employee form."""
    return services.parse_resume_file(file.filename or "resume", await file.read())


@router.post("/employees/{emp_id}/resume", status_code=201)
async def upload_resume(emp_id: str, file: UploadFile = File(...), session: dict = Depends(require_hr), db: Session = Depends(get_db)):
    return services.upload_resume(db, emp_id, file.filename or "resume", file.content_type or "", await file.read(), session["name"])


@router.get("/employees/{emp_id}/resume")
def get_resume(emp_id: str, session: dict = Depends(current_session), db: Session = Depends(get_db)):
    can_view(session, emp_id)
    r = db.get(Resume, emp_id)
    if not r:
        raise HTTPException(404, "No resume on file")
    return r.to_dict()


@router.get("/employees/{emp_id}/resume/file")
def download_resume(emp_id: str, session: dict = Depends(current_session), db: Session = Depends(get_db)):
    can_view(session, emp_id)
    r = db.get(Resume, emp_id)
    if not r:
        raise HTTPException(404, "No resume on file")
    return Response(r.data, media_type=r.content_type, headers={"Content-Disposition": f'attachment; filename="{r.filename}"'})


@router.delete("/employees/{emp_id}/resume", status_code=204, dependencies=[Depends(require_hr)])
def delete_resume(emp_id: str, db: Session = Depends(get_db)):
    services.delete_resume(db, emp_id)


@router.get("/employees/{emp_id}")
def employee(emp_id: str, session: dict = Depends(current_session), db: Session = Depends(get_db)):
    can_view(session, emp_id)
    return analyze_employee(_emp(db, emp_id), services.evidence_rows(db, emp_id), services.as_of(db))


@router.get("/employees/{emp_id}/skills")
def skills(emp_id: str, session: dict = Depends(current_session), db: Session = Depends(get_db)):
    can_view(session, emp_id)
    a = analyze_employee(_emp(db, emp_id), services.evidence_rows(db, emp_id), services.as_of(db))
    return [{k: c[k] for k in ("competencyId", "label", "state", "score", "confidence", "gaps", "conflict", "evidenceCount")} for c in a["competencies"]]


@router.get("/employees/{emp_id}/history")
def history(emp_id: str, session: dict = Depends(current_session), db: Session = Depends(get_db)):
    can_view(session, emp_id)
    a = analyze_employee(_emp(db, emp_id), services.evidence_rows(db, emp_id), services.as_of(db))
    return {c["competencyId"]: c["trajectory"] for c in a["competencies"]}


@router.get("/employees/{emp_id}/evidence")
def employee_evidence(emp_id: str, session: dict = Depends(current_session), db: Session = Depends(get_db)):
    can_view(session, emp_id)
    return services.evidence_rows(db, emp_id)


@router.post("/employees/{emp_id}/evidence", status_code=201, dependencies=[Depends(require_hr)])
def add_employee_evidence(emp_id: str, body: EmployeeEvidenceIn, db: Session = Depends(get_db)):
    """Same pipeline as POST /evidence (validate → store → recompute on read)."""
    return services.add_evidence(db, {"employeeId": emp_id, **body.model_dump(exclude_none=True)})


@router.post("/employees/{emp_id}/comments")
def comment(emp_id: str, body: CommentIn, session: dict = Depends(require_hr), db: Session = Depends(get_db)):
    return services.add_comment(db, emp_id, body.text, body.visibility, session["name"])


# ---- evidence ------------------------------------------------------------------------
@router.get("/evidence")
def evidence(session: dict = Depends(current_session), db: Session = Depends(get_db)):
    return services.evidence_rows(db, None if session["role"] == "hr" else session["employeeId"])


@router.post("/evidence", status_code=201, dependencies=[Depends(require_hr)])
def add_evidence(body: EvidenceIn, db: Session = Depends(get_db)):
    return services.add_evidence(db, body.model_dump())


@router.get("/evidence/gaps", dependencies=[Depends(require_hr)])
def gaps(db: Session = Depends(get_db)):
    return [{"employeeId": c["employeeId"], "competencyId": c["competencyId"], "gaps": c["gaps"]} for c in services.org_analysis(db)["all"] if c["evidenceGap"]]


@router.get("/evidence/conflicts", dependencies=[Depends(require_hr)])
def conflicts(db: Session = Depends(get_db)):
    return [{"employeeId": c["employeeId"], "competencyId": c["competencyId"], "conflict": c["conflict"]} for c in services.org_analysis(db)["all"] if c["conflict"]]


# ---- dashboard, admin -------------------------------------------------
@router.get("/dashboard/summary", dependencies=[Depends(require_hr)])
def summary(db: Session = Depends(get_db)):
    o = services.org_analysis(db)
    return {"employees": len(o["byEmployee"]), "competencies": o["total"], "improvingPct": o["improvingPct"], "evidenceGaps": o["evidenceGaps"], "counts": o["counts"]}


@router.get("/dashboard/attention", dependencies=[Depends(require_hr)])
def attention(db: Session = Depends(get_db)):
    o = services.org_analysis(db)
    return [{"employeeId": c["employeeId"], "competencyId": c["competencyId"], "state": c["state"], "confidence": c["confidence"]} for c in o["all"] if c["state"] in ("conflicting", "insufficient") or (c["state"] == "declining" and c["confidence"]["level"] == "high")]


@router.post("/admin/seed", dependencies=[Depends(require_hr)])
def reseed():
    return seed.run(reset=True)
