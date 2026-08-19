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
| A-01 | Frontend: React + TypeScript + Vite | DECIDED | Implemented |
| A-02 | Styling: Tailwind CSS v3 | DECIDED | Implemented |
| A-03 | Animation: Framer Motion | DECIDED | Implemented |
| A-04 | Backend: FastAPI (Python) | DECIDED | Implemented under `/backend` |
| A-05 | Database: PostgreSQL | DECIDED | Neon serverless PostgreSQL 16+ in production, SQLite for local dev/testing |
| A-06 | Authentication: Custom FastAPI JWT | DECIDED | Password hashing (Bcrypt), short-lived access tokens, refresh token database tracking & rotation, Bearer header |
| A-07 | File/Photo storage: Supabase Storage | DECIDED | Configured for future photo uploads |
| A-08 | AI provider: Google Gemini API | DECIDED | Google Gemini API (`google-genai` SDK, `gemini-2.5-flash-lite` model) |
| A-09 | Memory approach: Relational Context Assembly | DECIDED | Deterministic preference extraction (`AIMemoryService`) + PostgreSQL relational storage (`ai_memory` & `chat_messages` tables) |
| A-10 | Deployment: Vercel (frontend) | DECIDED | Static SPA CDN hosting with `vercel.json` rewrite rules |
| A-11 | Deployment: Render (backend) | DECIDED | FastAPI ASGI web service configured via `backend/render.yaml` |
| A-12 | Backend handles all deterministic calculations | DECIDED | Core architectural principle (BMR, TDEE, macros, fitness score) |
| A-13 | AI handles only reasoning, explanation, personalization | DECIDED | Core architectural principle |
| A-14 | Monorepo structure | DECIDED | Frontend at root (`src/`), backend in `/backend` |
| A-15 | State management | DECIDED | Zustand for client/app/UI state & auth session; TanStack Query for server state |
| A-16 | HTTP client | DECIDED | Centralized Axios instance with Bearer injection & 401 refresh interceptor |
| A-17 | Vector database for semantic memory | DEFERRED | Post-v1.0 scope; PostgreSQL relational memory is primary for current phase |
| A-18 | Relational memory architecture | DECIDED | Static, Dynamic, and Conversational memory stored in PostgreSQL (`profiles`, `goals`, `ai_memory`, `chat_messages`) |

---

## AI DECISIONS

| # | Decision | Status | Notes |
|---|---|---|---|
| AI-01 | Memory system has three layers: Static, Dynamic, Conversational | DECIDED | Implemented in `ContextBuilder` |
| AI-02 | Static memory stored in PostgreSQL | DECIDED | `profiles` & `goals` tables |
| AI-03 | Dynamic memory stored in PostgreSQL | DECIDED | `workout_logs`, `meal_logs`, `measurements`, `fitness_scores` tables |
| AI-04 | Conversational memory storage | DECIDED | `ai_memory` (preference keys) and `chat_messages` (chat history) tables |
| AI-05 | Context window management strategy | DECIDED | Rolling 10-message chat history + 30d/7d aggregated analytics summaries in `ContextBuilder` |
| AI-06 | System prompt architecture | DECIDED | `COACH_SYSTEM_PROMPT` in `coach_service.py` with strict schema validation guardrails |
| AI-07 | AI model selection | DECIDED | Configured via `GEMINI_MODEL` (`gemini-2.5-flash-lite`) |
| AI-08 | Token usage optimization | DECIDED | Bounded context assembly limits context window size |
| AI-09 | AI response validation strategy | DECIDED | Pydantic schema structured JSON output parsing (`CoachChatResponse`) |
| AI-10 | Escalation behavior for medical questions | DECIDED | System prompt instructs AI to decline medical diagnosis and advise consulting a physician |

---

## DESIGN DECISIONS

| # | Decision | Status | Notes |
|---|---|---|---|
| D-01 | Existing landing page is protected | DECIDED | No modifications allowed (`src/sections/`) |
| D-02 | Color palette is locked | DECIDED | Defined in `design-tokens.css` |
| D-03 | Typography: JetBrains Mono + Inter/Sans | DECIDED | Defined in `design-tokens.css` |
| D-04 | Border radius: 0px (editorial/brutalist) | DECIDED | Sharp edges on all UI components |
| D-05 | Light mode | DEFERRED | Not to be implemented unless requested |
| D-06 | No glassmorphism, neon, gradients | DECIDED | Explicit design system rule |
| D-07 | Application UI extends landing page identity | DECIDED | Same palette, typography, design primitives |

---

## KNOWN CONFLICTS (RESOLVED)

| # | Conflict | Documents Involved | Resolution |
|---|---|---|---|
| C-01 | Authentication: JWT vs Firebase Auth | Project Context / Status | RESOLVED — Custom FastAPI JWT confirmed (Decision A-06). |
| C-02 | PRD and Tech Spec missing claim | Audit / Status | RESOLVED — `docs/FitMind_PRD.md` and `docs/FitMind_TECH_SPEC.md` exist. |
| C-03 | Hydration / Water Intake scope | PRD vs Tech Spec | RESOLVED — Hydration score component computed deterministically; dedicated logger deferred. |
| C-04 | AI Provider: OpenAI vs Gemini | Decisions / Code | RESOLVED — Google Gemini API (`gemini-2.5-flash-lite`) confirmed in code. |

---

## OPEN DECISIONS (REMAINING FOR FUTURE PHASES)

1. **A-17**: Vector database integration (Deferred post-v1.0)
2. **P-04 to P-09**: Advanced features (Camera food recognition, barcode scanning, wearable sync, form analysis — Deferred post-v1.0)

---

*Last updated: 2026-08-19*


