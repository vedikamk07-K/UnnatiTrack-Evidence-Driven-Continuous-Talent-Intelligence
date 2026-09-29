import os
import tempfile

# TEST_DATABASE_URL=postgresql://… runs the suite against a real (empty) PostgreSQL database
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'test.db')}"
os.environ["JWT_SECRET"] = "test-secret-for-unnatitrack-that-is-long-enough"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def login(client, role, email):
    r = client.post("/api/v1/auth/login", json={"role": role, "email": email, "password": "demo"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def hr(client):
    client.post("/api/v1/admin/seed", headers=login(client, "hr", "neha.menon@vidyut.in"))
    return login(client, "hr", "neha.menon@vidyut.in")


@pytest.fixture()
def sneha(client, hr):
    return login(client, "employee", "sneha.deshmukh@vidyut.in")
