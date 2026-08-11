# FitMind AI - Technical Design Specification

# Architecture

React Frontend
    |
FastAPI Backend
    |
Business Logic Layer
    |
PostgreSQL Database
    |
Memory Service (RAG)
    |
OpenAI API

# Tech Stack

Frontend:
- React
- TailwindCSS
- React Router
- Recharts

Backend:
- FastAPI
- SQLAlchemy
- Pydantic

Database:
- PostgreSQL

Storage:
- Supabase Storage

Authentication:
- JWT

# Database Tables

Users
Profiles
Goals
Exercises
WorkoutPlans
WorkoutLogs
Foods
MealLogs
Measurements
ProgressPhotos
FitnessScores
AIMemory
Notifications

# API Endpoints

POST /auth/register
POST /auth/login

GET /profile
PUT /profile

GET /dashboard

GET /workout-plan
POST /workout/log

POST /meal/log
GET /nutrition/today

POST /chat

GET /reports/weekly
GET /reports/monthly

# AI Memory

Static Memory
- Height
- Goal
- Equipment
- Preferences

Dynamic Memory
- Meals
- Workouts
- Measurements
- Weight
- Fitness score

Conversation Memory
- Likes
- Dislikes
- Injuries

# AI Pipeline

User Request
↓
Authenticate
↓
Retrieve Profile
↓
Retrieve Relevant Memory
↓
Retrieve Recent Logs
↓
Construct Prompt
↓
LLM Response
↓
Return Personalized Answer

# Fitness Score

Calculated in backend from:
- Workout adherence
- Nutrition adherence
- Protein target
- Sleep
- Hydration
- Recovery
- Consistency

LLM only explains the score.

# Future Enhancements
- Food image recognition
- Barcode scanner
- Wearables
- Form analysis
- Voice AI
