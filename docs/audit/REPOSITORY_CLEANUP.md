# FitMind AI — Repository Cleanup Report

> **Audit Date:** 2026-08-19

---

## Files to DELETE (with evidence)

### backend/.env
**Reason:** Contains live API credentials. Should NEVER be committed.  
**Evidence:** `GEMINI_API_KEY=<REDACTED_API_KEY>` — live key confirmed.  
**Dependencies:** None (`.gitignore` already excludes it; the file is not imported).  
**Risk of deletion:** Zero. The `.env.example` serves as the template.  
**Confidence:** FACT  
**Action:** `git rm --cached backend/.env` + revoke the key immediately.

---

## Files to KEEP BUT REORGANIZE

### scratch/production_smoke_test.py
**Current location:** `scratch/production_smoke_test.py`  
**Recommended location:** `backend/scripts/smoke_test.py`  
**Reason:** Useful operational tool but wrong location. `scratch/` implies throwaway; this is a maintained script.  
**Confidence:** INFERENCE

---

## Files to KEEP BUT DOCUMENT

### backend/app/seed_demo_data.py
**Issue:** 876-line file at the root of the `app/` package. Contains `TEST_SUBJECT_PASSWORD` in plaintext.  
**Risk:** The demo password `FitMindDemo@2026` is committed. If anyone registers with a demo account email, they already know the password. This is acceptable only if demo accounts are intentionally public.  
**Recommendation:** Document explicitly that the demo password is intentionally public. Move seeding logic to `backend/scripts/seed_demo_data.py` and import only what's needed in `app/`.  
**Confidence:** FACT

### backend/app/api/v1/admin.py
**Issue:** Contains production-dangerous operations (database seeding, schema migration) accessible via HTTP.  
**Recommendation:** All admin operations should be CLI scripts. The HTTP admin router should be removed or gated to non-production environments only.  
**Confidence:** FACT

---

## Dead Dependencies

### pytest-timeout (NOT in requirements.txt — GOOD)
The `--timeout` flag was rejected when attempted in audit, confirming this plugin is not installed. **No action needed.**

### bcrypt==4.0.1 (pinned exact version)
`requirements.txt` pins `bcrypt==4.0.1` while `passlib[bcrypt]` is listed separately. The bcrypt pin is an artifact from resolving a known bcrypt/passlib compatibility issue. **Keep with a comment explaining why it's pinned.**

### slowapi (KEEP)
Used for rate limiting. Directly integrated in limiter.py, main.py, and auth.py. **Keep.**

### google-genai (KEEP)
AI client depends on this directly. **Keep.**

### psycopg2-binary (KEEP for production)
Required for Neon PostgreSQL. Tests use SQLite (in-memory), so psycopg2 is only used in production. **Keep.**

---

## Dead Code

### `recovery_score` in fitness_score_service.py
Line 153: `recovery_score = 75.0`  
The variable is computed but is **never included in the weighted_score calculation** (lines 155-161 — check: `sleep_score` gets 0.10 weight via the fifth term but there is no separate `recovery_score` term). The variable is stored in the database via `score_record.recovery_score = item.recovery_score` but contributes zero to the actual score.  
**Action:** Remove this variable and its database storage column, OR include it in the weighted calculation with its own weight.

### `is_weight_defaulted` in calculations.py
The `calculate_tdee()` function returns `is_weight_defaulted` and `is_age_defaulted` flags. These are returned in the TDEE dict but are never surfaced to the API caller or the frontend. They are silently discarded.  
**Action:** Either expose these flags via the Dashboard API response (so the UI can show "BMR calculated using estimated weight") or remove them from the return dict.

### `utc_now()` function — defined in 5 separate files
`user.py`, `profile.py`, `workout.py`, `fitness_score.py`, `ai_memory.py` all define their own `utc_now()` function. This is identical across all files.  
**Action:** Move to `backend/app/core/utils.py` and import.

---

## Generated Files That Should Not Be Committed

### dist/
The `dist/` directory contains the Vite production build output. This should not be in version control.  
**Action:** `git rm -r --cached dist/` if tracked. Verify `.gitignore` includes `dist` (it does at root level).

### backend/.pytest_cache/ and root .pytest_cache/
Both exist. The root `.gitignore` does not appear to exclude `.pytest_cache/`.  
**Action:** Add `**/.pytest_cache/` to `.gitignore`.

### backend/app/__pycache__/ and all __pycache__ directories
`__pycache__/` is in `.gitignore`. Verify none are tracked: `git ls-files | grep __pycache__`.

---

## Suspicious Files

### backend/.env (DANGEROUS)
Contains a live Gemini API key. **Rotate immediately.**

### backend/dev.db (SQLite development database)
The local SQLite database is in `.gitignore` (`*.db`) but exists on disk. **No action for file itself, but verify it is not tracked:** `git ls-files backend/dev.db`.

---

## Duplicate Files / Duplicate Functionality

| Duplicate | Location 1 | Location 2 | Location 3 | Location 4 |
|---|---|---|---|---|
| `extract_date()` | `analytics_service.py:31` | `fitness_score_service.py:16` | `context_builder.py:35` | `report_service.py:29` |
| `utc_now()` | `user.py:10` | `profile.py:15` | `workout.py:14` | `fitness_score.py:~12` |
| TDEE calculation | `calculations.py` | `tdeeCalculator.ts` | — | — |

---

## .gitignore Assessment

**Current .gitignore entries:** Logs, node_modules, dist, .env files, *.db, .venv, __pycache__, editor files.

**Missing entries:**
- `.pytest_cache/`
- `**/.pytest_cache/`
- `*.pyc`
- `backend/app/__pycache__` (covered by `__pycache__/` glob but should be explicit)
- `.DS_Store` is present ✓

**Overall:** .gitignore is adequate but incomplete for Python project conventions.
