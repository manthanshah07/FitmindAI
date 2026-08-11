# FitMind AI — AI Coding Agent Instructions

> **IMPORTANT:** This file must be read completely before making any code changes to this repository.

---

## What This Project Is

FitMind AI is a final-year engineering project building an AI-powered personalized fitness coach with persistent user memory.

**The repository currently contains:**
1. A complete, locked landing page (`src/sections/`)
2. A centralized design system (`src/styles/design-tokens.css`)
3. Full pre-development documentation (`docs/`)

**The application (dashboard, AI coach, workout, nutrition, etc.) has NOT been built yet.**

---

## MANDATORY: Read Before Coding

Before making any change, read these documents:

1. `FitMind_AI_Project_Context.md` — Primary source of truth
2. `docs/00_PROJECT_DECISIONS.md` — All confirmed decisions
3. `docs/ui/DESIGN_SYSTEM.md` — Visual identity rules
4. The relevant section of `docs/` for the feature you're implementing

---

## ABSOLUTE RULES

### 1. The Landing Page Is Protected

Do NOT modify:
- Any file in `src/sections/`
- `src/components/Navbar.tsx`

If a change is genuinely required for infrastructure reasons, document it in `docs/00_PROJECT_DECISIONS.md` first.

### 2. The Design System Is Locked

Do NOT:
- Change color values in `src/styles/design-tokens.css`
- Change color values in `tailwind.config.js`
- Introduce new colors not in the palette
- Use glassmorphism, gradients, neon, rounded cards, glowing borders
- Hardcode hex values in component files

DO:
- Use Tailwind classes from the existing token set (`bg-bone`, `text-graphite`, `text-olive`, etc.)
- Follow the button, card, and typography conventions in `docs/ui/DESIGN_SYSTEM.md`

### 3. Backend Owns Calculations. AI Owns Reasoning.

Do NOT let the LLM:
- Calculate calories or macros
- Compute the fitness score
- Invent exercises
- Invent nutritional values

Backend must calculate all deterministic values. AI receives structured data and produces natural language interpretation.

### 4. Never Invent Features

Do not add features not described in `FitMind_AI_Project_Context.md` or the PRD.

Do not mark future scope features as implemented.

### 5. Never Invent Architectural Decisions

If a decision is marked UNDECIDED in `docs/00_PROJECT_DECISIONS.md`, do not resolve it arbitrarily. Raise it to the developer.

---

## Before Creating a Component

1. Check `docs/ui/COMPONENT_INVENTORY.md` — does it already exist?
2. If not, derive it from the existing design system
3. Follow the component conventions in `docs/ui/DESIGN_SYSTEM.md`
4. Add the new component to `COMPONENT_INVENTORY.md`

---

## Before Creating an API Endpoint

1. Check `docs/api/API_OVERVIEW.md` — is it already documented?
2. Follow the API conventions (FastAPI, Pydantic validation, JWT auth)
3. All inputs must be validated server-side
4. All protected routes require JWT authentication

---

## Before Implementing AI Features

1. Read `docs/ai/AI_ARCHITECTURE.md`
2. Read `docs/ai/AI_GUARDRAILS.md`
3. Read `docs/architecture/MEMORY_ARCHITECTURE.md`
4. Ensure AI receives structured data, not raw user queries
5. Ensure response validation is in place

---

## Code Quality Expectations

- TypeScript strict mode — no untyped `any`
- Components under 150 lines — split if larger
- Service layer for all HTTP calls
- No business logic in React components
- No console.log in production code
- Test-accompanying implementation

---

## Documentation Expectations

When you:
- Create a new architectural pattern → update the relevant `docs/architecture/` file
- Make a decision → record it in `docs/00_PROJECT_DECISIONS.md`
- Add a new component → add it to `docs/ui/COMPONENT_INVENTORY.md`
- Add a new API endpoint → update `docs/api/API_OVERVIEW.md`
- Add an environment variable → update `.env.example` and `docs/development/ENVIRONMENT_SETUP.md`

---

## Implementation Phase Order

Do not skip phases. Follow the roadmap in `docs/project-management/ROADMAP.md`:

```
PHASE 0 (Complete) → PHASE 1 (Auth) → PHASE 2 (Dashboard) → ...
```

---

## The Final Design Test (Apply to Every Screen)

Before finishing any UI:

1. "Does this look like it belongs to FitMind AI?" — It must.
2. "Did I introduce a new visual style?" — If yes, remove it.
3. "Could this component appear on any generic AI SaaS site?" — If yes, redesign it.
4. "Is the landing page still unmodified?" — Verify this.
