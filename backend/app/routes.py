from fastapi import APIRouter, File, Form, Query, UploadFile
from fastapi.responses import FileResponse

from app.db import get_db, public
from app.errors import AppError
from app.security import password_matches
from app.services import orders as order_service
from app.services.photos import photo_file
from app.services.seed import state_payload

router = APIRouter()


@router.get("/health")
def health():
    get_db().command("ping")
    return {"ok": True, "mongo": True}


@router.get("/state")
def state():
    return state_payload(get_db())


@router.post("/login")
def login(body: dict):
    login_name = str(body.get("login") or "").strip()
    user = get_db().users.find_one({"login": login_name})
    if user is None or not password_matches(str(body.get("password") or ""), user["passwordHash"]):
        raise AppError(401, "Неверный логин или пароль")
    return {"user": public(user)}


@router.post("/orders")
def create_order(body: dict):
    return order_service.create_order(get_db(), body)


@router.post("/orders/{order_id}/photo")
async def photo(
    order_id: str,
    role: str | None = Form(None),
    actorName: str = Form(""),
    file: UploadFile | None = File(None),
):
    payload = await file.read() if file is not None else None
    return order_service.attach_photo(
        get_db(),
        order_id,
        {"role": role, "actorName": actorName},
        payload,
    )


@router.post("/orders/{order_id}/photo-card")
def photo_card(order_id: str, body: dict):
    return order_service.attach_photo(get_db(), order_id, body, None)


@router.get("/orders/{order_id}/photo")
def read_photo(order_id: str):
    order = get_db().orders.find_one({"id": order_id})
    if order is None or not order.get("photoPath"):
        raise AppError(404, "Фото не найдено")
    return FileResponse(photo_file(order["photoPath"]))


@router.post("/orders/{order_id}/inspect")
def inspect(order_id: str, body: dict):
    return order_service.inspect_order(get_db(), order_id, body)


@router.post("/orders/{order_id}/complete")
def complete(order_id: str, body: dict):
    return order_service.complete_order(get_db(), order_id, body)


@router.post("/orders/{order_id}/return")
def send_return(order_id: str, body: dict):
    return order_service.return_order(get_db(), order_id, body)


@router.post("/admin/settings")
def settings(body: dict):
    return order_service.save_settings(get_db(), body)


@router.delete("/orders/{order_id}")
def remove_order(order_id: str, role: str | None = Query(None), actorName: str = Query("")):
    return order_service.delete_order(get_db(), order_id, role, actorName)


@router.delete("/logs/{log_id}")
def remove_log(log_id: str, role: str | None = Query(None)):
    return order_service.delete_log(get_db(), log_id, role)
