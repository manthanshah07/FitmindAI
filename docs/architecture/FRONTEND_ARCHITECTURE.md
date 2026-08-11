# FitMind AI — Frontend Architecture

> **Status:** PROPOSED  
> **Framework:** React 19 + TypeScript + Vite  
> **Last Updated:** 2026-08-11

---

## Principles

1. The **existing landing page is immutable** — no restructuring that could affect it
2. New application pages extend the landing page's visual identity
3. Routing is client-side via `react-router-dom`
4. All HTTP communication goes through a centralized service layer
5. Business logic does not live in components — components render, services compute

---

## Intended Directory Structure

```
src/
├── app/
│   └── router.tsx               # Route definitions (react-router-dom)
│
├── pages/
│   ├── LandingPage.tsx          # Wraps existing sections (protected)
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx
│   ├── onboarding/
│   │   └── OnboardingPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── coach/
│   │   └── CoachPage.tsx
│   ├── workout/
│   │   ├── WorkoutPage.tsx
│   │   └── WorkoutSessionPage.tsx
│   ├── nutrition/
│   │   └── NutritionPage.tsx
│   ├── progress/
│   │   └── ProgressPage.tsx
│   └── profile/
│       └── ProfilePage.tsx
│
├── components/
│   ├── ui/                      # Reusable primitives (Button, Input, Card, etc.)
│   ├── layout/                  # AppShell, Sidebar, TopNav, BottomNav
│   ├── charts/                  # FitMind-styled chart wrappers
│   └── ai/                      # AI message bubbles, memory display, etc.
│
├── features/                    # Feature-scoped logic
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── onboarding/
│   ├── dashboard/
│   ├── workout/
│   ├── nutrition/
│   ├── progress/
│   └── profile/
│
├── hooks/                       # Shared custom React hooks
├── services/                    # HTTP service layer (Axios or Fetch wrappers)
├── lib/                         # Third-party integrations and configuration
├── types/                       # Shared TypeScript types and interfaces
├── utils/                       # Pure utility functions (date formatting, etc.)
├── constants/                   # Application-wide constants
├── styles/
│   └── design-tokens.css        # Already exists — source of truth
└── assets/
```

---

## Routing Plan

| Route | Component | Auth Required | Status |
|---|---|---|---|
| `/` | LandingPage | No | EXISTS (landing) |
| `/login` | LoginPage | No | NOT BUILT |
| `/signup` | SignupPage | No | NOT BUILT |
| `/onboarding` | OnboardingPage | Yes | NOT BUILT |
| `/dashboard` | DashboardPage | Yes | NOT BUILT |
| `/coach` | CoachPage | Yes | NOT BUILT |
| `/workout` | WorkoutPage | Yes | NOT BUILT |
| `/workout/session/:id` | WorkoutSessionPage | Yes | NOT BUILT |
| `/nutrition` | NutritionPage | Yes | NOT BUILT |
| `/progress` | ProgressPage | Yes | NOT BUILT |
| `/profile` | ProfilePage | Yes | NOT BUILT |

---

## State Management

**STATUS: UNDECIDED**

Options under consideration:
- **Zustand** — lightweight, minimal boilerplate
- **TanStack Query** — server state management, caching
- **Redux Toolkit** — more structured, heavier
- **React Context** — only for narrow cases (auth, theme)

Recommendation: **Zustand (client state) + TanStack Query (server state)**

---

## API Communication

**STATUS: UNDECIDED**

Recommended pattern:
```
src/services/
├── api.ts          # Axios instance with base URL + interceptors
├── auth.service.ts
├── workout.service.ts
├── nutrition.service.ts
├── progress.service.ts
└── ai.service.ts
```

---

## Protected Routes

All application routes require authentication.  
A `<ProtectedRoute>` wrapper component will redirect unauthenticated users to `/login`.

---

## Responsive Layout Strategy

| Breakpoint | Layout |
|---|---|
| Mobile (<768px) | Single column + bottom tab navigation |
| Tablet (768–1024px) | Compact sidebar or top navigation |
| Desktop (>1024px) | Fixed sidebar + main content area |

The landing page already handles its own responsive layout independently.

---

## Component Design Rules

1. Every component must use design tokens from `styles/design-tokens.css`
2. No hardcoded color hex values in component files
3. No glassmorphism, gradients, or neon — use the editorial aesthetic
4. New components must be added to `COMPONENT_INVENTORY.md`
5. Components under `ui/` are primitives — they accept props, render nothing application-specific

---

## Missing Dependencies (To Be Added in Phase 1)

```bash
npm install react-router-dom
npm install axios
npm install @tanstack/react-query
npm install zustand
npm install react-hook-form zod @hookform/resolvers
npm install recharts
```

> **Important:** Only add dependencies when the phase that needs them begins.
