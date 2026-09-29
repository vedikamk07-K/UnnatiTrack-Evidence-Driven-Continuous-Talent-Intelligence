"""The Python engine must reproduce the JS engine on every seeded assessment."""
import json
from pathlib import Path

import pytest

from app.engine.analyze import analyze_org

ROOT = Path(__file__).parent.parent
X = json.loads((ROOT / "tests/fixtures/expected.json").read_text())
ORG = analyze_org(json.loads((ROOT / "app/seed/employees.json").read_text()), json.loads((ROOT / "app/seed/evidence.json").read_text()))
BY = {(c["employeeId"], c["competencyId"]): c for c in ORG["all"]}


def test_summary():
    assert (ORG["total"], ORG["improvingPct"], ORG["evidenceGaps"]) == (156, 68, 17)
    assert ORG["counts"] == X["summary"]["counts"]


@pytest.mark.parametrize("row", X["competencies"], ids=lambda r: f"{r['employeeId']}:{r['competencyId']}")
def test_competency(row):
    c = BY[(row["employeeId"], row["competencyId"])]
    assert (c["state"], c["score"], c["confidence"]["value"], c["confidence"]["label"]) == (row["state"], row["score"], row["confidence"], row["label"])
    assert [t["score"] for t in c["trajectory"]] == row["trajectory"]
    assert [g["type"] for g in c["gaps"]] == row["gaps"]
    assert c["missingRequired"] == row["missing"]


def test_resume_parser_matches_js():
    from app.engine.resume import parse_resume

    text = (ROOT.parent / "docs/sample-resumes/ananya-iyer.txt").read_text()
    assert parse_resume(text, ["python", "api_design", "leadership", "communication"]) == X["resume"]["parsed"]


def test_resume_claim_enters_score_only():
    from app.engine.analyze import AS_OF, analyze_competency, cycle_of
    from app.engine.resume import parse_resume, resume_evidence

    ev = json.loads((ROOT / "app/seed/evidence.json").read_text())
    items = [e for e in ev if e["employeeId"] == "sneha-deshmukh" and e["competencyId"] == "leadership"]
    parsed = parse_resume("Led a team of 5 to launch the onboarding dashboard. Leadership training.", ["leadership"])
    claim = [{**x, "id": f"r{i}", "value": x["raw"], "cycle": cycle_of(x["date"]), "seq": len(ev) + 1 + i} for i, x in enumerate(resume_evidence(parsed, "sneha-deshmukh", AS_OF, "cv.txt"))]
    assert [{k: c[k] for k in ("id", "value", "note")} for c in claim] == X["resume"]["claim"]
    a = analyze_competency(items + claim, "leadership", AS_OF)
    want = X["resume"]["withClaim"]
    assert (a["score"], a["state"], a["confidence"]["value"], a["evidenceCount"], a["claim"]) == (want["score"], want["state"], want["confidence"], want["evidenceCount"], want["claim"])
    base = analyze_competency(items, "leadership", AS_OF)
    assert (base["state"], base["confidence"]["value"]) == (a["state"], a["confidence"]["value"])  # a claim never changes state or confidence
