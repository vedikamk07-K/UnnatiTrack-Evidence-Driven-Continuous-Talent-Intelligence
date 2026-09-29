"""UnnatiTrack skill-state engine — Python port of frontend/src/engine/analyze.js.

Rules are loaded from constants.json (exported from the frontend), so the two
engines share one source of truth. tests/test_parity.py checks identical output
for all 156 seeded competency assessments.

  score       recency- and source-weighted mean of normalised evidence (0–100)
  state       Theil–Sen slope of per-cycle scores, per competency
  confidence  0.30·volume + 0.25·diversity + 0.20·recency + 0.15·agreement + 0.10·stability
  hard rules  < 3 signals, < 2 sources or nothing in 180 days → insufficient
  conflict    source spread ≥ 1.0 point (5-pt scale) or opposing trends with ≥ 0.6
"""
from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np

C = json.loads((Path(__file__).parent / "constants.json").read_text())
AS_OF: str = C["AS_OF"]
CYCLES: list = C["CYCLES"]
SOURCES: dict = C["SOURCES"]
SOURCE_ORDER: list = C["SOURCE_ORDER"]
COMPETENCIES: dict = C["COMPETENCIES"]
RULES: dict = C["RULES"]
STATES: dict = C["STATES"]


def days(a: str, b: str) -> int:
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return min(hi, max(lo, v))


def r1(v: float) -> float:
    return math.floor(v * 10 + 0.5) / 10


def r2(v: float) -> float:
    return math.floor(v * 100 + 0.5) / 100


def round_half_up(v: float) -> int:
    return math.floor(v + 0.5)


def js_num(x: float) -> str:
    """Format a number the way JavaScript's String(number) does (3.0 → "3")."""
    return str(int(x)) if float(x).is_integer() else repr(float(x))


def mean(a: list[float]) -> float:
    s = 0.0
    for x in a:
        s += x
    return s / len(a)


def theil_sen(xs: list[float], ys: list[float]) -> float:
    """Median of all pairwise slopes (robust to a single outlier cycle)."""
    slopes = [(ys[j] - ys[i]) / (xs[j] - xs[i]) for i in range(len(xs)) for j in range(i + 1, len(xs)) if xs[j] != xs[i]]
    return float(np.median(slopes)) if slopes else 0.0


def relevance(cid: str, src: str) -> float:
    return 1.0 if src in COMPETENCIES[cid]["required"] else 0.4 if src == "training" else 0.5 if src == "resume" else 0.6


def source_weight(e: dict, cid: str) -> float:
    """reliability × relevance; either may be overridden per evidence item."""
    rel = e.get("reliability")
    rev = e.get("relevance")
    return (SOURCES[e["source"]]["reliability"] if rel is None else rel) * (relevance(cid, e["source"]) if rev is None else rev)


def time_weight(e: dict, as_of: str) -> float:
    return 0.5 ** (max(0, days(e["date"], as_of)) / RULES["halfLifeDays"])


def to_five(v: float) -> float:
    return r1(1 + v / 25)


def from_five(r: float) -> float:
    return (r - 1) * 25


def cycle_of(d: str) -> int:
    for c in CYCLES:
        if c["start"] <= d <= c["end"]:
            return c["id"]
    return CYCLES[-1]["id"]


def weighted_mean(items: list[dict], cid: str, as_of: str, with_time: bool = True):
    sw = 0.0
    s = 0.0
    for e in items:
        w = source_weight(e, cid) * (time_weight(e, as_of) if with_time else 1)
        sw += w
        s += w * e["value"]
    return s / sw if sw else None


def _label(s: str) -> str:
    return SOURCES[s]["label"].lower()


def _cap(s: str) -> str:
    return s[:1].upper() + s[1:]


def _list(a: list[str]) -> str:
    return "".join(a) if len(a) <= 1 else f"{', '.join(a[:-1])} and {a[-1]}"


def analyze_competency(items: list[dict], cid: str, as_of: str = AS_OF, resolve_from_seq: int | None = None) -> dict:
    comp = COMPETENCIES[cid]
    dated = sorted([e for e in items if e["date"] <= as_of], key=lambda e: e["date"])
    # Resume claims are kept apart: they only enter the current score (low weight), never state/confidence.
    claims = [e for e in dated if SOURCES[e["source"]].get("selfReported")]
    ev = [e for e in dated if not SOURCES[e["source"]].get("selfReported")]
    recent = [e for e in ev if days(e["date"], as_of) <= RULES["recentDays"]]
    # Conflict resolution: after a conflict plan collected calibrated evidence from ≥ 2
    # sources, the conflict check compares only that re-sample (older signals still score).
    post = [e for e in recent if e["seq"] > resolve_from_seq] if resolve_from_seq is not None else []
    resolved = len({e["source"] for e in post}) >= 2
    pool = post if resolved else recent
    w180 = [e for e in ev if days(e["date"], as_of) <= RULES["insufficientDays"]]

    last_cycle = max(4, cycle_of(as_of))
    trajectory = []
    for c in CYCLES:
        if c["id"] > last_cycle:
            continue
        in_c = [e for e in ev if e["cycle"] == c["id"]]
        by_src: dict[str, list] = {}
        for e in in_c:
            by_src.setdefault(e["source"], []).append(e["value"])
        m = weighted_mean(in_c, cid, as_of, False) if in_c else None
        trajectory.append({"cycle": c["id"], "label": c["label"], "score": None if m is None else r1(m), "n": len(in_c), "sources": {k: r1(mean(v)) for k, v in by_src.items()}})
    scored = [t for t in trajectory if t["score"] is not None]
    win = scored[-RULES["trendWindow"]:]
    win_cycles = {t["cycle"] for t in win}
    slope = r2(theil_sen([t["cycle"] for t in win], [t["score"] for t in win]))

    sources = []
    for src in SOURCE_ORDER:
        all_ = [e for e in ev if e["source"] == src]
        rec = [e for e in recent if e["source"] == src]
        rec_pool = [e for e in pool if e["source"] == src]
        per_cycle: dict[int, list] = {}
        for e in all_:
            if e["cycle"] in win_cycles:
                per_cycle.setdefault(e["cycle"], []).append(e["value"])
        cs = sorted(per_cycle)
        s_slope = theil_sen(cs, [mean(per_cycle[c]) for c in cs]) if len(cs) >= 2 else 0.0
        rm = weighted_mean(rec_pool, cid, as_of) if rec_pool else None
        latest = all_[-1] if all_ else None
        sources.append({
            "source": src, "label": SOURCES[src]["label"], "required": src in comp["required"], "count": len(all_), "recentCount": len(rec),
            "recentMean": None if rm is None else r1(rm),
            "latest": {"id": latest["id"], "value": latest["value"], "raw": latest["raw"], "scale": latest["scale"], "date": latest["date"]} if latest else None,
            "slope": r2(s_slope),
            "direction": ("up" if s_slope >= RULES["sourceEpsilon"] else "down" if s_slope <= -RULES["sourceEpsilon"] else "flat") if len(cs) >= 2 else "none",
            "relevance": relevance(cid, src), "reliability": SOURCES[src]["reliability"],
        })
    missing = [s for s in comp["required"] if not next(x for x in sources if x["source"] == s)["recentCount"]]

    with_recent = [s for s in sources if s["recentMean"] is not None]
    conflict = None
    if len(with_recent) >= 2:
        hi = with_recent[0]
        lo = with_recent[0]
        for s in with_recent[1:]:
            if s["recentMean"] > hi["recentMean"]:
                hi = s
            if s["recentMean"] < lo["recentMean"]:
                lo = s
        spread = hi["recentMean"] - lo["recentMean"]
        up = [s["source"] for s in sources if s["direction"] == "up"]
        down = [s["source"] for s in sources if s["direction"] == "down"]
        opposing = bool(up) and bool(down)
        if spread >= RULES["conflictSpread"] or (opposing and spread >= RULES["conflictSpreadWithOpposingTrends"]):
            conflict = {"high": hi["source"], "low": lo["source"], "spread": r1(spread), "spreadFive": r1(spread / 25), "highMean": hi["recentMean"], "lowMean": lo["recentMean"], "up": up, "down": down, "opposing": opposing}

    distinct = len({e["source"] for e in w180})
    reasons = []
    if not w180:
        reasons.append(f"No evidence in the last {RULES['insufficientDays']} days." if ev else "Only a self-reported resume claim — no verified evidence yet." if claims else "No evidence has been recorded yet.")
    else:
        if len(w180) < RULES["minSignals"]:
            reasons.append(f"Only {len(w180)} signal{'s' if len(w180) > 1 else ''} in the last 6 months (minimum {RULES['minSignals']}).")
        if distinct < RULES["minSources"]:
            reasons.append(f"Only one source ({_label(w180[0]['source'])}) — at least {RULES['minSources']} are needed.")

    if reasons:
        state = "insufficient"
    elif conflict:
        state = "conflicting"
    elif slope >= RULES["epsilon"]:
        state = "improving"
    elif slope <= -RULES["epsilon"]:
        state = "declining"
    else:
        state = "stagnating"

    latest_date = ev[-1]["date"] if ev else None
    age = days(latest_date, as_of) if latest_date else math.inf
    if len(scored) >= 3:
        d = [scored[i]["score"] - scored[i - 1]["score"] for i in range(1, len(scored))]
        m = mean(d)
        stability = clamp(1 - math.sqrt(mean([(x - m) ** 2 for x in d])) / 8)
    else:
        stability = 0.5
    factors = {
        "volume": clamp(len(w180) / RULES["volumeFull"]),
        "diversity": (len(comp["required"]) - len(missing)) / len(comp["required"]),
        "recency": clamp(1 - (age - RULES["recencyFullDays"]) / (RULES["recencyZeroDays"] - RULES["recencyFullDays"])) if latest_date else 0.0,
        "agreement": clamp(1 - (max(s["recentMean"] for s in with_recent) - min(s["recentMean"] for s in with_recent)) / 40) * (0.5 if conflict and conflict["opposing"] else 1) if len(with_recent) >= 2 else 0.5,
        "stability": stability,
    }
    W = RULES["weights"]
    value = W["volume"] * factors["volume"] + W["diversity"] * factors["diversity"] + W["recency"] * factors["recency"] + W["agreement"] * factors["agreement"] + W["stability"] * factors["stability"]
    caps = []
    if state == "insufficient":
        value = min(value, RULES["insufficientCap"])
    else:
        if conflict:
            value = min(value, RULES["conflictCap"])
            caps.append("Sources disagree, so confidence is held at the Low–Medium border until they are reconciled.")
        if missing:
            value = min(value, RULES["missingSourceCap"])
            caps.append(f"{_cap(_list([_label(s) for s in missing]))} required but missing in the last {RULES['recentDays']} days.")
    value = r2(value)
    level = "high" if value >= RULES["bands"]["high"] else "medium" if value >= RULES["bands"]["medium"] else "low"
    borderline = abs(value - RULES["bands"]["medium"]) < RULES["borderline"] and state != "insufficient"
    current = weighted_mean(ev + claims, cid, as_of) if w180 else None
    score = None if state == "insufficient" or current is None else round_half_up(current)

    gaps = []
    if not recent:
        gaps.append({"type": "no_recent_evidence", "priority": "medium"})
    elif len(w180) < RULES["minSignals"]:
        gaps.append({"type": "low_volume", "priority": "medium"})
    if conflict:
        gaps.append({"type": "conflicting_sources", "priority": "high"})
    if state != "insufficient":
        for m in missing:
            gaps.append({"type": "missing_source", "source": m, "priority": "high" if state == "declining" or conflict else "medium"})
    if state == "declining" and level == "high":
        gaps.append({"type": "declining_with_high_confidence", "priority": "high"})

    why = list(reasons) if state == "insufficient" else []
    if state != "insufficient":
        up_l = [_label(s["source"]) for s in sources if s["direction"] == "up"]
        down_l = [_label(s["source"]) for s in sources if s["direction"] == "down"]
        if conflict:
            why.append(f"{_cap(_label(conflict['high']))} and {_label(conflict['low'])} signals disagree by {conflict['spreadFive']:.1f} points ({js_num(to_five(conflict['highMean']))} vs {js_num(to_five(conflict['lowMean']))} on a 5-point scale).")
        if up_l and down_l:
            why.append(f"{_cap(_list(up_l))} {'are' if len(up_l) > 1 else 'is'} rising while {_list(down_l)} {'are' if len(down_l) > 1 else 'is'} falling.")
        elif up_l:
            why.append(f"{_cap(_list(up_l))} {'are' if len(up_l) > 1 else 'is'} rising across recent cycles.")
        elif down_l:
            why.append(f"{_cap(_list(down_l))} {'are' if len(down_l) > 1 else 'is'} falling across recent cycles.")
        else:
            why.append("Recent sources are broadly flat across cycles.")
        for m in missing:
            why.append(f"No {_label(m)} evidence in the last {RULES['recentDays']} days.")
        if resolved:
            why.append(f"Conflict check uses the calibrated re-sample collected under the development plan ({len(post)} signals from {len({e['source'] for e in post})} sources).")

    return {
        "competencyId": cid, "label": comp["label"], "state": state, "stateLabel": STATES[state]["label"], "score": score,
        "lastKnown": round_half_up(scored[-1]["score"]) if scored else None, "slope": slope, "trajectory": trajectory, "sources": sources,
        "required": comp["required"], "missingRequired": missing, "conflict": conflict,
        "resolution": {"fromSeq": resolve_from_seq, "signals": len(post), "sources": sorted({e["source"] for e in post}, key=SOURCE_ORDER.index)} if resolved else None,
        "confidence": {"value": value, "level": level, "label": "LOW–MEDIUM" if borderline else level.upper(), "factors": {k: r2(v) for k, v in factors.items()}, "caps": caps},
        "gaps": gaps, "evidenceGap": any(g["type"] != "declining_with_high_confidence" for g in gaps), "why": why,
        "evidenceCount": len(ev) + len(claims), "recentCount": len(recent), "latestDate": latest_date, "evidenceIds": [e["id"] for e in ev[-8:]],
        "claim": {"value": claims[-1]["value"], "date": claims[-1]["date"], "id": claims[-1]["id"], "note": claims[-1].get("note") or ""} if claims else None,
    }


def resolve_map_from_plans(plans: list[dict]) -> dict:
    """Plans raised to settle a conflict → {'emp::cid': acceptedSeq}."""
    m: dict[str, int] = {}
    for p in plans:
        if "conflicting_sources" not in (p.get("gapTypes") or []):
            continue
        k = f"{p['employeeId']}::{p['competencyId']}"
        if k not in m or p["acceptedSeq"] > m[k]:
            m[k] = p["acceptedSeq"]
    return m


def analyze_employee(emp: dict, evidence: list[dict], as_of: str = AS_OF, resolve_map: dict | None = None) -> dict:
    resolve_map = resolve_map or {}
    mine = [e for e in evidence if e["employeeId"] == emp["id"]]
    comps = [analyze_competency([e for e in mine if e["competencyId"] == c], c, as_of, resolve_map.get(f"{emp['id']}::{c}")) for c in emp["competencies"]]
    counts = {k: 0 for k in ["improving", "stagnating", "declining", "insufficient", "conflicting"]}
    for c in comps:
        counts[c["state"]] += 1
    return {"employee": emp, "competencies": comps, "counts": counts, "gaps": sum(c["evidenceGap"] for c in comps), "confidence": r2(mean([c["confidence"]["value"] for c in comps]))}


def analyze_org(employees: list[dict], evidence: list[dict], as_of: str = AS_OF, resolve_map: dict | None = None) -> dict:
    by = {e["id"]: analyze_employee(e, evidence, as_of, resolve_map) for e in employees}
    all_ = [c | {"employeeId": a["employee"]["id"]} for a in by.values() for c in a["competencies"]]
    counts = {k: sum(c["state"] == k for c in all_) for k in ["improving", "stagnating", "declining", "insufficient", "conflicting"]}
    return {"byEmployee": by, "all": all_, "counts": counts, "total": len(all_), "improvingPct": round_half_up(counts["improving"] / len(all_) * 100), "evidenceGaps": sum(c["evidenceGap"] for c in all_)}
