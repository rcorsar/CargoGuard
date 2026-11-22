# CargoGuard (5Post)

Информационная система контроля целостности и антифрода высокотехнологичной продукции в сети пунктов выдачи 5Post.

Сервер и правила приёмки лежат на ветке `backend/mongo`. В `main` их нет. Полный список изменений, роли и запуск для напарника: [docs/изменения.md](docs/изменения.md).

## Структура репозитория
- `frontend/` — страница в браузере.
- `backend/` — Python, REST и MongoDB. Запуск и роли описаны в `backend/README.md`.
- `docs/course/` — схемы и результаты проверок для пояснительной записки.
- `docs/изменения.md` — что сделано на ветке и как открыть стенд.

## Запуск стенда
Сначала перейти на ветку с сервером: `git checkout backend/mongo`. Служба MongoDB должна быть запущена. Дальше:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Откройте http://127.0.0.1:8000/

Если сервер выключен, страница открывается файлом `frontend/index.html` и хранит демо-данные в браузере.
