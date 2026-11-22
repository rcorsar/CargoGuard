import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _path(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    return Path(raw) if raw else default


class Settings:
    # Адрес базы и папка фото читаются снаружи, чтобы тот же код
    # позже смотрел на купленный хостинг, а не на этот компьютер.
    mongo_url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
    mongo_db = os.environ.get("MONGO_DB", "cargoguard")
    photo_dir = _path("PHOTO_DIR", ROOT / "photos")
    host = os.environ.get("APP_HOST", "127.0.0.1")
    port = int(os.environ.get("APP_PORT", "8000"))


settings = Settings()
settings.photo_dir.mkdir(parents=True, exist_ok=True)
