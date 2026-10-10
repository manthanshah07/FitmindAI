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
| **Milestone M3** | Workout Mode & Draft Recovery (Phase 3C-B & 3C-C) | **COMPLETE** |
| **Milestone M4** | Workouts Sub-App Rebuild | NEXT |

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

---

## 7. Milestone M3 Verified Implementation

- **Branch:** `m3-workout-mode`
- **Specification:** Strictly adhered to Section 6 (Milestone M3), Appendix B (API contract & Idempotency-Key headers), Appendix C (Draft Recovery Engine), and Appendix E (Workout Mode Wireframe).
- **Draft Recovery Engine (`src/lib/workoutDraft.ts`):**
  - `fitmind:workout-draft:<userId>` key with debounced 300ms persistence.
  - **User Isolation:** Drafts strictly scoped by user ID; User A cannot see User B's draft; drafts are preserved across logout so subsequent login on the same device restores progress.
  - **Corrupt JSON Quarantine:** Verified copy written to `fitmind:workout-draft-quarantine:<userId>:<timestamp>` before removing corrupt draft; verifies quarantine exists before offering discard/download.
  - **QuotaExceededError Handling:** Non-blocking warning banner with "Copy Draft" and "Download JSON" buttons; continues in-memory session.
  - **Stale Draft (>24h) Detection:** Prompts user with "Save as Completed" or "Discard" modal.
  - **Verbatim Notes Preservation:** Notes preserved verbatim (`null`, `""`, `"   "`, text distinct).
- **Zustand Store (`src/store/useWorkoutDraftStore.ts`):**
  - Manages full draft lifecycle: init from `SessionTemplate` or empty workout, resume active draft, set editing with string weight representation (`weightKg: string`), set completion with ISO timestamp.
  - Dropping uncompleted sets upon submission freeze per Appendix C.
  - Rest timer timestamp management (`restEndsAt`), -15s / +15s / Skip adjustments.
  - Immediate persistence flush on freeze and set completion.
- **Full-Screen Workout Mode UI (`src/pages/workout/WorkoutSessionPage.tsx`):**
  - Full-screen layout isolated from tab bar with `data-theme="dark"` tokens.
  - Live elapsed timer computed continuously from `startedAt` (survives tab closure and reload).
  - Single exercise focus view with Previous / Next pagination and quick-jump bottom sheet.
  - Touch targets >= 48px on set completion checkmark buttons.
  - Timestamp-based rest timer bar: progress ring, elapsed countdown, -15s / +15s / Skip buttons.
  - Zero-transition feedback: Web Audio synthesizer chime, `navigator.vibrate`, polite `aria-live` announcement.
  - Screen Wake Lock API integration: requests on mount, re-acquires on `visibilitychange`, releases on unmount/finish.
  - Accidental exit confirmation dialog and `beforeunload` browser guard.
  - Submission flow: drops uncompleted sets, freezes `endedAt`, submits with `Idempotency-Key` header, clears draft on 201/200, handles 409 conflict, retains draft on network failure with exponential backoff retries and `online` event listener.
  - Shortcut: "Open Music App" linking to native audio scheme with web player fallback.
- **Entry Points:**
  - Updated Today / Dashboard (`src/pages/dashboard/DashboardPage.tsx`) and Workouts Overview (`src/pages/workout/WorkoutOverviewPage.tsx`) with dynamic "Resume workout" / "Start workout" and "Start empty workout".
- **Verification & Test Results:**
  - Frontend Test Suite: **124 passed** across 18 test files (10/10 in `workoutDraft.test.ts`, 8/8 in `workoutMode.test.tsx`, 7/7 in `workout.test.tsx`, 0 failures).
  - Backend Test Suite: **349 passed** in 80.93s (100% parity with M2 baseline, 0 failures, 0 regressions).
  - TypeScript: `npx tsc -b --noEmit` passed (0 errors).
  - Production Build: `npm run build` succeeded (0 errors).
  - Linter: `npm run lint` passed (0 errors).
  - Database Migration: No schema changes in M3 (alembic head remains `2026_10_10_0013`).
- **Screenshots:** Mobile screenshots captured at 390x844 and saved in `docs/screens/m3/`:
  - `workout_mode_session.png` (Live workout mode active session)
  - `workout_overview_mobile.png` (Workouts overview with entry points)
  - `today_resume_mobile.png` (Today dashboard with dynamic resume entry point)
  - `workout_mode_dev_ui.png` (Design system UI showcase)

---

## 8. Milestone M4 Verified Implementation

- **Branch:** `m4-workouts-hub`
- **Specification:** Strictly adhered to Section 6 (Milestone M4), Section 3.2 (D13), Section 3.3 (U2), and docs/STATUS.md (V1, V2, V3 answers).
- **Database Migration (`backend/alembic/versions/2026_10_10_0014_add_plan_exercise_day_label.py`):**
  - Parent revision: `2026_10_10_0013`.
  - Added nullable `day_label` (VARCHAR(50)) column to `workout_plan_exercises` via `op.batch_alter_table` for SQLite / PostgreSQL compatibility.
  - Tested migration clean upgrade, downgrade, and re-upgrade cycles.
  - Active Alembic Head: `2026_10_10_0014 (head)`.
  - Updated `WorkoutPlanExercise` model in `backend/app/models/workout.py`.
- **Exercise Catalog Expansion (Fixes D13):**
  - Expanded `DEFAULT_EXERCISES` in `backend/app/services/exercise_service.py` to 44 realistic exercises across all muscle groups (chest, back, shoulders, arms, legs, core, full body) and equipment tiers (bodyweight, dumbbells, barbell, cables, machines).
  - Every exercise includes full, realistic 2–4 sentence instructions with zero placeholder text.
  - Added optional `equipment` filter parameter to `GET /api/v1/exercises`.
  - Exercise search prioritizes exact and prefix matches before partial substring matches using SQLAlchemy `case()`.
  - Updated `backend/app/seed_demo_data.py` to seed the expanded catalog.
- **Deterministic Plan Generator v2 (`backend/app/services/workout_service.py`):**
  - **Split Rules (2–6 days):**
    - 2 days: Full Body A / Full Body B
    - 3 days: Push / Pull / Legs
    - 4 days: Upper A / Lower A / Upper B / Lower B
    - 5 days: Push / Pull / Legs / Upper / Lower
    - 6 days: PPL x2
  - **Compound Lift Prioritization:** Exercises ranked by movement hierarchy (Priority 1: Squat, Deadlift, Bench Press, Overhead Press, Pull-up; Priority 2: Incline Dumbbell Press, Bent-over Row, Dips, Lunges, RDL). Priority 1 and 2 placed first in every session before accessory isolation movements.
  - **Equipment Adaptation:** Filters available pool strictly by user profile equipment; falls back gracefully to bodyweight if equipment unavailable.
  - **Volume & Goal Adaptation:** Generates 4–6 exercises per day. Target sets and rep ranges adapted deterministically by fitness goal (Muscle Gain: 3–4 sets x 8–12 reps; Fat Loss: 3 sets x 12–15 reps; Strength/Endurance: 4–5 sets x 4–6 reps).
  - **Deterministic Day Labels:** Assigned structured labels (`Day 1: Push`, `Day 2: Pull`, etc.) persisted in `workout_plan_exercises.day_label`.
- **Workout Read Endpoints & Enriched History:**
  - Added `GET /api/v1/workout/last-performance` endpoint returning user's previous weights and reps per exercise from completed workout logs.
  - Enriched `WorkoutLogResponse` with computed session metrics: `duration_seconds` (from `started_at` to `ended_at`), `total_volume_kg` (sum of `weight_kg * reps_completed`), `total_sets_completed`, session `name`, and `is_personal_record` flag per exercise log.
- **Workouts Hub UI (`src/pages/workout/WorkoutOverviewPage.tsx`):**
  - Rebuilt `/workouts` as a 3-segment hub (Plan, History, Exercises) using Radix UI Tabs with design tokens:
    - **Plan Tab:** Week strip day selector, day cards with `day_label`, exercise list with target sets/reps, "Start Day X" CTA handoff prefilling `SessionTemplate` into Workout Mode, and "Regenerate Plan" modal.
    - **History Tab:** Past sessions list with formatted date, duration, sets completed, volume in kg, PR indicators, and expandable exercise/set log view.
    - **Exercises Tab:** Searchable catalog with search input, muscle group dropdown, equipment dropdown, and exercise detail `BottomSheet` with step-by-step form cues.
  - Prefilled `SessionTemplate` handoff into Workout Mode (`/workouts/session`) automatically fetches previous performance benchmarks via `getLastPerformanceApi`.
  - Re-skinned `WorkoutHistoryPage.tsx` and `ExerciseDetailPage.tsx` using design system components (`PageHeader`, `Card`, `Chip`, `Button`, `EmptyState`).
- **Verification & Test Results:**
  - Backend Test Suite: **356 passed** across 29 test modules (0 failures, 0 regressions, 7 new tests in M4):
    - `test_plan_generator_v2.py`: 4 tests (split mapping, compound prioritization, determinism, goal adaptation).
    - `test_workout_history_and_performance.py`: 3 tests (computed metrics, PR flags, last performance lookup, user isolation).
  - Frontend Test Suite: **130 passed** across 19 test files (0 failures, 6 new tests in `workoutsHub.test.tsx`, 7 in `workout.test.tsx`).
  - TypeScript Static Check: `npx tsc -b --noEmit` passed with 0 errors.
  - Production Build: `npm run build` succeeded.
  - Linter: `npm run lint` passed (0 errors).
- **Screenshots:** Mobile (390x844) and desktop (1280x800) screenshots captured and saved in `docs/screens/m4/`:
  - `workouts_hub_plan_mobile.png` (Mobile Plan view with week selector, day cards, exercise list)
  - `workouts_hub_plan_desktop.png` (Desktop Plan view)
  - `workouts_hub_dev_ui_mobile.png` (Mobile showcase view)
  - `workouts_hub_dev_ui_desktop.png` (Desktop showcase view)

---

## 9. Milestone M5 Verified Implementation

- **Branch:** `m5-today-and-nutrition`
- **Specification:** Strictly adhered to Section 6 (Milestone M5), Section 3.2 (D5), Section 3.3 (U9), Section 4.5, Appendix E (Today Screen Wireframe), and docs/STATUS.md (V4 answer).
- **Regional Food Database Expansion (Fixes D13):**
  - Created `backend/app/core/food_catalog.py` with 174 realistic, unique regional Indian & global staple foods with verified per-100g nutritional facts (calories, protein, carbs, fat, fiber).
  - Covers Indian staples: Roti/Chapati, Bajra/Jowar/Makki Roti, Paratha (Aloo, Paneer, Gobi), Dal (Moong, Tadka, Makhani, Chana, Toor), Sambar, Idli, Dosa (Plain, Masala), Uttapam, Poha, Upma, Khichdi, Rajma, Chana Masala, Paneer dishes (Bhurji, Tikka, Palak Paneer), Curd/Dahi, Chaas, Lassi, Biryani, Pulao, Egg Bhurji, and global staples (Oats, Eggs, Chicken Breast, Whey Protein, Greek Yogurt, Sweet Potato, Salmon, Fruits, Rice).
  - Seeded via `FoodService.seed_default_foods` and called in `seed_demo_data.py`.
  - Prefix-boosted search ranking using SQLAlchemy `case()` ensures exact/prefix matches appear first.
- **Meal Item Edit, Delete & Recent Endpoints (Fixes V4):**
  - `DELETE /api/v1/nutrition/items/{item_id}`: Deletes meal item, automatically deletes parent meal log if 0 items remain, enforces user isolation (404 on cross-user attempt).
  - `DELETE /api/v1/nutrition/logs/{log_id}`: Deletes meal log and all child items.
  - `PATCH /api/v1/nutrition/items/{item_id}`: Updates quantity in grams and recalculates calories, protein, carbs, and fat proportionally from parent food per-100g macros.
  - `GET /api/v1/nutrition/recent`: Returns deduplicated past logged foods ordered by most recent consumption (`logged_at DESC`), limited to recent N items, strictly user-isolated.
  - `POST /api/v1/nutrition/quick-add`: Creates a quick-add meal entry with user-specified custom calories, protein, carbs, fat, and optional name.
  - `GET /api/v1/nutrition/today`: Supports optional `target_date` query parameter (defaults to today's date) with date-calibrated targets and consumed meals.
- **Single Source of Truth (Fixes D5):**
  - `DashboardService.get_dashboard_summary` directly invokes `NutritionService.get_today_summary` to source today's targets, consumed, and remaining calories and macros.
  - Added carbs & fat fields to `DashboardTodayNutritionSection`: `consumed_carbs_g`, `target_carbs_g`, `remaining_carbs_g`, `consumed_fat_g`, `target_fat_g`, `remaining_fat_g`.
- **Rebuilt Today Screen (`src/pages/dashboard/DashboardPage.tsx` / Appendix E):**
  - Greeting header: Time-of-day greeting ("Good morning / afternoon / evening, [User]"), formatted date, and user initial avatar pill.
  - Workout card:
    - Active draft: Displays "In progress" chip, live elapsed timer continuously updating every second, and "Resume workout" CTA.
    - Completed today: Displays "Completed" chip, checkmark icon, session name, total sets, and formatted duration.
    - Scheduled day: Displays "Scheduled" chip, day label, exercise count, and "Start workout" CTA prefilling `SessionTemplate`.
    - Rest day: Displays "Rest day" chip and recovery message.
  - Nutrition card:
    - Headline remaining calories with `Ring` progress meter.
    - Macro progress bars (Protein, Carbs, Fat) with consumed/target numbers and color variants.
    - Full-width "Add food" button opening `AddFoodSheet`.
  - This Week card:
    - Workouts completed dot indicators (e.g., 3 of 4).
    - Food logged count (e.g., 5 of 7 days).
    - Weight delta (e.g., -0.6 kg).
    - Fitness score badge with delta linking directly to `/progress`.
  - Deterministic insight line: Computed strictly from numbers (e.g. "You are 650 kcal under today's target") with zero LLM API calls.
  - Non-blocking onboarding reminder banner when profile setup is incomplete.
- **Rebuilt Nutrition Screen (`src/pages/nutrition/NutritionOverviewPage.tsx`):**
  - Date navigation: Previous day, formatted date, Next day, and "Today" quick jump button.
  - Calorie balance card: Headline remaining calories, consumed vs target, `Ring` meter, info popover explaining Mifflin-St Jeor metabolic calculations.
  - Macro progress bars: Protein, Carbs, Fat with consumed/target metrics.
  - Meal categories: Breakfast, Lunch, Dinner, Snacks cards with item count and subtotal calories.
  - Interactive meal items: Tap item opens `EditMealItemDialog` with `NumberStepper` and Delete button.
  - Add Food Sheet (`src/components/nutrition/AddFoodSheet.tsx`):
    - Full-screen / bottom sheet modal with meal selector dropdown.
    - Recent tab: Displays past logged foods with verified 3-tap quick add flow.
    - All foods tab: Search catalog with live query filtering and serving size stepper.
    - Quick add tab: Direct calorie and macro entry.
- **Verification & Test Results:**
  - Backend Test Suite: **364 passed** across 30 test modules in 86.49s (0 failures, 0 regressions, 8 new tests in `test_nutrition_items_and_recent.py`).
  - Frontend Test Suite: **144 passed** across 21 test files in 3.07s (0 failures, 7 new tests in `todayPage.test.tsx`, 7 new tests in `nutritionPage.test.tsx`).
  - TypeScript Static Check: `npx tsc -b --noEmit` passed with 0 errors.
  - Production Build: `npm run build` succeeded in 517ms.
  - Linter: `npm run lint` passed with 0 errors.
  - Database Migration: Zero migrations required (existing tables `foods`, `meal_logs`, `meal_log_items` accommodate all functionality; active Alembic head remains `2026_10_10_0014 (head)`).
- **Screenshots:** Captured at mobile (390x844) and desktop (1280x800) in `docs/screens/m5/`:
  - `today_mobile.png` (390x844)
  - `today_desktop.png` (1280x800)
  - `nutrition_mobile.png` (390x844)
  - `nutrition_desktop.png` (1280x800)
  - `dev_ui_mobile.png` (390x844)

---

## 10. Milestone M6 Verified Implementation

- **Branch:** `m6-progress-and-metrics`
- **Specification:** Strictly adhered to Section 6 (Milestone M6), Section 3.2 (findings D1, D3, D4, D5, D6, D12), Section 3.3 (U7, U10), Section 4.5, Appendix E, and docs/STATUS.md (V9 and V10 answers).
- **Database Migration:**
  - Migration revision: `backend/alembic/versions/2026_10_10_0015_add_fitness_score_formula_version.py` (parent: `2026_10_10_0014`).
  - Added `formula_version` (`INTEGER`, default `2`, nullable `False`) to `fitness_scores` table using SQLite-safe `op.batch_alter_table`.
  - Tested upgrade, downgrade, and re-upgrade on local database. Alembic head is `2026_10_10_0015 (head)`.
  - Updated `FitnessScore` model in `backend/app/models/fitness_score.py` and response schemas.
- **Central Weight Resolver (Fixes D6):**
  - Implemented `get_current_weight(db, user)` in `backend/app/core/weight.py`.
  - Hierarchy: Checks latest `Measurement` record with `weight_kg IS NOT NULL` (ordered by `measured_at DESC`), falling back to `profile.weight_kg`.
  - Wired into `NutritionService`, `DashboardService`, `ContextBuilder`, and `ReportService`. All numeric logic across the entire platform now operates on a single unified weight value.
- **Unified Metrics Engine (Fixes D5, D4):**
  - Created `backend/app/services/metrics_service.py` defining single deterministic adherence functions:
    - `calculate_calorie_adherence`: Ratio of average calories to target, capped at 100.0%.
    - `calculate_protein_adherence`: Ratio of average protein to target, capped at 100.0%.
    - `calculate_workout_session_credit`: Adversarial work-done rule (<3 sets = 0.0 credit; credit = min(1.0, completed / planned)).
    - `get_planned_sets_for_day`: Matches day_label or day_of_week; computes average sets per day across plan; fallback 12 sets.
    - `calculate_weekly_workout_adherence`: Sum of session credits / target_days_per_week * 100.0, capped at 100.0%.
    - `calculate_logging_consistency`: Active logging days (workout or nutrition) / 7 * 100.0, capped at 100.0%.
  - Documented full formula, component weights, edge cases, and design rationale in `docs/FITNESS_SCORE.md`.
- **Fitness Score Formula V2 Redesign (Fixes D3):**
  - Completely removed the 75.0 recovery baseline constant (zero invented data).
  - Formula weights: Workouts 35%, Calories 25%, Protein 20%, Consistency 20% (strictly sums to 100%).
  - Snapshot on read: Computes score on read and persists at most one daily snapshot row with `formula_version = 2`.
  - Removed manual "Recalculate" button from UI and API endpoints.
  - Exposes `sets_completed` and `sets_planned` volume metrics in response payload.
- **Goal Validation & Conflict Integrity (Fixes D1):**
  - Reject conflicting goals on write with HTTP 422 Unprocessable Entity:
    - `fat_loss`: requires `target_weight_kg < current_weight`.
    - `muscle_gain`: requires `target_weight_kg >= current_weight`.
    - `maintenance`: requires `abs(target_weight_kg - current_weight) <= 1.5 kg`.
  - Non-blocking conflict detection: Exposes `has_goal_conflict` and `conflict_reason` on `GoalResponse` for legacy data without corrupting or deleting existing user rows.
  - Fixed demo seed in `backend/app/seed_demo_data.py`: `demo.full` target weight updated to 84.0 kg for `muscle_gain` starting at 79.5 kg.
- **Rebuilt Progress Screen (`src/pages/progress/ProgressOverviewPage.tsx` / Fixes D12, U7, U10):**
  - Radix UI Tabs: Overview, Body Measurements, Weekly Review (M7 placeholder), Forecast (M7 placeholder). Direct deep-linking supported via `?tab=` query parameter.
  - Fitness Score Card (`src/components/progress/FitnessScoreCard.tsx`): 4-bar breakdown (Workouts 35%, Calories 25%, Protein 20%, Consistency 20%), dynamic "What to improve" line with actionable coaching guidance for lowest component, expandable "How this is calculated" disclosure with exact formula, removed recalculate button.
  - Trimmed Y-axis `LineChart`: Added `yDomain` prop to `src/components/ui/LineChart.tsx` avoiding visual compression of subtle body weight changes.
  - StatTiles: Current Weight, Weight Change over selected range (4w, 12w, 6m, all), Distance to Goal.
  - Goal conflict warning banner: Alert banner rendered when `has_goal_conflict` is true.
  - Body Measurements Tab: Unnested natural scrolling measurement log (no nested scroll boxes, fixes U7), measurement entries with date, weight, circumferences (formatted via `formatInches`), and body fat %, "Add Measurement" modal with validation.
- **Verification & Test Results:**
  - Backend Test Suite: **372 passed** across 32 test modules in 89.86s (0 failures, 0 regressions, new tests in `test_metrics_engine.py`, `test_weight_resolution.py`, and updated `test_goals.py`, `test_fitness_score.py`, and `test_adversarial_verification.py`).
  - Frontend Test Suite: **144 passed** across 21 test files in 3.09s (0 failures, 4 tests in `progress.test.tsx`, 3 tests in `fitnessScore.test.tsx`).
  - TypeScript Static Check: `npx tsc -b --noEmit` passed with 0 errors.
  - Production Build: `npm run build` completed successfully in 544ms.
  - Linter: `npm run lint` passed with 0 errors.
  - Database Migration: Alembic head verified at `2026_10_10_0015 (head)`.
- **Screenshots:** Mobile (390x844) and desktop (1280x800) screenshots captured and saved in `docs/screens/m6/`:
  - `progress_overview_mobile.png` (390x844)
  - `progress_overview_desktop.png` (1280x800)
  - `progress_body_mobile.png` (390x844)
  - `progress_body_desktop.png` (1280x800)
  - `dev_ui_mobile.png` (390x844)

---

## 11. Milestone M10 Verified Implementation

- **Branch:** `m10-pwa-and-mobile-polish`
- **Specification:** Strictly adhered to Section 6 (Milestone M10), Section 4.4, Section 8.3 of `docs/FINAL_PLAN.md`.
- **Vite PWA Plugin Configuration:**
  - Installed `vite-plugin-pwa` dev dependency.
  - Configured `VitePWA` in `vite.config.ts`:
    - `registerType: 'prompt'` with interactive reload update trigger.
    - Web App Manifest: `name: "FitMind AI"`, `short_name: "FitMind"`, `theme_color: "#0B1220"`, `background_color: "#0B1220"`, `display: "standalone"`, `orientation: "portrait"`, `start_url: "/today"`, `scope: "/"`.
    - Icons: 192x192, 512x512, maskable 512x512.
    - Workbox caching rules (Section 8.3): precaches static client assets (`html`, `css`, `js`, fonts, `svg`, `ico`, `png`), `navigateFallbackDenylist: [/^\/api/]`.
    - **Security Rule (Section 8.3):** Strictly zero caching of authenticated API endpoints (`/api/*`) in the service worker to prevent cross-account data leaks on shared devices.
- **Brand PWA Icons & index.html Meta Tags:**
  - Generated high-resolution brand icons in `public/`:
    - `pwa-192x192.png` (192x192)
    - `pwa-512x512.png` (512x512)
    - `pwa-maskable-512x512.png` (512x512 maskable)
    - `apple-touch-icon.png` (180x180)
  - Updated `index.html` with mobile PWA meta tags: `viewport-fit=cover`, `apple-mobile-web-app-capable="yes"`, `apple-mobile-web-app-status-bar-style="black-translucent"`, `apple-mobile-web-app-title="FitMind"`, `theme-color="#0B1220"`, and `apple-touch-icon`.
- **PWA Banners & Components:**
  - `PwaUpdateBanner` (`src/components/pwa/PwaUpdateBanner.tsx`): Update available notification prompting user to update service worker and reload.
  - `InstallPromptCard` (`src/components/pwa/InstallPromptCard.tsx`):
    - iOS Safari: Displays instructions: *"Tap Share, then Add to Home Screen"*.
    - Android/Chromium: Intercepts `beforeinstallprompt` event and renders an *"Install App"* button.
    - Dismissal: Persisted in `localStorage` under `fitmind:pwa-install-dismissed` with `try/catch` protection so dismissed users are not badgered.
  - `OfflineBanner` (`src/components/pwa/OfflineBanner.tsx`): Persistent top banner when `navigator.onLine === false`: *"You are offline. Workout Mode continues to save locally."*, with dynamic event listeners on `window` `online`/`offline`.
  - `ColdStartBanner` (`src/components/pwa/ColdStartBanner.tsx`): Pings `/health` on startup; if delayed past 4.0s, displays unobtrusive notice: *"Waking up the server, this can take up to a minute."*, dismissed immediately upon response.
  - Integrated banners and install card into `AppShell.tsx` and `WorkoutSessionPage.tsx`. Safe-area bottom offset `pb-[calc(5rem+env(safe-area-inset-bottom))]` applied to prevent content clipping behind navigation tabs.
- **Deployment Configuration (`vercel.json`):**
  - Configured `Cache-Control: no-cache, no-store, must-revalidate` for `sw.js` and `workbox-*.js` files.
  - Retained SPA wildcard route rewrites to `index.html`.
- **Architecture Documentation (`docs/DECISIONS.md`):**
  - Documented PWA vs native decision, offline-first draft architecture, deterministic core vs AI reasoning separation, and iOS WebKit platform constraints (background timer throttling, lack of `navigator.vibrate`, AudioContext autoplay policies, and standalone storage lifecycle).
- **Verification & Test Results:**
  - Frontend Test Suite: **153 passed** across 22 test files in 3.37s (0 failures, 9 new tests in `pwa.test.tsx`).
  - Backend Test Suite: **372 passed** across 32 test modules in 89.97s (0 failures, 0 regressions).
  - TypeScript Static Check: `npx tsc -b --noEmit` passed with 0 errors.
  - Production Build: `npm run build` completed successfully in 445ms, generating `dist/sw.js` (precache 87 entries) and `dist/manifest.webmanifest`.
  - Linter: `npm run lint` passed with 0 errors.
  - Database Migration: Zero migrations required (Alembic head remains `2026_10_10_0015 (head)`).
- **Mobile Viewport Audit Screenshots (360px, 390px, 430px):**
  - 15 total screenshots captured and saved in `docs/screens/m10/`:
    - 360px (Compact Mobile): `today_360.png`, `workouts_360.png`, `workout_session_360.png`, `nutrition_360.png`, `progress_360.png`.
    - 390px (Standard Phone): `today_390.png`, `workouts_390.png`, `workout_session_390.png`, `nutrition_390.png`, `progress_390.png`.
    - 430px (Large Phone): `today_430.png`, `workouts_430.png`, `workout_session_430.png`, `nutrition_430.png`, `progress_430.png`.






