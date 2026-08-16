# FitMind AI — Project Decision Log

> **Purpose:** Record every architectural, product, and technical decision.  
> **Rule:** Only decisions with clear rationale should be marked DECIDED. Anything uncertain must be marked UNDECIDED.  
> **Update this file whenever a decision is made or overturned.**

---

## STATUS KEY

| Status | Meaning |
|---|---|
| DECIDED | Confirmed, implemented or formally agreed |
| PROPOSED | Under consideration, not yet confirmed |
| UNDECIDED | Requires explicit decision before implementation |
| FUTURE SCOPE | Not part of current implementation |

---

## PRODUCT DECISIONS

| # | Decision | Status | Notes |
|---|---|---|---|
| P-01 | Core product = personalized AI fitness coach | DECIDED | Confirmed in project context |
| P-02 | Persistent AI memory across sessions | DECIDED | Core differentiator |
| P-03 | Manual / conversational food logging | DECIDED | Camera recognition is Future Scope |
| P-04 | Camera-based food recognition | FUTURE SCOPE | Not in core implementation |
| P-05 | Barcode scanning | FUTURE SCOPE | — |
| P-06 | Wearable integration | FUTURE SCOPE | — |
| P-07 | Exercise form analysis via camera | FUTURE SCOPE | — |
| P-08 | Voice assistant | FUTURE SCOPE | — |
| P-09 | Grocery recommendations | FUTURE SCOPE | — |
| P-10 | Explainable 0–100 fitness score | DECIDED | Backend calculates deterministically |
| P-11 | AI interprets and explains the score | DECIDED | AI does not calculate the score |
| P-12 | Structured exercise database | DECIDED | AI selects from DB, does not invent exercises |
| P-13 | Structured food/nutrition database | DECIDED | AI does not invent nutritional values |
| P-14 | Weekly and monthly reports | DECIDED | Part of core scope |
| P-15 | AI cannot diagnose medical conditions | DECIDED | Hard guardrail |
| P-16 | Progress photos as optional feature | DECIDED | Listed in core scope |

---

## ARCHITECTURAL DECISIONS

| # | Decision | Status | Notes |
|---|---|---|---|
| A-01 | Frontend: React + TypeScript + Vite | DECIDED | Already implemented |
| A-02 | Styling: Tailwind CSS v3 | DECIDED | Already implemented |
| A-03 | Animation: Framer Motion | DECIDED | Already implemented |
| A-04 | Backend: FastAPI (Python) | DECIDED | Confirmed in project context |
| A-05 | Database: PostgreSQL | DECIDED | Confirmed in project context |
| A-06 | Authentication: Custom FastAPI JWT | DECIDED | Password hashing (bcrypt/Argon2), short-lived access tokens + refresh tokens, Bearer header, FastAPI dependency auth. No Firebase Auth. (2026-08-16) |
| A-07 | File/Photo storage: Supabase Storage | DECIDED | Confirmed in project context |
| A-08 | AI provider: OpenAI API | DECIDED | Confirmed in project context |
| A-09 | Memory approach: RAG-based | DECIDED | Confirmed in project context |
| A-10 | Deployment: Vercel (frontend) | DECIDED | Confirmed in project context |
| A-11 | Deployment: Railway or Render (backend) | DECIDED | Either acceptable; final choice UNDECIDED |
| A-12 | Backend handles all deterministic calculations | DECIDED | Core architectural principle |
| A-13 | AI handles only reasoning, explanation, personalization | DECIDED | Core architectural principle |
| A-14 | Monorepo structure | DECIDED | Frontend at root (`src/`), backend in `/backend`. No moving `src/` to `/frontend`. (2026-08-16) |
| A-15 | State management | DECIDED | Zustand for client/app/UI state & auth session; TanStack Query for server state. No React Context for global state. (2026-08-16) |
| A-16 | HTTP client | DECIDED | Axios centralized instance handling Bearer tokens and token refresh. (2026-08-16) |
| A-17 | Vector database for semantic memory | UNDECIDED | Optional for post-Phase 8; architecture remains extensible for future vector store integration. |
| A-18 | Relational memory vs vector memory split | DECIDED | Static, Dynamic, and Conversational memory stored in PostgreSQL for Phases 1–8. (2026-08-16) |

---

## AI DECISIONS

| # | Decision | Status | Notes |
|---|---|---|---|
| AI-01 | Memory system has three layers: Static, Dynamic, Conversational | DECIDED | Defined in project context |
| AI-02 | Static memory stored in PostgreSQL | DECIDED | Fits structured nature (`profiles`, `goals`) |
| AI-03 | Dynamic memory stored in PostgreSQL | DECIDED | Workout/meal logs/scores are structured |
| AI-04 | Conversational memory storage (Phases 1–8) | DECIDED | PostgreSQL `ai_memory` table. Vector DB deferred but architecture remains extensible. (2026-08-16) |
| AI-05 | Context window management strategy | UNDECIDED | How to prevent irrelevant context from reaching LLM |
| AI-06 | Prompt architecture | UNDECIDED | System prompt structure to be designed in Phase 7 |
| AI-07 | OpenAI model selection | DECIDED | Configured via `OPENAI_MODEL` environment variable; finalized in AI Coach phase. (2026-08-16) |
| AI-08 | Token usage optimization | UNDECIDED | Budget not defined |
| AI-09 | AI response validation strategy | UNDECIDED | How to detect and handle hallucinations |
| AI-10 | Escalation behavior for medical questions | PROPOSED | Redirect to professional; decline to diagnose |

---

## DESIGN DECISIONS

| # | Decision | Status | Notes |
|---|---|---|---|
| D-01 | Existing landing page is protected | DECIDED | No modifications allowed |
| D-02 | Color palette is locked | DECIDED | Defined in design-tokens.css |
| D-03 | Typography: Helvetica Neue + JetBrains Mono | DECIDED | Defined in design-tokens.css |
| D-04 | Border radius: 0px (editorial/brutalist) | DECIDED | All components use sharp edges |
| D-05 | Light mode | FUTURE SCOPE | Not to be implemented unless requested |
| D-06 | No glassmorphism, neon, gradients | DECIDED | Explicit design prohibition |
| D-07 | Application UI extends landing page identity | DECIDED | Same palette, type, components |

---

## KNOWN CONFLICTS (RESOLVED)

| # | Conflict | Documents Involved | Resolution |
|---|---|---|---|
| C-01 | Authentication: JWT vs Firebase Auth | Project Context / Status | RESOLVED — Custom FastAPI JWT confirmed (Decision A-06). |
| C-02 | PRD and Tech Spec missing claim | Audit / Status | RESOLVED — `docs/FitMind_PRD.md` and `docs/FitMind_TECH_SPEC.md` exist. |
| C-03 | Hydration / Water Intake scope | PRD vs Tech Spec | RESOLVED — Hydration remains in score calculation spec; dedicated water logger page deferred to nutrition phase. |

---

## OPEN DECISIONS (REMAINING FOR FUTURE PHASES)

1. **A-11**: Backend deployment target (Railway vs Render — Phase 11)
2. **AI-05**: Context window management strategy (Phase 7)
3. **AI-06**: System prompt architecture (Phase 7)
4. **AI-08**: Token usage budget optimization (Phase 7)
5. **AI-09**: Response validation / hallucination detection strategy (Phase 7)

---

*Last updated: 2026-08-16*

