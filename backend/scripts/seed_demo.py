#!/usr/bin/env python3
"""
Local demo seed script for FitMind AI (Milestone M13).
Seeds `demo@fitmind.ai` (password: FitMindDemo@2026) and the 10 realistic test subjects.
Strictly guarded by `enforce_database_safety` so it never runs against a non-local database.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.db_safety import enforce_database_safety
from app.seed_demo_data import (
    seed_primary_demo_account,
    seed_test_subjects,
    TEST_SUBJECT_PASSWORD,
)


def run_seed() -> None:
    enforce_database_safety(getattr(settings, "DATABASE_URL", None))
    db = SessionLocal()
    try:
        primary_email = seed_primary_demo_account(db)
        subject_emails = seed_test_subjects(db)
        print(f"[seed_demo] Seeded primary demo account: {primary_email} (Password: {TEST_SUBJECT_PASSWORD})")
        print(f"[seed_demo] Seeded {len(subject_emails)} persona test accounts.")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
