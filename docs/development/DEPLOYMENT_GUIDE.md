# FitMind AI — Production Deployment Guide

> **Stack:** React + Vite (Vercel) | FastAPI (Render) | PostgreSQL (Neon / Supabase / Render Postgres)

---

## 1. Manual Setup Requirements

Before deploying, create the following cloud infrastructure resources:

1. **Managed PostgreSQL Database:**
   * Create a PostgreSQL database on [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Render Postgres](https://render.com).
   * Copy the connection string (`postgresql://<user>:<password>@<host>:5432/<dbname>`).

2. **Render Backend Web Service:**
   * Create a new Web Service on [Render](https://render.com) connected to your GitHub repository.
   * Root Directory: `backend`

3. **Vercel Frontend Project:**
   * Create a new Project on [Vercel](https://vercel.com) connected to your GitHub repository.
   * Framework Preset: `Vite`

---

## 2. Environment Variables

### A. Render (Backend Service)

| Variable Name | Example / Format | Notes |
|---|---|---|
| `ENVIRONMENT` | `production` | Enables production mode |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` | Managed PostgreSQL connection string |
| `JWT_SECRET` | `a_secure_random_32_character_string` | Secret key for JWT signature validation |
| `CORS_ORIGINS` | `https://fitmind-app.vercel.app` | Comma-separated allowed frontend origins |

### B. Vercel (Frontend App)

| Variable Name | Example / Format | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://fitmind-backend.onrender.com/api/v1` | Public HTTPS endpoint of Render FastAPI app |

---

## 3. Build, Release, & Startup Commands

### Render (Backend):
* **Build Command:** `pip install -r requirements.txt`
* **Release / Pre-deploy Command:** `alembic upgrade head` *(Automatically runs migrations 0001 → 0005 on the PostgreSQL database before starting the new code version)*
* **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Vercel (Frontend):
* **Build Command:** `npm run build`
* **Output Directory:** `dist`

---

## 4. CORS Configuration

Set `CORS_ORIGINS` on Render to match your exact Vercel deployment URL (e.g. `https://fitmind-app.vercel.app`).

FastAPI's `CORSMiddleware` in `backend/app/main.py` parses `CORS_ORIGINS` dynamically and injects the proper HTTP response headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`).

---

## 5. Deployment Verification Instructions

### Step 1: Verify Backend Health Endpoint
In terminal or browser:
```bash
curl -i https://<your-backend-name>.onrender.com/health
```
**Expected Output:** `HTTP/1.1 200 OK` `{"status":"ok"}`

### Step 2: Confirm Database Migrations Ran
Connect to your PostgreSQL database using `psql` or database GUI (DBeaver / TablePlus / Supabase SQL Editor):
```sql
SELECT * FROM alembic_version;
```
**Expected Output:** A row containing `2026_08_16_0005` (current head).

Verify tables exist:
```sql
\dt
-- Should list: users, refresh_tokens, profiles, goals, exercises, workout_plans, workout_plan_exercises, workout_logs, workout_log_exercises
```

### Step 3: End-to-End User Flow Verification
Open `https://<your-vercel-app>.vercel.app` in the browser:
1. **Signup:** Create a new account at `/signup`.
2. **Dashboard Entry:** Verify automatic redirection to `/dashboard` with user full name displayed.
3. **Onboarding:** Click `"Complete Onboarding →"` on the non-blocking card, fill all 5 steps, and verify returning to `/dashboard` with onboarding status updated to `Complete`.
4. **Profile Editing:** Navigate to `/profile`, click `"Edit Profile"`, change weight/height/equipment, and click `"Save Changes"`. Verify success banner and updated TDEE calculation on `/dashboard`.
