# FitMind AI — Testing & Quality Assurance Guide

## 1. Database Safety Guardrail (`enforce_database_safety`)

FitMind AI enforces a strict local-only database safety check (`backend/app/core/db_safety.py`) across all test suites, Alembic migrations, and seeding scripts:
- Only `sqlite`, `localhost`, `127.0.0.1`, `::1`, `postgres`, and `db` hosts are permitted during test or script execution.
- Any attempt to run pytest, migrations, or seed scripts against a remote or production database host immediately raises a `RuntimeError("SAFETY VIOLATION: ...")` before any connection is opened.

---

## 2. Backend Test Suite (`backend/tests/`)

The backend test suite uses `pytest` and FastAPI's `TestClient` backed by an isolated in-memory SQLite database (`sqlite:///:memory:`). All external LLM calls (`Gemini`) are mocked in unit and integration tests.

### Run All Backend Tests
```bash
cd backend && .venv/bin/pytest -q
```

### Key Backend Test Modules
| Test File | Coverage Area |
|---|---|
| `test_domain_logic_m1.py` | Central weight resolver, BMR/TDEE calorie & protein targets, physiological safety floors, Fitness Score v2 (`formula_version = 2`), EWMA weight forecast, and BMI floor clamping |
| `test_workout_m4.py` | Active workout plan generation, exercise catalog filtering, previous performance prefill, idempotent workout session logging, and exercise progression history |
| `test_nutrition_m5.py` | 174-item food catalog search & category filters, serving-unit conversion, inline meal item updates (`PATCH`), quick-add calories/macros, and recent foods |
| `test_progress_m6.py` | Same-day measurement upsert (`(user_id, measured_at)`), automatic `Profile.weight_kg` synchronization, and Fitness Score v2 component breakdown |
| `test_reports_m7.py` | Deterministic 7-day and 30-day reviews (`ai=False` default), period-over-period deltas, on-demand `POST /api/v1/reports/ai-summary` (mocked LLM), and goal-aligned forecast statuses |
| `test_coach_m8.py` | `GroundedFactsContext` precomputation (`1.6–2.2 g/kg` protein range), structured `CoachReply` validation, deterministic fallback, and `DELETE /api/v1/coach/history` |
| `test_settings_m9.py` | Auto-detected timezone registration, `YYYY-MM-DD` Date of Birth round-trip, JSON data export (`GET /api/v1/user/export`), and password-confirmed account deletion |
| `test_admin_m11.py` | Admin RBAC (`403` for non-admin), aggregate platform stats, self-lockout prevention (`400`), catalog verification toggles, and `admin_audit_log` entries |
| `test_data_isolation.py` | Cross-user data isolation across Workouts, Nutrition, Measurements, Coach history, and User Export + CORS `PATCH` preflight + refresh token bearer rejection |
| `test_rate_limiting.py` | SlowAPI rate-limit enforcement (`429 Too Many Requests` + `Retry-After`) |

---

## 3. Frontend Test Suite (`src/tests/`)

The frontend test suite uses **Vitest**, **React Testing Library**, and `jsdom`.

### Run All Frontend Tests
```bash
npm test -- --run
```

### Key Frontend Test Modules
- `src/tests/today_m3.test.tsx` — Today screen greeting, Next Best Action card, 4 summary cards, and quick actions
- `src/tests/workout_m4.test.tsx` — Active workout logger, rest timer pill (`+15s`, `-15s`, `Skip`), and Exercise Detail progression
- `src/tests/nutrition.test.tsx` — Nutrition overview, Quick Add modal, Recent tab, serving unit selector, and inline editing
- `src/tests/progress_m6.test.tsx` — Progress tabs, EWMA trend line chart, and Fitness Score v2 component bars
- `src/tests/weekly_review_forecast_m7.test.tsx` — Deterministic Weekly Review, period deltas, and Forecast trajectory badge
- `src/tests/coach_m8.test.tsx` — Coach chat interface, suggested prompts, Privacy modal, and New conversation reset
- `src/tests/settings_m9.test.tsx` — 4-step Onboarding wizard, unit conversion helpers (`metric` / `imperial`), and Settings sections
- `src/tests/pwa_m10.test.tsx` — Offline banner, PWA install prompt dismissal, and workout draft persistence
- `src/tests/admin_m11.test.tsx` — Admin Console tabs, RBAC redirect for regular users, and self-lockout prevention
- `src/tests/hardening_m13.test.tsx` — `ErrorBoundary` recovery, reskinned `NotFoundPage` (404), and zero `legacy-*` Tailwind keys

---

## 4. Static Analysis & Production Build Checks

```bash
# TypeScript strict compiler check
npx tsc -b --noEmit

# ESLint check
npm run lint

# Production bundle & PWA service worker build
npm run build
```
