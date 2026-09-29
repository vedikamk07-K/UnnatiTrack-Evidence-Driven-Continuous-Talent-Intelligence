"""Reduced data model (spec §8). Skill states are computed from evidence on read —
never stored — so a conclusion can't drift from the evidence behind it."""
from sqlalchemy import JSON, Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(20))  # "hr" | "employee"
    employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120))
    team: Mapped[str] = mapped_column(String(60), index=True)
    location: Mapped[str] = mapped_column(String(60))
    experience: Mapped[str] = mapped_column(String(20))
    manager: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    hero: Mapped[bool] = mapped_column(default=False)
    competencies: Mapped[list] = mapped_column(JSON)

    def to_dict(self) -> dict:
        d = {k: getattr(self, k) for k in ("id", "name", "role", "team", "location", "experience", "manager", "email", "competencies")}
        if self.hero:
            d["hero"] = True
        return d


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    seq: Mapped[int] = mapped_column(Integer, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), index=True)
    competency_id: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(20))
    date: Mapped[str] = mapped_column(String(10), index=True)
    cycle: Mapped[int] = mapped_column(Integer)
    raw: Mapped[float] = mapped_column(Float)
    scale: Mapped[int] = mapped_column(Integer)
    value: Mapped[float] = mapped_column(Float)  # normalised 0–100
    title: Mapped[str] = mapped_column(String(200))
    note: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(160))
    is_new: Mapped[bool] = mapped_column(default=False)
    reliability: Mapped[float | None] = mapped_column(Float, nullable=True)  # optional per-item override (0–1)
    relevance: Mapped[float | None] = mapped_column(Float, nullable=True)  # optional per-item override (0–1)

    def to_dict(self) -> dict:
        d = {"id": self.id, "seq": self.seq, "employeeId": self.employee_id, "competencyId": self.competency_id, "source": self.source, "date": self.date, "cycle": self.cycle,
             "raw": self.raw if self.scale == 5 else int(self.raw), "scale": self.scale, "value": self.value, "title": self.title, "note": self.note, "author": self.author}
        if self.is_new:
            d["isNew"] = True
        if self.reliability is not None:
            d["reliability"] = self.reliability
        if self.relevance is not None:
            d["relevance"] = self.relevance
        return d


class Comment(Base):
    __tablename__ = "hr_comments"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), index=True)
    visibility: Mapped[str] = mapped_column(String(10))  # "employee" | "private"
    author: Mapped[str] = mapped_column(String(160))
    date: Mapped[str] = mapped_column(String(10))
    competency_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    text: Mapped[str] = mapped_column(Text)

    def to_dict(self) -> dict:
        return {"id": self.id, "employeeId": self.employee_id, "visibility": self.visibility, "author": self.author, "date": self.date, "competencyId": self.competency_id, "text": self.text}


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[str] = mapped_column(String(200))


class Resume(Base):
    """One current resume per employee. The file is kept for download; parsed claims become
    low-weight "resume" evidence (self-reported), replaced whenever a new resume is uploaded."""
    __tablename__ = "resumes"
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), primary_key=True)
    filename: Mapped[str] = mapped_column(String(200))
    content_type: Mapped[str] = mapped_column(String(120))
    size: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    text: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[str] = mapped_column(String(10))
    uploaded_by: Mapped[str] = mapped_column(String(120))
    parsed: Mapped[dict] = mapped_column(JSON)
    evidence_ids: Mapped[list] = mapped_column(JSON)

    def to_dict(self) -> dict:
        return {"employeeId": self.employee_id, "filename": self.filename, "contentType": self.content_type, "size": self.size, "uploadedAt": self.uploaded_at,
                "uploadedBy": self.uploaded_by, "chars": len(self.text or ""), "years": self.parsed.get("years"), "matches": self.parsed.get("matches", []), "evidenceIds": self.evidence_ids}
