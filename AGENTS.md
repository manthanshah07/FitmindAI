# FitMind AI — Agent Instructions

FitMind AI is a full-stack fitness coaching platform: React 19 + TypeScript + Vite frontend (`src/`), FastAPI Python backend (`backend/`), PostgreSQL via SQLAlchemy/Alembic, Google Gemini AI coach.

## Before Making Changes
- Read relevant source files before editing. Don't guess at existing patterns.
- Check `src/lib/api/` for frontend API modules and `backend/app/api/v1/` for backend routes.
- Check `backend/alembic/versions/` before touching database schema.
- The landing page sections in `src/sections/` must not be modified without explicit instruction.
- Design tokens in `src/styles/design-tokens.css` and `tailwind.config.js` values must not be changed without explicit instruction.

## Code Standards
- Backend calculations own all numeric logic (BMR, TDEE, macros, fitness score). The AI coach only reasons and explains — it never calculates.
- Keep changes focused. Do not refactor unrelated code.
- Do not upgrade dependencies unless asked.
- Do not introduce new architecture patterns unless asked.

## After Changes
- Run `npm run test` after frontend changes.
- Run `cd backend && .venv/bin/pytest -q` after backend changes.
- Run `npx tsc -b --noEmit` after TypeScript changes.
- Do not commit secrets. `.env` files are gitignored.

## Documentation Rules
- Do not create PROJECT_STATUS, ROADMAP, AUDIT_REPORT, AI_CONTEXT, IMPLEMENTATION_PLAN, PHASE_*, or similar files.
- Do not create redundant architecture docs that restate the source code.
- The README.md and `docs/` are the documentation. Keep them minimal.
