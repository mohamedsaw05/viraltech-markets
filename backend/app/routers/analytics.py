"""AI analytics and diagnostic API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.ai_engine import analyze_product, analyze_all_products, get_global_insights
from app.services.diagnostic import (
    run_full_diagnostic, repair_inconsistencies, recalculate_quantities,
    rebuild_cache, reset_sync, verify_structure_integrity
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics & AI"])


@router.get("/product/{product_id}")
def product_analysis(product_id: str, db: Session = Depends(get_db)):
    return analyze_product(db, product_id)


@router.post("/analyze-all")
def analyze_all(db: Session = Depends(get_db)):
    return analyze_all_products(db)


@router.get("/insights")
def global_insights(db: Session = Depends(get_db)):
    return get_global_insights(db)


@router.get("/diagnostic")
def diagnostic(db: Session = Depends(get_db)):
    return run_full_diagnostic(db)


@router.post("/repair")
def repair(db: Session = Depends(get_db)):
    return repair_inconsistencies(db)


@router.post("/recalculate")
def recalculate(db: Session = Depends(get_db)):
    return recalculate_quantities(db)


@router.post("/rebuild-cache")
def rebuild(db: Session = Depends(get_db)):
    return rebuild_cache(db)


@router.post("/reset-sync")
def sync_reset(db: Session = Depends(get_db)):
    return reset_sync(db)


@router.get("/verify-integrity")
def verify(db: Session = Depends(get_db)):
    return verify_structure_integrity(db)
