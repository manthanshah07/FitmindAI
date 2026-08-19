import os
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.seed_demo_data import seed_demo_data

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed-demo", status_code=status.HTTP_200_OK)
def trigger_demo_seeding(
    x_admin_secret: str = Header(..., description="Admin authorization secret header"),
    db: Session = Depends(get_db),
):
    """
    Trigger production demo data seeding via HTTP POST request.
    Requires header `X-Admin-Secret` matching ADMIN_SEED_SECRET or JWT_SECRET.
    """
    expected_secret = os.getenv("ADMIN_SEED_SECRET", settings.JWT_SECRET)
    if not x_admin_secret or x_admin_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin authorization secret header",
        )

    # Force allow production seeding for explicit admin HTTP request
    os.environ["DEMO_SEED_PRODUCTION"] = "true"

    try:
        seeded_emails = seed_demo_data(db)
        return {
            "status": "success",
            "message": f"Successfully seeded {len(seeded_emails)} demo user accounts.",
            "seeded_emails": seeded_emails,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed demo data: {str(e)}",
        )
