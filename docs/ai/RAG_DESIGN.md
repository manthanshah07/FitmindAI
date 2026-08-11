# FitMind AI — RAG Design

> **Status:** PROPOSED  
> **Last Updated:** 2026-08-11

---

## What Is RAG in This Context?

Retrieval-Augmented Generation (RAG) is the process of fetching relevant information before calling the LLM, so that the model can reason over accurate, user-specific data rather than relying on its training knowledge.

In FitMind AI, RAG means:

> Before answering the user, retrieve the relevant pieces of their fitness history, goals, and preferences — then give all of that to the LLM as context.

---

## What Is NOT Vector-Searched

Not every piece of user data belongs in a vector database.

Structured data that is better retrieved via SQL:

| Data | Retrieval Method |
|---|---|
| Current goal | `SELECT * FROM goals WHERE user_id = ? AND is_active = true` |
| Recent workout logs | `SELECT * FROM workout_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 5` |
| Today's nutrition | `SELECT SUM(calories) FROM meal_log_items WHERE meal_log_id IN (...)` |
| Current fitness score | `SELECT * FROM fitness_scores WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1` |
| Measurements | `SELECT * FROM measurements WHERE user_id = ? ORDER BY measured_at DESC LIMIT 3` |

These are always retrieved via structured PostgreSQL queries.

---

## What May Use Semantic Retrieval

Conversational memory may benefit from semantic search:

- "User mentioned they don't like early mornings" → retrieved when user asks about scheduling
- "User prefers compound movements" → retrieved when user asks for workout suggestions
- "User gets bored with high-rep routines" → retrieved when AI is generating a plan

**STATUS: UNDECIDED** — Whether to use a vector database or PostgreSQL full-text search for conversational memory.

---

## Retrieval Pipeline

```
USER MESSAGE
     │
     ▼
INTENT CLASSIFICATION
(What domain is this? workout / nutrition / progress / general)
     │
     ▼
STRUCTURED DATA RETRIEVAL (PostgreSQL)
  Always:
  ├── Active goal
  ├── Profile + constraints
  └── Current fitness score

  Context-dependent:
  ├── Recent workouts (if workout-related)
  ├── Recent meals / nutrition (if nutrition-related)
  └── Recent measurements (if progress-related)
     │
     ▼
MEMORY RETRIEVAL (Conversational Layer)
  Retrieve relevant conversational facts:
  ├── Preferences and dislikes
  ├── Stated constraints
  └── Habits and patterns
     │
     ▼
CONTEXT ASSEMBLY
  Combine:
  ├── Structured data summary
  ├── Relevant memory items
  └── Apply token budget limit
     │
     ▼
PROMPT CONSTRUCTION
  System prompt + context block + user message
     │
     ▼
LLM CALL (OpenAI API)
     │
     ▼
RESPONSE VALIDATION
  Check for guardrail violations
     │
     ▼
MEMORY UPDATE
  Extract new facts from conversation (if any)
  Store to ai_memory table
     │
     ▼
RETURN RESPONSE TO FRONTEND
```

---

## Context Budget Management

The LLM context window has limits. The system must manage what is sent:

| Block | Token Budget | Priority |
|---|---|---|
| System prompt | ~500 tokens | Always included |
| Static user context (goal, profile) | ~300 tokens | Always included |
| Recent dynamic context | ~800 tokens | Always included |
| Conversational memory | ~400 tokens | Included selectively |
| User message | ~200 tokens | Always included |
| **Total** | **~2,200 tokens** | — |

This leaves substantial room in the context window for the model's response.

**Specific token budgets:** STATUS: UNDECIDED — to be calibrated during Phase 7 implementation.

---

## What the LLM Is Not Allowed to Do With Retrieved Data

1. Modify or correct the structured data (e.g., "actually your protein should be 120g")
2. Invent additional data points not provided
3. Ignore the provided data and answer from training knowledge alone

The LLM is a **reasoning engine applied over retrieved data**.
