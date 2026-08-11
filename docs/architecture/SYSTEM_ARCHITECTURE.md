# FitMind AI — System Architecture

> **Status:** PROPOSED — awaiting PRD and Tech Spec confirmation  
> **Last Updated:** 2026-08-11

---

## High-Level Architecture

```
USER (Browser)
     │
     ▼
REACT FRONTEND (Vite + TypeScript)
     │  REST API calls
     ▼
FASTAPI BACKEND (Python)
     │
     ├── Authentication Layer (JWT)
     │
     ├── Business Logic Layer
     │       ├── Fitness Score Calculation
     │       ├── Macro Calculations
     │       ├── Workout Volume Calculations
     │       └── Progress Aggregations
     │
     ├── Database Access Layer (ORM)
     │
     └── AI Orchestration Layer
           │
           ├── POSTGRESQL (Structured Data)
           │       ├── User / Profile / Goals
           │       ├── WorkoutPlans / Logs
           │       ├── Foods / MealLogs
           │       ├── Measurements / Photos
           │       ├── FitnessScores
           │       └── AIMemory (structured)
           │
           └── MEMORY RETRIEVAL LAYER
                   │ Context building
                   ▼
               OpenAI LLM (GPT-4 family)
                   │
                   ▼
           PERSONALIZED RESPONSE
```

---

## Layer Responsibilities

### Frontend (React + TypeScript + Vite)
- Render the user interface
- Handle user interactions and form input
- Manage client-side state
- Communicate with backend via REST API
- Display AI responses and fitness data
- Implement animations and transitions (Framer Motion)

**Does NOT:**
- Perform fitness calculations
- Access the database directly
- Call the OpenAI API directly
- Manage user authentication state beyond token storage

---

### Backend (FastAPI — Python)
- Handle all incoming HTTP requests
- Authenticate users (JWT validation)
- Validate all incoming data
- Execute all deterministic business logic:
  - Calorie and macro calculations
  - Fitness score computation
  - Workout volume aggregation
  - Progress trend analysis
- Access and write to PostgreSQL
- Orchestrate AI requests (build context, call LLM, validate response)
- Return structured responses to frontend

**Does NOT:**
- Let the LLM calculate calories or nutrition
- Let the LLM compute the fitness score
- Let the LLM determine if an exercise is appropriate without structured data

---

### Database (PostgreSQL)
- Persist all structured user data
- Store workout plans, logs, meal logs, measurements
- Store fitness scores and progress data
- Store structured AI memory records (Static + Dynamic layers)
- Support relational queries for aggregations and trend analysis

---

### Memory Retrieval Layer
- Retrieve relevant long-term context before each LLM call
- Filter memory to prevent irrelevant context entering the context window
- Combine structured data (from PostgreSQL) with memory context
- Build a structured context payload for the LLM

**Technology for conversational memory:** STATUS: UNDECIDED  
Options: PostgreSQL JSON columns / Pinecone / Chroma / Weaviate / hybrid

---

### AI / LLM (OpenAI API)
- Receive pre-constructed context (not raw user queries)
- Reason over the provided structured data
- Generate personalized natural-language explanations
- Provide workout and nutrition recommendations
- Interpret the fitness score
- Detect trends and propose adaptations

**Does NOT:**
- Invent nutritional values
- Invent exercises
- Calculate scores
- Access the database directly
- Operate without structured context

---

## Core Architectural Principle

> **Deterministic calculations stay in the backend. AI is used strictly for reasoning, contextualization, explanation, and personalization.**

This is not merely a preference — it is a hard constraint.  
The LLM is a reasoning engine applied over verified structured data, not a source of fitness facts.

---

## Deployment Architecture

```
Vercel (Frontend)
     │ HTTPS
Railway / Render (FastAPI Backend)
     │
Supabase / Railway PostgreSQL
     │
Supabase Storage (Progress Photos)
     │
OpenAI API
```

**Final deployment platform for backend:** STATUS: UNDECIDED (Railway vs Render)

---

## Security Architecture Overview

- All API routes (except auth) require valid JWT in Authorization header
- Passwords hashed with bcrypt (never stored in plain text)
- Environment secrets never committed to version control
- Input validation on all endpoints (Pydantic models)
- Rate limiting on auth and AI endpoints
- CORS configured to allow only known frontend origins
- Progress photo uploads validated for type and size

---

*See also: `FRONTEND_ARCHITECTURE.md`, `BACKEND_ARCHITECTURE.md`, `AI_ARCHITECTURE.md`*
