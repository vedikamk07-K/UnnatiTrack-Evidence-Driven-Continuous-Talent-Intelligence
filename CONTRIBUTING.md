# Contributing

- Branch `feat/…`, `fix/…`; conventional commits (`feat(engine): cap confidence on conflict`).
- Frontend: `npm test && npm run lint && npm run build`. Backend: `ruff check app tests && pytest -q`.
- Changed rules, templates or seed data? Run `cd frontend && npm run export:seed` and commit the regenerated backend files — CI fails otherwise.
- Any new endpoint must be role-scoped; add a privacy test.
