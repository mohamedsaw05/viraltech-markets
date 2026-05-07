"""Stock management API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.stock_manager import (
    get_inventory, get_product, create_product, update_product,
    delete_product, duplicate_product, record_movement, get_movements,
    transfer_stock, adjust_stock, get_alerts, resolve_alert,
    mark_alert_read, get_warehouses, create_warehouse,
    get_stock_analytics, get_dormant_products, export_inventory,
    security_audit
)
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/stock", tags=["Stock Management"])


class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = ""
    category: Optional[str] = "General"
    subcategory: Optional[str] = ""
    barcode: Optional[str] = ""
    quantity: Optional[float] = 0
    min_quantity: Optional[float] = 0
    max_quantity: Optional[float] = 0
    reorder_point: Optional[float] = 0
    unit: Optional[str] = "unit"
    cost_price: Optional[float] = 0
    selling_price: Optional[float] = 0
    batch_number: Optional[str] = ""
    serial_number: Optional[str] = ""
    expiry_date: Optional[datetime] = None
    manufacture_date: Optional[datetime] = None
    warehouse_id: Optional[str] = None
    supplier: Optional[str] = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    barcode: Optional[str] = None
    quantity: Optional[float] = None
    min_quantity: Optional[float] = None
    max_quantity: Optional[float] = None
    reorder_point: Optional[float] = None
    unit: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    warehouse_id: Optional[str] = None
    supplier: Optional[str] = None


class MovementCreate(BaseModel):
    product_id: str
    movement_type: str
    quantity: float
    warehouse_id: Optional[str] = None
    reference: Optional[str] = ""
    reason: Optional[str] = ""
    source_warehouse_id: Optional[str] = None
    destination_warehouse_id: Optional[str] = None


class TransferRequest(BaseModel):
    product_id: str
    quantity: float
    source_warehouse_id: str
    destination_warehouse_id: str
    reference: Optional[str] = ""


class AdjustRequest(BaseModel):
    new_quantity: float
    reason: Optional[str] = ""


class WarehouseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = ""
    capacity: Optional[int] = 0


# ─── PRODUCTS ────────────────────────────────────────────────────────

@router.get("/products")
def list_products(
    warehouse_id: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    sort_by: str = "name",
    sort_order: str = "asc",
    low_stock: bool = False,
    expired: bool = False,
    out_of_stock: bool = False,
    db: Session = Depends(get_db),
):
    filters = {}
    if low_stock:
        filters["low_stock"] = True
    if expired:
        filters["expired"] = True
    if out_of_stock:
        filters["out_of_stock"] = True
    return get_inventory(
        db, warehouse_id, category, search,
        page, page_size, sort_by, sort_order, filters
    )


@router.get("/products/{product_id}")
def read_product(product_id: str, db: Session = Depends(get_db)):
    result = get_product(db, product_id)
    if not result:
        return {"error": "Product not found"}
    return result


@router.post("/products")
def add_product(product: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, product.model_dump())


@router.put("/products/{product_id}")
def edit_product(product_id: str, product: ProductUpdate, db: Session = Depends(get_db)):
    data = {k: v for k, v in product.model_dump().items() if v is not None}
    result = update_product(db, product_id, data)
    if not result:
        return {"error": "Product not found"}
    return result


@router.delete("/products/{product_id}")
def remove_product(product_id: str, db: Session = Depends(get_db)):
    success = delete_product(db, product_id)
    if not success:
        return {"error": "Product not found"}
    return {"success": True}


@router.post("/products/{product_id}/duplicate")
def dup_product(product_id: str, db: Session = Depends(get_db)):
    result = duplicate_product(db, product_id)
    if not result:
        return {"error": "Product not found"}
    return result


# ─── MOVEMENTS ───────────────────────────────────────────────────────

@router.post("/movements")
def add_movement(movement: MovementCreate, db: Session = Depends(get_db)):
    try:
        return record_movement(db, movement.model_dump())
    except ValueError as e:
        return {"error": str(e)}


@router.get("/movements")
def list_movements(
    product_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    return get_movements(db, product_id, warehouse_id, movement_type, page, page_size)


@router.post("/transfer")
def transfer(request: TransferRequest, db: Session = Depends(get_db)):
    try:
        return transfer_stock(db, request.model_dump())
    except ValueError as e:
        return {"error": str(e)}


@router.post("/products/{product_id}/adjust")
def adjust(product_id: str, request: AdjustRequest, db: Session = Depends(get_db)):
    try:
        return adjust_stock(db, product_id, request.new_quantity, request.reason)
    except ValueError as e:
        return {"error": str(e)}


# ─── ALERTS ──────────────────────────────────────────────────────────

@router.get("/alerts")
def list_alerts(
    severity: Optional[str] = None,
    unread_only: bool = False,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    return get_alerts(db, severity, unread_only, page, page_size)


@router.post("/alerts/{alert_id}/resolve")
def resolve(alert_id: str, db: Session = Depends(get_db)):
    success = resolve_alert(db, alert_id)
    return {"success": success}


@router.post("/alerts/{alert_id}/read")
def read_alert(alert_id: str, db: Session = Depends(get_db)):
    success = mark_alert_read(db, alert_id)
    return {"success": success}


# ─── WAREHOUSES ──────────────────────────────────────────────────────

@router.get("/warehouses")
def list_warehouses(db: Session = Depends(get_db)):
    return get_warehouses(db)


@router.post("/warehouses")
def add_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    return create_warehouse(db, warehouse.model_dump())


# ─── ANALYTICS & TOOLS ──────────────────────────────────────────────

@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    return get_stock_analytics(db)


@router.get("/dormant")
def dormant(days: int = 30, db: Session = Depends(get_db)):
    return get_dormant_products(db, days)


@router.get("/export")
def export(format_type: str = "json", db: Session = Depends(get_db)):
    return export_inventory(db, format_type)


@router.get("/security-audit")
def audit(db: Session = Depends(get_db)):
    return security_audit(db)
