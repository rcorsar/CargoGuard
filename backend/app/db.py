from pymongo import ASCENDING, MongoClient

from app.config import settings

_client: MongoClient | None = None


def mongo_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongo_url, serverSelectionTimeoutMS=3000)
    return _client


def get_db():
    return mongo_client()[settings.mongo_db]


def ensure_indexes(db) -> None:
    db.users.create_index("login", unique=True)
    db.users.create_index("id", unique=True)
    db.orders.create_index("id", unique=True)
    db.orders.create_index("qr", unique=True)
    db.orders.create_index([("stage", ASCENDING)])
    db.logs.create_index("id", unique=True)
    db.logs.create_index([("boxId", ASCENDING)])


def public(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    clean = dict(doc)
    clean.pop("_id", None)
    clean.pop("passwordHash", None)
    return clean
