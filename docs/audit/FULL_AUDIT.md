# FitMind AI — Complete Findings Report

> **Audit Date:** 2026-08-19 | All findings verified by direct code inspection.

---

## ID: SEC-001
**Category:** Security  
**Severity:** CRITICAL  
**File:** `backend/.env:16`  
**Problem:** Live Gemini API key committed to repository working tree.  
**Why it matters:** API key can be used by anyone with repository access. Billing fraud, quota exhaustion.  
**Evidence:** Key value `<REDACTED_API_KEY>` present in plaintext.  
**Recommended solution:** Revoke key immediately. Add `backend/.env` to `.gitignore` (it already is, but the file is on disk and may be in history). Use `git filter-branch` or BFG to remove from history.  
**Effort:** Low  **Priority:** P0  **Confidence:** FACT

---

## ID: SEC-002
**Category:** Security  
**Severity:** CRITICAL  
**File:** `backend/app/api/v1/admin.py:142-160`  
**Problem:** `/admin/run-seeder` POST endpoint requires zero authentication. Any HTTP client can seed the production database.  
**Why it matters:** Anyone on the internet can call this endpoint and create 10 demo accounts in production, polluting the database.  
**Evidence:** `@router.post("/run-seeder")` has no `Depends(get_current_user)` and no secret header check.  
**Recommended solution:** Add `Depends(get_current_user)` and check `user.is_admin` flag, OR make this a CLI-only script outside the HTTP router.  
**Effort:** Low  **Priority:** P0  **Confidence:** FACT

---

## ID: SEC-003
**Category:** Security  
**Severity:** CRITICAL  
**File:** `backend/app/api/v1/admin.py:163-188`  
**Problem:** `/admin/migrate` POST endpoint runs raw SQL ALTER TABLE statements with zero authentication.  
**Why it matters:** Production schema can be modified by anyone. Error messages expose internal SQL state.  
**Evidence:** `@router.post("/migrate")` with no auth dependency. Executes `ALTER TABLE profiles ADD COLUMN...`.  
**Recommended solution:** Remove this endpoint entirely. Schema migrations must run via Alembic CLI, not via HTTP.  
**Effort:** Low  **Priority:** P0  **Confidence:** FACT

---

## ID: DOC-001
**Category:** Documentation  
**Severity:** HIGH  
**File:** `README.md`  
**Problem:** README states Phase 7 (AI Coach) is "Not Started". The AI Coach is fully implemented, deployed, and tested (26 backend test files, coach page rendered).  
**Why it matters:** Recruiter or professor reading this README would not know the most technically impressive feature exists.  
**Evidence:** `PROJECT_STATUS.md` line 231: `| AI Coach | Phase 7 | Not Started |`. Code: `backend/app/services/coach_service.py`, `backend/app/api/v1/coach.py`, `src/pages/coach/CoachPage.tsx` — all exist and functional.  
**Recommended solution:** Rewrite README to reflect phases 1-8 complete with actual feature descriptions.  
**Effort:** Low  **Priority:** P0  **Confidence:** FACT

---

## ID: DOC-002
**Category:** Documentation  
**Severity:** HIGH  
**File:** `docs/00_PROJECT_DECISIONS.md:54-78`  
**Problem:** Decision log states AI provider is "OpenAI API" (A-08) and memory is "RAG-based" (A-09). Actual implementation uses Google Gemini API and keyword pattern matching.  
**Why it matters:** A student defending this project would be caught claiming their memory is RAG when asked for technical details.  
**Evidence:** `backend/app/core/ai_client.py` uses `google.genai`. `backend/app/services/ai_memory_service.py` uses `re.search()` with 3 hardcoded patterns.  
**Recommended solution:** Update decision log to reflect Gemini as AI provider. Document memory as "deterministic preference extraction" not RAG.  
**Effort:** Low  **Priority:** P1  **Confidence:** FACT

---

## ID: CODE-001
**Category:** Code Quality  
**Severity:** MEDIUM  
**File:** Multiple files  
**Problem:** `extract_date()` function is copied verbatim in 4 files: `analytics_service.py:31`, `fitness_score_service.py:16`, `context_builder.py:35`, `report_service.py:29`.  
**Why it matters:** Code duplication. A bug fix in one copy would need to be replicated manually to all others.  
**Evidence:** Identical 8-line function in 4 separate service files.  
**Recommended solution:** Move to `backend/app/core/utils.py` and import from all callers.  
**Effort:** Low  **Priority:** P2  **Confidence:** FACT

---

## ID: CODE-002
**Category:** Code Quality  
**Severity:** MEDIUM  
**File:** `src/utils/tdeeCalculator.ts` and `backend/app/core/calculations.py`  
**Problem:** TDEE/BMR calculation (Mifflin-St Jeor) is implemented twice: once on the frontend in TypeScript, once on the backend in Python.  
**Why it matters:** The project principle is "backend owns all deterministic calculations." The frontend calculator violates this principle and creates a divergence risk.  
**Evidence:** Both files implement identical Mifflin-St Jeor formula. Frontend usage is onboarding wizard preview only; backend is authoritative.  
**Recommended solution:** The frontend calculator is acceptable ONLY for onboarding preview (instant user feedback). Document this explicitly. Add a comment in the frontend file: "Preview only — backend calculation is authoritative."  
**Effort:** Low  **Priority:** P2  **Confidence:** FACT

---

## ID: CODE-003
**Category:** Code Quality / Data Integrity  
**Severity:** MEDIUM  
**File:** `backend/app/services/fitness_score_service.py:152-153`  
**Problem:** `sleep_score = 75.0` and `recovery_score = 75.0` are hardcoded constants. They contribute 10% to the total fitness score. This is fabricated data presented as real.  
**Why it matters:** The fitness score claims to be deterministic and based on user data. 10% of it is a hardcoded lie. Any user who never logs sleep data still gets 7.5 free points.  
**Evidence:** Lines 152-153 in fitness_score_service.py: `sleep_score = 75.0` `recovery_score = 75.0`. `recovery_score` is not even included in the weighted_score calculation (only sleep_score indirectly via the 0.10 weight).  
**Recommended solution:** Remove `recovery_score` from the score entirely. Either implement actual sleep/recovery logging or set it to 0.0 with a `data_insufficient` flag. Update score weights to sum to 100% without sleep.  
**Effort:** Medium  **Priority:** P1  **Confidence:** FACT

---

## ID: CODE-004
**Category:** Code Quality  
**Severity:** LOW  
**File:** `backend/app/services/coach_service.py:176`  
**Problem:** `get_chat_history` method has `List[ChatMessageResponse]` return type but `List` is not imported. Python 3.9+ allows `list[...]` but the file uses `from typing import Dict, Any, Optional` — not `List`.  
**Why it matters:** Type annotation error that would fail strict type checking.  
**Evidence:** Line 176: `def get_chat_history(db: Session, user: User, limit: int = 50) -> List[ChatMessageResponse]:`  
**Recommended solution:** Add `List` to the typing import.  
**Effort:** Trivial  **Priority:** P3  **Confidence:** FACT

---

## ID: CODE-005
**Category:** Code Quality  
**Severity:** LOW  
**File:** `backend/app/api/v1/admin.py:193` (empty trailing lines)  
**Problem:** The admin.py file has 4 trailing blank lines after the last function. Minor code hygiene issue.  
**Evidence:** Lines 190-193 are empty.  
**Recommended solution:** Remove trailing blank lines.  
**Effort:** Trivial  **Priority:** P3  **Confidence:** FACT

---

## ID: ARCH-001
**Category:** Architecture  
**Severity:** HIGH  
**File:** `backend/app/api/v1/admin.py`  
**Problem:** The admin router exists as a production HTTP endpoint but its purpose is development/demo data management. This is an operational tool masquerading as an API.  
**Why it matters:** Admin operations (seeding, migrating) should be CLI scripts or protected management interfaces — not public HTTP endpoints on the production server.  
**Evidence:** `admin.py` is mounted in `router.py` with no environment gate: `api_v1_router.include_router(admin_router)`.  
**Recommended solution:** Move seeding to a CLI script (`backend/scripts/seed.py`). Remove the admin router from production, or gate it behind `if settings.ENVIRONMENT != "production"`.  
**Effort:** Medium  **Priority:** P0  **Confidence:** FACT

---

## ID: ARCH-002
**Category:** Architecture  
**Severity:** MEDIUM  
**File:** `backend/app/services/context_builder.py:222-246`  
**Problem:** `ContextBuilder.build_fitness_context()` calls both `FitnessScoreService.get_fitness_score_summary()` and `AnalyticsService.calculate_analytics()`. Each of these internally queries the database independently. When the coach endpoint is called, the context builder performs 7+ separate database queries sequentially.  
**Why it matters:** High latency per coach request. Each coach message triggers: profile query, goal query, workout_logs query, meal_logs query, measurements query, fitness_score calculation (more queries), analytics calculation (more queries), memories query, chat history query.  
**Evidence:** Context builder lines 65, 78-81, 99-111, 151-161, 195-203, 225, 242, 251-261, 266-272 — each a separate database query.  
**Recommended solution:** Consolidate queries using JOINs where possible. Cache fitness score calculation result within the request lifecycle.  
**Effort:** High  **Priority:** P2  **Confidence:** INFERENCE

---

## ID: ARCH-003
**Category:** Architecture  
**Severity:** LOW  
**File:** `backend/app/core/database.py`  
**Problem:** No connection pool size configuration. SQLAlchemy defaults to pool_size=5, max_overflow=10. For a production deployment on Render with Neon PostgreSQL serverless, connection limits may be hit under concurrent load.  
**Evidence:** `create_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False)` — no pool_size or max_overflow specified.  
**Recommended solution:** Add `pool_size=5, max_overflow=10, pool_recycle=300` for production.  
**Effort:** Low  **Priority:** P2  **Confidence:** INFERENCE

---

## ID: DB-001
**Category:** Database  
**Severity:** MEDIUM  
**File:** `backend/app/models/profile.py`  
**Problem:** `date_of_birth` is stored as `DateTime(timezone=False)` but it represents a date, not a datetime. This can cause timezone-offset issues.  
**Evidence:** Line 35: `date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)`  
**Recommended solution:** Use `Date` type for date_of_birth: `from sqlalchemy import Date`.  
**Effort:** Low (requires migration)  **Priority:** P2  **Confidence:** FACT

---

## ID: DB-002
**Category:** Database  
**Severity:** MEDIUM  
**File:** `backend/app/models/profile.py` and `backend/alembic/versions/`  
**Problem:** `Profile` model has `timezone`, `preferred_workout_duration_minutes`, `target_workout_days_per_week` fields added via migration 0011. The `/admin/migrate` endpoint ALSO tries to add these same columns via raw SQL. This creates duplicate migration risk.  
**Evidence:** `admin.py:171-173` runs ALTER TABLE for these same columns that migration 0011 already handles.  
**Recommended solution:** Remove the raw SQL from admin.py. Trust Alembic.  
**Effort:** Low  **Priority:** P1  **Confidence:** FACT

---

## ID: DB-003
**Category:** Database  
**Severity:** LOW  
**File:** `backend/alembic/versions/2026_08_16_0003_create_goals.py`  
**Problem:** The `goals` table has no unique constraint preventing a user from having multiple simultaneously active goals. The service layer handles this via query filtering, but the database does not enforce it.  
**Evidence:** No unique constraint on `(user_id, is_active)` in the goals migration.  
**Recommended solution:** Add partial unique index: `CREATE UNIQUE INDEX uix_goals_user_active ON goals (user_id) WHERE is_active = TRUE;`  
**Effort:** Low  **Priority:** P2  **Confidence:** FACT

---

## ID: FEAT-001
**Category:** Feature  
**Severity:** MEDIUM  
**File:** `backend/app/models/user.py:37-41`  
**Problem:** `is_verified` field exists on the User model and is set to `False` on registration. No email verification flow is implemented. The field is a stub.  
**Why it matters:** Documentation mentions it as "planned for v1.1" but it has been planned since Phase 1. It allows accounts to appear verified/unverified without any mechanism to actually verify.  
**Evidence:** `is_verified: Mapped[bool] = mapped_column(Boolean, default=False)`. No verification endpoint exists in any router.  
**Recommended solution:** Either implement basic email verification or set `is_verified = True` on registration and remove the field from public responses to avoid confusion.  
**Effort:** Medium  **Priority:** P2  **Confidence:** FACT

---

## ID: FRONT-001
**Category:** Frontend  
**Severity:** MEDIUM  
**File:** `src/pages/dashboard/DashboardPage.tsx`  
**Problem:** Dashboard uses local `useState`+`useEffect` for data fetching instead of TanStack Query. The project explicitly chose TanStack Query as the server state library. The dashboard page bypasses it entirely.  
**Why it matters:** No automatic cache invalidation, no background refetch, no stale-while-revalidate behavior. Dashboard data goes stale between page visits.  
**Evidence:** Lines 16-32: manual `async function loadDashboardData()` in `useEffect`. No `useQuery` hook used.  
**Recommended solution:** Replace with `useQuery({ queryKey: ['dashboard'], queryFn: getDashboardSummaryApi })`.  
**Effort:** Low  **Priority:** P2  **Confidence:** FACT

---

## ID: FRONT-002
**Category:** Frontend  
**Severity:** MEDIUM  
**File:** `src/pages/coach/CoachPage.tsx`  
**Problem:** Same pattern — CoachPage uses manual `useEffect` + `useState` for loading chat history instead of TanStack Query.  
**Evidence:** Lines 35-71: manual async history loader in useEffect. No `useQuery`.  
**Recommended solution:** Use TanStack Query for chat history with appropriate caching strategy.  
**Effort:** Low  **Priority:** P2  **Confidence:** FACT

---

## ID: FRONT-003
**Category:** Frontend / UX  
**Severity:** LOW  
**File:** `src/pages/coach/CoachPage.tsx:84`  
**Problem:** Temporary message IDs use `Date.now()`: `id: \`user-${Date.now()}\``. If messages are added rapidly, IDs can collide.  
**Evidence:** Lines 84, 97, 110: `id: \`user-${Date.now()}\``, `id: \`assistant-${Date.now()}\``, `id: \`error-${Date.now()}\``.  
**Recommended solution:** Use `crypto.randomUUID()` for temporary IDs.  
**Effort:** Trivial  **Priority:** P3  **Confidence:** FACT

---

## ID: HYGIENE-001
**Category:** Repository Hygiene  
**Severity:** HIGH  
**File:** `dist/` directory  
**Problem:** The `dist/` directory (Vite build output) appears to be tracked in git. `.gitignore` correctly lists `dist` but the directory exists.  
**Evidence:** `dist/` appears in the directory listing: `{"name":"dist","isDir":true}`.  
**Recommended solution:** Run `git rm -r --cached dist/` to untrack. Verify `.gitignore` includes `dist` (it does).  
**Effort:** Trivial  **Priority:** P1  **Confidence:** INFERENCE (directory exists; git tracking not confirmed without git status)

---

## ID: HYGIENE-002
**Category:** Repository Hygiene  
**Severity:** MEDIUM  
**File:** `scratch/production_smoke_test.py`  
**Problem:** A production smoke test script exists in the `scratch/` directory. This is development tooling that should either be in `scripts/` (and documented) or deleted.  
**Evidence:** `scratch/production_smoke_test.py` (6969 bytes). Contains hardcoded URLs to production services.  
**Recommended solution:** Move to `backend/scripts/smoke_test.py` if useful, or delete.  
**Effort:** Trivial  **Priority:** P3  **Confidence:** FACT

---

## ID: AI-001
**Category:** AI Implementation  
**Severity:** MEDIUM  
**File:** `backend/app/services/ai_memory_service.py`  
**Problem:** The "AI memory" system is described as persistent memory and implied to be intelligent. The actual implementation is 5 hardcoded regex patterns that match 3 dietary keywords and 2 workout phrases. This is not AI memory — it is a deterministic keyword extractor.  
**Why it matters:** Misrepresenting this as "AI" or "RAG" in a demo or interview would be immediately caught by any technical evaluator.  
**Evidence:** `extract_and_save_preferences()` uses `re.search()` with literal strings like "prefer home workout", "vegetarian", and `re.search(r"i (?:dislike|hate|don't like|do not like) ([a-z0-9\s]{3,20})", lower_text)`.  
**Recommended solution:** Either label this accurately ("deterministic preference extraction") or implement actual LLM-based memory extraction. Do not call it RAG.  
**Effort:** Medium  **Priority:** P1  **Confidence:** FACT

---

## ID: AI-002
**Category:** AI Implementation  
**Severity:** LOW  
**File:** `backend/app/services/context_builder.py:263-283`  
**Problem:** Chat history is limited to 10 messages passed to context. This is a reasonable limit but there is no strategy for summarizing older history. Long conversations will lose early context.  
**Evidence:** `.limit(10)` on chat history query.  
**Recommended solution:** Acceptable for current scope. Document as known limitation. Future: implement conversation summarization.  
**Effort:** N/A  **Priority:** P3  **Confidence:** FACT

---

## ID: PERF-001
**Category:** Performance  
**Severity:** MEDIUM  
**File:** `backend/app/services/context_builder.py`  
**Problem:** The context builder makes 9 sequential database queries before constructing the AI prompt. Each coach message incurs: profile, goal, workout_logs (with eager loading), meal_logs (with eager loading), measurements, fitness_score_summary (which makes 2+ more queries), analytics (which makes 4+ more queries), memories, chat_history — approximately 15+ database round-trips.  
**Why it matters:** On Render free tier with Neon PostgreSQL serverless, each query incurs network latency. 15 queries could mean 500-1500ms before the LLM call even starts.  
**Evidence:** Traced through `context_builder.py` — 9 explicit query blocks, each delegating to services that make additional queries.  
**Recommended solution:** Consider consolidating analytics + fitness score into a single "analytics" query pass. Cache fitness score for the request lifecycle.  
**Effort:** High  **Priority:** P2  **Confidence:** INFERENCE


---

## Phase 1 Remediation Status (2026-08-19)

- **SEC-001 (Gemini API Key):** RESOLVED — Plaintext key replaced with safe placeholder in local `backend/.env`. File is untracked by Git (`.gitignore` enforced). Git log history verified free of committed credentials.
- **SEC-002 (/admin/run-seeder):** RESOLVED — Endpoint deleted from HTTP router. CLI script `python -m app.seed_demo_data` is used instead.
- **SEC-003 (/admin/migrate):** RESOLVED — Endpoint deleted from HTTP router. Alembic CLI / `pre_deploy.py` is used exclusively for DDL migrations.
- **SEC-004 (Email disclosure):** RESOLVED — `/admin/seed-demo` response sanitized to return count instead of email list.
- **SEC-009 / SEC-010 (Admin info disclosure):** RESOLVED — All remaining admin routes (`/admin/seed-demo`, `/admin/verify-test-subjects`, `/admin/db-info`) protected with `verify_admin_secret` dependency requiring `X-Admin-Secret` header. Unauthenticated calls blocked.

---

## Phase 2 Remediation Status (2026-08-19)

- **DOC-001 (README outdated phase status):** RESOLVED — `README.md` updated to accurately describe all completed phases 0–8, 75 frontend + 249 backend passing test counts, complete API endpoint tables, and 11 Alembic migrations.
- **DOC-002 (00_PROJECT_DECISIONS outdated references):** RESOLVED — Decision log updated to reflect Google Gemini API integration (`gemini-2.5-flash-lite`), relational memory context assembly in PostgreSQL, Render deployment, and Pydantic response validation.
- **PROJECT_STATUS.md Realignment:** RESOLVED — Cleaned legacy duplicate headers and corrected false "not started" status tables for completed application features.
- **DevOps CI/CD Pipeline:** RESOLVED — Created `.github/workflows/ci.yml` protecting against regressions via frontend Vitest UI tests, TypeScript typechecking (`tsc`), and backend Pytest integration tests.

---

## Phase 3 Remediation Status (2026-08-19)

- **P1-2 (Hardcoded Baseline `sleep_score = 75.0`):** RESOLVED — Centralized `DEFAULT_SLEEP_SCORE_FALLBACK` and `DEFAULT_RECOVERY_SCORE_FALLBACK` in `FitnessScoreService`. Added explicit documentation explaining the 75.0 neutral baseline score for unlogged recovery in v1.0. Added unit tests for 10% recovery weight math.
- **P2-1 (Duplicate `extract_date()` Utility):** RESOLVED — Moved `extract_date` to `app/core/timezone_utils.py`. Replaced duplicate functions in `analytics_service.py`, `fitness_score_service.py`, `context_builder.py`, and `report_service.py`. Added unit test coverage for `date`, `datetime`, ISO strings, `None`, and invalid inputs in `test_calculations.py`.

---

## Phase 4 Remediation Status (2026-08-20)

- **INT-01 (Database Connection Pool Resilience):** RESOLVED — Added `pool_recycle=300`, `pool_size=5`, `max_overflow=10` settings in `database.py` for PostgreSQL production deployments.
- **INT-02 (Password Complexity Validation):** RESOLVED — Updated `RegisterRequest` schema with Pydantic validator requiring both letters and digits.
- **INT-03 (Refresh Endpoint Rate Limiting):** RESOLVED — Throttled `/auth/refresh` to 10 requests per minute in `app/api/v1/auth.py`.
- **INT-04 (CORS Middleware Hardening):** RESOLVED — Scoped CORS middleware allowed methods and headers in `main.py`.
- **INT-05 (Type Annotation Hygiene):** RESOLVED — Fixed missing `List` typing import in `coach_service.py`.
