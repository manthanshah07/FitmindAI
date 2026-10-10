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
| **Milestone M1** | Design System & App Shell Rebuild | **COMPLETE** |
| **Milestone M2** | Idempotent Workout API (Phase 3C-A) | **COMPLETE** |
| **Milestone M3** | Exercise Library & Seed Data | NEXT |

---

## 5. Milestone M1 Verified Implementation

- **Branch:** `m1-design-system`
- **Dependencies Installed:** `@fontsource-variable/inter`, `recharts`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `vitest-axe` (dev).
- **Design Tokens:** `src/styles/tokens.css` with light, dark, and workout mode tokens from Appendix A. Mapped into `tailwind.config.js` with legacy token retention under `legacy-`. Self-hosted Inter Variable and global `font-variant-numeric: tabular-nums`.
- **UI Component Library:** All 23 components implemented in `src/components/ui/`:
  - `PageHeader`, `Card`, `ListRow`, `StatTile`, `Button`, `IconButton`, `TextField`, `NumberStepper`, `Select`, `SegmentedControl`, `Tabs`, `Dialog`, `BottomSheet`, `Toast`, `Chip`, `ProgressBar`, `Ring`, `Skeleton`, `EmptyState`, `ErrorState`, `Banner`, `LineChart`, `BarChart`, `MacroBar`.
- **AppShell Rebuild:**
  - Phone (<768px): 5 bottom tabs (Today, Workouts, Nutrition, Progress, Coach) with `100dvh` and safe-area padding (`env(safe-area-inset-bottom)`).
  - Desktop (>=1024px): 240px sidebar with 1120px max content column.
  - Top bar: page title and single avatar menu (Settings, Theme toggle: light/dark/system, Log out) showing user initials and name.
  - Removed duplicate logout buttons, "FITMIND AI" chips, and emojis (replaced with Lucide icons).
- **Information Architecture & Route Map:** Section 5 route map applied with backwards-compatible redirects (`/dashboard` -> `/today`, `/profile` -> `/settings`, `/workout` -> `/workouts`, etc.). Full-screen `/workouts/session` mounted outside the AppShell.
- **Formatter:** `src/lib/format.ts` with 16 unit tests passing.
- **Auth Restyle:** Login and Signup pages restyled with design system components, show/hide password toggles, and accessible error alerts.
- **Showcase:** `/dev/ui` route mounted demonstrating all tokens and components in light and dark mode.
- **Test Results:**
  - Frontend: **106 passed** (16 test files, 0 failures, 0 skipped).
  - Backend: **334 passed** (0 failures, 0 skipped, 0 regressions).
  - TypeScript: `npx tsc -b --noEmit` passed (0 errors).
  - Production Build: `npm run build` succeeded (0 errors).
  - Linter: `npm run lint` passed (0 errors).
- **Screenshots:** Captured at 390x844 and 1280x800 and saved in `docs/screens/m1/`.

---

## 6. Milestone M2 Verified Implementation

- **Branch:** `m2-idempotent-workout-api`
- **Specification:** Strictly adhered to Section 6 (Milestone M2) and Appendix B (Idempotent Workout Session API Contract).
- **Database Migration:**
  - Created additive migration `2026_10_10_0013_add_workout_log_idempotency.py` (parent: `2026_08_20_0012`).
  - Added `idempotency_key` (VARCHAR(128), nullable) and `request_fingerprint` (VARCHAR(64), nullable) to `workout_logs`.
  - Added unique constraint `uq_workout_logs_user_idempotency` on `(user_id, idempotency_key)`.
  - Used `op.batch_alter_table("workout_logs")` for both `upgrade()` and `downgrade()` for SQLite/Postgres compatibility.
  - Tested migration upgrade, downgrade, and re-upgrade cycles successfully.
- **Canonicalisation & Fingerprint (`backend/app/core/idempotency.py`):**
  - Implemented `normalize_weight` with `Decimal(str(val))` and `ROUND_HALF_UP` (80.504 -> 80.50, 80.505 -> 80.51, 80.506 -> 80.51).
  - Implemented null discriminators ensuring `None`, `""`, `"   "`, and string values remain strictly distinct.
  - Implemented order-independent sorting for exercises and sets (`exercise_id`, `set_number`).
  - Preserved notes verbatim (no stripping, no lowercasing).
  - Implemented SHA-256 fingerprint generation of compact canonical JSON (`separators=(',', ':')`, `sort_keys=True`).
- **Idempotency Service & Route:**
  - Keyed requests require `ended_at` (returns 422 if omitted).
  - Validates key length <= 128 chars and non-whitespace (422).
  - Initial lookup returns 200 OK + `X-Idempotency-Replay: true` on matching fingerprint, or raises 409 Conflict with code `idempotency_key_reused` on mismatch.
  - Race-safe write transaction: immediate `db.rollback()` on `IntegrityError` before recovery query; recovers committed winner on idempotency constraint violation and re-raises non-idempotency integrity errors.
  - Legacy unkeyed requests preserve 201 Created and optional `ended_at` behavior without `X-Idempotency-Replay` header.
- **CORS Configuration (`backend/app/main.py`):**
  - Added `"Idempotency-Key"` to `allow_headers`.
  - Added `expose_headers=["X-Idempotency-Replay"]`.
- **Test Suite (`backend/tests/test_workout_idempotency.py`):**
  - 15 comprehensive unit and integration tests covering the complete Appendix B contract:
    - First keyed submit (201 Created without replay header).
    - Identical retry (200 OK with `X-Idempotency-Replay: true` and identical body).
    - Changed payload with same key (409 Conflict with code `idempotency_key_reused`).
    - Keyed submit missing `ended_at` (422).
    - Empty, whitespace-only, and >128-char keys (422).
    - Legacy unkeyed submit with and without `ended_at` (201).
    - User isolation (User A and User B using same key independently both succeed with 201).
    - Weight round-half-up normalization (80.504 -> 80.50, 80.505 -> 80.51, 80.506 -> 80.51).
    - Canonical payload exercise and set order permutation invariance.
    - Notes distinction (`None`, `""`, `"   "`, text).
    - Notes verbatim preservation in canonical payload.
    - Concurrency race-condition recovery with immediate rollback.
    - Non-idempotency `IntegrityError` re-raising.
    - CORS preflight `allow_headers` and actual request `expose_headers`.
- **Test Results:**
  - Backend: **349 passed** (0 failures, 0 skipped, 15 new tests in M2).
  - Frontend: **106 passed** (16 test files, 0 failures).
  - Active Alembic Head: `2026_10_10_0013 (head)`.


