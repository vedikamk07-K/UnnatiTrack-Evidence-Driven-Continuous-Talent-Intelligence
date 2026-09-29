"""JWT with role claims + role/ownership guards. Privacy is enforced HERE, server-side."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

_bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    return f"{salt.hex()}${hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, 200_000).hex()}"


def verify_password(pw: str, stored: str) -> bool:
    return hmac.compare_digest(hash_password(pw, bytes.fromhex(stored.split('$', 1)[0])), stored)


def create_token(claims: dict) -> str:
    s = get_settings()
    return jwt.encode({**claims, "exp": datetime.now(timezone.utc) + timedelta(minutes=s.jwt_expire_minutes)}, s.jwt_secret, algorithm=s.jwt_algorithm)


def current_session(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    s = get_settings()
    try:
        return jwt.decode(creds.credentials, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError as e:
        raise HTTPException(401, "Invalid or expired token") from e


def require_hr(session: dict = Depends(current_session)) -> dict:
    if session.get("role") != "hr":
        raise HTTPException(403, "HR access required")
    return session


def can_view(session: dict, employee_id: str) -> None:
    """HR sees everyone; an employee sees only themself."""
    if session.get("role") == "hr":
        return
    if session.get("employeeId") != employee_id:
        raise HTTPException(403, "PRIVATE INFORMATION — you can only access your own growth data.")
