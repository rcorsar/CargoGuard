import json
import secrets
from datetime import datetime
from pathlib import Path

from app.db import ensure_indexes, public
from app.security import ROLE_LABEL, STUDY_PASSWORDS, hash_password
from app.services.photos import save_stand_card
from app.services.weight import group_for_weight

DATA = Path(__file__).resolve().parent / "demo_data.json"

USERS = [
    {
        "id": "USR-01",
        "login": "controller",
        "name": "Мамбетов Р. Р.",
        "role": "controller",
        "point": "ПВЗ #5042",
    },
    {
        "id": "USR-02",
        "login": "accounting",
        "name": "Соколова Е. М.",
        "role": "accounting",
        "point": "ЦО 5Post (Эскроу)",
    },
    {
        "id": "USR-03",
        "login": "admin",
        "name": "Черакаев А. А.",
        "role": "admin",
        "point": "Все точки 5Post",
    },
    {
        "id": "USR-04",
        "login": "security",
        "name": "Служба безопасности",
        "role": "security",
        "point": "Дашборд споров",
    },
]


def seed_if_empty(db) -> None:
    ensure_indexes(db)
    if db.users.count_documents({}) == 0:
        for user in USERS:
            db.users.insert_one(
                {
                    **user,
                    "roleLabel": ROLE_LABEL[user["role"]],
                    "status": "Активен",
                    "passwordHash": hash_password(STUDY_PASSWORDS[user["login"]]),
                }
            )
    if db.settings.count_documents({"_id": "app"}) == 0:
        db.settings.insert_one(
            {
                "_id": "app",
                "commissionRate": 0.03,
                "tariffs": {"0-3": 600, "3-20": 1100, "20+": 1750},
                "steps": {
                    "send": [
                        "Коробка вскрыта под камерой, товар соответствует описанию",
                        "Серийный номер и пломбы совпадают",
                        "Брак и повреждения отсутствуют",
                    ],
                    "return": [
                        "Возврат вскрыт под камерой: подмены нет",
                        "Серийный номер и пломбы совпадают с отправкой",
                        "Товар в порядке, новых дефектов нет",
                    ],
                },
            }
        )
    if db.orders.count_documents({}) == 0:
        demo = json.loads(DATA.read_text(encoding="utf-8"))
        for order in demo["orders"]:
            order["group"] = group_for_weight(float(order["weightKg"]))
            order["createdAt"] = datetime.now().isoformat(timespec="seconds")
            order.setdefault("photoPath", "")
            db.orders.insert_one(order)
            if order["stage"] == "deal_closed" and order["group"] == "0-3":
                name = save_stand_card(order)
                db.orders.update_one({"id": order["id"]}, {"$set": {"photoPath": name}})
        for log in demo["logs"]:
            log["createdAt"] = datetime.now().isoformat(timespec="seconds")
            db.logs.insert_one(log)


def load_settings(db) -> dict:
    doc = db.settings.find_one({"_id": "app"})
    if doc is None:
        seed_if_empty(db)
        doc = db.settings.find_one({"_id": "app"})
    return doc


def new_qr(db) -> str:
    for _ in range(8):
        qr = f"5POST-QR-{secrets.randbelow(90000) + 10000}"
        if db.orders.count_documents({"qr": qr}) == 0:
            return qr
    raise RuntimeError("Не удалось выдать уникальный QR")


def state_payload(db) -> dict:
    settings_doc = load_settings(db)
    users = [public(user) for user in db.users.find({}, {"passwordHash": 0}).sort("id", 1)]
    orders = [public(order) for order in db.orders.find().sort("createdAt", -1)]
    logs = [public(log) for log in db.logs.find().sort("createdAt", -1)]
    return {
        "commissionRate": settings_doc["commissionRate"],
        "tariffs": settings_doc["tariffs"],
        "steps": settings_doc.get("steps", {}),
        "users": users,
        "orders": orders,
        "logs": logs,
    }
