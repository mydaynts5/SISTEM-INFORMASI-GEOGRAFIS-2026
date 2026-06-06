# WebGIS Fasilitas Publik - 123140076

Sistem Informasi Geografis berbasis Web (*WebGIS*) yang mengintegrasikan pengolahan database relasional spasial, server API asinkron, serta antarmuka pemetaan responsif. Sistem dibangun menggunakan teknologi **PostGIS** sebagai penyimpan data spasial, **FastAPI** sebagai penyedia layanan backend asinkron terproteksi, serta **ReactJS & Leaflet** sebagai penampil peta interaktif di sisi pengguna.

Sistem dilengkapi dengan sistem keamanan **JSON Web Token (JWT)** untuk mengamankan operasi pembaruan dan manipulasi data spasial (CRUD), serta fitur kueri jangkauan radius (*Nearby*) yang ter-visualisasi secara waktu-nyata di peta dasar.

---

## 🛠️ Tech Stack (Teknologi yang Digunakan)

*   **Database:** PostgreSQL dengan Ekstensi Spasial PostGIS.
*   **Backend:** FastAPI (Python), `asyncpg` (driver database asinkron), `pydantic` (validasi tipe data), `python-jose` (keamanan JWT), `passlib` (enkripsi kata sandi).
*   **Frontend:** ReactJS, Vite, React-Leaflet, Axios, CSS (Tata letak penuh layar fleksibel).

---

## 🌟 Fitur Utama Sistem

1.  **Peta Dasar Interaktif:** Peta responsif penuh layar yang terfokus pada wilayah dari database.
2.  **Simbologi Dinamis:** Penanda spasial berupa lingkaran kustom berwarna-warni (`L.circleMarker`) yang ter-render otomatis sesuai dengan kategori aslinya dari database.
3.  **Kueri Jangkauan Radius (Nearby Search):** Pencarian spasial ter-optimasi menggunakan fungsi `ST_DWithin` PostGIS. Radius pencarian dapat digambar secara dinamis berupa poligon lingkaran biru putus-putus di atas peta.
4.  **Autentikasi Aman (JWT):** Pembatasan operasi sensitif (tambah, perbarui, hapus data) hanya untuk pengguna terautentikasi menggunakan bearer token.
5.  **Manajemen Spasial (CRUD) di Sidebar Kiri:** Panel kontrol untuk memudahkan registrasi data baru, pengeditan langsung lewat klik penanda peta, serta penghapusan data secara waktu nyata.

---

## 📂 Struktur Direktori Proyek

```text
Tugas-Praktikum-076/
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
    *(Database dapat dilihat di database.sql)*.

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

### 3. Konfigurasi dan Menjalankan Antarmuka Frontend (React + Vite) [8]

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