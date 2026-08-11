# FitMind AI — AI Memory Architecture

> **Status:** PROPOSED  
> **Last Updated:** 2026-08-11

---

## Overview

The memory system is what separates FitMind AI from a generic fitness tracker or chatbot. Every user's AI coach maintains a persistent, evolving record of their fitness journey, which is used to generate contextually aware, personalized responses.

---

## Three Memory Layers

### Layer 1: Static Memory

**What it contains:** Fundamental user attributes that rarely change.

| Field | Example | Source |
|---|---|---|
| Height | 182 cm | Onboarding |
| Fitness goal | Muscle Gain | Onboarding / Goal update |
| Equipment | Dumbbells + Full Gym | Onboarding |
| Dietary preference | High protein, no dairy | Onboarding |
| Medical notes | Mild shoulder pain | Onboarding / Conversation |
| Injuries | Left knee sensitivity | Onboarding / Conversation |

**Where stored:** PostgreSQL — `profiles` and `goals` tables  
**When updated:** On explicit user action (profile edit, goal change)  
**Always included in AI context:** Yes — static memory is included in every AI request

---

### Layer 2: Dynamic Memory

**What it contains:** Ongoing physiological and performance data.

| Field | Example | Source |
|---|---|---|
| Weight history | 72.0 → 72.4 kg | Measurement logs |
| Workout logs | Last 5 sessions, volume, exercises | Workout logging |
| Meal logs | Last 7 days nutrition averages | Meal logging |
| Measurements | Chest, waist, hips trends | Measurement logs |
| Fitness score | 84/100 this week | Auto-calculated |
| Progress summaries | Weekly AI-generated summaries | Report generation |

**Where stored:** PostgreSQL — `workout_logs`, `meal_logs`, `measurements`, `fitness_scores`  
**When updated:** After each logged activity  
**Included in AI context:** Recent subset only — last N sessions / last N days (to manage token budget)

---

### Layer 3: Conversational Memory

**What it contains:** Nuances discovered through natural conversation.

| Field | Example | Source |
|---|---|---|
| Food dislikes | "doesn't like broccoli" | Conversation |
| Preferred workout time | "mornings before work" | Conversation |
| Personal constraints | "only 30 mins Tue/Thu" | Conversation |
| Discovered habits | "skips breakfast frequently" | Conversation + log analysis |
| Emotional context | "motivated after weigh-ins" | Conversation |

**Where stored:** STATUS: UNDECIDED  
Options:
- **Option A:** PostgreSQL `ai_memory` table with key-value JSON (simpler, relational)
- **Option B:** Vector database (Pinecone / Chroma) for semantic retrieval (more powerful but added complexity)
- **Option C:** Hybrid — structured facts in PostgreSQL, free-form conversational context in vector DB

**Recommendation:** Start with Option A (PostgreSQL) for simplicity; migrate to hybrid if semantic retrieval proves necessary.

**When updated:** After each conversation where new information is revealed  
**Included in AI context:** Selectively — only relevant memory items based on current query

---

## What Gets Stored

| Category | Stored | Not Stored |
|---|---|---|
| Explicit user statements | Yes | |
| System-detected trends | Yes | |
| Raw LLM responses | No | Responses are generated, not archived |
| Full conversation history | No | Only extracted memory facts |
| User's personal identifiers | No | Memory is about fitness, not PII |

---

## When Memory Is Updated

| Trigger | Memory Updated |
|---|---|
| User completes onboarding | Static memory initialized |
| User logs a workout | Dynamic memory updated |
| User logs a meal | Dynamic memory updated |
| User enters measurement | Dynamic memory updated |
| User sends a message to AI | Conversational memory may be updated |
| AI detects a trend | Dynamic memory summary updated |
| Weekly report generated | Progress summary added to dynamic memory |

---

## How Memory Is Retrieved

Before each AI call, the Memory Retrieval Layer:

1. **Always fetches** static memory (goal, equipment, constraints)
2. **Fetches recent** dynamic memory (configurable window, e.g. last 14 days)
3. **Selectively fetches** conversational memory based on query relevance
4. **Applies token budget** — removes oldest/least relevant items if context is too long

---

## How Irrelevant Context Is Prevented

| Risk | Prevention |
|---|---|
| Old, outdated goals | `is_active` flag ensures only current goal is fetched |
| Irrelevant workout data | Date window limits retrieval (e.g. last 2 weeks only) |
| Stale conversational facts | `is_active` soft-delete allows memory to be marked outdated |
| Context overload | Token budget enforced — AI receives a structured summary, not raw logs |

---

## Memory Update Rules

1. Memory is **never deleted** — it is soft-deleted (`is_active = false`) or superseded
2. When a user changes a goal, old goal is deactivated, not removed (preserves history for AI context)
3. Memory facts extracted from conversation are stored with `source = 'conversation'`
4. Memory facts calculated by the system are stored with `source = 'system'`

---

## What Memory Enables

- "You mentioned you prefer morning workouts — I've scheduled today's session for 7am."
- "Based on your last 3 weeks, your protein intake drops on weekends. Here's why that matters."
- "You told me you have 30 minutes on Tuesdays — here's a condensed upper body workout."
- "Your bench press has gone from 40kg to 47.5kg over 6 weeks — that's strong progress."

---

*See also: `AI_ARCHITECTURE.md`, `RAG_DESIGN.md`*
