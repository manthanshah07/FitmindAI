from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import DeleteAccountRequest, ExportResponse
from app.schemas.auth import MessageResponse
from app.services.user_service import UserService
from app.api.v1.auth import clear_refresh_cookie

router = APIRouter(tags=["User Account"])


@router.get("/export", response_model=ExportResponse, status_code=status.HTTP_200_OK)
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated endpoint to export all user data in structured JSON format.
    Enforces strict user isolation.
    """
    return UserService.export_user_data(db, current_user)


@router.delete("/account", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def delete_user_account(
    req: DeleteAccountRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated endpoint to permanently delete the current user's account and data.
    Requires password confirmation. Revokes all sessions and clears refresh cookies.
    """
    UserService.delete_user_account(db, current_user, req.password)
    clear_refresh_cookie(response)
    return MessageResponse(message="Account successfully deleted")
