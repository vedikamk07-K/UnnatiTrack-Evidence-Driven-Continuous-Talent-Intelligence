"""HR adds employees and resumes; resume claims are self-reported evidence (score only)."""
from pathlib import Path

from tests.conftest import login

SAMPLES = Path(__file__).parent.parent.parent / "docs/sample-resumes"


def _file(name):
    return {"file": (name, (SAMPLES / name).read_bytes())}


def test_parse_preview_stores_nothing(client, hr):
    r = client.post("/api/v1/resumes/parse", headers=hr, files=_file("ananya-iyer.pdf"))
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "ananya.iyer@vidyut.in" and body["name"] == "Ananya Iyer"
    assert [m["competencyId"] for m in body["matches"]][:2] == ["python", "api_design"]


def test_add_employee_with_resume_end_to_end(client, hr):
    emp = client.post("/api/v1/employees", headers=hr, json={"name": "Ananya Iyer", "email": "ananya.iyer@vidyut.in", "role": "Senior Software Engineer", "team": "Payments",
                                                            "competencies": ["python", "api_design", "system_design"]})
    assert emp.status_code == 201, emp.text
    eid = emp.json()["id"]
    assert client.post("/api/v1/employees", headers=hr, json={"name": "Dup", "email": "ananya.iyer@vidyut.in", "role": "X", "competencies": ["python"]}).status_code == 409

    up = client.post(f"/api/v1/employees/{eid}/resume", headers=hr, files=_file("ananya-iyer.pdf"))
    assert up.status_code == 201, up.text
    meta = up.json()
    assert len(meta["evidenceIds"]) == 3  # one claim per tracked competency the resume mentions

    ev = client.get(f"/api/v1/employees/{eid}/evidence", headers=hr).json()
    assert {e["source"] for e in ev} == {"resume"} and len(ev) == 3
    a = client.get(f"/api/v1/employees/{eid}", headers=hr).json()
    # claims alone are never enough to judge a skill
    assert all(c["state"] == "insufficient" and c["claim"] for c in a["competencies"])

    me = login(client, "employee", "ananya.iyer@vidyut.in")
    assert client.get(f"/api/v1/employees/{eid}/resume", headers=me).status_code == 200
    f = client.get(f"/api/v1/employees/{eid}/resume/file", headers=me)
    assert f.status_code == 200 and f.content[:4] == b"%PDF"
    assert client.get("/api/v1/employees/sneha-deshmukh/resume/file", headers=me).status_code == 403
    assert client.post(f"/api/v1/employees/{eid}/resume", headers=me, files=_file("ananya-iyer.pdf")).status_code == 403

    # re-upload replaces earlier claims instead of stacking them
    client.post(f"/api/v1/employees/{eid}/resume", headers=hr, files=_file("ananya-iyer.txt"))
    assert len(client.get(f"/api/v1/employees/{eid}/evidence", headers=hr).json()) == 3
    assert client.delete(f"/api/v1/employees/{eid}/resume", headers=hr).status_code == 204
    assert client.get(f"/api/v1/employees/{eid}/evidence", headers=hr).json() == []


def test_resume_claim_does_not_change_state_of_seeded_employee(client, hr):
    before = next(c for c in client.get("/api/v1/employees/sneha-deshmukh", headers=hr).json()["competencies"] if c["competencyId"] == "leadership")
    r = client.post("/api/v1/employees/sneha-deshmukh/resume", headers=hr, files={"file": ("cv.txt", b"Led a team of 5 to launch the onboarding dashboard. Leadership training.")})
    assert r.status_code == 201
    after = next(c for c in client.get("/api/v1/employees/sneha-deshmukh", headers=hr).json()["competencies"] if c["competencyId"] == "leadership")
    assert (after["state"], after["confidence"]["value"]) == (before["state"], before["confidence"]["value"])
    assert after["claim"]["value"] == 65
    client.delete("/api/v1/employees/sneha-deshmukh/resume", headers=hr)


def test_bad_uploads_and_manual_resume_evidence_rejected(client, hr):
    assert client.post("/api/v1/resumes/parse", headers=hr, files={"file": ("cv.exe", b"MZ")}).status_code == 415
    assert client.post("/api/v1/resumes/parse", headers=hr, files={"file": ("cv.pdf", b"not a pdf")}).status_code == 422
    r = client.post("/api/v1/evidence", headers=hr, json={"employeeId": "sneha-deshmukh", "competencyId": "leadership", "source": "resume", "raw": 90})
    assert r.status_code == 422
