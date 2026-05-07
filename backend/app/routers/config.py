"""System configuration and setup API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.system_manager import (
    configure_system, get_system_config, get_available_modules,
    get_suggested_modules, get_active_modules, get_audit_logs,
    get_system_stats
)
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/config", tags=["Configuration"])


class ConfigRequest(BaseModel):
    company_name: str
    business_type: str
    business_domain: str
    management_level: str = "standard"
    max_users: int = 1
    active_modules: list[str] = []


@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    return get_system_config(db)


@router.post("/setup")
def setup_system(request: ConfigRequest, db: Session = Depends(get_db)):
    return configure_system(db, request.model_dump())


@router.get("/modules/available")
def available_modules():
    return get_available_modules()


@router.get("/modules/suggested/{domain}")
def suggested_modules(domain: str):
    return get_suggested_modules(domain)


@router.get("/modules/active")
def active_modules(db: Session = Depends(get_db)):
    return get_active_modules(db)


@router.get("/audit-logs")
def audit_logs(
    page: int = 1, page_size: int = 50,
    module: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return get_audit_logs(db, page, page_size, module)


@router.get("/stats")
def system_stats(db: Session = Depends(get_db)):
    return get_system_stats(db)
