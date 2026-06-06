from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_pool
from app.models.schemas import FasilitasCreate, FasilitasUpdate
from app.utils.auth import get_current_user
import json

router = APIRouter(prefix="/api/fasilitas", tags=["fasilitas"])

@router.get("/")
async def get_fasilitas(jenis: str = None, limit: int = 100, offset: int = 0):
    """Membaca semua data spasial dengan dukungan parameter filter dan paginasi"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        query = """
            SELECT id, nama, jenis, alamat, ST_X(geom) as lon, ST_Y(geom) as lat
            FROM fasilitas_publik
            WHERE ($1::text IS NULL OR jenis = $1)
            ORDER BY nama LIMIT $2 OFFSET $3
        """
        rows = await conn.fetch(query, jenis, limit, offset)
        return [dict(r) for r in rows]

@router.get("/geojson")
async def get_geojson():
    """Mengonversi koordinat biner menjadi standar spasial OGC GeoJSON"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, nama, jenis, alamat, ST_AsGeoJSON(geom) as geom FROM fasilitas_publik")
        features = []
        for r in rows:
            features.append({
                "type": "Feature",
                "geometry": json.loads(r["geom"]),
                "properties": {"id": r["id"], "nama": r["nama"], "jenis": r["jenis"], "alamat": r["alamat"]}
            })
        return {"type": "FeatureCollection", "features": features}

@router.get("/nearby")
async def get_nearby(
    lat: float = Query(..., description="Latitude lokasi pusat"),
    lon: float = Query(..., description="Longitude lokasi pusat"),
    radius: int = Query(1000, description="Radius pencarian dalam meter")
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Menggunakan ST_MakePoint untuk kestabilan kalkulasi geodesik di semua versi PostGIS
        rows = await conn.fetch("""
            SELECT id, nama, jenis, alamat,
                   ROUND(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 2) as jarak_m
            FROM fasilitas_publik
            WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
            ORDER BY jarak_m ASC
        """, lon, lat, radius)
    return [dict(row) for row in rows]

@router.post("/", status_code=201)
async def create_fasilitas(data: FasilitasCreate, user: str = Depends(get_current_user)):
    """Memasukkan data spasial baru - Terproteksi Token JWT"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO fasilitas_publik (nama, jenis, alamat, geom)
            VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))
            RETURNING id, nama, jenis
        """, data.nama, data.jenis, data.alamat, data.longitude, data.latitude)
        return dict(row)

@router.put("/{id}")
async def update_fasilitas(id: int, data: FasilitasUpdate, user: str = Depends(get_current_user)):
    """Memperbarui data spasial secara parsial menggunakan COALESCE - Terproteksi Token JWT"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE fasilitas_publik SET
                nama = COALESCE($2, nama),
                jenis = COALESCE($3, jenis),
                alamat = COALESCE($4, alamat),
                geom = CASE 
                    WHEN $5::float IS NOT NULL AND $6::float IS NOT NULL 
                    THEN ST_SetSRID(ST_Point($5, $6), 4326)
                    ELSE geom
                END
            WHERE id = $1
            RETURNING id, nama, jenis
        """, id, data.nama, data.jenis, data.alamat, data.longitude, data.latitude)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return dict(row)

@router.delete("/{id}", status_code=204)
async def delete_fasilitas(id: int, user: str = Depends(get_current_user)):
    """Menghapus data spasial - Terproteksi Token JWT"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM fasilitas_publik WHERE id=$1", id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Not found")
        return None