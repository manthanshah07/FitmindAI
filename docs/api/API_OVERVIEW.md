# FitMind AI — API Overview

> **Status:** PROPOSED — Not implemented  
> **Framework:** FastAPI (Python)  
> **Base URL:** `/api/v1`  
> **Authentication:** Bearer JWT token (except auth endpoints)  
> **Last Updated:** 2026-08-11

---

## Conventions

- All responses return JSON
- All timestamps are ISO 8601 UTC
- Errors return `{ "detail": "message" }` (FastAPI default)
- Auth required endpoints return `401` if token is missing/invalid
- Validation errors return `422 Unprocessable Entity`

---

## Authentication

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create new user account |
| POST | `/auth/login` | No | Authenticate and receive JWT |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Invalidate token |

---

## User Profile

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/profile` | Yes | Get current user's profile |
| PUT | `/profile` | Yes | Update profile fields |
| POST | `/profile/onboarding` | Yes | Complete initial onboarding data |

---

## Dashboard

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/dashboard` | Yes | Aggregated today's data for dashboard |

Response includes: today's workouts, meals, calories, protein, fitness score, AI tip.

---

## Goals

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/goals` | Yes | Get active goal |
| POST | `/goals` | Yes | Create new goal |
| PUT | `/goals/{id}` | Yes | Update goal |

---

## Workout

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/workout/plan` | Yes | Get active workout plan |
| POST | `/workout/plan` | Yes | Create/generate workout plan |
| GET | `/workout/logs` | Yes | Get workout log history |
| POST | `/workout/logs` | Yes | Log a completed workout session |
| GET | `/workout/logs/{id}` | Yes | Get specific log detail |
| GET | `/exercises` | Yes | Browse exercise database |
| GET | `/exercises/{id}` | Yes | Get exercise details |

---

## Nutrition

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/nutrition/today` | Yes | Today's nutrition summary |
| GET | `/nutrition/logs` | Yes | Meal log history |
| POST | `/nutrition/log` | Yes | Log a meal (structured or NLP input) |
| GET | `/nutrition/logs/{id}` | Yes | Meal log detail |
| GET | `/foods/search` | Yes | Search food database |
| GET | `/foods/{id}` | Yes | Get food details |

---

## Progress

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/progress/measurements` | Yes | List all measurements |
| POST | `/progress/measurements` | Yes | Add new measurement |
| GET | `/progress/photos` | Yes | List progress photos |
| POST | `/progress/photos` | Yes | Upload a progress photo |
| GET | `/progress/fitness-score` | Yes | Current and historical fitness scores |

---

## Reports

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/reports/weekly` | Yes | Weekly AI-generated report |
| GET | `/reports/monthly` | Yes | Monthly AI-generated report |

---

## AI Coach

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/coach/chat` | Yes | Send message to AI coach |
| GET | `/coach/history` | Yes | Retrieve conversation history |
| GET | `/coach/insight` | Yes | Get today's AI-generated insight |

---

## Example: POST /auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "Priya Sharma"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Priya Sharma",
  "created_at": "2026-08-11T17:00:00Z"
}
```

**Errors:** `400` email already registered, `422` validation failed

---

## Example: POST /nutrition/log

**Request:**
```json
{
  "meal_type": "lunch",
  "raw_input": "2 rotis, chicken curry, glass of buttermilk",
  "logged_at": "2026-08-11T13:00:00Z"
}
```

**Response (201):**
```json
{
  "meal_log_id": "uuid",
  "meal_type": "lunch",
  "items": [
    { "food": "Roti", "quantity_g": 120, "calories": 295, "protein": 8.4, "carbs": 60, "fat": 1.2 },
    { "food": "Chicken Curry", "quantity_g": 200, "calories": 320, "protein": 28, "carbs": 8, "fat": 18 }
  ],
  "totals": {
    "calories": 615,
    "protein": 36.4,
    "carbs": 68,
    "fat": 19.2
  }
}
```

---

*Detailed request/response schemas for each endpoint are documented in individual API files.*
