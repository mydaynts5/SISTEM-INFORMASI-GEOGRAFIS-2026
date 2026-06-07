from fastapi import APIRouter
from app.database import get_pool
import json

router = APIRouter(prefix="/api/detections", tags=["Detections"])

@router.get("/geojson")
async def get_detections_geojson():
    """Mengambil seluruh data hasil deteksi AI terformat murni OGC GeoJSON"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, class_name, confidence, ST_AsGeoJSON(geom) as geom 
            FROM detections
        """)
    features = []
    for r in rows:
        features.append({
            "type": "Feature",
            "geometry": json.loads(r["geom"]), # json.loads mengubah string GeoJSON menjadi objek JSON asli
            "properties": {
                "id": r["id"],
                "class_name": r["class_name"],
                "confidence": r["confidence"]
            }
        })
    return {
        "type": "FeatureCollection",
        "features": features
    }