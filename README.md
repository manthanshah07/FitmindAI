# FitMind AI

A full-stack, personalized fitness platform built with deterministic health calculation engines, persistent user memory, Google Gemini AI coaching, and a decoupled FastAPI / React 19 architecture.

---

## Live Production Deployment

* **Frontend Application (Vercel):** [https://fitmind-ai-omega.vercel.app](https://fitmind-ai-omega.vercel.app)
* **Backend REST API (Render):** [https://fitmindai-ur71.onrender.com/health](https://fitmindai-ur71.onrender.com/health)
* **Database (Neon PostgreSQL):** Serverless PostgreSQL 16+

---

## Repository Context

FitMind AI is an engineering portfolio project demonstrating full-stack software architecture, data modeling, authentication security, deterministic health computation, and AI system integration. 

The application strictly separates **deterministic calculations** (BMR/TDEE calculations, macro allocation, physical metrics, 0–100 fitness scoring) from **reasoning layers**, ensuring that numerical health data remains exact, testable, and auditable server-side before passing structured context to the Google Gemini AI Coach.

---

## Currently Implemented Features

* **JWT-Based Authentication & Token Rotation:**
  * Account registration (`POST /api/v1/auth/register`) with Bcrypt password hashing.
  * User login (`POST /api/v1/auth/login`) issuing JWT access tokens (HS256 signature).
  * Server-side refresh token database tracking (`POST /api/v1/auth/refresh`) with token rotation and revocation (`POST /api/v1/auth/logout`).
  * React client session restoration and automatic token refresh via Axios interceptors.

* **5-Step Onboarding Wizard UI:**
  * Step 1: Personal Demographics (Full Name, Date of Birth, Gender).
  * Step 2: Fitness Goals (Primary Goal, Target Weight, Target Date).
  * Step 3: Physical Metrics & Activity Tiers (Height, Weight, Activity Level).
  * Step 4: Preferences & Constraints (Dietary preference, Training equipment multi-selection, Medical notes).
  * Step 5: Initial Baseline Assessment (Calculates baseline BMR & TDEE).

* **Deterministic TDEE & Baseline Engine:**
  * Implements the Mifflin-St Jeor equation to compute Basal Metabolic Rate (BMR).
  * Applies activity multipliers ($1.20\text{--}1.90$) to compute Total Daily Energy Expenditure (TDEE) server-side.

* **Application Shell & Navigation:**
  * Responsive layout featuring Desktop Sidebar, Mobile TopBar Drawer, and Mobile Bottom Navigation.
  * Protected route guard (`<ProtectedRoute>`) restricting unauthenticated access.
  * Non-blocking dashboard reminder card directing un-onboarded users to `/onboarding`.

* **User Profile & Account Settings (`/profile`):**
  * Full viewing and editing support for user demographics, physical metrics (`weight_kg`, `height_cm`), equipment, and medical constraints.
  * Client-side validation ($50\text{--}300\text{ cm}$ height, $30\text{--}300\text{ kg}$ weight) and inline feedback alerts.

* **Workout System (`/workout`):**
  * Active workout plan viewer tailored to user goals and available equipment.
  * Exercise catalog browsing and search with muscle group filtering.
  * Interactive live workout execution logger tracking sets, reps, weight (kg), and RPE.

* **Nutrition Module (`/nutrition`):**
  * Daily calorie and macro target engine (protein, carbs, fat based on TDEE and goal).
  * Meal logging with category splits (breakfast, lunch, dinner, snack).
  * Searchable food database and real-time macro balance tracking.

* **Progress & Measurement Analytics (`/progress`):**
  * Body weight logging and historical progress trend visualization.
  * Body measurement tracking (waist, chest, bicep, thigh, hips, body fat %) supporting both metric (cm) and imperial (inches) units.

* **Deterministic Fitness Score Engine:**
  * Multi-factor 0–100 fitness score calculated server-side based on workout consistency, nutrition adherence, logging completeness, and progress trends.
  * Historical score trend tracking and grade classification.

* **AI Coach & Persistent Memory System (`/coach`):**
  * Interactive conversational coach powered by Google Gemini API (`gemini-2.5-flash-lite`).
  * Structured Pydantic response parsing (`answer`, `observations`, `recommendations`, `warnings`, `data_quality`).
  * Context Builder aggregating user demographics, active goals, 30d/7d analytics, and preferences into bounded system prompts.
  * Deterministic preference extraction extracting and persisting user workout/diet preferences to PostgreSQL `ai_memory`.
  * Persistent chat history store with multi-session context retrieval.

* **Automated Weekly & Monthly Reports (`/reports`):**
  * Comprehensive performance summaries analyzing adherence scores, workout volume, nutrition consistency, and fitness score deltas.
  * AI-generated narrative summaries synthesizing weekly progress.

* **Rate Limiting & Security Controls:**
  * Endpoint rate limiting via `slowapi` with user-aware key functions.
  * Secured admin diagnostic routes requiring `X-Admin-Secret` header authorization.
  * DDL schema migrations managed strictly via Alembic CLI in deployment pipeline.

---

## Technology Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript 6.0 | Component-based UI library & strict static typing |
| **Build & Tooling** | Vite 8.2, Oxlint | High-performance ES build tool & static code linter |
| **State & Routing** | Zustand 5.0, React Router v7 | Global session state management & SPA client routing |
| **Forms & Validation** | React Hook Form, Zod 4.4 | Type-safe form validation schemas |
| **Backend Framework** | Python 3.14, FastAPI 0.110 | Asynchronous RESTful API framework |
| **AI Integration** | Google Gemini API (`google-genai`) | LLM reasoning & structured coaching responses |
| **ORM & Migrations** | SQLAlchemy 2.0, Alembic 1.13 | Declarative database mapping & DDL migration history |
| **Database** | PostgreSQL 16+ | Serverless cloud PostgreSQL database hosted on Neon |
| **Security & Limits** | PyJWT, Passlib, Bcrypt, Slowapi | Signed JWT tokens, bcrypt password hashing, rate limiting |
| **Infrastructure** | Vercel, Render | Edge CDN static hosting & backend ASGI web service |
| **Testing & CI** | Vitest, Pytest, GitHub Actions | Automated unit, UI, and integration test suites |

---

## Database Design

Schema changes are version-controlled in Git using Alembic DDL migrations (`backend/alembic/versions/`):

| Revision | Migration Description |
|---|---|
| `2026_08_16_0001` | Creates `users` & `refresh_tokens` tables |
| `2026_08_16_0002` | Creates `profiles` table |
| `2026_08_16_0003` | Creates `goals` table |
| `2026_08_16_0004` | Adds `weight_kg` column to `profiles` |
| `2026_08_16_0005` | Creates `exercises`, `workout_plans`, `workout_plan_exercises`, `workout_logs`, `workout_log_exercises` |
| `2026_08_16_0006` | Creates `foods`, `meal_logs`, `meal_log_items` tables |
| `2026_08_16_0007` | Creates `measurements` table |
| `2026_08_16_0008` | Creates `fitness_scores` table |
| `2026_08_16_0009` | Creates `ai_memory` table |
| `2026_08_16_0010` | Creates `chat_messages` table |
| `2026_08_16_0011` | Adds profile preferences (`timezone`, `target_workout_days_per_week`) & workout plan fields |

---

## API Overview

### Authentication (`/api/v1/auth`)

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate user & return access/refresh tokens | No |
| `POST` | `/api/v1/auth/refresh` | Issue new access token using valid refresh token | No |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token | Yes |

### User Profile & Goals (`/api/v1/profile`, `/api/v1/goals`)

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/profile` | Retrieve active user profile | Yes |
| `PUT` | `/api/v1/profile` | Update profile demographics & physical metrics | Yes |
| `POST` | `/api/v1/profile/onboarding` | Submit completed 5-step onboarding payload | Yes |
| `GET` | `/api/v1/goals/active` | Retrieve active fitness goal | Yes |
| `POST` | `/api/v1/goals` | Create or update active fitness goal | Yes |

### Workout System (`/api/v1/workout`, `/api/v1/exercises`)

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/exercises` | Browse and search exercise catalog | Yes |
| `GET` | `/api/v1/workout/plan` | Retrieve active workout plan | Yes |
| `POST` | `/api/v1/workout/plan/generate` | Generate workout plan based on goal & equipment | Yes |
| `POST` | `/api/v1/workout/logs` | Log completed workout session | Yes |

### Nutrition & Progress (`/api/v1/nutrition`, `/api/v1/progress`)

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/nutrition/summary` | Retrieve daily calorie & macro summary | Yes |
| `POST` | `/api/v1/nutrition/logs` | Log meal session | Yes |
| `GET/POST`| `/api/v1/progress/measurements`| Retrieve weight & measurement history / Add log | Yes |
| `GET` | `/api/v1/progress/fitness-score` | Retrieve calculated 0-100 fitness score summary | Yes |

### AI Coach & Reports (`/api/v1/coach`, `/api/v1/reports`)

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/coach/chat` | Send question to AI Coach & receive structured advice | Yes |
| `GET` | `/api/v1/coach/history` | Retrieve persistent chat history | Yes |
| `GET` | `/api/v1/reports/weekly` | Generate automated weekly performance report | Yes |

---

## Testing & CI/CD

Both application tiers are covered by automated test suites integrated into GitHub Actions CI:

* **Frontend Unit & UI Tests (Vitest):** **75 passed** across 14 test files (`auth.test.tsx`, `ui_auth.test.tsx`, `onboarding.test.tsx`, `appshell.test.tsx`, `profile.test.tsx`, `tdeeCalculator.test.ts`, `workout.test.tsx`, `nutrition.test.tsx`, `progress.test.tsx`, `fitnessScore.test.tsx`, `reports.test.tsx`, `coach.test.tsx`, `dashboard.test.tsx`, `unitConversion.test.ts`).
* **Backend Integration Tests (Pytest):** **249 passed** across 26 test modules covering auth security, profile, goals, workout execution, nutrition logging, fitness score calculation, reports, rate limiting, and admin security.
* **Static Analysis & Typecheck:** Oxlint passes with 0 errors; TypeScript `tsc` passes with 0 errors.

```bash
# Run Frontend Test Suite
npm run test

# Run Backend Test Suite
cd backend && .venv/bin/pytest
```

---

## Project Roadmap

### Completed Phases
- [x] **Phase 0 — Pre-Development Setup & Architecture Lock:** System documentation, API contracts, database schema, design system.
- [x] **Phase 1 — Auth & Onboarding:** JWT authentication, refresh token rotation, user registration/login, 5-step onboarding wizard.
- [x] **Phase 2 — Application Shell, Dashboard & Profile:** AppShell layout, baseline TDEE dashboard, interactive profile settings (`/profile`), production cloud deployment.
- [x] **Phase 3 — Workout System:** Active workout plan view, exercise catalog search, live session execution logger with sets/reps/weight/RPE.
- [x] **Phase 4 — Nutrition Module:** Meal logging (breakfast, lunch, dinner, snack), target date summaries, macro breakdown tracking.
- [x] **Phase 5 — Progress Analytics:** Body weight history charts, body measurement tracking in cm and inches.
- [x] **Phase 6 — Fitness Score Engine:** Weekly 0-100 deterministic fitness score calculation based on workout volume, protein adherence, and logging consistency.
- [x] **Phase 7 — AI Coach & Persistent Memory:** Interactive Gemini AI Coach with structured response validation, context builder, deterministic preference extraction, and chat history.
- [x] **Phase 8 — Automated Reports Module:** Automated weekly performance reports with adherence metrics and AI narrative synthesis.

### Remediation & Stabilization
- [x] **Remediation Phase 1 — Security & Repository Stabilization:** Sanitized local credentials, removed unauthenticated admin routes (`/admin/migrate`, `/admin/run-seeder`), enforced header authentication on diagnostic endpoints, sanitized response payloads.
- [x] **Remediation Phase 2 — Documentation Sync & Baseline Realignment:** Synchronized README, PROJECT_STATUS, and decision records with implementation code; added GitHub Actions CI pipeline.

---

## Local Development Setup

### Prerequisites
* Node.js 20+
* Python 3.10+
* Git

### 1. Clone Repository
```bash
git clone https://github.com/manthanshah07/FitmindAI.git
cd FitmindAI
```

### 2. Frontend Setup (Terminal 1)
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend runs locally at `http://localhost:5173`.

### 3. Backend Setup (Terminal 2)
```bash
cd backend

# Create & activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run migrations against local SQLite database
DATABASE_URL="sqlite:///./dev.db" .venv/bin/alembic upgrade head

# Start FastAPI uvicorn dev server
DATABASE_URL="sqlite:///./dev.db" .venv/bin/uvicorn app.main:app --port 8000 --reload
```
Backend API runs locally at `http://localhost:8000`. API documentation is accessible at `http://localhost:8000/docs`.

---

## Current Limitations & Deferred Work

* **Email Verification Flow:** User registration initializes `is_verified = False`; automated email confirmation flow is deferred.
* **Vector Store Integration:** Conversational memory uses PostgreSQL relational storage and deterministic preference extraction; vector database integration is deferred for post-v1.0.

---

## License

This repository is maintained as an engineering project portfolio. All rights reserved.

