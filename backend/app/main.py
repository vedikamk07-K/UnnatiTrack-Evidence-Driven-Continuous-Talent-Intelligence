from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import seed
from .config import get_settings
from .routers import api, auth


@asynccontextmanager
async def lifespan(_: FastAPI):
    seed.run()
    yield


s = get_settings()
app = FastAPI(title=s.app_name, version="0.1.0", lifespan=lifespan, description="Evidence · confidence · conflict detection · targeted action · verified growth.")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in s.allowed_origins.split(",")], allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(api.router)


@app.get("/health")
def health():
    return {"status": "ok"}
