# FitMind AI — 5-Minute Guided Demo Script

## Prerequisites

Ensure the local database is migrated and seeded, and both servers are running:
```bash
# Terminal 1: Backend (Port 8000)
cd backend
.venv/bin/alembic upgrade head
.venv/bin/python scripts/seed_demo.py
.venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend (Port 5173)
npm run dev
```

- **Demo Account:** `demo@fitmind.ai`
- **Password:** `FitMindDemo@2026`

---

## Minute 1: Marketing Landing Page & Sign In (`/` -> `/login`)
1. Open `http://localhost:5173/`. Highlight the editorial dark landing page (`#090D16` obsidian + `#F59E0B` warm amber) and clear value proposition.
2. Click **Sign In** (`/login`) and authenticate with `demo@fitmind.ai` / `FitMindDemo@2026`.
3. Observe the transition into the clean, high-contrast consumer application shell (`/today`) with the 5 primary navigation items (**Today**, **Workouts**, **Nutrition**, **Progress**, **Coach**).

---

## Minute 2: Today Hub & Live Workout Logger (`/today` -> `/workouts/session`)
1. On **Today** (`/today`), point out:
   - The time-of-day greeting and **Next Best Action** banner.
   - The 4 summary cards (**Calories**, **Protein**, **Today's Workout**, **Weight**) and the **Fitness Score v2** strip (`formula_version = 2`).
2. Click **Start Workout** to launch `/workouts/session`.
3. Demonstrate the mobile-first workout logger:
   - Previous performance prefill on each set row.
   - Check off a completed set and observe the non-blocking bottom **Rest Timer Pill** (`+15s`, `-15s`, `Skip`).
   - Show that refreshing the browser restores the active workout draft from `localStorage`.
   - Click **Finish Workout** to save idempotently (`Idempotency-Key`).

---

## Minute 3: Nutrition Tracking & Serving Units (`/nutrition`)
1. Navigate to **Nutrition** (`/nutrition`).
2. Inspect the daily Calorie and Protein progress rings and the 4 meal sections (**Breakfast**, **Lunch**, **Dinner**, **Snacks**).
3. Click **+ Quick Add** to log a fast calorie/protein entry, or open the food logger to search the 174-item food catalog (including Indian staples like *Roti*, *Dal Tadka*, *Paneer Tikka*, *Idli* with natural serving units such as `1 medium roti (40g)`).
4. Adjust a logged item's grams inline and watch the daily totals update immediately.

---

## Minute 4: Progress, Honest Fitness Score v2, Weekly Review & Forecast (`/progress`)
1. Navigate to **Progress** (`/progress`):
   - **Overview Tab:** View the Weight Trend chart (raw weigh-ins vs smooth EWMA trend line), log a same-day weigh-in (which upserts cleanly and syncs `Profile.weight_kg`), and inspect the 4-component **Fitness Score v2** breakdown (Workout 35%, Calorie 25%, Protein 20%, Consistency 20%).
   - **Weekly Review Tab (`/progress?tab=review`):** Show the instant deterministic assessment (**What went well**, **What needs attention**, **Next period focus**) and period-over-period delta badges (`7d` vs `30d`), plus the optional **Generate AI Coach Summary** button.
   - **Forecast Tab (`/progress?tab=forecast`):** Show the EWMA weight projection, physiological guardrails (`[-1.0, +0.5] kg/week`), and goal-aligned status badge (**On track**).

---

## Minute 5: Grounded AI Coach & Settings (`/coach` -> `/settings`)
1. Navigate to **Coach** (`/coach`):
   - Point out the privacy disclosure line (**"Coach uses your last 30 days of data. See what is shared."**) and click it to open the **Data Minimization Modal** (showing `medical_notes` and credentials are never shared).
   - Click a suggested prompt (`"Is my protein on target?"`) to receive a structured coaching card grounded in pre-computed metrics.
2. Navigate to **Settings** (`/settings`):
   - Toggle **Light / Dark / System** theme and **Metric (`kg, cm`) / Imperial (`lb, ft/in`)** units.
   - Show the **Download My Data (JSON)** export button under **Data & Privacy**.
