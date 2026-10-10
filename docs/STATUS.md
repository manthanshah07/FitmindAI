# FitMind AI — Project Status & Verified Architecture Baseline

> **Version:** 2.0 (Milestone M0 Baseline)  
> **Last Verified:** 2026-10-10  
> **Branch:** `m0-baseline`  
> **Status:** ACTIVE DEVELOPMENT / PORTFOLIO HARDENING  

---

## 1. Project Context & Objectives

**FitMind AI** is a full-stack, personalized fitness coaching platform built as an engineering portfolio and final-year software engineering project.

The application combines structured fitness tracking with an adaptive AI assistant that maintains persistent memory, understands long-term progress, and provides personalized workout and nutrition coaching.

### Core Philosophy
1. **Separation of Deterministic Computation and AI Reasoning:**  
   Backend calculations own all numeric health logic (BMR, TDEE, macronutrient distributions, volume, and the 0–100 fitness score). The AI Coach reasons, explains, and motivates — it never calculates arithmetic server-side or invents numbers.
2. **Decoupled Architecture:**  
   React 19 + TypeScript frontend (`src/`) communicates with a FastAPI Python backend (`backend/`) over a strict, typed REST API (`/api/v1`).
3. **Database Migration Discipline:**  
   All schema mutations are managed exclusively via version-controlled Alembic DDL migrations. No programmatic schema alterations run at application runtime.
4. **Data Isolation & Security:**  
   Strict user isolation enforced on all endpoints via authenticated JWT claims (`user_id`). Database-backed role-based access control (`is_admin`) secures administrative capabilities.

---

## 2. Milestone M0 Verified Baseline

All facts below were verified through code inspection, test runs, and CLI diagnostics during Milestone M0.

### 2.1 Git Repository State
- **Active Working Branch:** `m0-baseline`
- **Base Commit:** `8854a42` (synchronized with `origin/main`)
- **Working Tree:** Clean
- **Branch-only / Unpushed Phase 3C Work:** **None.** All historical commits from `audit/production-foundation-fixes` are fully merged into `main`. No pending stashes or dangling branches exist.
- **Hygiene:** `scratch/` removed from filesystem and permanently ignored in `.gitignore`.

### 2.2 Database Migrations
- **Active Alembic Head:** `2026_08_20_0012` (`add is_admin column to users table`).
- **Complete Migration History:**
  1. `2026_08_16_0001` — Creates `users` & `refresh_tokens` tables
  2. `2026_08_16_0002` — Creates `profiles` table
  3. `2026_08_16_0003` — Creates `goals` table
  4. `2026_08_16_0004` — Adds `weight_kg` to `profiles`
  5. `2026_08_16_0005` — Creates `exercises`, `workout_plans`, `workout_logs` tables
  6. `2026_08_16_0006` — Creates `foods`, `meal_logs`, `meal_log_items` tables
  7. `2026_08_17_0007` — Creates `measurements` table
  8. `2026_08_17_0008` — Creates `fitness_scores` table
  9. `2026_08_17_0009` — Adds composite date range indexes for `meal_logs` and `workout_logs`
  10. `2026_08_19_0010` — Creates `ai_memory` and `chat_messages` tables
  11. `2026_08_19_0011` — Adds user settings to `profiles`
  12. `2026_08_20_0012` (Head) — Adds `is_admin` to `users`

### 2.3 Verified Test & Quality Suite Baseline
- **Backend Tests (Pytest):** **307 passed** (0 failures, 0 skipped) across 27 test modules in local SQLite/in-memory environment. (Now 334 passed including the M0 database safety guard test suite).
- **Frontend Tests (Vitest):** **90 passed** across 15 test files (0 failures).
- **TypeScript Static Verification:** `npx tsc -b --noEmit` passed with 0 errors.
- **Frontend Production Build:** `npm run build` completed successfully with Vite production bundle.
- **Static Analysis (Linter):** `oxlint` reported 0 errors and 0 warnings across 108 files.

### 2.4 Database Safety Guard
- Implemented in `backend/app/core/db_safety.py`.
- Enforces that `DATABASE_URL` targets only safe local databases (`sqlite://...`, `localhost`, `127.0.0.1`, `::1`).
- Execution against any remote host (e.g., Neon or Render production databases) is immediately refused with `RuntimeError` unless `ALLOW_REMOTE_DB=1` is explicitly set in the execution environment.
- Integrated into `backend/alembic/env.py`, `backend/tests/conftest.py`, and `backend/app/seed_demo_data.py`.
- Verified by unit tests in `backend/tests/test_db_safety.py`.

---

## 3. Verified Answers to Architectural Questions (V1 – V12)

### V1: Workout Plan Grouping
- **Database:** `workout_plan_exercises` includes a nullable `day_of_week` integer column. When generated via `WorkoutService.generate_workout_plan`, days are assigned via `(idx % days) + 1`.
- **API & UI:** The active plan endpoint returns a flat list ordered by `order_index`. In `WorkoutOverviewPage.tsx`, exercises are rendered as a single flat list (`#1`, `#2`, ...) with no day grouping headers. Per-day grouping is introduced in M4.

### V2: Live Workout Logger UI & Set Payload
- **Location:** `src/pages/workout/WorkoutSessionPage.tsx` (route `/workout/session`).
- **Set Payload Fields:** Each set sends:
  - `exercise_id` (UUID string)
  - `set_number` (integer, 1-indexed)
  - `reps_completed` (integer)
  - `weight_kg` (numeric float)
  - `rpe` (integer 1–10)
- **Notes:** Sent at the workout session level (`WorkoutLogCreate.notes`), not per set from the UI.

### V3: Workout Read Endpoints
- **List:** `GET /api/v1/workout/logs` (aliased as `GET /api/v1/workout/history`) with pagination (`limit`, `skip`). `GET /api/v1/workout/plan` returns active plan.
- **Detail:** `GET /api/v1/workout/logs/{log_id}` returns specific session details.
- **Catalog:** `GET /api/v1/exercises` and `GET /api/v1/exercises/{exercise_id}`.
- **Last Performance Endpoint:** **Does NOT exist.** (To be added in M4 for set prefilling).

### V4: Meal Item Editing, Deletion & Nutrition Summary Date
- **Editing & Deletion:** **No endpoints exist.** `backend/app/api/v1/nutrition.py` exposes only `GET /today`, `GET /logs`, `POST /log`, and `GET /logs/{log_id}`. There are no `PUT`, `PATCH`, or `DELETE` endpoints for meals or food items.
- **Summary Date Filtering:** **Yes.** `GET /api/v1/nutrition/today` accepts `target_date: Optional[date] = Query(None)`. `NutritionService.get_today_summary` computes timezone-aware day boundaries for the provided date.

### V5: Admin Authorization Model
- **Real Model:** Database-backed `is_admin` boolean column on the `User` table.
- **Enforcement:** `get_current_admin_user` in `backend/app/api/deps.py` verifies the authenticated user has `is_admin == True` in the database.
- **Header Auth Status:** `X-Admin-Secret` is completely retired; passing the header without `is_admin == True` returns HTTP 403.

### V6: Date of Birth Storage & UI Rendering
- **Storage:** Stored in `profiles.date_of_birth` as `DateTime(timezone=False)` in PostgreSQL/SQLite. Serialized by `ProfileResponse` as `Optional[date]` (`YYYY-MM-DD` in JSON).
- **Rendering:** In `ProfilePage.tsx`, rendered as an `<Input type="date" disabled={!isEditing} {...register('date_of_birth')} />`. When null or unset during onboarding, it displays the browser's date placeholder (`dd/mm/yyyy`) and appears greyed out when disabled.

### V7: Frontend Dependencies & Router Map
- **TanStack Query:** **Used** (`@tanstack/react-query: ^5.101.4`).
- **Tailwind CSS Version:** **Tailwind CSS v3** (`tailwindcss: ^3.4.19`).
- **Router Paths (`src/App.tsx`):**
  - Public: `/`, `/how-it-works`, `/technology`, `/about`, `/login`, `/signup`, `/404`
  - Onboarding: `/onboarding`
  - Authenticated AppShell: `/dashboard`, `/workout`, `/workout/session`, `/workout/history`, `/workout/exercise/:id`, `/workout/catalog/:id`, `/nutrition`, `/nutrition/log`, `/nutrition/history`, `/progress`, `/progress/measurements`, `/intelligence`, `/coach`, `/reports`, `/profile`

### V8: Endpoint Rate Limits
- `POST /workout/logs`: **No rate limit** applied.
- `POST /coach/chat`: **`10/minute`** enforced via `@limiter.limit(settings.RATE_LIMIT_COACH)`.

### V9: Fitness Score Formula & Storage
- **Computation Window:** 7-day rolling window (`period_end = target_date`, `period_start = period_end - 6 days`).
- **Formula:**
  - `0.30 * workout_adherence_pct` (completed workout days ÷ target days)
  - `0.25 * nutrition_score` (average daily calorie adherence percentage across logged days, or 50% fallback)
  - `0.20 * protein_score` (average protein intake ÷ target protein, or 50% fallback)
  - `0.15 * consistency_score` (active logging days [workouts, meals, measurements] ÷ 7 × 100%)
  - `0.10 * recovery_score` (hardcoded constant fallback: `75.0%`)
  - Overall score: `round(weighted_sum)` clamped between 0 and 100.
- **Stored Columns (`fitness_scores` table):**
  `id` (UUID PK), `user_id` (UUID FK), `score` (Integer), `workout_adherence_pct`, `nutrition_score`, `protein_score`, `sleep_score` (default 75.0), `recovery_score` (default 75.0), `consistency_score`, `calculated_at` (DateTime tz), `period_start` (Date), `period_end` (Date), with unique constraint on `(user_id, period_start, period_end)`.

### V10: Indexes on Workout & Meal Tables
- **`workout_logs`:** `ix_workout_logs_user_id`, `ix_workout_logs_plan_id`, `ix_workout_logs_user_started` (composite on `user_id, started_at`), PK `id`.
- **`workout_log_exercises`:** `ix_workout_log_exercises_log_id`, `ix_workout_log_exercises_exercise_id`, PK `id`.
- **`meal_logs`:** `ix_meal_logs_user_id`, `ix_meal_logs_logged_at`, `ix_meal_logs_user_logged` (composite on `user_id, logged_at`), PK `id`.
- **`meal_log_items`:** `ix_meal_log_items_meal_log_id`, `ix_meal_log_items_food_id`, PK `id`.

### V11: Gemini Model Configuration
- **Model Name:** Managed via environment variable `GEMINI_MODEL`, defaulting to `"gemini-2.5-flash-lite"` in `backend/app/core/config.py`.
- Read and passed to Google GenAI Client in `backend/app/core/ai_client.py`.

### V12: Demo User Creation & Seeding
- **Script:** `backend/app/seed_demo_data.py` (runnable via `python -m app.seed_demo_data`).
- **Users Created:** 7 test subjects (`demo.full@fitmind.ai`, `demo.athlete@fitmind.ai`, `demo.beginner@fitmind.ai`, `demo.bulking@fitmind.ai`, `demo.cutting@fitmind.ai`, `demo.inconsistent@fitmind.ai`, `demo.progress@fitmind.ai`), with shared password `FitMindDemo@2026`.
- **Execution Paths:** CLI execution, authenticated `POST /api/v1/admin/seed-demo`, and application startup trigger when `SEED_TEST_SUBJECTS_PRODUCTION=true`.

---

## 4. Phase History Summary

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Pre-Development Setup & Architecture Lock | COMPLETE |
| **Phase 1** | Auth & Onboarding Infrastructure | COMPLETE |
| **Phase 2** | AppShell, Dashboard & User Profile UI | COMPLETE |
| **Phase 3** | Workout System & Session Logger | COMPLETE |
| **Phase 4** | Nutrition System & Macro Target Engine | COMPLETE |
| **Phase 5** | Progress Analytics & Measurement Tracking | COMPLETE |
| **Phase 6** | Deterministic Fitness Score Engine | COMPLETE |
| **Phase 7** | AI Coach & Persistent Memory | COMPLETE |
| **Phase 8** | Automated Reports Module | COMPLETE |
| **Milestone M0** | Baseline Audit, Hygiene & Database Guard | **COMPLETE** |
| **Milestone M1** | Design System & App Shell Rebuild | NEXT |
