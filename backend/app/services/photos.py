from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.config import settings
from app.errors import AppError

FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def save_upload(order_id: str, payload: bytes) -> str:
    if not payload:
        raise AppError(400, "Файл фото пустой")
    name = f"{order_id}.png"
    (settings.photo_dir / name).write_bytes(payload)
    return name


def save_stand_card(order: dict) -> str:
    # На стенде кнопка скана ещё не берёт поток веб-камеры.
    # Сервер пишет карточку кадра: QR, масса, время. Тот же путь потом примет настоящий файл.
    image = Image.new("RGB", (880, 520), "#f4f1ea")
    draw = ImageDraw.Draw(image)
    draw.rectangle((24, 24, 856, 496), outline="#1f2933", width=3)
    draw.text((48, 48), "Cargo Guard", font=_font(28, True), fill="#1f2933")
    draw.text((48, 96), "Кадр осмотра, учебный стенд", font=_font(22), fill="#52606d")
    lines = [
        f"Заказ: {order['id']}",
        f"QR: {order['qr']}",
        f"Масса: {order['weightKg']} кг, группа {order['group']}",
        f"Товар: {order['name']}",
        f"Время: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}",
    ]
    y = 170
    for line in lines:
        draw.text((48, y), line, font=_font(24), fill="#1f2933")
        y += 46
    name = f"{order['id']}.png"
    image.save(settings.photo_dir / name, "PNG")
    return name


def photo_file(name: str) -> Path:
    path = (settings.photo_dir / name).resolve()
    root = settings.photo_dir.resolve()
    if root not in path.parents and path != root:
        raise AppError(404, "Фото не найдено")
    if not path.is_file():
        raise AppError(404, "Фото не найдено")
    return path
