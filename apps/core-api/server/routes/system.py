from fastapi import APIRouter

from ..security import jwks_response

router = APIRouter()

@router.get("/.well-known/jwks.json")
def jwks():
    return jwks_response()
