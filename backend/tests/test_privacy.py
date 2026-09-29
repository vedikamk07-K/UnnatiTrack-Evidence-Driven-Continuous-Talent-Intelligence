"""Role-based access is enforced by the API, not by the UI."""
from tests.conftest import login


def test_employee_dataset_is_self_only(client, sneha):
    d = client.get("/api/v1/dataset", headers=sneha).json()
    assert d["scope"] == "self"
    assert [e["id"] for e in d["employees"]] == ["sneha-deshmukh"]
    assert {e["employeeId"] for e in d["evidence"]} == {"sneha-deshmukh"}
    assert all(c["visibility"] == "employee" for c in d["comments"])
    assert "Private:" not in str(d)


def test_employee_cannot_read_others(client, sneha):
    r = client.get("/api/v1/employees/aarav-sharma", headers=sneha)
    assert r.status_code == 403
    assert "PRIVATE" in r.json()["detail"]
    assert client.get("/api/v1/employees", headers=sneha).status_code == 403


def test_employee_cannot_write(client, sneha):
    r = client.post("/api/v1/evidence", headers=sneha, json={"employeeId": "sneha-deshmukh", "competencyId": "leadership", "source": "manager", "raw": 5})
    assert r.status_code == 403


def test_wrong_portal_rejected(client, hr):
    r = client.post("/api/v1/auth/login", json={"role": "hr", "email": "sneha.deshmukh@vidyut.in", "password": "demo"})
    assert r.status_code == 403


def test_hr_adds_evidence_and_employee_sees_it(client, hr, sneha):
    bad = client.post("/api/v1/employees/sneha-deshmukh/evidence", headers=hr, json={"competencyId": "leadership", "source": "manager", "raw": 9, "scale": 5})
    assert bad.status_code == 422
    r = client.post("/api/v1/employees/sneha-deshmukh/evidence", headers=hr, json={"competencyId": "leadership", "source": "project", "raw": 4.0, "scale": 5, "date": "2026-09-29", "note": "Led onboarding dashboard"})
    assert r.status_code == 201 and r.json()["item"]["value"] == 75
    own = client.get("/api/v1/employees/sneha-deshmukh/evidence", headers=sneha).json()
    assert any(e["id"] == r.json()["item"]["id"] for e in own)
    assert client.get("/api/v1/employees/aarav-sharma/evidence", headers=sneha).status_code == 403


def test_hr_sees_private_notes(client, hr):
    assert "Private:" in str(client.get("/api/v1/dataset", headers=hr).json()["comments"])
    assert login  # imported helper
