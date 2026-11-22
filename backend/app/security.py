import hashlib
import secrets

# Пароли стенда. На хостинге их заменяют, в базу попадает только хеш.
STUDY_PASSWORDS = {
    "admin": "admin",
    "controller": "controller",
    "accounting": "accounting",
    "security": "security",
}

ROLE_LABEL = {
    "admin": "Администратор",
    "controller": "Контролер",
    "accounting": "Бухгалтерия",
    "security": "Служба безопасности",
}

# Кто имеет право на действие. Администратор ведёт стенд и может провести чужой шаг.
PERMISSIONS = {
    "create_order": {"accounting", "admin"},
    "inspect": {"controller", "admin"},
    "photo": {"controller", "admin"},
    "complete": {"accounting", "admin"},
    "return_order": {"accounting", "admin"},
    "settings": {"admin"},
    "delete": {"admin"},
}


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return salt.hex() + ":" + digest.hex()


def password_matches(password: str, stored: str) -> bool:
    salt_hex, _digest = stored.split(":", 1)
    return secrets.compare_digest(hash_password(password, bytes.fromhex(salt_hex)), stored)


def require_role(role: str | None, action: str) -> str:
    from app.errors import AppError

    if role not in PERMISSIONS[action]:
        raise AppError(403, "Этой роли действие недоступно")
    return role
