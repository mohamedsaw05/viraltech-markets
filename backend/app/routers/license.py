"""License management API endpoints."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.license_manager import (
    activate_license, validate_license, deactivate_license,
    get_random_available_key, get_license_stats, seed_licenses,
    detect_clock_tampering, detect_virtual_machine
)
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/license", tags=["License"])


class ActivateRequest(BaseModel):
    license_key: str


class RandomKeyRequest(BaseModel):
    number: int


@router.post("/activate")
def activate(request: ActivateRequest, req: Request, db: Session = Depends(get_db)):
    client_ip = req.client.host if req.client else "127.0.0.1"
    return activate_license(db, request.license_key, client_ip)


@router.get("/validate")
def validate(db: Session = Depends(get_db)):
    return validate_license(db)


@router.post("/deactivate")
def deactivate(request: ActivateRequest, db: Session = Depends(get_db)):
    return deactivate_license(db, request.license_key)


@router.post("/get-key")
def get_key(request: RandomKeyRequest, db: Session = Depends(get_db)):
    key = get_random_available_key(db, request.number)
    if key:
        return {"success": True, "key": key}
    return {"success": False, "error": "No available keys found."}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    return get_license_stats(db)


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    seed_licenses(db)
    return {"success": True, "message": "Licenses seeded successfully."}


@router.get("/security-check")
def security_check():
    return {
        "clock_tampered": detect_clock_tampering(),
        "virtual_machine": detect_virtual_machine(),
    }
