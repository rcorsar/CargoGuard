from datetime import datetime

from pymongo import ReturnDocument

from app.db import public
from app.errors import AppError
from app.security import require_role
from app.services.journal import add_log, next_id
from app.services.money import rub, split_amount
from app.services.photos import save_stand_card, save_upload
from app.services.seed import load_settings, new_qr
from app.services.weight import group_for_weight


def _order(db, order_id: str) -> dict:
    doc = db.orders.find_one({"id": order_id})
    if doc is None:
        raise AppError(404, "Заказ не найден")
    return doc


def _move(db, order: dict, target: str, fields: dict) -> dict:
    # Условие по текущей стадии не даёт второму щелчку создать вторую закрытую запись.
    updated = db.orders.find_one_and_update(
        {"id": order["id"], "stage": order["stage"]},
        {"$set": fields | {"stage": target}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        fresh = _order(db, order["id"])
        if fresh["stage"] == target:
            return fresh
        raise AppError(409, "Состояние заказа уже изменилось")
    return updated


def _as_float(value, label: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise AppError(400, f"{label} указана неверно")


def _as_int(value, label: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        raise AppError(400, f"{label} указан неверно")


def create_order(db, body: dict) -> dict:
    require_role(body.get("role"), "create_order")
    weight = _as_float(body.get("weightKg"), "Масса")
    amount = _as_int(body.get("amount"), "Сумма")
    if amount <= 0:
        raise AppError(400, "Сумма заказа должна быть больше нуля")
    name = str(body.get("name") or "").strip()
    buyer = str(body.get("buyer") or "").strip()
    seller = str(body.get("seller") or "").strip()
    if not name or not buyer or not seller:
        raise AppError(400, "Нужны товар, покупатель и продавец")
    group = group_for_weight(weight)
    settings_doc = load_settings(db)
    order = {
        "id": next_id(db, "orders", "BOX-"),
        "qr": new_qr(db),
        "group": group,
        "weightKg": weight,
        "name": name,
        "specs": str(body.get("specs") or "Стандартная комплектация"),
        "seller": seller,
        "sellerAccount": str(body.get("sellerAccount") or ""),
        "buyer": buyer,
        "buyerPhone": str(body.get("buyerPhone") or ""),
        "buyerAccount": str(body.get("buyerAccount") or ""),
        "amount": amount,
        "commission": 0,
        "sellerPayout": 0,
        "dates": datetime.now().strftime("%d.%m %H:%M"),
        "defects": "Нет",
        "pay": int(settings_doc["tariffs"][group]),
        "stage": "warehouse_send",
        "moneyStatus": "Заморожены (Эскроу 5Post)",
        "photoPath": "",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    }
    db.orders.insert_one(order)
    rate = settings_doc["commissionRate"]
    commission, _payout = split_amount(amount, rate)
    log = add_log(
        db,
        order,
        "Бухгалтерия",
        f"Оплата и заморозка {rub(amount)} ₽ (комиссия {round(rate * 100)}%: {rub(commission)} ₽)",
        body.get("role"),
        str(body.get("actorName") or ""),
        True,
        0,
    )
    return {"order": public(order), "log": log}


def attach_photo(db, order_id: str, body: dict, payload: bytes | None) -> dict:
    require_role(body.get("role"), "photo")
    order = _order(db, order_id)
    had_photo = bool(order.get("photoPath"))
    if payload:
        name = save_upload(order_id, payload)
    else:
        name = save_stand_card(order)
    updated = db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": {"photoPath": name}},
        return_document=ReturnDocument.AFTER,
    )
    if had_photo:
        return {"order": public(updated), "photoPath": name}
    log = add_log(
        db,
        updated,
        "Осмотр",
        "Сохранён кадр осмотра",
        body.get("role"),
        str(body.get("actorName") or ""),
        True,
        0,
    )
    return {"order": public(updated), "log": log, "photoPath": name}


def inspect_order(db, order_id: str, body: dict) -> dict:
    require_role(body.get("role"), "inspect")
    order = _order(db, order_id)
    if not body.get("qrScanned"):
        raise AppError(409, "Сначала отсканируйте QR-код")
    direction = body.get("direction")
    approved = bool(body.get("approved"))
    note = str(body.get("note") or "").strip()
    settings_doc = load_settings(db)
    repeated_stage = {
        ("send", True): "in_pvz",
        ("send", False): "cancelled_defect",
        ("return", True): "return_completed",
        ("return", False): "dispute_closed",
    }.get((direction, approved))
    if repeated_stage and order["stage"] == repeated_stage:
        return {"order": public(order), "repeated": True}

    if direction == "send":
        if order["stage"] != "warehouse_send":
            raise AppError(409, "Осмотр отправки уже закрыт")
        if approved and not body.get("checklistOk"):
            raise AppError(409, "Пустой шаг чек-листа")
        # Нет фото у группы 0-3 кг. Это отказ закрытия, не спор.
        if approved and order["group"] == "0-3" and not order.get("photoPath"):
            raise AppError(409, "Группа 0-3 кг не закрывается без фото серийного номера")
        target = "in_pvz" if approved else "cancelled_defect"
        money = (
            "Заморожены (В ПВЗ покупателя)"
            if approved
            else "Возврат покупателю (Брак — отмена заказа)"
        )
        status = (
            "Товар без брака → Доставка в ПВЗ"
            if approved
            else "Брак → Возврат продавцу (3 дня) / отмена"
        )
        flow = "Отправка"
        step_key = "send"
    elif direction == "return":
        if order["stage"] != "warehouse_return":
            raise AppError(409, "Проверка возврата ещё не открыта")
        if approved and not body.get("checklistOk"):
            raise AppError(409, "Пустой шаг чек-листа")
        # Спор: фото уже есть, а проверка возврата не сошлась.
        target = "return_completed" if approved else "dispute_closed"
        money = (
            "Возвращено покупателю (Контролер)"
            if approved
            else "Выплачено продавцу (Спор 3 дня закрыт)"
        )
        status = (
            "Возврат денег покупателю и товара продавцу"
            if approved
            else "Спор 3 дня и выплата продавцу"
        )
        flow = "Возврат"
        step_key = "return"
    else:
        raise AppError(400, "Неизвестное направление осмотра")

    if note:
        status = f"{status} ({note})"
    steps = [{"text": text, "done": bool(body.get("checklistOk"))} for text in settings_doc["steps"][step_key]]
    updated = _move(
        db,
        order,
        target,
        {
            "moneyStatus": money,
            "defects": note or order.get("defects") or "Нет",
            "steps": steps,
        },
    )
    log = add_log(
        db,
        updated,
        flow,
        status,
        body.get("role"),
        str(body.get("actorName") or ""),
        approved,
        int(updated.get("pay") or 0),
    )
    return {"order": public(updated), "log": log, "repeated": False}


def complete_order(db, order_id: str, body: dict) -> dict:
    require_role(body.get("role"), "complete")
    order = _order(db, order_id)
    if order["stage"] == "deal_closed":
        return {"order": public(order), "repeated": True}
    if order["stage"] != "in_pvz":
        raise AppError(409, "Комиссия списывается, когда покупатель забрал товар")
    settings_doc = load_settings(db)
    rate = float(settings_doc["commissionRate"])
    commission, payout = split_amount(int(order["amount"]), rate)
    pct = round(rate * 100)
    updated = _move(
        db,
        order,
        "deal_closed",
        {
            "commission": commission,
            "sellerPayout": payout,
            "moneyStatus": f"Выплачено продавцу {rub(payout)} ₽ (Комиссия {pct}%: {rub(commission)} ₽)",
        },
    )
    log = add_log(
        db,
        updated,
        "Бухгалтерия",
        f"Сделка закрыта (комиссия {pct}%: {rub(commission)} ₽, продавцу: {rub(payout)} ₽)",
        body.get("role"),
        str(body.get("actorName") or ""),
        True,
        0,
    )
    return {"order": public(updated), "log": log, "repeated": False}


def return_order(db, order_id: str, body: dict) -> dict:
    require_role(body.get("role"), "return_order")
    order = _order(db, order_id)
    if order["stage"] == "warehouse_return":
        return {"order": public(order), "repeated": True}
    if order["stage"] != "in_pvz":
        raise AppError(409, "Отказ принимается из пункта выдачи")
    updated = _move(db, order, "warehouse_return", {"moneyStatus": "Заморожены (Возврат из ПВЗ)"})
    log = add_log(
        db,
        updated,
        "ПВЗ → Возврат",
        "Направлен на скан QR и проверку возврата",
        body.get("role"),
        str(body.get("actorName") or ""),
        False,
        0,
    )
    return {"order": public(updated), "log": log, "repeated": False}


def save_settings(db, body: dict) -> dict:
    require_role(body.get("role"), "settings")
    current = load_settings(db)
    rate = current["commissionRate"]
    tariffs = dict(current["tariffs"])
    if body.get("commissionPct") is not None:
        pct = _as_float(body["commissionPct"], "Комиссия")
        if pct < 0 or pct > 25:
            raise AppError(400, "Комиссия задаётся от 0 до 25 процентов")
        rate = pct / 100
    for key, field in (("0-3", "tariff1"), ("3-20", "tariff2"), ("20+", "tariff3")):
        if body.get(field) is None:
            continue
        value = _as_int(body[field], "Тариф")
        if value <= 0:
            raise AppError(400, "Тариф должен быть больше нуля")
        tariffs[key] = value
    db.settings.update_one({"_id": "app"}, {"$set": {"commissionRate": rate, "tariffs": tariffs}})
    return {"commissionRate": rate, "tariffs": tariffs}


def delete_order(db, order_id: str, role: str | None, actor_name: str) -> dict:
    require_role(role, "delete")
    order = _order(db, order_id)
    log = add_log(db, order, "Администратор", "Заказ удалён", role or "admin", actor_name, False, 0)
    db.orders.delete_one({"id": order_id})
    return {"deleted": order_id, "log": log}


def delete_log(db, log_id: str, role: str | None) -> dict:
    require_role(role, "delete")
    log = db.logs.find_one({"id": log_id})
    if log is None:
        raise AppError(404, "Строка журнала не найдена")
    db.logs.delete_one({"id": log_id})
    return {"deleted": log_id}
