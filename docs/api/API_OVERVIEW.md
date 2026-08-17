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
| POST | `/progress/fitness-score/recalculate` | Yes | Immediately recalculate and persist fitness score for period |

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

## Example: POST /api/v1/nutrition/log

**Request:**
```json
{
  "meal_type": "lunch",
  "logged_at": "2026-08-11T13:00:00Z",
  "notes": "Post-workout lunch",
  "items": [
    { "food_id": "c1f7b8e2-9b2a-4a6c-8e4d-1e2f3a4b5c6d", "quantity_grams": 120.0 }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "meal_type": "lunch",
  "logged_at": "2026-08-11T13:00:00Z",
  "notes": "Post-workout lunch",
  "created_at": "2026-08-11T13:00:00.123456Z",
  "items": [
    {
      "id": "uuid",
      "meal_log_id": "uuid",
      "food_id": "c1f7b8e2-9b2a-4a6c-8e4d-1e2f3a4b5c6d",
      "quantity_grams": 120.0,
      "calculated_calories": 316.8,
      "calculated_protein": 11.04,
      "calculated_carbs": 62.4,
      "calculated_fat": 3.0,
      "food": {
        "id": "c1f7b8e2-9b2a-4a6c-8e4d-1e2f3a4b5c6d",
        "name": "Whole Wheat Roti (Chapati)",
        "calories_per_100g": 264.0,
        "protein_per_100g": 9.2,
        "carbs_per_100g": 52.0,
        "fat_per_100g": 2.5,
        "is_verified": true,
        "created_at": "2026-08-11T12:00:00Z"
      }
    }
  ]
}
```

---

*Detailed request/response schemas for each endpoint are documented in individual API files.*
