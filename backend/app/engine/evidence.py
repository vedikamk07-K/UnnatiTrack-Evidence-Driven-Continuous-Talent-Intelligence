"""Validate + normalise evidence input. Mirrors frontend/src/engine/evidence.js."""
from __future__ import annotations

import math
import re

from .analyze import SOURCES


def normalise_evidence(row: dict) -> dict:
    """Validate one evidence input; scale 5 (rating) or 100 (score); optional 0–1 reliability/relevance."""
    src = row.get("source")
    if src not in SOURCES:
        raise ValueError("Choose a valid source.")
    scale = int(row.get("scale") or SOURCES[src]["scale"])
    if scale not in (5, 100):
        raise ValueError("Scale must be 5 or 100.")
    try:
        raw = float(row.get("raw"))
    except (TypeError, ValueError):
        raw = math.nan
    if math.isnan(raw) or (scale == 5 and not 1 <= raw <= 5) or (scale == 100 and not 0 <= raw <= 100):
        raise ValueError(f"{SOURCES[src]['label']}: {'rating must be between 1 and 5' if scale == 5 else 'score must be between 0 and 100'}.")
    d = row.get("date") or ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
        raise ValueError("Each evidence item needs a date.")
    out = {"source": src, "date": d, "raw": raw, "scale": scale, "value": math.floor((raw - 1) * 25 * 10 + 0.5) / 10 if scale == 5 else raw}
    for k, name in (("reliability", "Reliability"), ("relevance", "Relevance")):
        v = row.get(k)
        if v not in (None, ""):
            v = float(v)
            if not 0 <= v <= 1:
                raise ValueError(f"{name} must be between 0% and 100%.")
            out[k] = v
    return out
