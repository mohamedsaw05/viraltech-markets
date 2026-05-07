"""SQLAlchemy models for Viraltech-Markets."""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone
import enum
import uuid


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LicenseType(str, enum.Enum):
    TEST_7 = "test_7_days"
    TEST_16 = "test_16_days"
    MONTH_1 = "1_month"
    MONTH_2 = "2_months"
    MONTH_3 = "3_months"
    MONTH_4 = "4_months"
    MONTH_5 = "5_months"
    MONTH_6 = "6_months"
    MONTH_7 = "7_months"
    MONTH_8 = "8_months"
    MONTH_9 = "9_months"
    MONTH_10 = "10_months"
    MONTH_11 = "11_months"
    MONTH_12 = "12_months"
    YEAR_1 = "1_year"
    YEAR_2 = "2_years"
    YEAR_3 = "3_years"


class LicenseStatus(str, enum.Enum):
    ACTIVE = "active"
    USED = "used"
    EXPIRED = "expired"
    REVOKED = "revoked"
    AVAILABLE = "available"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertType(str, enum.Enum):
    LOW_STOCK = "low_stock"
    IMMINENT_RUPTURE = "imminent_rupture"
    INVENTORY_INCONSISTENCY = "inventory_inconsistency"
    SUSPICIOUS_MOVEMENT = "suspicious_movement"
    SYNC_ERROR = "sync_error"
    EXPIRED_PRODUCT = "expired_product"
    SALE_ANOMALY = "sale_anomaly"
    PRODUCT_DUPLICATION = "product_duplication"
    DATA_CONFLICT = "data_conflict"


class MovementType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    LOSS = "loss"


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_name = Column(String(255), nullable=False)
    business_type = Column(String(100), nullable=False)
    business_domain = Column(String(100), nullable=False)
    management_level = Column(String(50), nullable=False)
    max_users = Column(Integer, default=1)
    active_modules = Column(JSON, default=list)
    settings = Column(JSON, default=dict)
    is_configured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class License(Base):
    __tablename__ = "licenses"

    id = Column(String, primary_key=True, default=generate_uuid)
    license_key = Column(String(64), unique=True, nullable=False, index=True)
    signature = Column(String(128), nullable=False)
    license_type = Column(SAEnum(LicenseType), nullable=False)
    status = Column(SAEnum(LicenseStatus), default=LicenseStatus.AVAILABLE)
    machine_fingerprint = Column(String(256), nullable=True)
    activated_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    validation_history = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        Index("idx_license_key", "license_key"),
        Index("idx_license_status", "status"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="user")
    permissions = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    audit_logs = relationship("AuditLog", back_populates="user")


class Module(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    version = Column(String(20), default="1.0.0")
    is_active = Column(Boolean, default=False)
    is_loaded = Column(Boolean, default=False)
    config = Column(JSON, default=dict)
    dependencies = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    address = Column(Text)
    capacity = Column(Integer, default=0)
    current_occupancy = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    manager_id = Column(String, ForeignKey("users.id"), nullable=True)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    products = relationship("Product", back_populates="warehouse")
    stock_movements = relationship("StockMovement", back_populates="warehouse")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    internal_signature = Column(String(128), unique=True, nullable=False)
    sku = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    subcategory = Column(String(100))
    barcode = Column(String(100), index=True)
    qr_code = Column(String(255))

    # Stock
    quantity = Column(Float, default=0.0)
    min_quantity = Column(Float, default=0.0)
    max_quantity = Column(Float, default=0.0)
    reorder_point = Column(Float, default=0.0)
    unit = Column(String(20), default="unit")

    # Pricing
    cost_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    margin = Column(Float, default=0.0)

    # Traceability
    batch_number = Column(String(100))
    serial_number = Column(String(100))
    expiry_date = Column(DateTime, nullable=True)
    manufacture_date = Column(DateTime, nullable=True)

    # Status
    is_available = Column(Boolean, default=True)
    sync_status = Column(String(20), default="synced")
    security_status = Column(String(20), default="secure")
    priority_level = Column(Integer, default=0)
    risk_level = Column(Integer, default=0)

    # AI Data
    ai_predictions = Column(JSON, default=dict)
    computed_data = Column(JSON, default=dict)
    activity_history = Column(JSON, default=list)

    # Relations
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    warehouse = relationship("Warehouse", back_populates="products")
    supplier = Column(String(255))

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("idx_product_sku", "sku"),
        Index("idx_product_category", "category"),
        Index("idx_product_warehouse", "warehouse_id"),
        Index("idx_product_barcode", "barcode"),
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    movement_type = Column(SAEnum(MovementType), nullable=False)
    quantity = Column(Float, nullable=False)
    previous_quantity = Column(Float, default=0.0)
    new_quantity = Column(Float, default=0.0)
    reference = Column(String(100))
    reason = Column(Text)
    source_warehouse_id = Column(String, nullable=True)
    destination_warehouse_id = Column(String, nullable=True)
    performed_by = Column(String, ForeignKey("users.id"), nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    warehouse = relationship("Warehouse", back_populates="stock_movements")

    __table_args__ = (
        Index("idx_movement_product", "product_id"),
        Index("idx_movement_date", "created_at"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    alert_type = Column(SAEnum(AlertType), nullable=False)
    severity = Column(SAEnum(AlertSeverity), default=AlertSeverity.INFO)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        Index("idx_alert_severity", "severity"),
        Index("idx_alert_type", "alert_type"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    module = Column(String(100))
    entity_type = Column(String(50))
    entity_id = Column(String)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45))
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_date", "created_at"),
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_type = Column(String(100), nullable=False)
    module = Column(String(100))
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        Index("idx_analytics_type", "event_type"),
    )
