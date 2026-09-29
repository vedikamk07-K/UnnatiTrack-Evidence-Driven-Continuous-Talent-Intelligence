"""Create tables and load the synthetic dataset (idempotent). python -m app.seed [--reset]"""
import json
from pathlib import Path

from sqlalchemy import inspect, text

from .db import Base, SessionLocal, engine
from .engine.analyze import AS_OF
from .models import Comment, Employee, Evidence, Setting, User
from .security import hash_password

SEED = Path(__file__).parent / "seed"
load = lambda n: json.loads((SEED / n).read_text())  # noqa: E731


def ensure_schema() -> None:
    """Tiny forward-only migration: add columns introduced after a database was created."""
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not insp.has_table(table.name):
                continue
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name not in have and col.nullable:
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {col.name} {col.type.compile(engine.dialect)}'))


def run(reset: bool = False) -> dict:
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    ensure_schema()
    with SessionLocal() as db:
        if db.query(Employee).count() == 0:
            emps = load("employees.json")
            for e in emps:
                db.add(Employee(**{k: e[k] for k in ("id", "name", "role", "team", "location", "experience", "manager", "email", "competencies")}, hero=bool(e.get("hero"))))
            db.flush()
            for u in load("hr_users.json"):
                db.add(User(id=u["id"], email=u["email"], name=u["name"], title=u["title"], role="hr", password_hash=hash_password(u["password"])))
            for e in emps:
                db.add(User(id=e["id"], email=e["email"], name=e["name"], title=f"{e['role']} · {e['team']}", role="employee", employee_id=e["id"], password_hash=hash_password("demo")))
            ev = load("evidence.json")
            for x in ev:
                db.add(Evidence(id=x["id"], seq=x["seq"], employee_id=x["employeeId"], competency_id=x["competencyId"], source=x["source"], date=x["date"], cycle=x["cycle"], raw=x["raw"], scale=x["scale"], value=x["value"], title=x["title"], note=x.get("note"), author=x.get("author")))
            for c in load("comments.json"):
                db.add(Comment(id=c["id"], employee_id=c["employeeId"], visibility=c["visibility"], author=c["author"], date=c["date"], competency_id=c.get("competencyId"), text=c["text"]))
            db.add(Setting(key="as_of", value=AS_OF))
        db.commit()
        return {"employees": db.query(Employee).count(), "evidence": db.query(Evidence).count()}


if __name__ == "__main__":
    import sys

    print(run(reset="--reset" in sys.argv))
