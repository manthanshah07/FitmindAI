# FitMind AI — Security Audit Report

> **Audit Date:** 2026-08-19 | **Classification:** Engineering Audit

---

## CRITICAL FINDINGS

### SEC-001 — COMMITTED LIVE API KEY
- **Severity:** CRITICAL
- **File:** `backend/.env` (line 16)
- **Evidence:** `GEMINI_API_KEY=<REDACTED_API_KEY>`
- **Problem:** A live, functional Gemini API key is committed to the repository working tree. While `.gitignore` excludes `.env` files, the file exists on disk and may already be in git history if it was ever staged. If the repository is or was ever pushed to GitHub publicly, this key is compromised.
- **Impact:** Unauthorized API usage, billing fraud, quota exhaustion, potential rate limiting of the production system.
- **Required Action:** IMMEDIATELY revoke this key in Google Cloud Console. Generate a new key. Ensure the new key is never committed. Audit git history with `git log --all --full-history -- backend/.env`.
- **Classification:** FACT (directly verified in file)

---

### SEC-002 — UNAUTHENTICATED ADMIN ENDPOINT: /admin/run-seeder
- **Severity:** CRITICAL
- **File:** `backend/app/api/v1/admin.py` (lines 142–160)
- **Evidence:** `@router.post("/run-seeder")` with no authentication dependency
- **Problem:** This endpoint seeds the production database with 10 demo user accounts. Any person on the internet who knows the URL can call it with `curl -X POST https://fitmindai-ur71.onrender.com/api/v1/admin/run-seeder` and it will execute successfully. There is no Bearer token check, no secret header check, no IP allowlist.
- **Impact:** Database pollution, demo account creation, potential data loss.
- **Classification:** FACT (directly verified in code)

---

### SEC-003 — UNAUTHENTICATED ADMIN ENDPOINT: /admin/migrate
- **Severity:** CRITICAL
- **File:** `backend/app/api/v1/admin.py` (lines 163–188)
- **Evidence:** `@router.post("/migrate")` with no authentication dependency whatsoever
- **Problem:** This endpoint executes raw SQL ALTER TABLE statements against the production database. No authentication. No rate limiting. No guards.
- **Impact:** Schema corruption if called with edge-case database state. Information disclosure in error messages.
- **Classification:** FACT (directly verified in code)

---

### SEC-004 — ADMIN ENDPOINT EXPOSES SEEDED EMAILS IN RESPONSE
- **Severity:** HIGH
- **File:** `backend/app/api/v1/admin.py` (lines 34–39)
- **Evidence:** Response includes `"seeded_emails": seeded_emails`
- **Problem:** The `/admin/seed-demo` endpoint (which does have a shared-secret check) returns the list of demo account emails in the response body. This leaks PII.
- **Classification:** FACT

---

### SEC-005 — WEAK ADMIN AUTHENTICATION: JWT_SECRET AS ADMIN SECRET
- **Severity:** HIGH
- **File:** `backend/app/api/v1/admin.py` (line 22)
- **Evidence:** `expected_secret = os.getenv("ADMIN_SEED_SECRET", settings.JWT_SECRET)`
- **Problem:** If `ADMIN_SEED_SECRET` is not set, the JWT signing secret is used as the admin authorization secret. An attacker who obtains any valid JWT token can decode its structure, and if they also learn the JWT_SECRET (e.g., via a misconfigured error), they can call admin endpoints. More critically, using the JWT_SECRET for a different purpose weakens the security boundary.
- **Classification:** FACT

---

### SEC-006 — REFRESH TOKEN STORED IN LOCALSTORAGE
- **Severity:** MEDIUM
- **File:** `src/lib/api/tokenStorage.ts`
- **Evidence:** `localStorage.setItem(REFRESH_TOKEN_KEY, token)`
- **Problem:** Refresh tokens stored in localStorage are vulnerable to XSS attacks. Any injected script can read `fitmind_refresh_token` and exfiltrate it to maintain persistent access.
- **Impact:** Account hijacking if XSS vulnerability exists anywhere in the application.
- **Mitigation:** Use `httpOnly` cookies for refresh tokens (requires backend changes).
- **Classification:** FACT (by design, but architecturally weak)

---

### SEC-007 — NO PASSWORD COMPLEXITY REQUIREMENTS
- **Severity:** MEDIUM
- **File:** `backend/app/schemas/auth.py` (line 9)
- **Evidence:** `password: str = Field(..., min_length=8, max_length=128)`
- **Problem:** Password validation only requires minimum 8 characters. "aaaaaaaa" is a valid password. No uppercase, number, or special character requirements. No common password blocklist.
- **Classification:** FACT

---

### SEC-008 — ACCESS TOKEN NOT RATE LIMITED ON REFRESH ENDPOINT
- **Severity:** MEDIUM
- **File:** `backend/app/api/v1/auth.py` (lines 35–38)
- **Evidence:** `@router.post("/refresh")` has no `@limiter.limit()` decorator
- **Problem:** The `/auth/refresh` endpoint has no rate limiting applied. An attacker could brute-force refresh token guessing (though impractical given token complexity) or cause DoS via rapid requests.
- **Classification:** FACT

---

### SEC-009 — /admin/verify-test-subjects UNAUTHENTICATED INFORMATION DISCLOSURE
- **Severity:** MEDIUM
- **File:** `backend/app/api/v1/admin.py` (lines 48–99)
- **Evidence:** `@router.get("/verify-test-subjects")` with no authentication
- **Problem:** Returns a list of all demo email addresses, their existence status, and whether their password verifies. No authentication required. This is an enumeration oracle.
- **Classification:** FACT

---

### SEC-010 — /admin/db-info UNAUTHENTICATED DATABASE METADATA
- **Severity:** MEDIUM
- **File:** `backend/app/api/v1/admin.py` (lines 102–139)
- **Evidence:** `@router.get("/db-info")` with no authentication
- **Problem:** Returns database type, host, table existence, total user count, and environment variable values. No authentication required.
- **Classification:** FACT

---

### SEC-011 — CORS ALLOWS ALL METHODS AND HEADERS
- **Severity:** LOW
- **File:** `backend/app/main.py` (lines 47–53)
- **Evidence:** `allow_methods=["*"], allow_headers=["*"]`
- **Problem:** CORS is configured to allow all HTTP methods and all headers from allowed origins. Should be scoped to required methods (GET, POST, PUT, DELETE, OPTIONS) and required headers.
- **Classification:** FACT

---

### SEC-012 — JWT jti IS NOT VALIDATED AGAINST A REVOCATION LIST
- **Severity:** LOW
- **File:** `backend/app/core/security.py` (line 40)
- **Evidence:** `"jti": uuid.uuid4().hex[:12]`
- **Problem:** The JWT access token has a `jti` claim but it is never validated. There is no way to revoke a specific access token before expiration. The 60-minute window is acceptable for most cases, but logout only revokes the refresh token — the access token remains valid.
- **Classification:** FACT

---

## Authentication Assessment

| Feature | Implementation | Quality |
|---|---|---|
| Password hashing | bcrypt via passlib | GOOD |
| JWT signing | HS256 (acceptable, RS256 would be better) | ACCEPTABLE |
| Access token expiry | 60 minutes | ACCEPTABLE |
| Refresh token rotation | Implemented, tested | GOOD |
| Refresh token revocation | Database-backed | GOOD |
| Account enumeration protection | Generic error message | GOOD |
| Rate limiting (login) | 5/minute | GOOD |
| Rate limiting (register) | 3/minute | GOOD |
| Rate limiting (coach) | 10/minute | GOOD |
| Rate limiting (refresh) | MISSING | WEAK |
| Password complexity | Minimum length only | WEAK |
| Email verification | Flag exists, flow not implemented | INCOMPLETE |

---

## Authorization Assessment

| Feature | Implementation | Quality |
|---|---|---|
| User data isolation | Filtered by user_id | GOOD |
| Admin endpoint protection | MISSING on 4 of 6 endpoints | CRITICAL |
| IDOR prevention | user_id from JWT, not URL | GOOD |
| Profile authorization | Enforced via get_current_user | GOOD |
| Workout authorization | Enforced via user_id filter | GOOD |
| Nutrition authorization | Enforced via user_id filter | GOOD |

**Summary:** The user-to-user authorization (IDOR prevention) is correctly implemented. No evidence that User A can access User B's data through normal application routes. The critical failure is the admin router, which bypasses all authorization entirely.

---

## Required Immediate Actions

1. **Revoke** the Gemini API key in `backend/.env` — KEY IS LIVE
2. **Add** `Depends(get_current_user)` or a strong admin-only dependency to ALL `/admin/*` endpoints
3. **Consider removing** the admin router from production entirely and making it a local CLI script
4. **Add** rate limiting to `/auth/refresh`
5. **Audit** git history for committed `.env` files

---

## Phase 1 Remediation Status (2026-08-19)

### SEC-001 — GEMINI API KEY IN BACKEND/.ENV
- **Status:** RESOLVED
- **Before:** `backend/.env` contained a plaintext API key.
- **Action Taken:** Removed plaintext API key from local `backend/.env` file and replaced with safe placeholder `GEMINI_API_KEY=your_gemini_api_key_here`. Verified `backend/.env` is NOT tracked in git (`git ls-files backend/.env` is empty). Verified key was never committed to git history (`git log --all -S "REDACTED"` returned 0 matches).
- **Verification:** `git status` shows clean tracking state; `git ls-files backend/.env` returns empty.

### SEC-002 — /ADMIN/RUN-SEEDER UNAUTHENTICATED ENDPOINT
- **Status:** RESOLVED
- **Before:** Unauthenticated POST route allowed seeding demo database over public HTTP.
- **Action Taken:** Removed `/admin/run-seeder` route from HTTP API entirely. Seeding operations are executed via CLI script `python -m app.seed_demo_data` or Render deployment pipeline.
- **Verification:** `POST /api/v1/admin/run-seeder` returns HTTP 404 in integration tests.

### SEC-003 — /ADMIN/MIGRATE UNAUTHENTICATED ENDPOINT
- **Status:** RESOLVED
- **Before:** Unauthenticated POST route allowed executing raw DDL schema changes over public HTTP.
- **Action Taken:** Removed `/admin/migrate` route from HTTP API entirely. Schema migrations execute exclusively via Alembic DDL pipeline (`alembic upgrade head` in `pre_deploy.py`).
- **Verification:** `POST /api/v1/admin/migrate` returns HTTP 404 in integration tests.

### SEC-004 — ADMIN RESPONSE EMAIL DISCLOSURE
- **Status:** RESOLVED
- **Before:** `/admin/seed-demo` returned array of created user email addresses.
- **Action Taken:** Updated response schema to return aggregate summary `{ "status": "success", "message": "...", "count": 10 }` without leaking user emails.
- **Verification:** Verified response payload in pytest suite `test_seed_demo_data.py`.

### SEC-009 & SEC-010 — UNAUTHENTICATED DIAGNOSTIC ENDPOINTS
- **Status:** RESOLVED
- **Before:** `/admin/verify-test-subjects` and `/admin/db-info` were accessible without authentication.
- **Action Taken:** Added `verify_admin_secret` dependency requiring `X-Admin-Secret` header on all `/admin/*` endpoints. Removed detailed subject PII arrays from responses.
- **Verification:** Integration tests confirm unauthenticated GET requests return 422/401, while authenticated requests with `X-Admin-Secret` succeed with sanitized output.
