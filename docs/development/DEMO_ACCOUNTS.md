# FitMind AI — Demo User Accounts & Seeding Guide

> [!WARNING]
> **DEVELOPMENT & DEMO CREDENTIALS ONLY**
> The accounts and password documented below are for development, automated testing, and demo verification ONLY. They MUST NEVER be deployed to a public production environment or populated with real personal user data.

---

## 1. How to Seed Demo Accounts

To create or seed the demo accounts against your local PostgreSQL or SQLite development database:

```bash
cd backend
.venv/bin/python -m app.seed_demo_data
```

This populates 10 distinct, deterministic demo accounts representing realistic user personas, varying adherence levels, edge-case UI states, and timezone boundary conditions.

---

## 2. How to Reset / Reseed Demo Accounts

To reset the demo accounts to their original pristine state:

```bash
cd backend
.venv/bin/python -m app.seed_demo_data
```

### Idempotent Purge & Rebuild Mechanics
- **Selective Purge**: The seed script queries existing records matching `demo.*@fitmind.ai` and purges their child rows across `fitness_scores`, `measurements`, `meal_logs`, `workout_logs`, `workout_plans`, `goals`, `profiles`, `ai_memories`, `chat_messages`, and `users`.
- **Safety Guarantee**: Non-demo users (`user.email not in DEMO_EMAILS`) are **never touched or deleted**.
- **Zero LLM Overhead**: Operates deterministically without calling external Gemini LLM APIs.

---

## 3. Demo Login Credentials

- **Shared Demo Password (All Accounts)**: `FitMindDemo@2026`

| Account | Scenario | Best For |
|---|---|---|
| `demo.full@fitmind.ai` | **Fully Populated Realistic User** | End-to-end full application walkthrough (Dashboard, Workouts, Nutrition, Reports, AI Coach). |
| `demo.athlete@fitmind.ai` | **High Adherence Athlete** | Verifying high workout completion (5/5 workouts), 6+ nutrition logging days, and **High (84%+) Adherence** badges. |
| `demo.beginner@fitmind.ai` | **New Beginner (Sparse UI)** | Verifying sparse data, empty states, and **Insufficient Data** UI prompts without misleading fake zeros. |
| `demo.bulking@fitmind.ai` | **Caloric Surplus & Hypertrophy** | Verifying muscle gain goals, high calorie/protein targets (~3,200 kcal/174g protein), and upward weight progression trends. |
| `demo.cutting@fitmind.ai` | **Caloric Deficit & Weight Loss** | Verifying fat loss goals, caloric deficit targets (~1,650 kcal/120g protein), and downward weight reduction trends. |
| `demo.inconsistent@fitmind.ai` | **Irregular Real-World Adherence** | Verifying partial completion (1/3 workouts, 2/7 nutrition days), missing logging days, and **Low (44%) Adherence** UI badges. |
| `demo.progress@fitmind.ai` | **60-Day Progress Analytics** | Verifying multi-measurement weight/body-fat trend charts and historical **Fitness Score progression (55 → 75 pts)** over time. |
| `demo.noplan@fitmind.ai` | **No Active WorkoutPlan** | Verifying profile preference fallbacks (`target_workout_days_per_week: 5`, `preferred_workout_duration_minutes: 60`) when no active plan exists. |
| `demo.timezone@fitmind.ai` | **`Asia/Kolkata` Timezone Boundary** | Verifying timezone-aware date range queries for workouts and meals logged near local IST midnight (`23:30` / `00:30` IST). |
| `demo.ai@fitmind.ai` | **AI Coach & Memory Persistence** | Verifying active `AIMemory` recall (3 items), structured `ChatMessage` history (6 exchanges), and **zero sensitive medical notes leakage**. |

---

## 4. Recommended Testing Order

When performing a manual QA verification or demo presentation, test the accounts in this logical sequence:

1. **`demo.full@fitmind.ai`**: Verify baseline happy-path functionality across all primary views.
2. **`demo.athlete@fitmind.ai`**: Verify peak adherence badges, high workout volume, and high fitness scores.
3. **`demo.beginner@fitmind.ai`**: Verify empty/sparse data UI cards, fallback prompts, and lack of visual bugs.
4. **`demo.noplan@fitmind.ai`**: Verify that Dashboard correctly falls back to Profile target days when no workout plan is active.
5. **`demo.bulking@fitmind.ai` & `demo.cutting@fitmind.ai`**: Verify caloric surplus vs. deficit progress analytics.
6. **`demo.inconsistent@fitmind.ai`**: Verify real-world imperfect logging behavior and low adherence badges.
7. **`demo.progress@fitmind.ai`**: Verify long-term historical charts and multi-week score trend changes.
8. **`demo.timezone@fitmind.ai`**: Verify date boundary alignment for non-UTC users.
9. **`demo.ai@fitmind.ai`**: Verify persistent AI memory, conversation history loading, and guardrail enforcement.

---

## 5. Important Differences Between Accounts

- **Adherence Scores**: `demo.athlete` (High ~84%), `demo.full` (High ~94%), `demo.inconsistent` (Low ~44%), `demo.beginner` (Low ~23%), `demo.noplan` (Low ~20%).
- **Caloric Intake**: `demo.bulking` (1,848+ kcal consumed today, 3,200 target) vs `demo.cutting` (827+ kcal consumed today, 2,216 target).
- **Workout Plan Presence**: All accounts have active plans except `demo.noplan@fitmind.ai`.
- **Fitness Score History**: `demo.progress@fitmind.ai` contains 5 multi-week historical fitness score entries to demonstrate score trends over time.

---

## 6. How to Verify Timezone Behavior (`demo.timezone@fitmind.ai`)

1. Log in as `demo.timezone@fitmind.ai`.
2. Inspect Profile: Primary Timezone displays **`Asia/Kolkata`** (UTC+5:30).
3. View Dashboard & Weekly Report: Workouts completed near 23:30 IST and meals logged near 00:30 IST are correctly assigned to local IST calendar days rather than bleeding into incorrect UTC calendar dates.
4. Compare Dashboard `weekly_summary` and `generate_weekly_report` numbers: both show 4/4 workouts completed and 6 logged nutrition days in the local IST week.

---

## 7. How to Verify Sparse-Data Behavior (`demo.beginner@fitmind.ai`)

1. Log in as `demo.beginner@fitmind.ai`.
2. View Dashboard: Daily nutrition displays `0 kcal / 1,886 kcal target`. Weekly summary displays `1/3 workouts completed` with a `Low (23.3%)` adherence score.
3. View Reports Page: Displays clean insufficient-data UI state without crashing or rendering NaN values.
4. View AI Coach Page: Context builder includes minimal baseline data without throwing missing-key exceptions.

---

## 8. How to Verify AI Coach Behavior (`demo.ai@fitmind.ai`)

1. Log in as `demo.ai@fitmind.ai`.
2. Open AI Coach Page (`/coach`).
3. Verify Previous Chat History: 6 structured messages load from DB (questions regarding vegan protein, progressive overload on squats, and cardio timing).
4. Verify AI Memory: 3 active memories load (`training_preference`, `schedule_preference`, `dietary_preference`).
5. Verify Medical Safety: Profile `medical_notes` is empty, and no sensitive health/injury details exist in `AIMemory`.

---

## 9. How to Verify Dashboard vs Reports Consistency

1. Log in as `demo.full@fitmind.ai` or `demo.athlete@fitmind.ai`.
2. Note the Dashboard **Weekly Progress Overview** card metrics:
   - Workouts Completed: `4/4` (or `5/5` for athlete)
   - Nutrition Logged Days: `6/7`
   - Adherence Score: `94.3%`
3. Click **"View Full Weekly Report →"** to navigate to `/reports`.
4. Verify Report metrics: Workouts Completed (`4/4`), Nutrition Logged Days (`6`), and Adherence Score (`94.3%`) match the Dashboard 100%.

---

## 10. Production Deployment Safety Warning

> [!CAUTION]
> **PROHIBITED IN PRODUCTION**
> - The seed script `app.seed_demo_data` and documented passwords must **NEVER** be enabled or executed in a production environment containing live user data.
> - Demo accounts must be disabled or omitted in production builds unless running inside an explicitly isolated staging/demo environment.
