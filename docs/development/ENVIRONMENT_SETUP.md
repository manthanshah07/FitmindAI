# FitMind AI — Environment Setup

> **Status:** ACTIVE  
> **Last Updated:** 2026-08-11

---

## Frontend Environment Variables

Copy `.env.example` to `.env.local` in the project root.

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes (app phase) | Base URL of the FastAPI backend (e.g., `http://localhost:8000/api/v1`) |
| `VITE_SUPABASE_URL` | Yes (progress phase) | Supabase project URL for storage |
| `VITE_SUPABASE_ANON_KEY` | Yes (progress phase) | Supabase anonymous API key for frontend use |

> **Note:** All frontend environment variables must be prefixed with `VITE_` to be exposed to the browser by Vite.

---

## Backend Environment Variables (FastAPI)

These live in `backend/.env` (excluded from version control).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g., `postgresql://user:pass@host/db`) |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens (min 32 chars, random) |
| `JWT_ALGORITHM` | Yes | JWT algorithm (use `HS256`) |
| `JWT_EXPIRE_MINUTES` | Yes | Access token expiry in minutes (e.g., `60`) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (server-side only, never expose to client) |
| `GEMINI_MODEL` | Yes | Model name (e.g., `gemini-2.5-flash-lite`) |
| `ADMIN_SEED_SECRET` | Optional | Secret key required in `X-Admin-Secret` header for admin seeding/diagnostics |
| `SUPABASE_URL` | Optional | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Optional | Supabase service role key (server-side only) |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed frontend origins |
| `ENVIRONMENT` | Yes | `development` or `production` |

---

## Security & Secret Management Architecture

1. **Zero Committed Secrets**: `.env` and `.env.*` files are strictly excluded from version control via `.gitignore`. Real credentials must NEVER be committed to Git.
2. **Safe Placeholder Templates**: `.env.example` files contain safe placeholder strings only (e.g. `GEMINI_API_KEY=your_gemini_api_key_here`).
3. **Server-Side Only Credentials**: `GEMINI_API_KEY`, `SUPABASE_SERVICE_KEY`, and `JWT_SECRET` are strictly consumed by the FastAPI backend server. They are NEVER prefixed with `VITE_` or exposed to the browser client.
4. **Admin Endpoint Authorization**: Admin endpoints (`/api/v1/admin/*`) require explicit header verification via `X-Admin-Secret`. Schema migrations must be executed via Alembic CLI / deployment pipeline (`alembic upgrade head`), NOT via HTTP.
5. **Secret Rotation**: Any secret accidentally exposed in any environment must be revoked immediately in the service provider console and rotated.

---

## Local Development Setup

### Frontend

```bash
git clone <repository>
cd FitmindAI
npm install
cp .env.example .env.local
# Fill in VITE_API_BASE_URL
npm run dev
```

### Backend (When Created)

```bash
cd backend/
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in all required variables
uvicorn app.main:app --reload
```

---

## Generating a Secure JWT Secret

```bash
# Python
python -c "import secrets; print(secrets.token_hex(32))"

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Running Quality & Test Gates Locally

```bash
# Frontend UI tests & TypeScript compilation
npm run test
npx tsc -b --noEmit
npm run build

# Backend deterministic test suite (253 tests)
cd backend
GEMINI_API_KEY="dummy_ci_key_placeholder" .venv/bin/pytest -q
```
