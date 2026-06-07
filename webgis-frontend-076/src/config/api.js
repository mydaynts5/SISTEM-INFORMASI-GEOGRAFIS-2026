import axios from 'axios';

// Pembuatan instansi Axios dengan konfigurasi terpusat
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;