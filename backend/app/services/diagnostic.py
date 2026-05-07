"""Diagnostic mode - detect errors, repair inconsistencies, rebuild data."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, StockMovement, Warehouse, Alert, MovementType
import json


def run_full_diagnostic(db: Session) -> dict:
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": [],
        "repairs": [],
        "summary": {"errors": 0, "warnings": 0, "repaired": 0},
    }

    results["checks"].append(_check_inventory_errors(db))
    results["checks"].append(_check_quantity_integrity(db))
    results["checks"].append(_check_index_integrity(db))
    results["checks"].append(_check_orphaned_movements(db))
    results["checks"].append(_check_duplicate_products(db))
    results["checks"].append(_check_data_consistency(db))

    for check in results["checks"]:
        results["summary"]["errors"] += check.get("errors", 0)
        results["summary"]["warnings"] += check.get("warnings", 0)

    return results


def repair_inconsistencies(db: Session) -> dict:
    repairs = []

    neg_products = db.query(Product).filter(Product.quantity < 0).all()
    for p in neg_products:
        p.quantity = 0
        repairs.append({"type": "negative_qty_fix", "product": p.name, "action": "Set quantity to 0"})

    no_sig = db.query(Product).filter(
        (Product.internal_signature == None) | (Product.internal_signature == "")  # noqa: E711
    ).all()
    for p in no_sig:
        from app.services.stock_manager import generate_internal_signature
        sig_data = {"sku": p.sku, "name": p.name, "created": p.created_at.isoformat() if p.created_at else ""}
        p.internal_signature = generate_internal_signature(sig_data)
        repairs.append({"type": "signature_repair", "product": p.name, "action": "Generated new signature"})

    no_sync = db.query(Product).filter(
        (Product.sync_status == None) | (Product.sync_status == "")  # noqa: E711
    ).all()
    for p in no_sync:
        p.sync_status = "synced"
        repairs.append({"type": "sync_status_fix", "product": p.name, "action": "Reset sync status"})

    db.commit()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_repairs": len(repairs),
        "repairs": repairs,
    }


def recalculate_quantities(db: Session) -> dict:
    products = db.query(Product).all()
    recalculated = []

    for product in products:
        movements = db.query(StockMovement).filter(
            StockMovement.product_id == product.id
        ).order_by(StockMovement.created_at.asc()).all()

        if not movements:
            continue

        calculated_qty = 0.0
        for m in movements:
            if m.movement_type in (MovementType.IN, MovementType.RETURN):
                calculated_qty += m.quantity
            elif m.movement_type in (MovementType.OUT, MovementType.LOSS):
                calculated_qty -= m.quantity
            elif m.movement_type == MovementType.ADJUSTMENT:
                calculated_qty = m.quantity
            elif m.movement_type == MovementType.TRANSFER:
                calculated_qty -= m.quantity

        calculated_qty = max(0, calculated_qty)

        if abs(product.quantity - calculated_qty) > 0.01:
            recalculated.append({
                "product": product.name,
                "old_quantity": product.quantity,
                "new_quantity": calculated_qty,
                "difference": round(product.quantity - calculated_qty, 2),
            })
            product.quantity = calculated_qty

    db.commit()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_recalculated": len(recalculated),
        "details": recalculated,
    }


def rebuild_cache(db: Session) -> dict:
    products = db.query(Product).all()
    rebuilt = 0

    for product in products:
        computed = {
            "stock_value": round(product.quantity * product.cost_price, 2),
            "selling_value": round(product.quantity * product.selling_price, 2),
            "margin_value": round(
                product.quantity * (product.selling_price - product.cost_price), 2
            ),
            "is_low_stock": product.quantity <= product.min_quantity,
            "is_overstock": product.quantity > product.max_quantity if product.max_quantity > 0 else False,
            "stock_percentage": round(
                (product.quantity / product.max_quantity * 100) if product.max_quantity > 0 else 0, 1
            ),
            "last_computed": datetime.now(timezone.utc).isoformat(),
        }
        product.computed_data = computed
        rebuilt += 1

    db.commit()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "products_rebuilt": rebuilt,
    }


def reset_sync(db: Session) -> dict:
    count = db.query(Product).update({"sync_status": "synced"})
    db.commit()
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "products_reset": count,
    }


def verify_structure_integrity(db: Session) -> dict:
    checks = {
        "products_table": True,
        "movements_table": True,
        "warehouses_table": True,
        "alerts_table": True,
    }

    try:
        db.query(func.count(Product.id)).scalar()
    except Exception:
        checks["products_table"] = False

    try:
        db.query(func.count(StockMovement.id)).scalar()
    except Exception:
        checks["movements_table"] = False

    try:
        db.query(func.count(Warehouse.id)).scalar()
    except Exception:
        checks["warehouses_table"] = False

    try:
        db.query(func.count(Alert.id)).scalar()
    except Exception:
        checks["alerts_table"] = False

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "all_ok": all(checks.values()),
        "checks": checks,
    }


def _check_inventory_errors(db: Session) -> dict:
    errors = 0
    warnings = 0
    details = []

    neg = db.query(Product).filter(Product.quantity < 0).count()
    if neg > 0:
        errors += neg
        details.append(f"{neg} products with negative quantities")

    no_sku = db.query(Product).filter(
        (Product.sku == None) | (Product.sku == "")  # noqa: E711
    ).count()
    if no_sku > 0:
        errors += no_sku
        details.append(f"{no_sku} products without SKU")

    no_name = db.query(Product).filter(
        (Product.name == None) | (Product.name == "")  # noqa: E711
    ).count()
    if no_name > 0:
        errors += no_name
        details.append(f"{no_name} products without name")

    return {"check": "inventory_errors", "errors": errors, "warnings": warnings, "details": details}


def _check_quantity_integrity(db: Session) -> dict:
    errors = 0
    warnings = 0
    details = []

    products = db.query(Product).limit(1000).all()
    for p in products:
        if p.min_quantity > p.max_quantity and p.max_quantity > 0:
            errors += 1
            details.append(f"{p.name}: min_qty ({p.min_quantity}) > max_qty ({p.max_quantity})")
        if p.cost_price > p.selling_price and p.selling_price > 0:
            warnings += 1
            details.append(f"{p.name}: cost ({p.cost_price}) > selling ({p.selling_price})")

    return {"check": "quantity_integrity", "errors": errors, "warnings": warnings, "details": details[:20]}


def _check_index_integrity(db: Session) -> dict:
    dup_skus = db.query(Product.sku, func.count(Product.id)).group_by(
        Product.sku
    ).having(func.count(Product.id) > 1).all()

    return {
        "check": "index_integrity",
        "errors": len(dup_skus),
        "warnings": 0,
        "details": [f"Duplicate SKU: {sku} ({count}x)" for sku, count in dup_skus],
    }


def _check_orphaned_movements(db: Session) -> dict:
    from sqlalchemy import text
    try:
        orphaned = db.execute(text(
            "SELECT COUNT(*) FROM stock_movements sm "
            "LEFT JOIN products p ON sm.product_id = p.id "
            "WHERE p.id IS NULL"
        )).scalar() or 0
    except Exception:
        orphaned = 0

    return {
        "check": "orphaned_movements",
        "errors": orphaned,
        "warnings": 0,
        "details": [f"{orphaned} movements reference deleted products"] if orphaned > 0 else [],
    }


def _check_duplicate_products(db: Session) -> dict:
    dup_names = db.query(Product.name, func.count(Product.id)).group_by(
        Product.name
    ).having(func.count(Product.id) > 1).all()

    return {
        "check": "duplicate_products",
        "errors": 0,
        "warnings": len(dup_names),
        "details": [f"Possible duplicate: {name} ({count}x)" for name, count in dup_names],
    }


def _check_data_consistency(db: Session) -> dict:
    errors = 0
    details = []

    products_with_warehouse = db.query(Product).filter(
        Product.warehouse_id != None  # noqa: E711
    ).all()

    for p in products_with_warehouse:
        warehouse = db.query(Warehouse).filter(Warehouse.id == p.warehouse_id).first()
        if not warehouse:
            errors += 1
            details.append(f"{p.name}: references non-existent warehouse {p.warehouse_id}")

    return {"check": "data_consistency", "errors": errors, "warnings": 0, "details": details[:20]}
