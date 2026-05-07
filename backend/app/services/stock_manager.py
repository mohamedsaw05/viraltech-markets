"""Intelligent stock management service with all engines."""

from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models import (
    Product, StockMovement, Warehouse, Alert, AuditLog,
    MovementType, AlertType, AlertSeverity
)
import uuid
import hashlib
import json


def generate_internal_signature(product_data: dict) -> str:
    raw = json.dumps(product_data, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


# ─── INVENTORY ENGINE ───────────────────────────────────────────────

def get_inventory(
    db: Session,
    warehouse_id: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    sort_by: str = "name",
    sort_order: str = "asc",
    filters: Optional[dict] = None,
) -> dict:
    query = db.query(Product)

    if warehouse_id:
        query = query.filter(Product.warehouse_id == warehouse_id)
    if category:
        query = query.filter(Product.category == category)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%"))
            | (Product.sku.ilike(f"%{search}%"))
            | (Product.barcode.ilike(f"%{search}%"))
        )
    if filters:
        if filters.get("low_stock"):
            query = query.filter(Product.quantity <= Product.min_quantity)
        if filters.get("expired"):
            query = query.filter(Product.expiry_date < datetime.now(timezone.utc))
        if filters.get("out_of_stock"):
            query = query.filter(Product.quantity <= 0)
        if filters.get("available_only"):
            query = query.filter(Product.is_available == True)  # noqa: E712

    total = query.count()

    sort_col = getattr(Product, sort_by, Product.name)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    offset = (page - 1) * page_size
    products = query.offset(offset).limit(page_size).all()

    return {
        "products": [_product_to_dict(p) for p in products],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


def get_product(db: Session, product_id: str) -> Optional[dict]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None
    return _product_to_dict(product)


def create_product(db: Session, data: dict) -> dict:
    sku = data.get("sku", f"VT-{uuid.uuid4().hex[:8].upper()}")
    sig_data = {"sku": sku, "name": data.get("name"), "created": datetime.now(timezone.utc).isoformat()}
    signature = generate_internal_signature(sig_data)

    product = Product(
        internal_signature=signature,
        sku=sku,
        name=data["name"],
        description=data.get("description", ""),
        category=data.get("category", "General"),
        subcategory=data.get("subcategory", ""),
        barcode=data.get("barcode", ""),
        quantity=data.get("quantity", 0),
        min_quantity=data.get("min_quantity", 0),
        max_quantity=data.get("max_quantity", 0),
        reorder_point=data.get("reorder_point", 0),
        unit=data.get("unit", "unit"),
        cost_price=data.get("cost_price", 0),
        selling_price=data.get("selling_price", 0),
        margin=data.get("margin", 0),
        batch_number=data.get("batch_number", ""),
        serial_number=data.get("serial_number", ""),
        expiry_date=data.get("expiry_date"),
        manufacture_date=data.get("manufacture_date"),
        warehouse_id=data.get("warehouse_id"),
        supplier=data.get("supplier", ""),
        is_available=True,
        sync_status="synced",
        security_status="secure",
        priority_level=0,
        risk_level=0,
        ai_predictions={},
        computed_data={},
        activity_history=[],
    )

    if product.selling_price and product.cost_price:
        product.margin = round(
            ((product.selling_price - product.cost_price) / product.selling_price) * 100, 2
        )

    db.add(product)
    db.commit()
    db.refresh(product)

    _log_audit(db, "product_created", "stock", "product", product.id, {"name": product.name})

    return _product_to_dict(product)


def update_product(db: Session, product_id: str, data: dict) -> Optional[dict]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None

    for key, value in data.items():
        if hasattr(product, key) and key not in ("id", "internal_signature", "created_at"):
            setattr(product, key, value)

    product.updated_at = datetime.now(timezone.utc)

    if product.selling_price and product.cost_price:
        product.margin = round(
            ((product.selling_price - product.cost_price) / product.selling_price) * 100, 2
        )

    db.commit()
    db.refresh(product)
    _log_audit(db, "product_updated", "stock", "product", product.id, data)
    return _product_to_dict(product)


def delete_product(db: Session, product_id: str) -> bool:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return False
    _log_audit(db, "product_deleted", "stock", "product", product.id, {"name": product.name})
    db.delete(product)
    db.commit()
    return True


def duplicate_product(db: Session, product_id: str) -> Optional[dict]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None
    data = {
        "name": f"{product.name} (Copy)",
        "description": product.description,
        "category": product.category,
        "subcategory": product.subcategory,
        "quantity": 0,
        "min_quantity": product.min_quantity,
        "max_quantity": product.max_quantity,
        "reorder_point": product.reorder_point,
        "unit": product.unit,
        "cost_price": product.cost_price,
        "selling_price": product.selling_price,
        "warehouse_id": product.warehouse_id,
        "supplier": product.supplier,
    }
    return create_product(db, data)


# ─── MOVEMENT ENGINE ────────────────────────────────────────────────

def record_movement(db: Session, data: dict) -> dict:
    product = db.query(Product).filter(Product.id == data["product_id"]).first()
    if not product:
        raise ValueError("Product not found")

    prev_qty = product.quantity
    movement_type = MovementType(data["movement_type"])
    qty = float(data["quantity"])

    if movement_type in (MovementType.IN, MovementType.RETURN):
        product.quantity += qty
    elif movement_type in (MovementType.OUT, MovementType.LOSS):
        product.quantity = max(0, product.quantity - qty)
    elif movement_type == MovementType.ADJUSTMENT:
        product.quantity = qty
    elif movement_type == MovementType.TRANSFER:
        product.quantity = max(0, product.quantity - qty)

    movement = StockMovement(
        product_id=product.id,
        warehouse_id=data.get("warehouse_id", product.warehouse_id),
        movement_type=movement_type,
        quantity=qty,
        previous_quantity=prev_qty,
        new_quantity=product.quantity,
        reference=data.get("reference", ""),
        reason=data.get("reason", ""),
        source_warehouse_id=data.get("source_warehouse_id"),
        destination_warehouse_id=data.get("destination_warehouse_id"),
        performed_by=data.get("performed_by"),
        metadata_json=data.get("metadata", {}),
    )

    db.add(movement)
    product.updated_at = datetime.now(timezone.utc)

    _check_stock_alerts(db, product)

    db.commit()
    db.refresh(movement)

    _log_audit(db, f"stock_{movement_type.value}", "stock", "movement", movement.id, {
        "product": product.name, "qty": qty, "prev": prev_qty, "new": product.quantity
    })

    return {
        "id": movement.id,
        "product_id": product.id,
        "movement_type": movement_type.value,
        "quantity": qty,
        "previous_quantity": prev_qty,
        "new_quantity": product.quantity,
        "created_at": movement.created_at.isoformat() if movement.created_at else None,
    }


def get_movements(
    db: Session,
    product_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    query = db.query(StockMovement).order_by(StockMovement.created_at.desc())
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if warehouse_id:
        query = query.filter(StockMovement.warehouse_id == warehouse_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    total = query.count()
    movements = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "movements": [
            {
                "id": m.id,
                "product_id": m.product_id,
                "warehouse_id": m.warehouse_id,
                "movement_type": m.movement_type.value if m.movement_type else None,
                "quantity": m.quantity,
                "previous_quantity": m.previous_quantity,
                "new_quantity": m.new_quantity,
                "reference": m.reference,
                "reason": m.reason,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in movements
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def transfer_stock(db: Session, data: dict) -> dict:
    return record_movement(db, {
        "product_id": data["product_id"],
        "movement_type": "transfer",
        "quantity": data["quantity"],
        "source_warehouse_id": data["source_warehouse_id"],
        "destination_warehouse_id": data["destination_warehouse_id"],
        "reference": data.get("reference", ""),
        "reason": f"Transfer from {data['source_warehouse_id']} to {data['destination_warehouse_id']}",
    })


def adjust_stock(db: Session, product_id: str, new_quantity: float, reason: str = "") -> dict:
    return record_movement(db, {
        "product_id": product_id,
        "movement_type": "adjustment",
        "quantity": new_quantity,
        "reason": reason,
    })


# ─── ALERT ENGINE ───────────────────────────────────────────────────

def _check_stock_alerts(db: Session, product: Product):
    now = datetime.now(timezone.utc)

    if product.quantity <= 0:
        _create_alert(db, AlertType.IMMINENT_RUPTURE, AlertSeverity.EMERGENCY,
                      f"Rupture: {product.name}", f"Stock at 0 for {product.name} (SKU: {product.sku})",
                      product.id, product.warehouse_id)
    elif product.quantity <= product.min_quantity:
        _create_alert(db, AlertType.LOW_STOCK, AlertSeverity.WARNING,
                      f"Stock faible: {product.name}",
                      f"Stock ({product.quantity}) below minimum ({product.min_quantity})",
                      product.id, product.warehouse_id)

    if product.expiry_date and product.expiry_date < now:
        _create_alert(db, AlertType.EXPIRED_PRODUCT, AlertSeverity.CRITICAL,
                      f"Produit expiré: {product.name}",
                      f"Product {product.name} expired on {product.expiry_date.isoformat()}",
                      product.id, product.warehouse_id)


def _create_alert(
    db: Session, alert_type: AlertType, severity: AlertSeverity,
    title: str, message: str, product_id: Optional[str] = None,
    warehouse_id: Optional[str] = None
):
    existing = db.query(Alert).filter(
        and_(
            Alert.alert_type == alert_type,
            Alert.product_id == product_id,
            Alert.is_resolved == False,  # noqa: E712
        )
    ).first()
    if existing:
        return

    alert = Alert(
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        product_id=product_id,
        warehouse_id=warehouse_id,
    )
    db.add(alert)


def get_alerts(
    db: Session, severity: Optional[str] = None,
    unread_only: bool = False, page: int = 1, page_size: int = 50
) -> dict:
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if severity:
        query = query.filter(Alert.severity == severity)
    if unread_only:
        query = query.filter(Alert.is_read == False)  # noqa: E712
    total = query.count()
    alerts = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "alerts": [
            {
                "id": a.id,
                "type": a.alert_type.value if a.alert_type else None,
                "severity": a.severity.value if a.severity else None,
                "title": a.title,
                "message": a.message,
                "product_id": a.product_id,
                "is_read": a.is_read,
                "is_resolved": a.is_resolved,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
        "total": total,
    }


def resolve_alert(db: Session, alert_id: str) -> bool:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return False
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return True


def mark_alert_read(db: Session, alert_id: str) -> bool:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return False
    alert.is_read = True
    db.commit()
    return True


# ─── WAREHOUSE ENGINE ───────────────────────────────────────────────

def get_warehouses(db: Session) -> list[dict]:
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()  # noqa: E712
    return [
        {
            "id": w.id,
            "name": w.name,
            "code": w.code,
            "address": w.address,
            "capacity": w.capacity,
            "current_occupancy": w.current_occupancy,
            "product_count": db.query(Product).filter(Product.warehouse_id == w.id).count(),
        }
        for w in warehouses
    ]


def create_warehouse(db: Session, data: dict) -> dict:
    warehouse = Warehouse(
        name=data["name"],
        code=data.get("code", f"WH-{uuid.uuid4().hex[:6].upper()}"),
        address=data.get("address", ""),
        capacity=data.get("capacity", 0),
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return {"id": warehouse.id, "name": warehouse.name, "code": warehouse.code}


# ─── ANALYTICS ENGINE ───────────────────────────────────────────────

def get_stock_analytics(db: Session) -> dict:
    total_products = db.query(Product).count()
    total_value = db.query(func.sum(Product.quantity * Product.cost_price)).scalar() or 0
    total_selling = db.query(func.sum(Product.quantity * Product.selling_price)).scalar() or 0
    low_stock = db.query(Product).filter(Product.quantity <= Product.min_quantity).count()
    out_of_stock = db.query(Product).filter(Product.quantity <= 0).count()
    expired = db.query(Product).filter(
        Product.expiry_date < datetime.now(timezone.utc)
    ).count()

    categories = db.query(
        Product.category, func.count(Product.id), func.sum(Product.quantity)
    ).group_by(Product.category).all()

    recent_movements = db.query(StockMovement).order_by(
        StockMovement.created_at.desc()
    ).limit(10).all()

    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()  # noqa: E712
    critical_alerts = db.query(Alert).filter(
        and_(Alert.severity == AlertSeverity.CRITICAL, Alert.is_resolved == False)  # noqa: E712
    ).count()

    return {
        "total_products": total_products,
        "total_stock_value": round(total_value, 2),
        "total_selling_value": round(total_selling, 2),
        "potential_profit": round(total_selling - total_value, 2),
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "expired_count": expired,
        "categories": [
            {"name": c[0] or "Uncategorized", "count": c[1], "total_qty": float(c[2] or 0)}
            for c in categories
        ],
        "recent_movements": [
            {
                "id": m.id,
                "product_id": m.product_id,
                "type": m.movement_type.value if m.movement_type else None,
                "quantity": m.quantity,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in recent_movements
        ],
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
    }


def get_dormant_products(db: Session, days: int = 30) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    products = db.query(Product).filter(Product.updated_at < cutoff).all()
    return [_product_to_dict(p) for p in products]


# ─── EXPORT ENGINE ──────────────────────────────────────────────────

def export_inventory(db: Session, format_type: str = "json") -> dict:
    products = db.query(Product).all()
    data = [_product_to_dict(p) for p in products]
    return {"format": format_type, "count": len(data), "data": data}


# ─── SECURITY ENGINE ────────────────────────────────────────────────

def security_audit(db: Session) -> dict:
    products = db.query(Product).all()
    issues = []

    for p in products:
        if p.quantity < 0:
            issues.append({"product": p.name, "issue": "Negative quantity", "severity": "critical"})
        if p.selling_price < p.cost_price and p.selling_price > 0:
            issues.append({"product": p.name, "issue": "Selling below cost", "severity": "warning"})
        if not p.internal_signature:
            issues.append({"product": p.name, "issue": "Missing signature", "severity": "critical"})

    dup_skus = db.query(Product.sku, func.count(Product.id)).group_by(
        Product.sku
    ).having(func.count(Product.id) > 1).all()

    for sku, count in dup_skus:
        issues.append({"sku": sku, "issue": f"Duplicate SKU ({count} occurrences)", "severity": "critical"})

    return {
        "total_issues": len(issues),
        "critical": len([i for i in issues if i["severity"] == "critical"]),
        "warnings": len([i for i in issues if i["severity"] == "warning"]),
        "issues": issues,
    }


# ─── HELPERS ─────────────────────────────────────────────────────────

def _product_to_dict(p: Product) -> dict:
    now = datetime.now(timezone.utc)
    is_expired = bool(p.expiry_date and p.expiry_date < now)
    days_until_expiry = None
    if p.expiry_date:
        days_until_expiry = (p.expiry_date - now).days

    return {
        "id": p.id,
        "internal_signature": p.internal_signature,
        "sku": p.sku,
        "name": p.name,
        "description": p.description,
        "category": p.category,
        "subcategory": p.subcategory,
        "barcode": p.barcode,
        "qr_code": p.qr_code,
        "quantity": p.quantity,
        "min_quantity": p.min_quantity,
        "max_quantity": p.max_quantity,
        "reorder_point": p.reorder_point,
        "unit": p.unit,
        "cost_price": p.cost_price,
        "selling_price": p.selling_price,
        "margin": p.margin,
        "batch_number": p.batch_number,
        "serial_number": p.serial_number,
        "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
        "manufacture_date": p.manufacture_date.isoformat() if p.manufacture_date else None,
        "warehouse_id": p.warehouse_id,
        "supplier": p.supplier,
        "is_available": p.is_available,
        "is_expired": is_expired,
        "days_until_expiry": days_until_expiry,
        "sync_status": p.sync_status,
        "security_status": p.security_status,
        "priority_level": p.priority_level,
        "risk_level": p.risk_level,
        "ai_predictions": p.ai_predictions,
        "computed_data": p.computed_data,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _log_audit(db: Session, action: str, module: str, entity_type: str,
               entity_id: str, details: dict):
    log = AuditLog(
        action=action,
        module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log)
