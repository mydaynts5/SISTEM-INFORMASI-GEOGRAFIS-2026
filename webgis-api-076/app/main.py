from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_pool, close_pool
from app.routers import auth, fasilitas, detections
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    print("Database connected successfully!")
    yield
    await close_pool()
    print("Database disconnected successfully!")

app = FastAPI(
    title="WebGIS API - 123140076",
    description="REST API Spasial asinkron berbasis FastAPI dan PostGIS",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daftarkan router detections ke aplikasi utama
app.include_router(auth.router)
app.include_router(fasilitas.router)
app.include_router(detections.router)