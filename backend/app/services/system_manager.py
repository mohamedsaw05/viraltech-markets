"""Central system manager for modules, security, sync, cache, logs, analytics, permissions."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import SystemConfig, Module, AuditLog, AnalyticsEvent, User
from passlib.hash import bcrypt
import json

AVAILABLE_MODULES = {
    "stock": {"name": "stock", "display_name": "Gestion de Stock", "description": "Gestion intelligente de stock avec analyse IA"},
    "commercial": {"name": "commercial", "display_name": "Gestion Commerciale", "description": "Ventes, achats, factures, clients"},
    "accounting": {"name": "accounting", "display_name": "Comptabilité", "description": "Plan comptable, journaux, bilan"},
    "hr": {"name": "hr", "display_name": "Ressources Humaines", "description": "Employés, paie, congés, formations"},
    "production": {"name": "production", "display_name": "Production", "description": "Ordres de fabrication, gammes, nomenclatures"},
    "logistics": {"name": "logistics", "display_name": "Logistique", "description": "Transport, livraison, suivi colis"},
    "ecommerce": {"name": "ecommerce", "display_name": "E-Commerce", "description": "Boutique en ligne, commandes, paiements"},
    "pharmacy": {"name": "pharmacy", "display_name": "Pharmacie", "description": "Médicaments, ordonnances, traçabilité"},
    "restaurant": {"name": "restaurant", "display_name": "Restaurant", "description": "Menu, commandes, tables, cuisine"},
    "school": {"name": "school", "display_name": "École", "description": "Élèves, classes, notes, emploi du temps"},
    "hospital": {"name": "hospital", "display_name": "Hôpital", "description": "Patients, dossiers médicaux, rendez-vous"},
    "multi_warehouse": {"name": "multi_warehouse", "display_name": "Multi-Entrepôts", "description": "Gestion de plusieurs entrepôts"},
    "data_management": {"name": "data_management", "display_name": "Gestion de Données", "description": "Import, export, nettoyage de données"},
    "industrial": {"name": "industrial", "display_name": "Gestion Industrielle", "description": "Machines, maintenance, qualité"},
}

BUSINESS_DOMAIN_MODULES = {
    "commerce": ["stock", "commercial", "accounting", "ecommerce"],
    "industrie": ["stock", "production", "industrial", "logistics"],
    "sante": ["stock", "pharmacy", "hospital"],
    "education": ["school", "data_management"],
    "restauration": ["stock", "restaurant", "commercial"],
    "logistique": ["stock", "logistics", "multi_warehouse"],
    "general": ["stock", "commercial", "accounting", "hr"],
}


def configure_system(db: Session, data: dict) -> dict:
    existing = db.query(SystemConfig).first()
    if existing:
        existing.company_name = data.get("company_name", existing.company_name)
        existing.business_type = data.get("business_type", existing.business_type)
        existing.business_domain = data.get("business_domain", existing.business_domain)
        existing.management_level = data.get("management_level", existing.management_level)
        existing.max_users = data.get("max_users", existing.max_users)
        existing.active_modules = data.get("active_modules", existing.active_modules)
        existing.is_configured = True
        existing.updated_at = datetime.now(timezone.utc)
        config = existing
    else:
        config = SystemConfig(
            company_name=data.get("company_name", ""),
            business_type=data.get("business_type", ""),
            business_domain=data.get("business_domain", "general"),
            management_level=data.get("management_level", "standard"),
            max_users=data.get("max_users", 1),
            active_modules=data.get("active_modules", []),
            is_configured=True,
        )
        db.add(config)

    selected_modules = data.get("active_modules", [])
    for mod_name in selected_modules:
        mod_info = AVAILABLE_MODULES.get(mod_name)
        if mod_info:
            existing_mod = db.query(Module).filter(Module.name == mod_name).first()
            if not existing_mod:
                module = Module(
                    name=mod_info["name"],
                    display_name=mod_info["display_name"],
                    description=mod_info["description"],
                    is_active=True,
                    is_loaded=True,
                )
                db.add(module)
            else:
                existing_mod.is_active = True
                existing_mod.is_loaded = True

    inactive_modules = set(AVAILABLE_MODULES.keys()) - set(selected_modules)
    for mod_name in inactive_modules:
        existing_mod = db.query(Module).filter(Module.name == mod_name).first()
        if existing_mod:
            existing_mod.is_active = False
            existing_mod.is_loaded = False

    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            email="admin@viraltech.local",
            hashed_password=bcrypt.hash("admin123"),
            full_name="Administrateur",
            role="admin",
            permissions=["*"],
        )
        db.add(admin)

    db.commit()
    db.refresh(config)

    _log_event(db, "system_configured", "system", {"config": data})

    return {
        "id": config.id,
        "company_name": config.company_name,
        "business_type": config.business_type,
        "business_domain": config.business_domain,
        "management_level": config.management_level,
        "max_users": config.max_users,
        "active_modules": config.active_modules,
        "is_configured": config.is_configured,
    }


def get_system_config(db: Session) -> dict:
    config = db.query(SystemConfig).first()
    if not config:
        return {"is_configured": False}
    return {
        "id": config.id,
        "company_name": config.company_name,
        "business_type": config.business_type,
        "business_domain": config.business_domain,
        "management_level": config.management_level,
        "max_users": config.max_users,
        "active_modules": config.active_modules,
        "is_configured": config.is_configured,
    }


def get_available_modules() -> dict:
    return AVAILABLE_MODULES


def get_suggested_modules(business_domain: str) -> list:
    return BUSINESS_DOMAIN_MODULES.get(business_domain, BUSINESS_DOMAIN_MODULES["general"])


def get_active_modules(db: Session) -> list:
    modules = db.query(Module).filter(Module.is_active == True).all()  # noqa: E712
    return [
        {
            "id": m.id,
            "name": m.name,
            "display_name": m.display_name,
            "description": m.description,
            "version": m.version,
            "is_loaded": m.is_loaded,
        }
        for m in modules
    ]


def get_audit_logs(db: Session, page: int = 1, page_size: int = 50, module: str = None) -> dict:
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if module:
        query = query.filter(AuditLog.module == module)
    total = query.count()
    logs = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "logs": [
            {
                "id": l.id,
                "action": l.action,
                "module": l.module,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "details": l.details,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "total": total,
    }


def get_system_stats(db: Session) -> dict:
    from app.models import Product, StockMovement, Alert, Warehouse
    return {
        "products": db.query(Product).count(),
        "movements": db.query(StockMovement).count(),
        "alerts": db.query(Alert).count(),
        "warehouses": db.query(Warehouse).count(),
        "users": db.query(User).count(),
        "modules": db.query(Module).filter(Module.is_active == True).count(),  # noqa: E712
        "audit_logs": db.query(AuditLog).count(),
    }


def _log_event(db: Session, event_type: str, module: str, data: dict):
    event = AnalyticsEvent(event_type=event_type, module=module, data=data)
    db.add(event)
    db.commit()
