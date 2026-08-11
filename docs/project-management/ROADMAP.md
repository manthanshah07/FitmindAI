# FitMind AI — Project Roadmap

> **Status:** ACTIVE  
> **Last Updated:** 2026-08-11

---

## PHASE 0 — Pre-Development Setup ✅

**Goal:** Establish project foundation before any implementation.

- [x] Landing page designed and complete
- [x] Design system locked (`design-tokens.css`)
- [x] Repository audited
- [x] Documentation structure created
- [x] Architecture designed
- [x] Database design documented
- [x] API contracts documented
- [x] AI architecture documented
- [x] Memory architecture documented
- [x] AI guardrails documented
- [x] User flows documented
- [x] Screen inventory documented
- [x] Roadmap created
- [x] AGENTS.md created
- [x] .env.example created

**Status: COMPLETE**

---

## PHASE 1 — Authentication + Onboarding

**Goal:** Users can register, log in, and complete onboarding.

**Frontend tasks:**
- Set up `react-router-dom` routing
- Create `AppShell` layout with sidebar (desktop) + bottom nav (mobile)
- Build `LoginPage`, `SignupPage`
- Build Onboarding wizard (5 steps)
- Build `ProtectedRoute` component
- Implement auth state management (Zustand)
- Create UI primitives: `Button`, `Input`, `Select`, `Card`

**Backend tasks (if in scope):**
- `POST /auth/register`
- `POST /auth/login`
- `GET /profile` (basic)
- `POST /profile/onboarding`

**Definition of Done:**
- User can register with email + password
- User can log in and receive a JWT
- User is redirected to onboarding after first login
- Onboarding data is saved to user profile
- User lands on dashboard after onboarding

**Status: NOT STARTED**

---

## PHASE 2 — User Profile + Dashboard Shell

**Goal:** Basic dashboard exists with today's summary.

**Frontend tasks:**
- Build `DashboardPage` layout
- Build profile display + edit
- Build today's summary cards (workouts, calories, protein, score)
- Implement `GET /dashboard` data display

**Status: NOT STARTED**

---

## PHASE 3 — Workout System

**Goal:** Users can view a workout plan and log sessions.

**Frontend tasks:**
- `WorkoutPage` — display active plan
- `WorkoutSessionPage` — log live session
- `WorkoutHistoryPage`
- Exercise detail view

**Backend tasks:**
- Exercise database seeded
- `GET /workout/plan`
- `POST /workout/plan` (AI-generated)
- `POST /workout/logs`
- `GET /workout/logs`

**Status: NOT STARTED**

---

## PHASE 4 — Nutrition System

**Goal:** Users can log meals and view nutrition data.

**Frontend tasks:**
- `NutritionPage` — daily summary
- `FoodLoggerPage` — natural language + search
- Meal history view

**Backend tasks:**
- Food database seeded
- `POST /nutrition/log` (NLP + structured)
- `GET /nutrition/today`
- `GET /foods/search`

**Status: NOT STARTED**

---

## PHASE 5 — Progress Tracking

**Goal:** Users can log measurements and view trends.

**Frontend tasks:**
- `ProgressPage` — charts and summaries
- Measurement logging form
- Progress photo upload

**Backend tasks:**
- `POST /progress/measurements`
- `GET /progress/measurements`
- `POST /progress/photos`
- Photo storage via Supabase Storage

**Status: NOT STARTED**

---

## PHASE 6 — Fitness Score

**Goal:** Fitness score is calculated deterministically and displayed.

**Backend tasks:**
- Fitness score calculation engine
- `GET /progress/fitness-score`
- Weekly auto-calculation trigger

**Frontend tasks:**
- Score display in dashboard
- Score breakdown visualization
- Score history chart

**Status: NOT STARTED**

---

## PHASE 7 — AI Coach (Basic)

**Goal:** AI Coach responds using structured user data + memory.

**Backend tasks:**
- Memory layer implementation
- Context builder
- `POST /coach/chat`
- `GET /coach/insight`

**Frontend tasks:**
- `CoachPage` — conversation interface
- Memory display panel
- Today's AI insight card

**Status: NOT STARTED**

---

## PHASE 8 — Memory + Adaptive Coaching

**Goal:** AI remembers conversational context and detects adaptation triggers.

**Backend tasks:**
- Conversational memory extraction
- Memory update pipeline
- Trend detection (plateaus, adherence drops)
- Adaptation trigger logic

**Frontend tasks:**
- Memory visualization in AI coach panel

**Status: NOT STARTED**

---

## PHASE 9 — Reports

**Goal:** Weekly and monthly AI-generated reports.

**Backend tasks:**
- Report generation pipeline
- `GET /reports/weekly`
- `GET /reports/monthly`

**Frontend tasks:**
- `ReportsPage`
- Weekly report display
- Monthly report display

**Status: NOT STARTED**

---

## PHASE 10 — Testing

**Goal:** System is validated before deployment.

- Backend unit tests
- API integration tests
- Frontend component tests
- AI behavior tests
- Security tests
- E2E tests (Playwright)

**Status: NOT STARTED**

---

## PHASE 11 — Deployment + Final Polish

**Goal:** Application deployed and production-ready.

- Frontend deployed to Vercel
- Backend deployed to Railway / Render
- Environment configuration finalized
- README finalized
- Final visual polish pass
- Performance optimization

**Status: NOT STARTED**
