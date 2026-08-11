# FitMind AI

**Personalized AI Fitness Coach with Persistent Memory**  
*Final Year Software Engineering Project*

---

## What Is FitMind AI?

FitMind AI combines structured fitness tracking with an AI coach that builds a **persistent memory** of each user's goals, habits, workouts, nutrition, and progress — then continuously adapts its guidance as the user evolves.

The core differentiator is not tracking — it is **memory and adaptation**.

> The AI is the coach. Not the calculator.

---

## Current Project Status

| Item | Status |
|---|---|
| Landing page | ✅ Complete |
| Design system | ✅ Locked |
| Architecture documentation | ✅ Complete |
| Database design | ✅ Documented |
| API contracts | ✅ Documented |
| AI architecture | ✅ Documented |
| Backend (FastAPI) | ⏳ Not started |
| Authentication | ⏳ Not started |
| Dashboard | ⏳ Not started |
| AI Coach | ⏳ Not started |
| Workout module | ⏳ Not started |
| Nutrition module | ⏳ Not started |
| Progress tracking | ⏳ Not started |

See `PROJECT_STATUS.md` for a complete breakdown.

---

## Repository Structure

```
FitmindAI/
├── src/                    ← React + TypeScript frontend
│   ├── sections/           ← Landing page sections (protected)
│   ├── components/         ← Reusable components
│   ├── styles/             ← Design tokens (locked)
│   └── App.tsx
├── docs/                   ← Full project documentation
│   ├── architecture/       ← System, frontend, AI, memory architecture
│   ├── database/           ← Database design + schema
│   ├── api/                ← API contracts
│   ├── ai/                 ← AI system, guardrails, evaluation
│   ├── product/            ← User flows, screen inventory, edge cases
│   ├── ui/                 ← Design system, component inventory
│   ├── development/        ← Dev guide, testing, environment setup
│   └── project-management/ ← Roadmap, milestones, definition of done
├── AGENTS.md               ← AI coding agent instructions
├── PROJECT_STATUS.md       ← Current implementation status
└── .env.example            ← Environment variable template
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| AI | OpenAI API |
| Memory | RAG-based retrieval |
| Storage | Supabase Storage |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway / Render |

---

## Running the Project

### Prerequisites
- Node.js 20+
- npm

### Install & Run

```bash
npm install
npm run dev
```

The landing page will be available at `http://localhost:5173`

---

## Documentation

All project documentation is in `docs/`. Start with:

- `docs/01_PROJECT_CONTEXT.md` — What the project is
- `docs/architecture/SYSTEM_ARCHITECTURE.md` — How the system works
- `docs/project-management/ROADMAP.md` — Implementation phases
- `AGENTS.md` — AI coding agent instructions

---

## Important Notes

- The landing page (`src/sections/`) is complete and must not be modified
- The design system (`src/styles/design-tokens.css`) is the visual source of truth
- `FitMind_PRD.md` and `FitMind_TECH_SPEC.md` are referenced but not yet provided — see `docs/00_PROJECT_DECISIONS.md`
