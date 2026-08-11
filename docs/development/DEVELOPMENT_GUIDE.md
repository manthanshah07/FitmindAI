# FitMind AI — Development Guide

> **Status:** ACTIVE  
> **Last Updated:** 2026-08-11

---

## Prerequisites

- Node.js 20+ (for frontend)
- Python 3.11+ (for backend — when backend development begins)
- Git
- A code editor (VS Code recommended)

---

## Repository Structure

```
FitmindAI/              ← Frontend (current repo)
├── src/
│   ├── sections/       ← Landing page sections (DO NOT MODIFY)
│   ├── components/     ← Reusable UI components
│   ├── pages/          ← Application pages (TO BE CREATED)
│   ├── styles/         ← Design tokens (DO NOT MODIFY VALUES)
│   └── App.tsx         ← Root component
├── docs/               ← All project documentation
└── tailwind.config.js  ← Visual configuration (DO NOT MODIFY VALUES)
```

---

## Running the Frontend (Development)

```bash
# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

The dev server runs at `http://localhost:5173` by default.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

See `docs/development/ENVIRONMENT_SETUP.md` for variable descriptions.

**NEVER commit `.env` to version control.**

---

## Branch Strategy

```
main          ← Production-ready code only
develop       ← Integration branch for features
feature/*     ← Feature branches (e.g., feature/auth-login)
fix/*         ← Bug fixes (e.g., fix/navbar-mobile-overflow)
docs/*        ← Documentation-only changes
```

### Branch Naming

```
feature/phase-1-auth-login
feature/phase-3-workout-log
fix/nutrition-total-calculation
docs/update-api-endpoints
```

---

## Commit Conventions

Use the following format:

```
type(scope): short description

Types:
  feat     — New feature
  fix      — Bug fix
  docs     — Documentation only
  style    — Formatting, no logic change
  refactor — Code change that neither fixes a bug nor adds a feature
  test     — Adding or updating tests
  chore    — Dependency updates, config changes

Examples:
  feat(auth): implement JWT login endpoint
  fix(nutrition): correct protein calculation for multi-item meals
  docs(api): add workout log endpoint documentation
  test(score): add unit tests for fitness score calculation
```

---

## Code Quality Rules

1. No hardcoded color hex values in component files — use Tailwind tokens
2. No inline styles unless absolutely necessary
3. TypeScript strict mode — no `any` unless justified
4. Components should be <150 lines — split if larger
5. Fetch/mutation logic belongs in service files, not components
6. All new UI components must follow `docs/ui/DESIGN_SYSTEM.md`
7. Update `docs/ui/COMPONENT_INVENTORY.md` when adding new components

---

## Adding a New Feature

1. Read the relevant documentation in `docs/`
2. Check `docs/00_PROJECT_DECISIONS.md` for existing decisions
3. Create a feature branch from `develop`
4. Build the feature following coding standards
5. Test (unit + integration + UI)
6. Update any affected documentation
7. Create a pull request to `develop`
8. Merge only after review

---

## The Landing Page Protection Rule

The following files must NOT be modified during feature development:

```
src/sections/Hero.tsx
src/sections/Problem.tsx
src/sections/MeetFitMind.tsx
src/sections/Memory.tsx
src/sections/Timeline.tsx
src/sections/Features.tsx
src/sections/Architecture.tsx
src/sections/AdaptiveCoaching.tsx
src/sections/Scope.tsx
src/sections/Footer.tsx
src/components/Navbar.tsx
src/styles/design-tokens.css (values only — structure OK to extend)
tailwind.config.js (values only — structure OK to extend)
```

Any change to these files requires explicit justification in `00_PROJECT_DECISIONS.md`.

---

## Phase Implementation Order

See `docs/project-management/ROADMAP.md` for the complete phase plan.

Current phase: **PHASE 0 — PRE-DEVELOPMENT SETUP (COMPLETE)**  
Next phase: **PHASE 1 — Authentication + Onboarding**
