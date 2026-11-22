# -*- coding: utf-8 -*-
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CHECKS = json.loads((ROOT / "backend" / "course_checks.json").read_text(encoding="utf-8"))
PHOTO = ROOT / "backend" / "photos" / "BOX-098.png"
OUT_REPO = ROOT / "docs" / "course"
OUT_LOCAL = Path(r"C:\Users\print\OneDrive\Desktop\Файлы Учебы - Быстрый Доступ\Проектированние Информационных Систем\Курсовой_БД")
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


def font(size, bold=False):
    path = FONT_BOLD if bold else FONT
    return ImageFont.truetype(str(path), size)


def schema_image(path: Path) -> None:
    image = Image.new("RGB", (1600, 980), "#f7f5f2")
    draw = ImageDraw.Draw(image)
    draw.text((48, 36), "Cargo Guard. Коллекции MongoDB", font=font(32, True), fill="#1f2933")
    draw.text((48, 84), "Учебный стенд. Фото лежит файлом, в заказе хранится путь.", font=font(20), fill="#52606d")
    cards = [
        ("users", ["login, хеш пароля", "роль: admin, controller,", "accounting, security", "имя, точка"]),
        ("orders", ["номер, QR, масса", "группа считает сервер", "стадия, сумма, комиссия", "photoPath, шаги осмотра"]),
        ("logs", ["кто, когда, заказ", "действие и исход", "удаление заказа пишет строку", "повтор закрытия её не двоит"]),
        ("settings", ["комиссия, три тарифа", "тексты шагов чек-листа", "границы 3 и 20 кг", "в этот документ не входят"]),
    ]
    colors = ["#1f4b6e", "#0f6e56", "#8a4b08", "#5b3d8f"]
    for index, (title, lines) in enumerate(cards):
        x = 48 + (index % 2) * 760
        y = 150 + (index // 2) * 390
        draw.rounded_rectangle((x, y, x + 700, y + 340), radius=18, fill="white", outline=colors[index], width=4)
        draw.rectangle((x, y, x + 700, y + 64), fill=colors[index])
        draw.text((x + 24, y + 16), title, font=font(28, True), fill="white")
        line_y = y + 96
        for line in lines:
            draw.text((x + 28, line_y), line, font=font(24), fill="#1f2933")
            line_y += 48
    image.save(path)


def checks_image(path: Path) -> None:
    height = 120 + len(CHECKS) * 52
    image = Image.new("RGB", (1500, height), "#f7f5f2")
    draw = ImageDraw.Draw(image)
    draw.text((40, 28), "Проверки правил сервера", font=font(30, True), fill="#1f2933")
    y = 90
    for item in CHECKS:
        mark = "пройдено" if item["ok"] else "ошибка"
        color = "#0f6e56" if item["ok"] else "#9b1c1c"
        draw.rounded_rectangle((40, y, 1460, y + 44), radius=8, fill="white", outline="#e4e7eb")
        draw.text((56, y + 8), mark, font=font(20, True), fill=color)
        draw.text((210, y + 8), item["name"], font=font(20), fill="#1f2933")
        y += 52
    image.save(path)


def write_texts(folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "рисунки").mkdir(exist_ok=True)
    (folder / "00_запуск.txt").write_text(
        "\n".join(
            [
                "Запуск Cargo Guard на учебном стенде",
                "",
                "На компьютере уже есть Python 3.14, Git и MongoDB 8.2. Служба MongoDB запущена.",
                "Оболочка mongosh установлена. Compass нужен для снимков коллекций в пояснительную записку.",
                "",
                "1. Открыть каталог CargoGuard\\backend",
                "2. Один раз: python -m venv .venv",
                "3. Один раз: .\\.venv\\Scripts\\python -m pip install -r requirements.txt",
                "4. Запуск: .\\.venv\\Scripts\\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
                "5. Браузер: http://127.0.0.1:8000/",
                "",
                "Адрес базы и папка фото задаются переменными MONGO_URL и PHOTO_DIR.",
                "Сейчас это mongodb://127.0.0.1:27017 и каталог backend\\photos.",
                "Когда появится хостинг, меняются эти две строки. Правила массы остаются в коде сервера.",
                "",
                "Роли. Пароль совпадает с логином.",
                "admin, Черакаев А. А. Настройки, удаление с записью в журнал.",
                "controller, Мамбетов Р. Р. Осмотр, кадр, закрытие приёмки.",
                "accounting, Соколова Е. М. Заморозка, комиссия, отказ в ПВЗ.",
                "security. Только журнал и споры.",
                "",
                "Группа 0-3 кг не уходит в ПВЗ без файла кадра. Повтор того же закрытия вторую строку не пишет.",
                "Комиссию считает сервер. Номера счетов на экране учебные, перевода денег нет.",
            ]
        ),
        encoding="utf-8",
    )
    (folder / "01_коллекции.txt").write_text(
        "\n".join(
            [
                "База cargoguard, четыре коллекции.",
                "",
                "users. Учётная запись роли. Пароль хранится как хеш PBKDF2, в ответ API хеш не отдаётся.",
                "orders. Заказ экрана: QR, масса, группа, товар, стороны, сумма, стадия, статус денег, путь к фото, шаги.",
                "Группу пишет сервер: до 3 кг это 0-3, до 20 кг это 3-20, дальше 20+. В задании тяжёлая группа называется 20-100+ кг.",
                "logs. Кто выполнил действие, по какому заказу и с каким исходом.",
                "settings. Процент комиссии, три тарифа и тексты шагов. Границы массы в settings не лежат.",
                "",
                "Стадии заказа: warehouse_send, in_pvz, warehouse_return, deal_closed, return_completed, dispute_closed, cancelled_defect.",
                "Нет фото у группы 0-3 кг: стадия warehouse_send сохраняется, это не спор.",
                "Спор: возврат уже на проверке, и контролер не подтверждает вложение.",
                "",
                "Индексы: уникальные id и login, уникальные id и qr заказа, стадия заказа, id и boxId журнала.",
                "Второй щелчок закрытия не создаёт вторую строку: сервер меняет заказ только из ожидаемой стадии.",
            ]
        ),
        encoding="utf-8",
    )
    lines = ["Результаты автоматических проверок сервера.", ""]
    for item in CHECKS:
        lines.append(("Пройдено. " if item["ok"] else "Ошибка. ") + item["name"])
    (folder / "02_проверки.txt").write_text("\n".join(lines), encoding="utf-8")
    schema_image(folder / "рисунки" / "схема_коллекций.png")
    checks_image(folder / "рисунки" / "проверки.png")
    if PHOTO.exists():
        shutil.copy2(PHOTO, folder / "рисунки" / "кадр_осмотра.png")


def main():
    write_texts(OUT_REPO)
    if OUT_LOCAL.exists():
        shutil.rmtree(OUT_LOCAL)
    shutil.copytree(OUT_REPO, OUT_LOCAL)
    print("course files", OUT_REPO)
    print("local copy", OUT_LOCAL)


if __name__ == "__main__":
    main()
