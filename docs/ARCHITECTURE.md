# Architecture — Milestone 1

## Navigation

- **HR**: Dashboard · Employees → Profile → Competency · Competencies · Evidence (feed / gaps / conflicts / source rules) · Settings & Profile
- **Employee**: My Growth · My Competencies → Competency · My Evidence · HR Feedback · Settings & Profile

## API (FastAPI, prefix `/api/v1`)

| Area | Endpoints | Access |
|---|---|---|
| Auth | `POST /auth/login` (role + email + password), `POST /auth/demo`, `GET /auth/me` | public / any |
| Dataset | `GET /dataset` — role-scoped payload used by the frontend | any (scoped) |
| Employees | `GET /employees`, `GET /employees/{id}`, `/skills`, `/history`, `GET/POST /employees/{id}/evidence`, `POST /employees/{id}/comments` | HR; self for own id |
| Evidence | `GET /evidence`, `POST /evidence`, `GET /evidence/gaps`, `GET /evidence/conflicts` | scoped / HR |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/attention` | HR |
| Admin | `POST /admin/seed` | HR |

## Data model

`users(id, email, role, employee_id, password_hash)` · `employees` · `evidence(seq, source, date, cycle, raw, scale, value, reliability?, relevance?, …)` · `hr_comments(visibility employee|private)` · `settings(as_of)`. Skill states, confidence, gaps and conflicts are computed on read from evidence, so they cannot drift.

## Deployment

Vercel (`frontend/`, `VITE_API_URL`, SPA rewrite in `vercel.json`) · Render blueprint `render.yaml` (API + Postgres, seeds on first boot).
