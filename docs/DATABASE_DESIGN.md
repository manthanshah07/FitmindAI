# FitMind AI — Database Schema

Engine: PostgreSQL (production on Render / Supabase) or SQLite (local development).  
ORM: SQLAlchemy 2.0 (`backend/app/models/`).  
Migrations: Alembic (`backend/alembic/versions/`). Apply via `alembic upgrade head`.

## Core Entities

| Table | Primary Key | Key Foreign Keys | Purpose |
|---|---|---|---|
| `users` | `id` (UUID/str) | — | User accounts (email, hashed password, role, status) |
| `refresh_tokens` | `id` (UUID/str) | `user_id` → `users.id` | Revocable JWT refresh token records |
| `profiles` | `id` (UUID/str) | `user_id` → `users.id` | Biometrics (age, gender, height, weight, activity, timezone) |
| `goals` | `id` (UUID/str) | `user_id` → `users.id` | User targets (target weight, goal type, target date) |
| `exercises` | `id` (UUID/str) | `created_by` → `users.id` (opt) | Global exercise library & user custom exercises |
| `workout_plans` | `id` (UUID/str) | `user_id` → `users.id` | Structured multi-day workout routines |
| `workout_plan_exercises` | `id` (UUID/str) | `plan_id` → `workout_plans.id`, `exercise_id` → `exercises.id` | Planned sets, reps, and order per workout plan |
| `workout_logs` | `id` (UUID/str) | `user_id` → `users.id`, `plan_id` (opt) | Logged workout sessions with duration and completion state |
| `workout_log_exercises` | `id` (UUID/str) | `workout_log_id` → `workout_logs.id`, `exercise_id` → `exercises.id` | Exercise sets performed during a workout |
| `foods` | `id` (UUID/str) | `created_by` → `users.id` (opt) | Nutritional food database (calories, protein, carbs, fat) |
| `meal_logs` | `id` (UUID/str) | `user_id` → `users.id` | Daily meals logged by date and meal type |
| `meal_log_items` | `id` (UUID/str) | `meal_log_id` → `meal_logs.id`, `food_id` → `foods.id` | Servings and macros of individual foods in a meal |
| `measurements` | `id` (UUID/str) | `user_id` → `users.id` | Historical weight and body circumference tracking |
| `fitness_scores` | `id` (UUID/str) | `user_id` → `users.id` | Historical 0–100 composite fitness scores and subscores |
| `ai_memories` | `id` (UUID/str) | `user_id` → `users.id` | Extracted user coaching preferences (diet, schedule, limitations) |
| `chat_messages` | `id` (UUID/str) | `user_id` → `users.id` | Persistent conversation history between user and AI Coach |

## Guidelines
- Always generate migrations via `alembic revision --autogenerate -m "<description>"` when modifying models.
- Inspect `backend/app/models/` for column definitions, constraints, and relationships.
