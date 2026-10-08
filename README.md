# FitMind AI

A full-stack, personalized fitness platform built with deterministic health calculation engines, persistent user memory, Google Gemini AI coaching, and a decoupled FastAPI / React 19 architecture.

---

## Live Production Deployment

* **Frontend Application (Vercel):** [https://fitmind-ai-omega.vercel.app](https://fitmind-ai-omega.vercel.app)
* **Backend REST API (Render):** [https://fitmindai-ur71.onrender.com/health](https://fitmindai-ur71.onrender.com/health)
* **Database (Neon PostgreSQL):** Serverless PostgreSQL 16+

---

## What It Is

FitMind AI is a full-stack engineering portfolio project demonstrating authentication security, deterministic health computation, and AI system integration.

The application strictly separates **deterministic calculations** (BMR/TDEE, macro allocation, 0–100 fitness scoring) from **AI reasoning layers**, ensuring that numerical health data remains exact, testable, and auditable server-side before passing structured context to the Google Gemini AI Coach.

---

## Features

* **JWT Authentication & Token Rotation** — Registration, login, refresh token rotation, server-side revocation, automatic 401 recovery via Axios interceptors.

* **5-Step Onboarding Wizard** — Collects demographics, fitness goals, physical metrics, dietary preferences, equipment, and medical notes. Computes baseline BMR & TDEE (Mifflin-St Jeor).

* **Application Shell & Navigation** — Responsive layout with Desktop Sidebar, Mobile TopBar, and Mobile Bottom Navigation. Protected route guard.

* **User Profile (`/profile`)** — View and edit demographics, physical metrics, equipment, and medical constraints.

* **Workout System (`/workout`)** — Active workout plan tailored to user goals and equipment. Exercise catalog with muscle group filtering. Live session logger tracking sets, reps, weight, and RPE.

* **Nutrition Module (`/nutrition`)** — Daily calorie and macro targets based on TDEE and goal. Meal logging (breakfast, lunch, dinner, snack). Searchable food database.

* **Progress Analytics (`/progress`)** — Body weight history charts. Body measurement tracking (waist, chest, bicep, thigh, hips, body fat %) in cm and inches.

* **Fitness Score Engine** — Multi-factor 0–100 score calculated server-side based on workout consistency, nutrition adherence, and logging completeness. Score history and grade classification.

* **AI Coach (`/coach`)** — Conversational coach powered by Google Gemini (`gemini-2.5-flash-lite`). Structured Pydantic response parsing. Context Builder aggregating user metrics, goals, 7d/30d analytics, and extracted preferences. Persistent multi-session chat history.

* **Automated Reports (`/reports`)** — Weekly performance summaries with adherence scores, workout volume, nutrition consistency, fitness score deltas, and AI narrative synthesis.

* **Rate Limiting & Admin Controls** — Endpoint rate limiting via `slowapi`. Admin routes secured by database-backed `is_admin` user authorization. All DDL managed via Alembic CLI.

---

## Technology Stack

| Domain | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v3, Framer Motion |
| State & Routing | Zustand, React Router v7 |
| Forms & Validation | React Hook Form, Zod |
| HTTP | Axios |
| Backend | Python, FastAPI |
| AI | Google Gemini API (`google-genai`) |
| ORM & Migrations | SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16+ (Neon) |
| Auth & Security | python-jose (JWT), Passlib/Bcrypt, slowapi |
| Infrastructure | Vercel (frontend), Render (backend) |
| Testing & CI | Vitest, Pytest, GitHub Actions |
| Linting | Oxlint, TypeScript strict mode |

---

## Database Migrations

Schema changes are version-controlled via Alembic (`backend/alembic/versions/`):

| Revision | Description |
|---|---|
| `2026_08_16_0001` | Creates `users` & `refresh_tokens` tables |
| `2026_08_16_0002` | Creates `profiles` table |
| `2026_08_16_0003` | Creates `goals` table |
| `2026_08_16_0004` | Adds `weight_kg` to `profiles` |
| `2026_08_16_0005` | Creates `exercises`, `workout_plans`, `workout_logs` tables |
| `2026_08_16_0006` | Creates `foods`, `meal_logs`, `meal_log_items` tables |
| `2026_08_17_0007` | Creates `measurements` table |
| `2026_08_17_0008` | Creates `fitness_scores` table |
| `2026_08_17_0009` | Adds composite date indexes |
| `2026_08_19_0010` | Creates `ai_memory` and `chat_messages` tables |
| `2026_08_19_0011` | Adds user settings to `profiles` |
| `2026_08_20_0012` | Adds `is_admin` to `users` |

---

## Testing & CI

```bash
# Frontend tests (Vitest + React Testing Library)
npm run test
# → 78 tests passing across 14 test files

# Backend tests (Pytest)
cd backend && .venv/bin/pytest -q
# → 268 tests passing across 26 test modules, ~95% coverage

# TypeScript typecheck
npx tsc -b --noEmit

# Lint
npm run lint
```

Both test suites run automatically on push/PR to `main` via GitHub Actions (`.github/workflows/ci.yml`).

---

## Local Development Setup

### Prerequisites
* Node.js 20+
* Python 3.11+
* Git

### 1. Clone Repository
```bash
git clone https://github.com/manthanshah07/FitmindAI.git
cd FitmindAI
```

### 2. Frontend Setup
```bash
npm install
npm run dev
# → http://localhost:5173
```

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL=http://localhost:8000/api/v1`.

### 3. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run migrations (SQLite for local development)
DATABASE_URL="sqlite:///./dev.db" .venv/bin/alembic upgrade head

# Start dev server
DATABASE_URL="sqlite:///./dev.db" .venv/bin/uvicorn app.main:app --port 8000 --reload
# → http://localhost:8000
# → API docs at http://localhost:8000/docs
```

Copy `backend/.env.example` to `backend/.env` and fill in your values.

### 4. Optional: Seed Demo Data
```bash
cd backend
DATABASE_URL="sqlite:///./dev.db" .venv/bin/python -m app.seed_demo_data
```
See `docs/development/DEMO_ACCOUNTS.md` for demo account credentials.

---

## Known Limitations

* **Email Verification:** Registration sets `is_verified = False`; email confirmation flow is not implemented.
* **Vector Store:** AI memory uses PostgreSQL relational storage and deterministic preference extraction; vector database integration is deferred.

---

## License

Engineering portfolio project. All rights reserved.
