# FitMind AI — Project Context Document

## Overview

**FitMind AI** is a final-year software engineering project focused on building an **AI-powered personalized fitness coach**, not just another fitness tracking application.

The core objective is to combine structured fitness tracking with an AI assistant that maintains persistent user memory, understands long-term progress, and continuously adapts workout and nutrition recommendations.

## Problem Statement

Most fitness applications specialize in one domain:
- Workout logging
- Calorie tracking
- Nutrition
- AI chat
- Progress tracking

Users often switch between multiple apps. FitMind AI unifies these into a single experience centered around an adaptive AI coach.

## Primary Goal

Create an AI coach that:
- Learns about every user over time
- Remembers goals, habits and preferences
- Tracks progress
- Explains recommendations
- Adjusts workout and nutrition plans automatically

The AI is the coach, not the calculator.

## Core Modules

### Authentication
- Registration
- Login
- Secure authentication

### User Profile
Collect:
- Name
- Age
- Gender
- Height
- Weight
- Fitness goal
- Activity level
- Diet preference
- Equipment availability
- Medical notes (optional)

### Workout Module
- AI-generated workout plans
- Exercise database
- Workout logging
- Progressive overload tracking
- Workout history

### Nutrition Module
- Manual food logger
- Structured food database
- Calorie tracking
- Macro tracking
- AI meal feedback

### Progress Module
- Weight history
- Measurements
- Progress photos
- Weekly review
- Monthly review

### AI Coach
- Persistent memory
- Personalized coaching
- Adaptive recommendations
- Explainable fitness score
- Conversational assistant

## Future Scope
- Camera food recognition
- Barcode scanning
- Wearable integration
- Exercise form analysis
- Voice assistant
- Grocery recommendations

## AI Memory

### Static Memory
- Height
- Gender
- Goal
- Equipment
- Injuries
- Diet preference

### Dynamic Memory
- Weight history
- Workout logs
- Meal logs
- Measurements
- Fitness score
- Reports

### Conversational Memory
Examples:
- User dislikes certain foods
- Preferred workout timings
- Injuries
- Personal preferences

## Fitness Score

Suggested components:
- Workout adherence
- Nutrition
- Protein target
- Recovery
- Hydration
- Sleep
- Consistency

The AI must explain every score.

## AI Responsibilities

The AI SHOULD:
- Explain progress
- Recommend workouts
- Recommend meals
- Detect trends
- Motivate users
- Adapt plans

The AI SHOULD NOT:
- Invent nutrition values
- Invent exercises
- Perform backend calculations

## High-Level Workflow

1. User registers.
2. Completes fitness assessment.
3. Backend stores profile.
4. AI creates initial report.
5. User logs workouts and meals.
6. Backend updates metrics.
7. Memory refreshes.
8. AI adapts recommendations.
9. Weekly and monthly reports generated.

## High-Level Architecture

Frontend
→ Backend API
→ Authentication
→ Business Logic
→ Database
→ Memory Retrieval Layer
→ LLM
→ Personalized Response

## Database Entities

- Users
- Profiles
- Goals
- Exercises
- WorkoutPlans
- WorkoutLogs
- Foods
- MealLogs
- Measurements
- ProgressPhotos
- FitnessScores
- AI_Memory
- Notifications

## Tech Stack

Frontend:
- React
- Tailwind CSS

Backend:
- FastAPI

Database:
- PostgreSQL

Authentication:
- JWT / Firebase Auth

Storage:
- Supabase Storage

AI:
- OpenAI API
- RAG-based memory

Deployment:
- Vercel
- Railway / Render

## Unique Selling Proposition

FitMind AI combines structured fitness tracking with a persistent AI coach that learns from long-term user data to provide adaptive and explainable workout and nutrition guidance.

## Development Order

1. Authentication
2. User Profile
3. Exercise Database
4. Workout Logging
5. Food Logging
6. Progress Tracking
7. AI Memory
8. AI Coach
9. Dashboard
10. Reports
