# FitMind AI — User Flows

> **Status:** PROPOSED — Not implemented  
> **Last Updated:** 2026-08-11

---

## Flow 1: New User Registration & Onboarding

```
[LANDING PAGE]
        │ Click Sign Up
        ▼
[SIGNUP PAGE]
  Enter email + password
        │ Submit
        ▼
[EMAIL VERIFICATION] ← Optional, UNDECIDED
        │ Verified
        ▼
[ONBOARDING — Step 1: Personal Info]
  Full name, DOB, gender, height
        │ Next
        ▼
[ONBOARDING — Step 2: Goals]
  Goal type, target weight, timeline
        │ Next
        ▼
[ONBOARDING — Step 3: Fitness Level]
  Activity level, training frequency, experience
        │ Next
        ▼
[ONBOARDING — Step 4: Preferences]
  Diet preference, dietary restrictions, food dislikes
  Equipment availability
  Medical notes / injuries (optional)
        │ Next
        ▼
[ONBOARDING — Step 5: Initial Assessment]
  System generates baseline:
  - Starting fitness score
  - Initial workout plan suggestion
  - Nutrition targets (TDEE calculation)
        │ View My Plan
        ▼
[DASHBOARD]
```

---

## Flow 2: Logging a Workout Session

```
[DASHBOARD or WORKOUT PAGE]
        │ Start Workout / Log Workout
        ▼
[WORKOUT SESSION PAGE]
  Display today's plan exercises
        │
        ▼
  For each exercise:
    - Confirm sets, reps, weight
    - Log actual performance
    - Mark complete
        │ Finish Workout
        ▼
[SESSION SUMMARY]
  Volume completed, PRs broken, duration
        │
        ▼
[BACKGROUND: Backend updates]
  - WorkoutLog created
  - Dynamic memory updated
  - Progress aggregations recalculated
  - Fitness score recalculated if needed
        │ Done
        ▼
[DASHBOARD / AI TIP triggered]
```

---

## Flow 3: Logging a Meal

```
[NUTRITION PAGE or FOOD LOGGER]
        │ Log Meal
        ▼
[MEAL LOGGER]
  Option A: Search food database
  Option B: Type natural language input
        │
        ▼
[PARSED RESULT]
  System shows identified items + quantities
  User confirms or adjusts
        │ Confirm
        ▼
[BACKGROUND: Backend updates]
  - MealLog + MealLogItems created
  - Calories, protein, carbs, fat calculated
  - Daily totals updated
  - Memory context may be updated
        │
        ▼
[NUTRITION DASHBOARD]
  Shows updated daily progress
  AI feedback if relevant
```

---

## Flow 4: AI Coach Conversation

```
[AI COACH PAGE]
        │ User types message
        ▼
[FRONTEND]
  POST /coach/chat { message }
        │
        ▼
[BACKEND — AI Orchestration]
  1. Parse user intent
  2. Fetch relevant structured data (goals, recent logs, score)
  3. Retrieve relevant memory (static + dynamic + conversational)
  4. Build context payload
  5. Construct prompt (system + context + user message)
  6. Call OpenAI API
  7. Validate response (check for guardrail violations)
  8. Extract and store any new memory facts
  9. Return response to frontend
        │
        ▼
[AI COACH PAGE]
  Display AI response
  Show source context if relevant (e.g., "Based on your last 3 workouts...")
```

---

## Flow 5: Weekly Report

```
[AUTOMATED TRIGGER — Every Sunday night / Manual request]
        │
        ▼
[BACKEND]
  1. Aggregate last 7 days:
     - Workout sessions logged
     - Average calories, protein
     - Weight change
     - Fitness score change
  2. Calculate weekly fitness score
  3. Detect notable trends
  4. Pass structured summary to LLM
  5. LLM generates natural language report
  6. Report saved to database
  7. Notification sent to user
        │
        ▼
[REPORTS PAGE]
  User reads weekly report
  Score breakdown visible
  AI narrative visible
```

---

## Flow 6: Progress Review

```
[PROGRESS PAGE]
        │
        ▼
  User selects time period (last 4 weeks, 3 months, etc.)
        │
        ▼
[CHARTS + DATA]
  - Weight trend chart
  - Strength progression (key lifts)
  - Protein trend
  - Workout adherence %
  - Fitness score history
  - Body measurements (if entered)
        │
        ▼
[AI INSIGHT CARD]
  AI interprets the trend data
  Suggests adjustments if appropriate
```
