# FitMind AI — Product & Engineering Decisions

This document records the 13 locked product and architectural decisions governing FitMind AI (defined in Section 2 of [`docs/FINAL_PLAN.md`](FINAL_PLAN.md)).

---

### Decision 1 — Product Scope & Platform Admin Separation
FitMind AI is a **personal fitness and nutrition coaching app for individual users**, plus a **lightweight platform admin console** for the app owner. The consumer navigation has 5 primary destinations (`Today`, `Workouts`, `Nutrition`, `Progress`, `Coach`). Platform Admin (`/admin`) is strictly separated from consumer navigation, guarded by `is_admin=True`, and restricted to system health, user account status (`is_active`), catalog curation, and audit logging. Admins cannot read private user meal logs, measurements, or AI chats.

### Decision 2 — Visual Direction & Theme System
- **Marketing Landing Page (`/`):** Preserves the editorial dark aesthetic (`#090D16` obsidian, `#F59E0B` warm amber, `Syne` display typography).
- **Authenticated Application (`/today`, `/workouts`, `/nutrition`, `/progress`, `/coach`, `/settings`):** Uses a clean, high-contrast, light-first consumer fitness interface with full Dark Mode and System preference parity (`src/styles/design-tokens.css`), sentence-case typography (`Plus Jakarta Sans`), and tabular monospace numerals (`JetBrains Mono`).

### Decision 3 — Primary Navigation (Max 5 Consumer Destinations)
1. **Today** (`/today`) — Daily action hub
2. **Workouts** (`/workouts`) — Active plan, live session logger, exercise library, and history
3. **Nutrition** (`/nutrition`) — Daily calorie/macro rings, meal sections, quick-add, and food logger
4. **Progress** (`/progress`) — Weight & measurements, Fitness Score v2, Weekly Review, and Forecast tabs
5. **Coach** (`/coach`) — Grounded conversational AI coach

### Decision 4 — Single Source of Truth for User Weight
`resolve_current_weight(db, user_id)` in `backend/app/services/weight_resolver.py` is the single resolver across all services:
1. Latest `Measurement.weight_kg` ordered by `measured_at DESC, created_at DESC`.
2. Fallback to `Profile.weight_kg`.
3. `None` if neither exists.
Logging a new measurement automatically synchronizes `Profile.weight_kg` in the same database transaction.

### Decision 5 — Honest Fitness Score Formula (`formula_version = 2`)
Because FitMind AI does not collect sleep or heart-rate variability data, hardcoded sleep (`80.0`) and recovery (`75.0`) constants were eliminated in `formula_version = 2`:
- **With an active workout plan:** `0.35 * workout_adherence + 0.25 * calorie_adherence + 0.20 * protein_adherence + 0.20 * logging_consistency`.
- **Without an active workout plan:** Weights redistribute across nutrition and consistency (`0.385 * calorie_adherence + 0.308 * protein_adherence + 0.307 * logging_consistency`).
- Historical rows remain immutable (`formula_version` stored per row).

### Decision 6 — Goal-Aware Calorie & Protein Targets
- **BMR:** Mifflin-St Jeor equation; falls back to age `30` with an `age_assumed = True` flag if `date_of_birth` is unset.
- **Goal Calorie Adjustments:** `fat_loss` (`TDEE - 400`), `weight_loss` (`TDEE - 500`), `muscle_gain` (`TDEE + 250`), `general_fitness` / `maintenance` (`TDEE`), `endurance` (`TDEE + 150`), `strength` (`TDEE + 200`).
- **Physiological Safety Floors:** Never below `1200 kcal` (female), `1500 kcal` (male), or `1350 kcal` (other/unspecified).
- **Protein Scaling:** `2.0 g/kg` for fat/weight loss, `1.8 g/kg` for muscle gain/strength/general fitness (`15%–35%` calorie cap).

### Decision 7 — Honest Nutrition Logging Denominator
Nutrition adherence and averages are reported with two distinct metrics:
- `avg_calories_on_logged_days` / `avg_protein_on_logged_days` (sum divided by `logged_days` only, avoiding dilution from unlogged days).
- `logging_consistency_pct` (`logged_days / period_days * 100`).

### Decision 8 — Physiologically Safe Weight Forecasting
- Requires `>= 4` weigh-ins spanning `>= 7` days.
- Applies Exponentially Weighted Moving Average (`EWMA`, `alpha = 0.3`) before linear regression.
- Clamps projected weekly rate of change to `[-1.0, +0.5] kg/week` (`flag = "rate_clamped"` when triggered) and enforces a minimum BMI floor of `18.5`.
- Evaluates trajectory alignment against the active goal (`on_track`, `ahead`, `behind`, `off_track`, `holding_steady`).

### Decision 9 — Timezone Correctness
Every day-bounded query (`Today`, `Nutrition`, `Workouts`, `Fitness Score`, `Reports`) resolves local day boundaries (`00:00:00` to `23:59:59.999999`) in the user's `Profile.timezone` (auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` on signup and editable in Settings) before converting to UTC timestamps.

### Decision 10 — Today Screen Redesign
The `/today` screen is an action-oriented daily dashboard featuring a time-of-day greeting, a Next Best Action banner, 4 summary cards (Calories, Protein, Today's Workout, Weight Trend), Quick Actions (`+ Log Meal`, `Start Workout`, `+ Log Weight`, `Ask Coach`), and a compact Fitness Score strip.

### Decision 11 — Mobile-First Active Workout Logger
The live workout session (`/workouts/session`) runs in a distraction-free full-screen layout with large touch targets (`>= 48px`), previous performance prefill, inline set completion checkboxes, an non-blocking bottom rest timer pill (`+15s`, `-15s`, `Skip`), Screen Wake Lock support, and offline draft persistence.

### Decision 12 — Deterministic-First AI Architecture
All mathematical calculations happen in deterministic Python services. The LLM (`gemini-2.5-flash`) is invoked only for `/coach` conversations and on-demand `/api/v1/reports/ai-summary`, receiving pre-computed facts in `GroundedFactsContext`. If `GEMINI_API_KEY` is absent or the provider times out, deterministic fallback responses are returned seamlessly.

### Decision 13 — Installable PWA, Web-First Scope
FitMind AI is packaged as an installable Progressive Web App (`manifest.webmanifest`, Workbox service worker for static shell assets, offline workout draft store) without native iOS/Android wrapper complexity.
