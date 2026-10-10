# FitMind AI — Unified Fitness Score Formula (V2)

## Overview
This document specifies the definitive, deterministic calculation engine for the FitMind AI **Fitness Score** (Formula Version 2), resolving logic problems identified in Section 3.2 (findings D3, D4, D5) of the FitMind Master Plan.

The Fitness Score is a 0–100 integer score evaluating a rolling 7-day window ending on the target date.

---

## 1. Core Principles

1. **Zero Invented Data (Fixes D3):**
   - The legacy 10% "recovery/sleep baseline" fixed constant (`75.0%`) has been removed.
   - The Fitness Score only evaluates data the user explicitly logged.
2. **Work-Done Adherence (Fixes D4):**
   - Logging a session with only 1 or 2 sets earns **0 credit**.
   - Adherence evaluates actual work completed relative to prescribed volume: `min(1.0, sets_completed / sets_planned_for_day)`.
3. **Single Source of Truth (Fixes D5):**
   - All metrics are calculated by `backend/app/services/metrics_service.py`.
   - The Today, Progress, and Reports surfaces read server-calculated values and never perform local arithmetic.

---

## 2. Component Weights (Sum = 100%)

| Component | Weight | Underlying Metric | Formula |
|---|---|---|---|
| **Workouts** | **35%** | Workout Adherence | `min(100.0, (sum(session_credits) / target_days_per_week) * 100.0)` |
| **Calories** | **25%** | Caloric Adherence | Average daily score: `max(0.0, 1.0 - (|actual - target| / target)) * 100%` across logged days (fallback 50% if 0 days) |
| **Protein** | **20%** | Protein Adherence | Average daily intake relative to target: `min(100.0, (avg_intake / target) * 100%)` (fallback 50% if 0 days) |
| **Logging Consistency** | **20%** | Active Tracking Days | `(active_logging_days / 7) * 100%` across workouts, meals, and measurements |

$$\text{Fitness Score} = \text{round}(0.35 \times \text{Workouts} + 0.25 \times \text{Calories} + 0.20 \times \text{Protein} + 0.20 \times \text{Consistency})$$
Clamped strictly between 0 and 100.

---

## 3. Session Credit & Volume Mechanics

For each workout session within the 7-day period:
- If `sets_completed < 3`, `session_credit = 0.0`.
- Else, `session_credit = min(1.0, sets_completed / sets_planned_for_day)`.
- If the session matches a plan day, `sets_planned_for_day` is the sum of target sets for that specific day.
- If unlinked or ad-hoc, the plan's average sets per day is used (fallback: 12 sets).

---

## 4. Snapshot Persistence & Storage

- Table: `fitness_scores`
- Schema columns:
  - `id`: UUID (PK)
  - `user_id`: UUID (FK)
  - `score`: INT (0–100)
  - `workout_adherence_pct`: NUMERIC(5, 2)
  - `nutrition_score`: NUMERIC(5, 2)
  - `protein_score`: NUMERIC(5, 2)
  - `consistency_score`: NUMERIC(5, 2)
  - `sleep_score`: NUMERIC(5, 2) (deprecated, retained for backwards compatibility)
  - `recovery_score`: NUMERIC(5, 2) (deprecated, retained for backwards compatibility)
  - `formula_version`: INT (`2` for all M6+ calculations)
  - `period_start`: DATE
  - `period_end`: DATE
  - `calculated_at`: DATETIME UTC
- **Snapshot Rule:** At most one record is persisted per user per calendar day upon read. Manual recalculate buttons are removed from client workflows.
