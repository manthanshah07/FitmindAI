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

These live in the backend repository's `.env` file.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g., `postgresql://user:pass@host/db`) |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens (min 32 chars, random) |
| `JWT_ALGORITHM` | Yes | JWT algorithm (use `HS256`) |
| `JWT_EXPIRE_MINUTES` | Yes | Access token expiry in minutes (e.g., `60`) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (starts with `sk-`) |
| `OPENAI_MODEL` | Yes | Model name (e.g., `gpt-4o-mini`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (server-side only, never expose to client) |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed frontend origins |
| `ENVIRONMENT` | Yes | `development` or `production` |

---

## Security Rules for Environment Variables

1. **NEVER commit `.env` files** — `.gitignore` must exclude them
2. `SUPABASE_SERVICE_KEY` and `JWT_SECRET` are server-side only — never expose to browser
3. All production secrets must be set via deployment platform environment variables (Vercel, Railway)
4. Rotate secrets immediately if accidentally committed to git

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
