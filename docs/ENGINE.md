# Engine rules

Source of truth: `frontend/src/engine/constants.js` → exported to `backend/app/engine/constants.json`. The Python engine loads that file; `tests/test_parity.py` asserts identical results on all 156 assessments.

**Normalisation** — assessments, training and KPIs are 0–100. Ratings on 1–5 map to `(rating − 1) × 25` (4.4 → 85).

**Score** — `Σ(w_source × w_time × value) / Σ(w_source × w_time)`, `w_time = 0.5^(age/45 days)`, `w_source = reliability × relevance`. Relevance is 1.0 for the competency’s required sources, 0.6 for others, 0.4 for training.

**State** — Theil–Sen slope of the last 3 cycle scores. ≥ +1.5 pts/cycle Improving, ≤ −1.5 Declining, else Stagnating.

**Hard rules** — < 3 signals, < 2 sources, or none in 180 days → Insufficient Evidence (no score shown).

**Conflict** — two sources’ recent (90-day) means differ by ≥ 25 points (1.0 on the 5-point scale), or by ≥ 15 while trending in opposite directions → Conflicting Evidence.

**Confidence** — `0.30 volume + 0.25 source diversity + 0.20 recency + 0.15 agreement + 0.10 trend stability`. High ≥ 0.75, Medium ≥ 0.50. Caps: conflict → 0.52 (shown as LOW–MEDIUM, the 0.45–0.55 band); missing required source → 0.72; insufficient → 0.35.

**Gaps** — `no_recent_evidence`, `low_volume`, `conflicting_sources`, `missing_source`, `declining_with_high_confidence`. Evidence-gap KPI counts the first four.

**Milestone 2 (not in this repo yet)** — recommendation templates, development plans, closed-loop verification, reciprocal pairing, the chatbot and the Employee Skill Analysis tool.
