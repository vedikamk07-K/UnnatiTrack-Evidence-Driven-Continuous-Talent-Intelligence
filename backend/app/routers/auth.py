from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import create_token, current_session, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginIn(BaseModel):
    role: str
    email: str
    password: str


def _claims(u: User) -> dict:
    return {"sub": u.id, "role": u.role, "userId": u.id, "employeeId": u.employee_id, "name": u.name, "title": u.title}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Incorrect email or password.")
    if u.role != body.role:
        raise HTTPException(403, "This account does not have HR access. Use Employee login." if body.role == "hr" else "HR accounts sign in through HR login.")
    return {"access_token": create_token(_claims(u)), "token_type": "bearer", "user": _claims(u)}


@router.post("/demo")
def demo(role: str = "hr", db: Session = Depends(get_db)):
    email = "neha.menon@vidyut.in" if role == "hr" else "sneha.deshmukh@vidyut.in"
    return login(LoginIn(role=role, email=email, password="demo"), db)


@router.get("/me")
def me(session: dict = Depends(current_session)):
    return session
