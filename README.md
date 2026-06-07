# WebGIS Fasilitas Publik - 123140076

Sistem Informasi Geografis berbasis Web (*WebGIS*) yang mengintegrasikan pengolahan database relasional spasial PostGIS, server API asinkron FastAPI, serta antarmuka pemetaan responsif ReactJS & Leaflet, serta **Pipeline Kecerdasan Buatan Spasial (Spatial AI / GeoAI)** berbasis **YOLOv8**.

Sistem ini mendukung fungsionalitas deteksi objek otomatis pada citra penginderaan jauh (*remote sensing*) berformat GeoTIFF. Hasil koordinat piksel deteksi objek diterjemahkan secara otomatis menjadi derajat geografis global (EPSG:4326/WGS84) memanfaatkan matriks transformasi afinitas, disimpan ke PostGIS secara asinkron, dan divisualisasikan dalam bentuk layer GeoJSON pada antarmuka peta interaktif. Sistem juga dilengkapi dengan sistem keamanan **JSON Web Token (JWT)** untuk mengamankan operasi CRUD administratif.

---

## 🛠️ Tech Stack (Teknologi yang Digunakan)

*   **Database:** PostgreSQL dengan Ekstensi Spasial PostGIS.
*   **Backend:** FastAPI (Python), `asyncpg` (driver database asinkron), `pydantic` (validasi tipe data), `python-jose` (keamanan JWT), `passlib` (enkripsi kata sandi), `ultralytics` (YOLOv8 Engine), `opencv-python-headless` (computer vision), `rasterio` (georeferencing).
*   **Frontend:** ReactJS, Vite, React-Leaflet, Axios, CSS (Tata letak penuh layar fleksibel).

---

## 🌟 Fitur Utama Sistem

1.  **Peta Dasar Interaktif:** Peta responsif yang terfokus pada wilayah dari database.
2.  **Simbologi Dinamis:** Penanda spasial berupa lingkaran kustom berwarna-warni (`L.circleMarker`) yang ter-render otomatis sesuai dengan kategori aslinya dari database.
3.  **Pipeline Spasial AI (YOLOv8):** Mendeteksi objek secara otomatis (pohon, bangunan, kendaraan) dari citra drone/satelit GeoTIFF presisi tinggi.
4.  **Georeferencing Piksel ke Koordinat Bumi:** Mengonversi posisi piksel global (x, y) hasil deteksi menjadi koordinat geografis nyata (WGS84) memanfaatkan modul transformasi afinitas Rasterio.
5.  **Kueri Jangkauan Radius (Nearby Search):** Pencarian spasial ter-optimasi menggunakan fungsi `ST_DWithin` PostGIS.
6.  **Autentikasi Aman (JWT):** Pembatasan operasi sensitif (tambah, perbarui, hapus data) hanya untuk pengguna administratif terautentikasi.
7.  **Manajemen Spasial (CRUD):** Panel kontrol untuk memudahkan registrasi data baru, pengeditan langsung lewat klik penanda peta, serta penghapusan data secara waktu nyata.

---

## 📂 Struktur Direktori Proyek

```text
Tugas-Praktikum-076/
├── database.sql
├── .gitignore
├── webgis-api-076/  
│   ├── app/
│   │   ├── __pycache__/
│   │   ├── main.py          
│   │   ├── database.py  
│   │   ├── models/
│   │   │   ├── __pycache__/
│   │   │   ├── schemas.py
│   │   │   └── fasilitas.py 
│   │   ├── routers/
│   │   │   ├── __pycache__/
│   │   │   ├── auth.py  
│   │   │   └── fasilitas.py   
│   │   └── utils/
│   │       ├── __pycache__/
│   │       └── auth.py
│   ├── detect_pipeline.py
│   └── .env   
│
└── webgis-frontend-076/     
    ├── src/
    │   ├── components/
    │   │   └── MapView.jsx 
    │   ├── context/
    │   │   └── AuthContext.jsx 
    │   ├── services/
    │   │   └── api.js 
    │   ├── App.jsx   
    │   ├── App.css  
    │   └── main.jsx 
    ├── public/
    │   ├── marker-icon.png 
    │   ├── marker-shadow.png 
    │   ├── favicon.svg 
    │   └── icons.svg
    ├── package.json 
    └── vite.config.js
```
---

## Panduan Setup & Instalasi Sistem WebGIS Full-Stack

Panduan operasional ini memuat langkah-langkah rincian dan runtur untuk melakukan konfigurasi serta menjalankan sistem WebGIS secara lokal, meliputi subsistem database PostGIS, server backend FastAPI, dan antarmuka pemetaan ReactJS.

---

### 1. Persiapan Database (PostgreSQL / PostGIS)

1.  Buka aplikasi pgAdmin 4 dan hubungkan ke server PostgreSQL lokal.
2.  Buat database spasial baru bernama **`sig_123140076`**.
3.  Buka **Query Tool** pada database baru tersebut, lalu jalankan kueri untuk mengaktifkan ekstensi spasial PostGIS:
    ```sql
    CREATE EXTENSION postgis;
    ```
4.  Buat tabel relasional `users` dan `fasilitas_publik` menggunakan perintah DDL berikut untuk menampung data atribut dan spasial:
    ```sql
    -- Tabel penyimpanan pengguna terautentikasi
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
    );

    -- Tabel penyimpanan data spasial fasilitas publik (Point)
    CREATE TABLE fasilitas_publik (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        jenis VARCHAR(50),
        alamat TEXT,
        geom GEOMETRY(Point, 4326)
    );
    ```
    *(Kueri SQL lengkap di atas dapat dilihat di berkas `database.sql` pada root folder).*

---

### 2. Konfigurasi dan Menjalankan Server Backend (FastAPI) [7]

1.  Buka jendela terminal baru pada VS Code, lalu arahkan direktori aktif ke dalam folder proyek backend:
    ```bash
    cd webgis-api-076
    ```
2.  Inisialisasi lingkungan virtual Python (*virtual environment*) tanpa pip bawaan untuk mencegah kendala macet di sistem operasi Windows:
    ```bash
    python -m venv venv --without-pip
    ```
3.  Aktifkan lingkungan virtual yang telah dibuat:
    *   **Windows PowerShell:**
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **Windows Command Prompt (CMD):**
        ```cmd
        .\venv\Scripts\activate
        ```
    *   **Mac / Linux:**
        ```bash
        source venv/bin/activate
        ```
    *(Tanda sukses: Muncul indikator `(venv)` di sebelah kiri baris perintah terminal)*.

4.  Pasang manajer paket `pip` secara manual, disusul dengan pemasangan seluruh dependensi backend:
    ```bash
    # Mengunduh skrip bootstrap pip resmi
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    
    # Memasang pip
    python get-pip.py
    
    # Menghapus sisa berkas skrip bootstrap
    Remove-Item get-pip.py
    
    # Memasang semua pustaka dependensi inti backend
    pip install fastapi uvicorn asyncpg python-dotenv pydantic "python-jose[cryptography]" "passlib[bcrypt]" email-validator "bcrypt==4.0.1"
    ```
5.  Buat berkas konfigurasi rahasia baru bernama **`.env`** di dalam folder `webgis-api-076`, lalu isi dengan baris berikut:
    ```env
    # Sesuaikan password_pgadmin_anda dan nama_database dengan kata sandi dan nama database asli akun pgAdmin lokal
    DATABASE_URL=postgresql://postgres:password_pgadmin_anda@localhost:5432/nama_database
    ```
6.  Jalankan server asinkron Uvicorn:
    ```bash
    uvicorn app.main:app --reload
    ```
    *Log terminal akan menunjukkan status aktif: `Database connected successfully!` dan server siap melayani request spasial di alamat `http://localhost:8000`*.

---

### 3. Eksekusi Skrip Pipeline Spasial AI (YOLOv8 + Rasterio)

1.  Salin berkas citra drone/satelit GeoTIFF (misalnya: `aerial_image.tif`) ke dalam folder `webgis-api-076/`.
2.  Buka berkas `detect_pipeline.py`, lalu sesuaikan nama berkas citra spasial Anda pada baris paling bawah:
    ```python
    image_file = 'aerial_image.tif' # Ganti sesuai nama berkas citra asli yang diletakkan
    ```
3.  Jalankan skrip kognisi spasial di terminal backend (pastikan virtual environment aktif):
    ```bash
    python detect_pipeline.py
    ```
    *Sistem otomatis memproses pemotongan ubin (tiling), mendeteksi objek via YOLOv8, menerjemahkan koordinat piksel ke geografis via Rasterio, dan menyimpan hasilnya ke database PostGIS*.

---

### 4. Konfigurasi dan Menjalankan Antarmuka Frontend (React + Vite) [8]

1.  Buka jendela terminal baru (terpisah dari terminal backend) dan masuk ke direktori proyek frontend:
    ```bash
    cd webgis-frontend-076
    ```
2.  Pasang semua modul dependensi Node.js secara lokal sesuai manifes `package.json`:
    ```bash
    npm install
    ```
3.  Jalankan server pengembangan lokal Vite:
    ```bash
    npm run dev
    ```
    *Aplikasi pemetaan interaktif WebGIS siap diakses menggunakan browser web di alamat `http://localhost:5173`*.

---

## 📸 Dokumentasi Sistem

Berikut lampiran gambar dokumentasi sistem di bawah ini untuk menunjukkan status berjalan proyek:

### 1. Terminal Uvicorn & Database Connected
*![Database Connected](image.png)*

### 2. Dasbor Pengujian Swagger UI (`/docs`)
*![Swagger UI](image-1.png)*

### 3. Tampilan Utuh WebGIS Spasial AI (Peta Penuh Layar)
*![Webgis (Fasilitas Publik)](image-2.png)*
*![Webgis (YOLOv8))](image-3.png)*