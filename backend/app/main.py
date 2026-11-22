from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.db import get_db
from app.errors import AppError
from app.routes import router
from app.services.seed import seed_if_empty

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db = get_db()
    db.command("ping")
    seed_if_empty(db)
    yield


app = FastAPI(title="Cargo Guard", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")


@app.exception_handler(AppError)
async def app_error(_request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status, content={"detail": exc.detail})


if FRONTEND.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
