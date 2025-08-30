from fastapi import APIRouter

from .system import router as system_router
from .v1.compliance import router as compliance_router
from .v1.exchange import router as exchange_router
from .v1.receipts import router as receipts_router

router = APIRouter()
router.include_router(system_router)
router.include_router(exchange_router, prefix="/v1")
router.include_router(receipts_router, prefix="/v1")
router.include_router(compliance_router, prefix="/v1")
