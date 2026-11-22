from datetime import datetime

from app.db import public
from app.security import ROLE_LABEL


def now_hm() -> str:
    return datetime.now().strftime("%H:%M")


def next_id(db, collection: str, prefix: str) -> str:
    best = 0
    for doc in db[collection].find({}, {"id": 1}):
        raw = str(doc.get("id", ""))
        if not raw.startswith(prefix):
            continue
        tail = raw[len(prefix):]
        if tail.isdigit():
            best = max(best, int(tail))
    return f"{prefix}{best + 1}"


def add_log(db, order: dict, flow: str, status: str, role: str, actor_name: str, ok: bool, pay: int = 0) -> dict:
    label = ROLE_LABEL.get(role, role)
    actor = actor_name.strip() if actor_name else label
    if not actor.endswith(")"):
        actor = f"{actor} ({label})"
    doc = {
        "id": next_id(db, "logs", "LOG-"),
        "time": now_hm(),
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "boxId": order["id"],
        "qr": order["qr"],
        "flow": flow,
        "item": order["name"],
        "weight": f"{order['weightKg']} кг",
        "parties": f"{order['seller']} / {order['buyer']}",
        "status": status,
        "actor": actor,
        "role": role,
        "ok": ok,
        "pay": pay,
    }
    db.logs.insert_one(doc)
    return public(doc)
