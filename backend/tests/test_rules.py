import json
import os
import tempfile
from pathlib import Path

os.environ.setdefault("MONGO_DB", "cargoguard_test")
os.environ.setdefault("PHOTO_DIR", tempfile.mkdtemp(prefix="cg_photos_"))
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app

CHECKS: list[dict] = []


def record(name: str, ok: bool, detail: str) -> None:
    CHECKS.append({"name": name, "ok": ok, "detail": detail})
    assert ok, detail


@pytest.fixture
def client():
    db = get_db()
    for name in list(db.list_collection_names()):
        db[name].drop()
    with TestClient(app) as test_client:
        yield test_client


def _create(client, weight, amount=10000, role="accounting"):
    response = client.post(
        "/api/orders",
        json={
            "role": role,
            "actorName": "Соколова Е. М.",
            "buyer": "Покупатель",
            "buyerPhone": "+7 900 000-00-00",
            "buyerAccount": "счёт демо",
            "seller": "Продавец",
            "sellerAccount": "счёт демо",
            "name": "Тестовый товар",
            "specs": "S/N TEST",
            "weightKg": weight,
            "amount": amount,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["order"]


def test_weight_groups(client):
    light = _create(client, 1.8)
    middle = _create(client, 14)
    heavy = _create(client, 62)
    record("1,8 кг попадает в группу 0-3", light["group"] == "0-3", light["group"])
    record("14 кг попадает в группу 3-20", middle["group"] == "3-20", middle["group"])
    record("62 кг попадает в группу 20+", heavy["group"] == "20+", heavy["group"])


def test_light_order_needs_photo(client):
    order = _create(client, 1.8)
    refused = client.post(
        f"/api/orders/{order['id']}/inspect",
        json={
            "role": "controller",
            "actorName": "Мамбетов Р. Р.",
            "direction": "send",
            "approved": True,
            "qrScanned": True,
            "checklistOk": True,
        },
    )
    record(
        "Группа 0-3 кг без фото не закрывается",
        refused.status_code == 409 and "фото" in refused.json()["detail"],
        refused.text,
    )
    fresh = client.get("/api/state").json()
    same = next(item for item in fresh["orders"] if item["id"] == order["id"])
    record("После отказа стадия не меняется", same["stage"] == "warehouse_send", same["stage"])

    pictured = client.post(
        f"/api/orders/{order['id']}/photo-card",
        json={"role": "controller", "actorName": "Мамбетов Р. Р."},
    )
    record("Кадр осмотра сохраняется файлом", pictured.status_code == 200 and pictured.json()["photoPath"], pictured.text)
    closed = client.post(
        f"/api/orders/{order['id']}/inspect",
        json={
            "role": "controller",
            "actorName": "Мамбетов Р. Р.",
            "direction": "send",
            "approved": True,
            "qrScanned": True,
            "checklistOk": True,
        },
    )
    record("С фото осмотр уходит в ПВЗ", closed.status_code == 200 and closed.json()["order"]["stage"] == "in_pvz", closed.text)
    logs_before = client.get("/api/state").json()["logs"]
    close_logs = [item for item in logs_before if item["boxId"] == order["id"] and item["status"].startswith("Товар без брака")]
    again = client.post(
        f"/api/orders/{order['id']}/inspect",
        json={
            "role": "controller",
            "actorName": "Мамбетов Р. Р.",
            "direction": "send",
            "approved": True,
            "qrScanned": True,
            "checklistOk": True,
        },
    )
    logs_after = client.get("/api/state").json()["logs"]
    close_logs_after = [item for item in logs_after if item["boxId"] == order["id"] and item["status"].startswith("Товар без брака")]
    record(
        "Повторное закрытие не пишет вторую строку",
        again.status_code == 200 and again.json().get("repeated") is True and len(close_logs_after) == len(close_logs) == 1,
        f"{len(close_logs)} -> {len(close_logs_after)}",
    )


def test_dispute_and_roles(client):
    order = _create(client, 8)
    client.post(
        f"/api/orders/{order['id']}/inspect",
        json={
            "role": "controller",
            "direction": "send",
            "approved": True,
            "qrScanned": True,
            "checklistOk": True,
            "actorName": "Мамбетов Р. Р.",
        },
    )
    sent_back = client.post(
        f"/api/orders/{order['id']}/return",
        json={"role": "accounting", "actorName": "Соколова Е. М."},
    )
    record("Отказ в ПВЗ открывает проверку возврата", sent_back.json()["order"]["stage"] == "warehouse_return", sent_back.text)
    dispute = client.post(
        f"/api/orders/{order['id']}/inspect",
        json={
            "role": "controller",
            "direction": "return",
            "approved": False,
            "qrScanned": True,
            "checklistOk": False,
            "note": "вложение не совпало",
            "actorName": "Мамбетов Р. Р.",
        },
    )
    record("Несовпадение возврата закрывает спор", dispute.json()["order"]["stage"] == "dispute_closed", dispute.text)
    forbidden = client.delete(f"/api/orders/{order['id']}?role=controller")
    record("Контролер не удаляет закрытую запись", forbidden.status_code == 403, forbidden.text)
    security = client.post(
        "/api/orders",
        json={"role": "security", "buyer": "А", "seller": "Б", "name": "В", "weightKg": 1, "amount": 10},
    )
    record("Служба безопасности не создаёт заказ", security.status_code == 403, security.text)
    removed = client.delete(f"/api/orders/{order['id']}?role=admin&actorName=Черакаев А. А.")
    record("Администратор удаляет заказ и оставляет строку журнала", removed.status_code == 200, removed.text)


def test_commission_is_server_side(client):
    order = _create(client, 14, amount=10000)
    client.post(
        f"/api/orders/{order['id']}/inspect",
        json={
            "role": "controller",
            "direction": "send",
            "approved": True,
            "qrScanned": True,
            "checklistOk": True,
            "actorName": "Мамбетов Р. Р.",
        },
    )
    done = client.post(
        f"/api/orders/{order['id']}/complete",
        json={"role": "accounting", "actorName": "Соколова Е. М.", "sellerPayout": 1},
    )
    body = done.json()["order"]
    record("Комиссию 3% считает сервер", body["commission"] == 300 and body["sellerPayout"] == 9700, str(body))
    logs_before = len(client.get("/api/state").json()["logs"])
    again = client.post(
        f"/api/orders/{order['id']}/complete",
        json={"role": "accounting", "actorName": "Соколова Е. М."},
    )
    logs_after = len(client.get("/api/state").json()["logs"])
    record(
        "Повторное закрытие сделки не добавляет журнал",
        again.json().get("repeated") is True and logs_after == logs_before,
        f"{logs_before} -> {logs_after}",
    )


def test_login(client):
    ok = client.post("/api/login", json={"login": "admin", "password": "admin"})
    bad = client.post("/api/login", json={"login": "admin", "password": "нет"})
    record("Вход администратора по паролю стенда", ok.status_code == 200 and ok.json()["user"]["role"] == "admin", ok.text)
    record("Чужой пароль отклоняется", bad.status_code == 401, bad.text)
    record("В ответе нет хеша пароля", "passwordHash" not in ok.json()["user"], str(ok.json()["user"].keys()))


@pytest.fixture(scope="session", autouse=True)
def save_checks():
    yield
    path = Path(__file__).resolve().parents[1] / "course_checks.json"
    path.write_text(json.dumps(CHECKS, ensure_ascii=False, indent=2), encoding="utf-8")
