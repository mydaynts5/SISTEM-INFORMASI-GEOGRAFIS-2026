import cv2
import numpy as np
import rasterio
from ultralytics import YOLO
import asyncpg
import asyncio
import os
from dotenv import load_dotenv

# Memuat konfigurasi koneksi database
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def create_tiles(image, tile_size=640, overlap=128):
    """
    Memotong citra satelit/aerial berukuran besar menjadi ubin (tiles) kecil.
    Menggunakan overlap untuk menghindari terpotongnya objek di bagian tepi ubin.
    """
    tiles = []
    coords = []
    h, w = image.shape[:2]
    step = tile_size - overlap
    
    for y in range(0, h - tile_size + 1, step):
        for x in range(0, w - tile_size + 1, step):
            tile = image[y:y+tile_size, x:x+tile_size]
            tiles.append(tile)
            coords.append((x, y))
            
    return tiles, coords

def detect_and_georeference(image_path, model_path='yolov8n.pt', tile_size=640, overlap=128):
    """
    Membaca citra GeoTIFF, menjalankan kognisi deteksi objek YOLOv8, 
    lalu mengonversi koordinat piksel hasil deteksi menjadi koordinat geografis (WGS84).
    """
    # Membaca citra dan transformasi afinitas menggunakan Rasterio
    with rasterio.open(image_path) as src:
        transform = src.transform # Membaca matriks transformasi (piksel -> geo)
        img_data = src.read([1, 2, 3]) # Membaca 3 band warna (RGB)
        
        # Konversi bentuk dimensi array ke standar OpenCV (height, width, channels)
        img = np.transpose(img_data, (1, 2, 0))
        # Konversi warna dari RGB ke BGR karena OpenCV membaca BGR secara native
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Memanggil arsitektur model YOLOv8
    model = YOLO(model_path)

    # Menjalankan proses pemotongan citra (tiling)
    tiles, coords = create_tiles(img_bgr, tile_size, overlap)
    print(f"Sistem sukses memotong citra menjadi {len(tiles)} ubin.")

    geo_detections = []
    # Daftar nama kategori kelas target deteksi spasial AI
    class_names = [
        'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
        'fire hydrant', 'stop sign', 'parking meter'
    ]

    # Melakukan deteksi objek (inference) pada setiap ubin
    for tile, (offset_x, offset_y) in zip(tiles, coords):
        results = model(tile, verbose=False)
        
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            # Menghitung posisi koordinat piksel pusat objek pada citra global
            cx_pixel = ((x1 + x2) / 2) + offset_x
            cy_pixel = ((y1 + y2) / 2) + offset_y

            # Mengalikan koordinat piksel dengan matriks afinitas untuk mendapatkan Bujur & Lintang
            lon, lat = transform * (cx_pixel, cy_pixel)

            # Menyimpan hasil ekstraksi data spasial
            geo_detections.append({
                'class_name': class_names[cls] if cls < len(class_names) else 'object',
                'confidence': conf,
                'longitude': lon,
                'latitude': lat
            })

    print(f"Total objek spasial terdeteksi: {len(geo_detections)}")
    return geo_detections

async def save_to_postgis(geo_detections):
    """Menyimpan hasil ekstraksi koordinat spasial AI ke PostGIS secara asinkron"""
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Membuat tabel detections otomatis jika belum terbuat di database
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id SERIAL PRIMARY KEY,
            class_name VARCHAR(50) NOT NULL,
            confidence FLOAT NOT NULL,
            geom GEOMETRY(Point, 4326) NOT NULL,
            detected_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Menyisipkan koordinat titik spasial secara non-blocking
    for det in geo_detections:
        await conn.execute("""
            INSERT INTO detections (class_name, confidence, geom)
            VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        """, det['class_name'], det['confidence'], det['longitude'], det['latitude'])
        
    await conn.close()
    print("Sistem asinkron berhasil menyimpan seluruh hasil deteksi spasial ke PostGIS!")

if __name__ == "__main__":
    # Jalankan alur kerja (pipeline) Spatial AI terstruktur
    image_file = 'aerial_image.tif' 
    
    if os.path.exists(image_file):
        # Jalankan ekstraksi model
        pixel_results = run_detection = detect_and_georeference(image_file, 'yolov8n.pt')
        # Eksekusi penyimpanan asinkron ke database PostGIS
        asyncio.run(save_to_postgis(pixel_results))
    else:
        print(f"File citra '{image_file}' tidak ditemukan di folder utama backend!")