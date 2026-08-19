import os
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.seed_demo_data import seed_test_subjects, seed_demo_data

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed-test-subjects", status_code=status.HTTP_200_OK)
@router.post("/seed-demo", status_code=status.HTTP_200_OK)
def trigger_test_subjects_seeding(
    x_admin_secret: str = Header(..., description="Admin authorization secret header"),
    db: Session = Depends(get_db),
):
    """
    Trigger production test subject data seeding via HTTP POST request.
    Requires header `X-Admin-Secret` matching ADMIN_SEED_SECRET or JWT_SECRET.
    """
    expected_secret = os.getenv("ADMIN_SEED_SECRET", settings.JWT_SECRET)
    if not x_admin_secret or x_admin_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin authorization secret header",
        )

    # Force allow production seeding for explicit admin HTTP request
    os.environ["SEED_TEST_SUBJECTS_PRODUCTION"] = "true"
    os.environ["DEMO_SEED_PRODUCTION"] = "true"

    try:
        seeded_emails = seed_test_subjects(db)
        return {
            "status": "success",
            "message": f"Successfully seeded {len(seeded_emails)} test subject user accounts.",
            "seeded_emails": seeded_emails,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed test subjects: {str(e)}",
        )

