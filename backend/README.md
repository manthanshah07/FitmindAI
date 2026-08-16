# FitMind AI — Backend Application

FastAPI backend service powering FitMind AI, providing deterministic fitness calculations, structured database persistence, JWT authentication, and AI memory orchestration.

---

## Prerequisites

- **Python:** 3.11+ (Python 3.11 or 3.12 recommended)
- **Database:** PostgreSQL 14+ (or Supabase Postgres)

---

## Backend Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── router.py       # API v1 base router
│   ├── core/
│   │   ├── config.py           # Pydantic Settings configuration
│   │   ├── database.py         # SQLAlchemy engine & session dependency
│   │   └── security.py         # Password hashing & JWT helpers
│   ├── models/
│   │   └── base.py             # SQLAlchemy DeclarativeBase
│   ├── schemas/                # Pydantic schemas (Phase 1+)
│   └── main.py                 # FastAPI app entrypoint & middleware
├── alembic/                    # Database migration scripts
├── tests/                      # Pytest test suite
├── alembic.ini                 # Alembic configuration
├── requirements.txt            # Python dependencies
└── .env.example                # Example environment variables
```

---

## Local Setup Instructions

### 1. Create and Activate Virtual Environment

```bash
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env to set your local DATABASE_URL and JWT_SECRET
```

---

## Running the Application Locally

```bash
# From the backend/ directory with venv activated:
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API Base:** `http://localhost:8000/api/v1`
- **Health Check:** `http://localhost:8000/health`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Running Tests

```bash
# Run all unit and API tests
pytest
```

---

## Database Migrations (Alembic)

```bash
# Apply all pending database migrations
alembic upgrade head

# Create a new migration after updating SQLAlchemy models
alembic revision --autogenerate -m "describe_changes"
```
