from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_pool, close_pool
from app.routers import auth, fasilitas
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup asinkron connection pool saat server menyala
    await get_pool()
    yield
    # Penutupan asinkron connection pool saat server dimatikan
    await close_pool()

app = FastAPI(
    title="WebGIS API - 123140076",
    lifespan=lifespan
)

# Konfigurasi domain asal yang diizinkan bertransaksi data
origins = [
    "http://localhost:5173", # Port Vite dev
    "http://localhost:3000", # Port React standar
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mendaftarkan router endpoint spasial dan autentikasi
app.include_router(auth.router)
app.include_router(fasilitas.router)