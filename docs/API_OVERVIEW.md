# FitMind AI — API Overview

Base URL: `/api/v1`  
Interactive documentation available locally at `http://localhost:8000/docs` (Swagger UI) and `/redoc`.

All endpoints except `/auth/register`, `/auth/login`, `/auth/refresh`, and `/health` require a Bearer JWT in the `Authorization` header (`Authorization: Bearer <access_token>`).

## Route Summary

| Prefix | Router | Key Operations |
|---|---|---|
| `/auth` | `auth.py` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout` |
| `/profile` | `profile.py` | `GET /profile`, `PUT /profile` (biometrics, target days, timezone) |
| `/goals` | `goals.py` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` (fitness goals) |
| `/exercises` | `exercises.py` | `GET /exercises`, `POST /exercises` (catalog + custom exercises) |
| `/workout` | `workout.py` | `/plans` (CRUD workout plans), `/logs` (log completed workouts) |
| `/foods` | `foods.py` | `GET /foods`, `POST /foods` (nutritional food catalog) |
| `/nutrition` | `nutrition.py` | `/meals` (log meals/items), `/summary` (daily totals vs targets) |
| `/progress` | `progress.py`, `fitness_score.py` | `/measurements` (biometrics), `/fitness-score` (deterministic 0–100 score) |
| `/coach` | `coach.py` | `POST /chat` (Gemini AI conversation), `GET`/`DELETE /memories` (AI preferences) |
| `/reports` | `reports.py` | `GET /reports/weekly` (weekly adherence and metric summaries) |
| `/dashboard` | `dashboard.py` | `GET /dashboard` (unified home screen data payload) |
| `/health` | `router.py` | `GET /health` (service health probe) |

## Numeric Ownership Rule
All numeric calculations (BMR, TDEE, macro splits, volume load, adherence rate, fitness scores) are computed by the FastAPI backend deterministically. The AI Coach endpoint (`/coach/chat`) only interprets and coaches on data returned by these endpoints.
