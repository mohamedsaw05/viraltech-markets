"""AI analysis engine for predictive analytics and anomaly detection."""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, StockMovement, MovementType
import math
import random


def analyze_product(db: Session, product_id: str) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}

    movements = db.query(StockMovement).filter(
        StockMovement.product_id == product_id
    ).order_by(StockMovement.created_at.desc()).limit(100).all()

    sales = [m for m in movements if m.movement_type == MovementType.OUT]
    entries = [m for m in movements if m.movement_type == MovementType.IN]

    sales_frequency = _calculate_frequency(sales)
    consumption_rate = _calculate_consumption_rate(sales)
    stock_forecast = _forecast_stock(product, consumption_rate)
    risk_analysis = _analyze_risk(product, sales, consumption_rate)
    trend = _analyze_trend(sales)
    anomalies = _detect_anomalies(movements)
    invisible_losses = _detect_invisible_losses(entries, sales, product)

    predictions = {
        "sales_frequency": sales_frequency,
        "daily_consumption_rate": round(consumption_rate, 2),
        "stock_forecast_days": stock_forecast,
        "reorder_suggestion": max(0, round(consumption_rate * 14, 0)),
        "risk_score": risk_analysis["score"],
        "risk_factors": risk_analysis["factors"],
        "trend": trend,
        "anomalies": anomalies,
        "invisible_losses": invisible_losses,
        "confidence": min(100, len(movements) * 2),
    }

    product.ai_predictions = predictions
    product.risk_level = risk_analysis["score"]
    db.commit()

    return predictions


def analyze_all_products(db: Session) -> dict:
    products = db.query(Product).all()
    results = {
        "analyzed": 0,
        "high_risk": [],
        "low_stock_forecast": [],
        "anomalies_detected": [],
        "dormant_products": [],
        "trending_up": [],
        "trending_down": [],
    }

    for product in products:
        analysis = analyze_product(db, product.id)
        results["analyzed"] += 1

        if analysis.get("risk_score", 0) > 70:
            results["high_risk"].append({"id": product.id, "name": product.name, "score": analysis["risk_score"]})

        forecast = analysis.get("stock_forecast_days", 999)
        if 0 < forecast < 7:
            results["low_stock_forecast"].append({
                "id": product.id, "name": product.name, "days": forecast
            })

        if analysis.get("anomalies"):
            results["anomalies_detected"].append({
                "id": product.id, "name": product.name, "anomalies": analysis["anomalies"]
            })

        trend = analysis.get("trend", {})
        if trend.get("direction") == "up":
            results["trending_up"].append({"id": product.id, "name": product.name})
        elif trend.get("direction") == "down":
            results["trending_down"].append({"id": product.id, "name": product.name})

        if analysis.get("daily_consumption_rate", 0) == 0 and product.quantity > 0:
            results["dormant_products"].append({"id": product.id, "name": product.name, "qty": product.quantity})

    return results


def get_global_insights(db: Session) -> dict:
    total_products = db.query(Product).count()
    total_value = db.query(func.sum(Product.quantity * Product.cost_price)).scalar() or 0
    total_movements_today = db.query(StockMovement).filter(
        StockMovement.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    ).count()

    high_risk = db.query(Product).filter(Product.risk_level > 70).count()
    low_stock = db.query(Product).filter(Product.quantity <= Product.min_quantity).count()

    movement_types = db.query(
        StockMovement.movement_type, func.count(StockMovement.id)
    ).group_by(StockMovement.movement_type).all()

    return {
        "summary": {
            "total_products": total_products,
            "total_inventory_value": round(total_value, 2),
            "movements_today": total_movements_today,
            "high_risk_products": high_risk,
            "low_stock_products": low_stock,
        },
        "movement_distribution": {
            mt.value if mt else "unknown": count for mt, count in movement_types
        },
        "recommendations": _generate_recommendations(db),
        "health_score": _calculate_health_score(db),
    }


def _calculate_frequency(movements: list) -> dict:
    if not movements:
        return {"period": "none", "avg_per_day": 0, "avg_per_week": 0, "avg_per_month": 0}

    if len(movements) < 2:
        return {"period": "rare", "avg_per_day": 0.01, "avg_per_week": 0.07, "avg_per_month": 0.3}

    dates = [m.created_at for m in movements if m.created_at]
    if len(dates) < 2:
        return {"period": "rare", "avg_per_day": 0.01, "avg_per_week": 0.07, "avg_per_month": 0.3}

    span_days = max(1, (max(dates) - min(dates)).days)
    avg_per_day = len(movements) / span_days

    return {
        "period": "high" if avg_per_day > 5 else "medium" if avg_per_day > 1 else "low",
        "avg_per_day": round(avg_per_day, 2),
        "avg_per_week": round(avg_per_day * 7, 2),
        "avg_per_month": round(avg_per_day * 30, 2),
    }


def _calculate_consumption_rate(sales: list) -> float:
    if not sales:
        return 0.0
    total_qty = sum(s.quantity for s in sales)
    dates = [s.created_at for s in sales if s.created_at]
    if len(dates) < 2:
        return total_qty / 30
    span_days = max(1, (max(dates) - min(dates)).days)
    return total_qty / span_days


def _forecast_stock(product: Product, consumption_rate: float) -> int:
    if consumption_rate <= 0:
        return 999
    return max(0, int(product.quantity / consumption_rate))


def _analyze_risk(product: Product, sales: list, consumption_rate: float) -> dict:
    score = 0
    factors = []

    if product.quantity <= 0:
        score += 40
        factors.append("Out of stock")
    elif product.quantity <= product.min_quantity:
        score += 25
        factors.append("Below minimum stock level")

    if product.expiry_date:
        days_left = (product.expiry_date - datetime.now(timezone.utc)).days
        if days_left < 0:
            score += 30
            factors.append("Product expired")
        elif days_left < 7:
            score += 20
            factors.append(f"Expiring in {days_left} days")
        elif days_left < 30:
            score += 10
            factors.append(f"Expiring soon ({days_left} days)")

    if consumption_rate > 0:
        forecast_days = product.quantity / consumption_rate
        if forecast_days < 3:
            score += 20
            factors.append("Stock depletes in less than 3 days")
        elif forecast_days < 7:
            score += 10
            factors.append("Stock depletes in less than 7 days")

    if product.selling_price < product.cost_price and product.selling_price > 0:
        score += 15
        factors.append("Selling below cost price")

    return {"score": min(100, score), "factors": factors}


def _analyze_trend(sales: list) -> dict:
    if len(sales) < 4:
        return {"direction": "stable", "change_percent": 0}

    mid = len(sales) // 2
    recent = sum(s.quantity for s in sales[:mid])
    older = sum(s.quantity for s in sales[mid:])

    if older == 0:
        return {"direction": "up" if recent > 0 else "stable", "change_percent": 100}

    change = ((recent - older) / older) * 100
    direction = "up" if change > 10 else "down" if change < -10 else "stable"

    return {"direction": direction, "change_percent": round(change, 1)}


def _detect_anomalies(movements: list) -> list:
    anomalies = []
    if not movements:
        return anomalies

    quantities = [m.quantity for m in movements]
    if len(quantities) < 3:
        return anomalies

    avg = sum(quantities) / len(quantities)
    std = math.sqrt(sum((q - avg) ** 2 for q in quantities) / len(quantities)) if len(quantities) > 1 else 0

    for m in movements[:20]:
        if std > 0 and abs(m.quantity - avg) > 2 * std:
            anomalies.append({
                "movement_id": m.id,
                "type": "unusual_quantity",
                "quantity": m.quantity,
                "expected_range": [round(avg - 2 * std, 1), round(avg + 2 * std, 1)],
                "date": m.created_at.isoformat() if m.created_at else None,
            })

    return anomalies[:5]


def _detect_invisible_losses(entries: list, sales: list, product: Product) -> dict:
    total_in = sum(e.quantity for e in entries)
    total_out = sum(s.quantity for s in sales)
    expected_stock = total_in - total_out
    actual_stock = product.quantity
    difference = expected_stock - actual_stock

    return {
        "total_entries": round(total_in, 2),
        "total_exits": round(total_out, 2),
        "expected_stock": round(expected_stock, 2),
        "actual_stock": round(actual_stock, 2),
        "discrepancy": round(difference, 2),
        "has_loss": difference > 0.01,
        "loss_percentage": round((difference / total_in * 100) if total_in > 0 else 0, 2),
    }


def _generate_recommendations(db: Session) -> list:
    recommendations = []

    low_stock = db.query(Product).filter(
        Product.quantity <= Product.min_quantity, Product.quantity > 0
    ).count()
    if low_stock > 0:
        recommendations.append({
            "type": "restock",
            "priority": "high",
            "message": f"{low_stock} products need restocking",
        })

    expired = db.query(Product).filter(
        Product.expiry_date < datetime.now(timezone.utc)
    ).count()
    if expired > 0:
        recommendations.append({
            "type": "expired",
            "priority": "critical",
            "message": f"{expired} expired products need attention",
        })

    out_of_stock = db.query(Product).filter(Product.quantity <= 0).count()
    if out_of_stock > 0:
        recommendations.append({
            "type": "rupture",
            "priority": "critical",
            "message": f"{out_of_stock} products are out of stock",
        })

    return recommendations


def _calculate_health_score(db: Session) -> int:
    score = 100
    total = db.query(Product).count()
    if total == 0:
        return 100

    low = db.query(Product).filter(Product.quantity <= Product.min_quantity).count()
    out = db.query(Product).filter(Product.quantity <= 0).count()
    expired = db.query(Product).filter(Product.expiry_date < datetime.now(timezone.utc)).count()

    score -= int((low / max(total, 1)) * 30)
    score -= int((out / max(total, 1)) * 40)
    score -= int((expired / max(total, 1)) * 30)

    return max(0, min(100, score))
