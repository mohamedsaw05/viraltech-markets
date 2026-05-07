"""License management service with 30,000+ unique keys and security features."""

import hashlib
import hmac
import secrets
import string
import time
import platform
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models import License, LicenseType, LicenseStatus

SECRET_KEY = "VT-MARKETS-2024-SECURE-KEY-INTERNAL"
BRUTE_FORCE_MAX_ATTEMPTS = 5
BRUTE_FORCE_LOCKOUT_SECONDS = 300
ACTIVATION_TIME_LIMIT = 180  # 3 minutes


class BruteForceTracker:
    def __init__(self):
        self.attempts: dict[str, list[float]] = {}
        self.lockouts: dict[str, float] = {}

    def record_attempt(self, ip: str) -> bool:
        now = time.time()
        if ip in self.lockouts and now < self.lockouts[ip]:
            return False
        if ip not in self.attempts:
            self.attempts[ip] = []
        self.attempts[ip] = [t for t in self.attempts[ip] if now - t < 60]
        self.attempts[ip].append(now)
        if len(self.attempts[ip]) >= BRUTE_FORCE_MAX_ATTEMPTS:
            self.lockouts[ip] = now + BRUTE_FORCE_LOCKOUT_SECONDS
            self.attempts[ip] = []
            return False
        return True

    def is_locked(self, ip: str) -> bool:
        if ip in self.lockouts:
            if time.time() < self.lockouts[ip]:
                return True
            del self.lockouts[ip]
        return False


brute_force_tracker = BruteForceTracker()

LICENSE_DURATIONS = {
    LicenseType.TEST_7: timedelta(days=7),
    LicenseType.TEST_16: timedelta(days=16),
    LicenseType.MONTH_1: timedelta(days=30),
    LicenseType.MONTH_2: timedelta(days=60),
    LicenseType.MONTH_3: timedelta(days=90),
    LicenseType.MONTH_4: timedelta(days=120),
    LicenseType.MONTH_5: timedelta(days=150),
    LicenseType.MONTH_6: timedelta(days=180),
    LicenseType.MONTH_7: timedelta(days=210),
    LicenseType.MONTH_8: timedelta(days=240),
    LicenseType.MONTH_9: timedelta(days=270),
    LicenseType.MONTH_10: timedelta(days=300),
    LicenseType.MONTH_11: timedelta(days=330),
    LicenseType.MONTH_12: timedelta(days=365),
    LicenseType.YEAR_1: timedelta(days=365),
    LicenseType.YEAR_2: timedelta(days=730),
    LicenseType.YEAR_3: timedelta(days=1095),
}


def _generate_key_segment(length: int = 5) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def generate_license_key() -> str:
    segments = [_generate_key_segment(5) for _ in range(5)]
    return f"VT-{'-'.join(segments)}"


def generate_signature(license_key: str) -> str:
    return hmac.new(
        SECRET_KEY.encode(), license_key.encode(), hashlib.sha256
    ).hexdigest()


def get_machine_fingerprint() -> str:
    info = f"{platform.node()}-{platform.machine()}-{platform.system()}-{uuid.getnode()}"
    return hashlib.sha256(info.encode()).hexdigest()


def detect_clock_tampering() -> bool:
    current_time = time.time()
    if current_time < 1700000000:
        return True
    return False


def detect_virtual_machine() -> bool:
    vm_indicators = [
        "vmware", "virtualbox", "qemu", "xen", "hyperv",
        "parallels", "bochs", "kvm"
    ]
    system_info = platform.platform().lower()
    for indicator in vm_indicators:
        if indicator in system_info:
            return True
    return False


def generate_bulk_licenses(db: Session, license_type: LicenseType, count: int) -> list[License]:
    licenses = []
    for _ in range(count):
        key = generate_license_key()
        sig = generate_signature(key)
        lic = License(
            license_key=key,
            signature=sig,
            license_type=license_type,
            status=LicenseStatus.AVAILABLE,
        )
        db.add(lic)
        licenses.append(lic)
    db.commit()
    return licenses


def seed_licenses(db: Session):
    existing = db.query(License).count()
    if existing >= 30000:
        return
    per_type = 30000 // len(LicenseType)
    remainder = 30000 - (per_type * len(LicenseType))
    for lt in LicenseType:
        count = per_type + (1 if remainder > 0 else 0)
        remainder -= 1
        generate_bulk_licenses(db, lt, count)


def activate_license(
    db: Session, license_key: str, client_ip: str = "127.0.0.1"
) -> dict:
    if brute_force_tracker.is_locked(client_ip):
        return {"success": False, "error": "Too many attempts. Locked for 5 minutes."}

    if not brute_force_tracker.record_attempt(client_ip):
        return {"success": False, "error": "Brute force detected. Account locked."}

    if detect_clock_tampering():
        return {"success": False, "error": "Clock tampering detected."}

    lic = db.query(License).filter(License.license_key == license_key).first()
    if not lic:
        return {"success": False, "error": "Invalid license key."}

    if lic.status == LicenseStatus.USED:
        return {"success": False, "error": "License already used and permanently deactivated."}

    if lic.status == LicenseStatus.REVOKED:
        return {"success": False, "error": "License has been revoked."}

    if lic.status == LicenseStatus.EXPIRED:
        return {"success": False, "error": "License has expired."}

    expected_sig = generate_signature(license_key)
    if lic.signature != expected_sig:
        return {"success": False, "error": "License signature verification failed."}

    machine_fp = get_machine_fingerprint()
    if lic.machine_fingerprint and lic.machine_fingerprint != machine_fp:
        return {"success": False, "error": "License bound to different machine. Re-installation detected."}

    now = datetime.now(timezone.utc)
    duration = LICENSE_DURATIONS.get(lic.license_type, timedelta(days=30))
    lic.status = LicenseStatus.ACTIVE
    lic.machine_fingerprint = machine_fp
    lic.activated_at = now
    lic.expires_at = now + duration

    history = lic.validation_history or []
    history.append({
        "action": "activated",
        "timestamp": now.isoformat(),
        "machine": machine_fp[:16],
    })
    lic.validation_history = history

    db.commit()
    db.refresh(lic)

    return {
        "success": True,
        "license": {
            "id": lic.id,
            "key": lic.license_key,
            "type": lic.license_type.value,
            "status": lic.status.value,
            "activated_at": lic.activated_at.isoformat() if lic.activated_at else None,
            "expires_at": lic.expires_at.isoformat() if lic.expires_at else None,
        },
    }


def validate_license(db: Session) -> dict:
    active = db.query(License).filter(License.status == LicenseStatus.ACTIVE).first()
    if not active:
        return {"valid": False, "reason": "No active license found."}

    now = datetime.now(timezone.utc)
    if active.expires_at and active.expires_at < now:
        active.status = LicenseStatus.EXPIRED
        db.commit()
        return {"valid": False, "reason": "License has expired."}

    machine_fp = get_machine_fingerprint()
    if active.machine_fingerprint and active.machine_fingerprint != machine_fp:
        return {"valid": False, "reason": "Machine fingerprint mismatch."}

    return {
        "valid": True,
        "license": {
            "id": active.id,
            "type": active.license_type.value,
            "expires_at": active.expires_at.isoformat() if active.expires_at else None,
            "days_remaining": (active.expires_at - now).days if active.expires_at else 0,
        },
    }


def deactivate_license(db: Session, license_key: str) -> dict:
    lic = db.query(License).filter(License.license_key == license_key).first()
    if not lic:
        return {"success": False, "error": "License not found."}
    lic.status = LicenseStatus.USED
    history = lic.validation_history or []
    history.append({
        "action": "deactivated",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    lic.validation_history = history
    db.commit()
    return {"success": True, "message": "License permanently deactivated."}


def get_random_available_key(db: Session, number: int) -> Optional[str]:
    """Given a random number, return the associated available license key."""
    available = db.query(License).filter(
        License.status == LicenseStatus.AVAILABLE
    ).offset(number % 1000).first()
    if available:
        return available.license_key
    return None


def get_license_stats(db: Session) -> dict:
    total = db.query(License).count()
    available = db.query(License).filter(License.status == LicenseStatus.AVAILABLE).count()
    active = db.query(License).filter(License.status == LicenseStatus.ACTIVE).count()
    used = db.query(License).filter(License.status == LicenseStatus.USED).count()
    expired = db.query(License).filter(License.status == LicenseStatus.EXPIRED).count()
    return {
        "total": total,
        "available": available,
        "active": active,
        "used": used,
        "expired": expired,
    }
