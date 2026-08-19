# FitMind AI — Demo User Accounts & Seeding Guide

> **WARNING:** The credentials documented below are for local/demo verification ONLY. Do NOT use this password in production or for real user accounts.

---

## Overview

FitMind AI includes a deterministic, idempotent backend seeding system. Running the seed command creates or resets **10 realistic demo accounts** representing distinct fitness user personas and system edge cases.

---

## Seed Command

Run the backend seed command from the `backend/` directory:

```bash
cd backend
.venv/bin/python -m app.seed_demo_data
```

### Idempotency & Reset Behavior
- **Idempotent**: Safe to run repeatedly.
- **Selective Purge**: Deletes and rebuilds records belonging **strictly** to the 10 demo email addresses (`demo.*@fitmind.ai`).
- **Safety Guarantee**: Never alters or deletes non-demo user data.
- **Zero AI Overhead**: Executes deterministically without invoking external Gemini LLM APIs.

---

## Demo Accounts Credentials

- **Default Demo Password (for ALL demo accounts)**: `FitMindDemo@2026`

| Email | Persona / Scenario | Key Data & Characteristics |
|---|---|---|
| `demo.full@fitmind.ai` | **Fully Populated Realistic User** | Complete profile, active muscle gain goal, 4-day split plan, 3 weeks of workouts, 6 nutrition days/week, measurements, persisted AI memory & chat history, high adherence. |
| `demo.athlete@fitmind.ai` | **High Adherence Athlete** | 5-day athletic performance split, 20 logged workouts over 4 weeks, 7 days/week nutrition logging, high adherence badge (~88-92%). |
| `demo.beginner@fitmind.ai` | **New Beginner (Sparse UI)** | Valid profile, 3-day foundation plan, 1 workout session, 0 nutrition logs, baseline measurements. Used to verify insufficient data / sparse UI states. |
| `demo.bulking@fitmind.ai` | **Caloric Surplus & Hypertrophy** | Muscle gain goal, heavy mass split, high caloric/protein intake (~3,100 kcal, 175g protein), upward weight trend (82.1kg → 84.0kg). |
| `demo.cutting@fitmind.ai` | **Caloric Deficit & Weight Loss** | Fat loss goal, fat loss & conditioning split, keto diet, caloric deficit (~1,550 kcal, 130g protein), downward weight trend (71.0kg → 68.5kg). |
| `demo.inconsistent@fitmind.ai` | **Real-World Irregular Adherence** | 3-day workout plan, only 3 workouts completed over 3 weeks, 2 logged nutrition days. Tests moderate/low adherence UI badges. |
| `demo.progress@fitmind.ai` | **60-Day Progress Analytics** | 6 measurements over 60 days (68.5kg → 64.0kg), progressive workout logs, nutrition logs, ideal for testing progress charts. |
| `demo.noplan@fitmind.ai` | **No Active WorkoutPlan** | Valid profile with `target_workout_days_per_week: 5` and `preferred_workout_duration_minutes: 60`, but no active workout plan. Tests profile preference fallbacks. |
| `demo.timezone@fitmind.ai` | **Timezone Boundary Verification** | `timezone: "Asia/Kolkata"`, workout and meal logs recorded near IST midnight (23:30 / 00:30 IST). Proves local calendar period boundaries. |
| `demo.ai@fitmind.ai` | **AI Coach & Memory Testing** | Valid profile, active hypertrophy plan, persisted `AIMemory` items, 6 structured `ChatMessage` exchanges. **Contains zero medical notes.** |

---

## How to Test

1. Launch backend and frontend development servers.
2. Run `python -m app.seed_demo_data`.
3. Open `http://localhost:5173/login`.
4. Log in using any demo email above with password `FitMindDemo@2026`.
5. Navigate through Dashboard, Workouts, Nutrition, Progress, Reports, and AI Coach to inspect populated metrics.
