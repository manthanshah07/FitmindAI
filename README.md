# FitMind AI

FitMind AI is a full-stack personalized fitness coaching platform that unifies deterministic physiological calculations (BMR, TDEE, macronutrient targets, progressive overload tracking, goal-aligned weight forecasting, and multi-factor Fitness Score v2) with a grounded Google Gemini AI Coach.

---

## Core Architecture Principle: Deterministic Math First, AI Coach Second

FitMind AI enforces a strict separation between **deterministic calculation** and **conversational AI reasoning**:
- **Backend Services Own All Numeric Logic:** Basal Metabolic Rate (Mifflin-St Jeor), Total Daily Energy Expenditure (TDEE), daily calorie and macronutrient targets, workout volume/adherence, EWMA weight trends, goal forecasts, and the 4-component Fitness Score (`formula_version = 2`) are computed exclusively by deterministic Python backend services and SQL queries.
- **Grounded AI Coach:** The Google Gemini AI Coach (`gemini-2.5-flash`) receives a pre-computed `GroundedFactsContext` snapshot. It is strictly forbidden from inventing arithmetic, fabricating weight/macro numbers, or providing clinical/medical diagnoses.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS (CSS Custom Property Design Tokens), TanStack React Query, Zustand, Recharts, `vite-plugin-pwa` |
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, SlowAPI Rate Limiting |
| **Database & Migrations** | PostgreSQL (Production / Docker) & SQLite (Local Dev / Test), Alembic Migrations (`2026_10_11_0016` head) |
| **AI Integration** | Google GenAI SDK (`google-genai`, `gemini-2.5-flash`) with deterministic fallback |

---

## Local Setup Instructions

### 1. Prerequisites
- **Node.js** `>= 20.x` and `npm`
- **Python** `>= 3.12`
- **PostgreSQL** (optional for local dev; SQLite works out of the box for local development and tests)

### 2. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (never committed to git):
```env
ENVIRONMENT=development
DATABASE_URL=sqlite:///./fitmind_dev.db
JWT_SECRET_KEY=replace-with-a-secure-32-byte-hex-secret
GEMINI_API_KEY=your-gemini-api-key-optional
CORS_ORIGINS=["http://localhost:5173"]
```

Run database migrations and seed the local demo dataset:
```bash
cd backend
.venv/bin/alembic upgrade head
.venv/bin/python scripts/seed_demo.py
```

Start the FastAPI server:
```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## Demo Credentials (Local Seed)

Running `cd backend && .venv/bin/python scripts/seed_demo.py` populates:
- **Primary Demo Account:** `demo@fitmind.ai` / `FitMindDemo@2026` (4-day Upper/Lower hypertrophy split, 28 days of completed workouts, Indian & global meal logs from the 174-food catalog, goal-consistent weigh-ins, and a v2 Fitness Score).
- **10 Specialized Persona Accounts:** `demo.full@fitmind.ai`, `demo.athlete@fitmind.ai`, `demo.cutting@fitmind.ai`, `demo.bulking@fitmind.ai`, `demo.progress@fitmind.ai`, `demo.beginner@fitmind.ai`, `demo.inconsistent@fitmind.ai`, `demo.noplan@fitmind.ai`, `demo.timezone@fitmind.ai`, `demo.ai@fitmind.ai` (all using password `FitMindDemo@2026`).

---

## Running Tests & Quality Gates

```bash
# Frontend unit & component tests (Vitest + React Testing Library)
npm test -- --run

# Backend unit & integration tests (Pytest against isolated in-memory SQLite)
cd backend && .venv/bin/pytest -q

# TypeScript strict typecheck
npx tsc -b --noEmit

# ESLint
npm run lint

# Production bundle & PWA build
npm run build
```

---

## Documentation Index

- [`docs/FINAL_PLAN.md`](docs/FINAL_PLAN.md) — Master specification, audit findings, milestones, and release criteria
- [`docs/STATUS.md`](docs/STATUS.md) — Verified milestone-by-milestone engineering status and release checklist
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture, data flows, and component diagrams
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Locked product and engineering decisions (Decisions 1–13)
- [`docs/TESTING.md`](docs/TESTING.md) — Test suites, database safety guardrails, and verification commands
- [`docs/PRIVACY_AND_SAFETY.md`](docs/PRIVACY_AND_SAFETY.md) — Data minimization, physiological guardrails, and user rights
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — 5-minute guided walkthrough of FitMind AI
