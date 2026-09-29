"""Resume → self-reported skill claims. Python port of frontend/src/engine/resume.js.

Deterministic keyword matching (no AI). Claims are capped (RESUME.cap) and enter the
current score only as the low-weight "resume" source; they never decide state or confidence.
"""
from __future__ import annotations

import re

from .analyze import C, COMPETENCIES

RESUME: dict = C["RESUME"]
SPLIT = re.compile(r"(?:\.\s+|[\n\r;•|])+")
BULLET = re.compile(r"^[-*·–—]+\s*")


def _alt(words: list[str]) -> str:
    return "|".join(re.escape(w) for w in sorted(words, key=lambda w: (-len(w), w)))


def _word_re(words: list[str]) -> re.Pattern:
    return re.compile(rf"(?<![a-z0-9])(?:{_alt(words)})(?![a-z0-9])")


VERBS = _word_re(RESUME["verbs"])


def parse_resume(text: str, tracked: list[str] | None = None) -> dict:
    tracked = tracked or []
    text = text or ""
    sentences = [t for t in (BULLET.sub("", s.strip()).strip() for s in SPLIT.split(text)) if t]
    lower = [s.lower() for s in sentences]
    matches = []
    for cid, words in RESUME["keywords"].items():
        rx = _word_re(words)
        mentions = applied = 0
        snippet = None
        for i, s in enumerate(lower):
            n = len(rx.findall(s))
            if not n:
                continue
            mentions += n
            if VERBS.search(s):
                applied += 1
            if snippet is None:
                snippet = sentences[i][:137] + "..." if len(sentences[i]) > 140 else sentences[i]
        if not mentions:
            continue
        value = min(RESUME["cap"], RESUME["base"] + RESUME["perMention"] * min(mentions, RESUME["maxMentions"]) + RESUME["perApplied"] * min(applied, RESUME["maxApplied"]))
        matches.append({"competencyId": cid, "label": COMPETENCIES[cid]["label"], "mentions": mentions, "applied": applied, "value": value, "snippet": snippet, "tracked": cid in tracked})
    matches.sort(key=lambda m: (-m["value"], -m["mentions"], m["competencyId"]))
    years = [int(y) for y in re.findall(r"([0-9]{1,2})\s*\+?\s*(?:years|yrs)", text.lower()) if int(y) <= 50]
    email = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+", text)
    first = next((ln.strip() for ln in re.split(r"[\n\r]+", text) if ln.strip()), "")
    name = first if re.fullmatch(r"[A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){1,3}", first) else None
    return {"matches": matches, "years": max(years) if years else None, "email": email.group(0).lower() if email else None, "name": name, "chars": len(text)}


def resume_evidence(parsed: dict, employee_id: str, date: str, filename: str) -> list[dict]:
    out = []
    for m in parsed["matches"]:
        if not m["tracked"]:
            continue
        applied = f", applied in {m['applied']} statement{'s' if m['applied'] > 1 else ''}" if m["applied"] else ""
        out.append({"employeeId": employee_id, "competencyId": m["competencyId"], "source": "resume", "raw": m["value"], "scale": 100, "date": date,
                    "title": f"Resume claim · {filename}", "note": f"Mentioned {m['mentions']}×{applied} — “{m['snippet']}”", "author": "Resume parser (self-reported)"})
    return out
