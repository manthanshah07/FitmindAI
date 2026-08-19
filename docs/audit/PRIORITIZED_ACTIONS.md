# FitMind AI — Prioritized Action Plan

> **Audit Date:** 2026-08-19 | Ordered by severity and urgency.

---

## P0 — IMMEDIATE ACTIONS (do before anything else)

These must be done NOW. They affect security of live production data.

### P0-1: Revoke the committed Gemini API key
- **Time:** 5 minutes
- **Steps:**
  1. Go to Google Cloud Console → APIs & Services → Credentials
  2. Find the key starting with `<REDACTED_API_KEY>` and click Delete / Revoke
  3. Generate a new key
  4. Set the new key as an environment variable in Render dashboard: `GEMINI_API_KEY=<new_key>`
  5. NEVER commit a .env file again
- **Verify:** Old key returns 403 when called directly

### P0-2: Add authentication to admin endpoints
- **Time:** 30 minutes
- **Steps:**
  1. Open `backend/app/api/v1/admin.py`
  2. Add `from app.api.deps import get_current_user` import
  3. Add `current_user: User = Depends(get_current_user)` to ALL router functions that lack it (lines 143, 165, 48, 102)
  4. Add an `is_admin` check: `if not current_user.is_admin: raise HTTPException(403, "Forbidden")`
  5. If `is_admin` field doesn't exist, gate behind environment check: `if settings.ENVIRONMENT == "production": raise HTTPException(404)`
- **Verify:** Calling `/admin/run-seeder` without a Bearer token returns 401

### P0-3: Remove backend/.env from version control
- **Time:** 10 minutes
- **Steps:**
  1. `git rm --cached backend/.env`
  2. `git commit -m "Remove accidentally tracked .env file"`
  3. `git push`
  4. Verify `.gitignore` still has `.env` pattern (it does)
  5. If the file was previously committed in git history, run: `git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch backend/.env' HEAD`
  6. Or use BFG Repo Cleaner for cleaner history rewrite

---

## P1 — HIGH PRIORITY (this week)

### P1-1: Update README.md
- **Time:** 45 minutes
- **Steps:**
  1. Update "Currently Implemented Features" section to include all 8 phases
  2. Update the Roadmap section — all phases are complete
  3. Update the test counts (75 frontend + 249 backend, not the outdated numbers)
  4. Update the database migration table (5 migrations is wrong; there are more)
  5. Remove the "Phase 7 - AI Coach: Not Started" line
  6. Add a section describing the AI Coach feature properly
- **Why it matters:** This is the first thing a recruiter or professor reads

### P1-2: Update PROJECT_STATUS.md
- **Time:** 20 minutes
- **Steps:**
  1. Mark Phases 3-8 as COMPLETE in the bottom table
  2. Remove duplicate phase entries (Phases 0-2 are listed twice)
  3. Update "What Is NOT Started" table to accurately reflect current state
- **Why it matters:** Actively misrepresents the project

### P1-3: Fix sleep_score hardcoded value
- **Time:** 2 hours
- **Steps (Option A — Remove):**
  1. Remove `sleep_score` and `recovery_score` from `FitnessScoreCalculation` result
  2. Rebalance weights: consistency (0.30), workout (0.35), nutrition (0.35)
  3. Update the `FitnessScore` migration to remove these columns OR set to nullable
  4. Update all tests that assert on sleep_score
- **Steps (Option B — Implement):**
  1. Add sleep tracking table and API endpoint
  2. Calculate sleep_score from actual logged sleep data
  3. Default to 0 (not 75) when no data

### P1-4: Update docs/00_PROJECT_DECISIONS.md AI decisions
- **Time:** 20 minutes
- **Steps:**
  1. Change A-08 from "OpenAI API" to "Google Gemini API (gemini-2.0-flash)"
  2. Change A-09 from "RAG-based" to "Deterministic preference extraction (Phase 1-8)"
  3. Update AI-07 to reflect Gemini model selection
  4. Resolve the open decisions that are now decided (AI-05, AI-06 were implemented in Phase 7)

---

## P2 — MEDIUM PRIORITY (this sprint)

### P2-1: Consolidate extract_date() into a shared utility
- **Time:** 20 minutes
- **Steps:**
  1. Create `backend/app/core/utils.py`
  2. Add `extract_date()` function (copy from any existing file)
  3. Add `utc_now()` function
  4. Update imports in `analytics_service.py`, `fitness_score_service.py`, `context_builder.py`, `report_service.py`
  5. Remove local function definitions from all 4 files
  6. Run all tests to confirm no regression

### P2-2: Add CI/CD Pipeline (GitHub Actions)
- **Time:** 45 minutes
- **Steps:**
  1. Create `.github/workflows/ci.yml`
  2. Add jobs: frontend-tests (npm run test), backend-tests (.venv/bin/pytest), lint (npm run lint)
  3. Trigger on push to main and on pull requests
  4. Add backend job secrets: `GEMINI_API_KEY` (for any tests that need it), `DATABASE_URL` (SQLite for CI)
- **Why it matters:** Zero automated quality gate on production deploy is a serious gap

### P2-3: Replace useEffect data fetching with TanStack Query in DashboardPage and CoachPage
- **Time:** 1.5 hours
- **Steps:**
  1. In `DashboardPage.tsx`, replace the useEffect with `useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummaryApi })`
  2. In `CoachPage.tsx`, replace history useEffect with `useQuery({ queryKey: ['coach-history'], queryFn: getCoachHistoryApi })`
  3. Handle `isLoading` and `isError` from the query return values

### P2-4: Fix date_of_birth column type in profiles table
- **Time:** 30 minutes (migration required)
- **Steps:**
  1. Create Alembic migration: `ALTER TABLE profiles ALTER COLUMN date_of_birth TYPE DATE`
  2. Update `Profile` model: change `DateTime(timezone=False)` to `Date` type
  3. Update any services that call `.date()` on the value (no longer needed)

### P2-5: Add partial unique index on goals table
- **Time:** 15 minutes
- **Steps:**
  1. Create Alembic migration
  2. `CREATE UNIQUE INDEX uix_goals_user_active ON goals (user_id) WHERE is_active = TRUE;`
  3. Remove any service-layer workarounds that manually handle multi-active goal edge cases

### P2-6: Add comment to frontend tdeeCalculator.ts clarifying it is preview-only
- **Time:** 5 minutes
- **Steps:**
  1. Add a comment at the top: `// PREVIEW ONLY: Used for onboarding wizard instant preview. Backend calculation is authoritative.`
  2. The duplication is acceptable as long as it is clearly intentional and documented.

---

## P3 — LOW PRIORITY (backlog)

### P3-1: Fix temporary message IDs in CoachPage
Use `crypto.randomUUID()` instead of `Date.now()` for temporary message IDs.

### P3-2: Add password complexity validation
Extend `RegisterRequest` schema with a Pydantic validator that requires at least one uppercase, one digit, and one special character.

### P3-3: Add rate limiting to /auth/refresh endpoint
Add `@limiter.limit("10/minute")` to the refresh token endpoint.

### P3-4: Scope CORS configuration
Change `allow_methods=["*"]` to `allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]` and `allow_headers` to the specific required headers.

### P3-5: Document sleep_score limitation in scorecard UI
If not implementing sleep tracking, add a tooltip in the FitnessScoreCard explaining that this component uses a baseline estimate.

### P3-6: Implement database connection pool configuration
Add `pool_size=5, max_overflow=10, pool_recycle=300` to `create_engine()` in `database.py`.

### P3-7: Add pytest-cov to requirements.txt
Measure actual test coverage percentage. The 249 tests are impressive but the coverage percentage is unknown.

### P3-8: Add ARIA labels and keyboard navigation review
Run an accessibility audit on the main application screens.

### P3-9: Fix trailing blank lines and List import in coach_service.py
Trivial code hygiene: add `List` to the typing import in `coach_service.py`.

### P3-10: Remove dist/ from git tracking if it is tracked
Run `git ls-files dist/` to verify. If tracked, run `git rm -r --cached dist/`.

---

## Effort Summary

| Priority | Count | Estimated Total Effort |
|---|---|---|
| P0 (Do now) | 3 | ~45 minutes |
| P1 (This week) | 4 | ~4 hours |
| P2 (This sprint) | 6 | ~6 hours |
| P3 (Backlog) | 10 | ~5 hours |

**Total estimated effort for all issues:** ~16 hours

The P0 actions are critically important and should happen before any new feature development. The P1 documentation actions will have the single highest impact on how evaluators perceive the project.

---

## Phase 1 Remediation Status (2026-08-19)

### P0 Actions Status:
- **P0-1 (Revoke/Sanitize Gemini API Key):** RESOLVED — Plaintext key replaced with safe placeholder in local `backend/.env`. Verified untracked in Git (`git ls-files backend/.env` is empty). Verified key was never committed in Git history.
- **P0-2 (Authenticate Admin Endpoints):** RESOLVED — `verify_admin_secret` dependency added requiring `X-Admin-Secret` header on all admin routes. `/admin/run-seeder` removed. PII removed from responses.
- **P0-3 (Remove /admin/migrate):** RESOLVED — `/admin/migrate` HTTP route deleted. Migrations execute via Alembic CLI in deployment pipeline (`alembic upgrade head`).

---

## Phase 2 Remediation Status (2026-08-19)

### P1 Actions Status:
- **P1-1 (Update README.md):** RESOLVED — Synchronized README with actual implemented features across all 8 phases, test counts (75 frontend, 249 backend), API endpoints, and Alembic migrations.
- **P1-2 (Update PROJECT_STATUS.md):** RESOLVED — Removed duplicate legacy phase headers and updated status tables to accurately report all implemented modules as COMPLETED.
- **P1-4 (Update docs/00_PROJECT_DECISIONS.md):** RESOLVED — Updated decision log to reflect Google Gemini API provider (`gemini-2.5-flash-lite`), PostgreSQL relational memory architecture, Render deployment, and schema response validation.

### P2 Actions Status:
- **P2-2 (Add GitHub Actions CI/CD Pipeline):** RESOLVED — Created `.github/workflows/ci.yml` running frontend unit/UI tests, TypeScript type checking, and backend Pytest suites on push and pull requests to `main`.
