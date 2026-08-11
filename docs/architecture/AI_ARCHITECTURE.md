# FitMind AI — AI Architecture

> **Status:** PROPOSED  
> **Last Updated:** 2026-08-11

---

## AI System Purpose

The AI in FitMind AI is a **reasoning and explanation engine**, not a calculation engine.

It exists to:
- Interpret structured fitness data in natural language
- Provide personalized guidance based on user history and context
- Adapt recommendations when trends are detected
- Maintain a coherent coaching relationship over time

It does NOT:
- Calculate calories, macros, or scores
- Invent exercise information not present in the database
- Invent nutritional values not present in the food database
- Make medical diagnoses
- Operate without structured data context

---

## The Hard Boundary

```
BACKEND OWNS:                    AI OWNS:
─────────────────────────────    ──────────────────────────────
Calorie calculations             Contextual explanation
Macro calculations               Personalized recommendation
Fitness score (0-100)            Trend interpretation
Workout volume                   Motivational guidance
Progress aggregations            Natural language understanding
Validation and constraints       Conversational interaction
Exercise selection logic         Plan adaptation narrative
```

This boundary must be enforced in every implementation decision.

---

## AI Request Pipeline

```
User input (text/question/action trigger)
          │
          ▼
1. INTENT CLASSIFICATION
   Is this a coaching question?
   A workout question?
   A nutrition question?
   A progress question?
          │
          ▼
2. STRUCTURED DATA RETRIEVAL
   Backend fetches relevant data:
   ├── Current goal / profile
   ├── Recent workout logs (last N sessions)
   ├── Recent meal logs (last N days)
   ├── Current fitness score + breakdown
   ├── Progress trends (weight, strength, macros)
   └── Relevant aggregations
          │
          ▼
3. MEMORY RETRIEVAL
   Memory layer fetches relevant context:
   ├── Static memory (goal, equipment, injuries)
   ├── Dynamic memory (recent trends, history)
   └── Conversational memory (preferences, dislikes, constraints)
          │
          ▼
4. CONTEXT CONSTRUCTION
   Combine structured data + memory into
   a structured context payload.
   Filter out irrelevant history.
   Apply token budget constraints.
          │
          ▼
5. PROMPT CONSTRUCTION
   System prompt (FitMind AI persona + guardrails)
   + Structured context payload
   + User message
          │
          ▼
6. LLM CALL (OpenAI API)
          │
          ▼
7. RESPONSE VALIDATION
   Check for:
   ├── Medical claims → intercept
   ├── Invented data → flag
   └── Out-of-scope responses → redirect
          │
          ▼
8. RETURN TO USER
   Store relevant new information in memory
```

---

## Memory Architecture

Three-layer memory system:

### Layer 1: Static Memory
Stored in PostgreSQL `profiles` / `goals` tables.

| Data | Update Frequency |
|---|---|
| Height | Rare |
| Fitness goal | Occasional |
| Equipment availability | Occasional |
| Dietary preference | Occasional |
| Medical notes / injuries | Rare |

### Layer 2: Dynamic Memory
Stored in PostgreSQL across multiple tables.

| Data | Update Frequency |
|---|---|
| Current weight | After each weigh-in |
| Workout logs | After each session |
| Meal logs | After each meal |
| Measurements | Weekly / monthly |
| Fitness score | Calculated weekly |
| Progress summaries | Auto-generated |

### Layer 3: Conversational Memory
**Technology: STATUS UNDECIDED**  
Options: PostgreSQL JSON fields / vector database

| Data | Update Frequency |
|---|---|
| Food preferences and dislikes | As mentioned |
| Preferred workout times | As mentioned |
| Personal constraints | As mentioned |
| Habits detected through conversation | As discovered |

---

## Prompt Architecture

**STATUS: UNDECIDED — to be designed in Phase 7**

Proposed structure:
```
[SYSTEM PROMPT]
You are FitMind AI, a personalized fitness coach.
You remember each user's complete fitness history.
You explain your reasoning clearly.
You NEVER invent nutritional values or exercises.
You NEVER diagnose medical conditions.
If unsure, you say so explicitly.

[USER PROFILE BLOCK]
Goal: {goal}
Height: {height}
Equipment: {equipment}
Dietary preference: {dietary_preference}
Constraints: {injuries_and_constraints}

[RECENT DATA BLOCK]
Current weight: {weight}
Fitness score: {score} / 100
Last 7 days:
- Workouts: {workout_summary}
- Calories avg: {calorie_avg}
- Protein avg: {protein_avg}

[MEMORY BLOCK]
{retrieved_conversational_memory}

[USER MESSAGE]
{user_input}
```

---

## AI Guardrails

1. **No medical diagnosis** — If user mentions symptoms or injuries, redirect to professional help
2. **No invented data** — All nutritional values come from the structured food database
3. **No invented exercises** — All exercises come from the structured exercise database
4. **No guarantees** — AI cannot promise results
5. **Uncertainty acknowledgment** — AI must say "I don't know" when context is insufficient
6. **Scope limiting** — AI should decline to discuss topics unrelated to fitness coaching

---

## Specific OpenAI Model

**STATUS: UNDECIDED**

Candidates:
- `gpt-4o` — highest capability, higher cost
- `gpt-4o-mini` — lower cost, suitable for most coaching tasks

Recommendation: Use `gpt-4o-mini` for standard interactions, `gpt-4o` for weekly report generation.

---

*See also: `MEMORY_ARCHITECTURE.md`, `RAG_DESIGN.md`, `PROMPT_ARCHITECTURE.md`, `AI_GUARDRAILS.md`*
