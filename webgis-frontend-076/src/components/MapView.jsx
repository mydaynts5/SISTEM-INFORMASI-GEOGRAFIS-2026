import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Circle, useMapEvents } from 'react-leaflet';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import L from 'leaflet';

// Komponen Pembantu untuk menangkap klik pada peta dasar
function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng); // Mengirimkan koordinat klik ke fungsi penangan utama
    }
  });
  return null;
}

function MapView() {
  const [data, setData] = useState(null);
  const [originalData, setOriginalData] = useState([]);
  const { user } = useAuth();
  
  // State untuk form CRUD Fasilitas Publik
  const [form, setForm] = useState({ id: null, nama: '', jenis: '', alamat: '', lat: '', lon: '' });
  const [showCrudForm, setShowCrudForm] = useState(false);

  // State untuk filter kategori dan daftar fasilitas (GET All)
  const [filterJenis, setFilterJenis] = useState('Semua');
  const [daftarFasilitas, setDaftarFasilitas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk detail fasilitas terpilih (GET by ID)
  const [detailFasilitas, setDetailFasilitas] = useState(null);

  // State untuk fungsionalitas Kueri Radius (Nearby Search)
  const [nearbyForm, setNearbyForm] = useState({ lat: '', lon: '', radius: 1000 });
  const [nearbyResults, setNearbyResults] = useState([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbyCenter, setNearbyCenter] = useState(null);

  // STATE BARU UNTUK MENAMPUNG HASIL DETEKSI AI (YOLOv8)
  const [detectionData, setDetectionData] = useState(null);

  // Referensi ke instansi peta Leaflet untuk kebutuhan navigasi kamera (flyTo)
  const mapRef = useRef(null);

  const fetchAllData = async () => {
    try {
      const resGeo = await api.get('/api/fasilitas/geojson'); // Ambil GeoJSON Fasilitas
      setData(resGeo.data);

      const resAll = await api.get('/api/fasilitas/'); // Ambil data atribut fasilitas (GET All)
      setOriginalData(resAll.data);
      setDaftarFasilitas(resAll.data);

      // MENARIK DATA GEJSON DETEKSI SPASIAL AI SECARA ASINKRON
      const resDetect = await api.get('/api/detections/geojson');
      setDetectionData(resDetect.data);

    } catch (err) {
      console.error("Gagal memuat data spasial:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let filtered = originalData;

    if (filterJenis !== 'Semua') {
      filtered = filtered.filter(f => f.jenis === filterJenis);
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(f => 
        f.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setDaftarFasilitas(filtered);
  }, [filterJenis, searchQuery, originalData]);

  // Penentu warna titik berdasarkan kategori data
  const colors = { 
    'Rumah Sakit': '#e74c3c',
    'Sekolah': '#3498db',
    'Masjid': '#2ecc71',
    'SPBU': '#f1c40f'
  };
  
  const getStyle = (feature) => ({
    fillColor: colors[feature.properties.jenis] || '#95a5a6',
    color: '#ffffff',
    weight: 1.5,
    fillOpacity: 0.8
  });

  const pointToLayer = (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 9,
      fillColor: colors[feature.properties.jenis] || '#95a5a6',
      color: '#ffffff',
      weight: 1.5,
      fillOpacity: 0.9
    });
  };

  const onEachFeature = (feature, layer) => {
    const { nama, jenis, alamat } = feature.properties;
    
    layer.bindPopup(`
      <div style="font-family: Arial; padding: 5px; min-width: 150px;">
        <h3 style="margin: 0 0 5px 0; color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 4px;">${nama}</h3>
        <p style="margin: 4px 0; font-size: 11px;"><b>Kategori:</b> ${jenis}</p>
        <p style="margin: 4px 0; font-size: 11px;"><b>Alamat:</b> ${alamat || '-'}</p>
        ${user ? `<button id="btn-edit-${feature.properties.id}" style="margin-top: 8px; width: 100%; padding: 6px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">Edit Fasilitas</button>` : ''}
      </div>
    `, { autoPan: false });

    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({ weight: 4.5, fillOpacity: 1.0 });
      },
      mouseout: (e) => {
        const target = e.target;
        target.setStyle({ weight: 1.5, fillOpacity: 0.8 });
      },
      click: (e) => {
        const map = e.target._map;
        map.flyTo(e.latlng, 16, { duration: 1.5 });

        const [lon, lat] = feature.geometry.coordinates;

        if (!user) {
          setDetailFasilitas({
            id: feature.properties.id,
            nama,
            jenis,
            alamat,
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6)
          });
        }
      },
      popupopen: (e) => {
        setTimeout(() => {
          const btn = document.getElementById(`btn-edit-${feature.properties.id}`);
          if (btn) {
            btn.onclick = (event) => {
              event.stopPropagation();
              const [lon, lat] = feature.geometry.coordinates;
              setForm({
                id: feature.properties.id,
                nama,
                jenis,
                alamat,
                lat: lat.toFixed(6),
                lon: lon.toFixed(6)
              });
              setShowCrudForm(true);
              e.target.closePopup();
            };
          }
        }, 50);
      }
    });
  };

  const handleMapClick = (latlng) => {
    if (user && showCrudForm) {
      setForm(prev => ({ ...prev, lat: latlng.lat.toFixed(6), lon: latlng.lng.toFixed(6) }));
    } else {
      setNearbyForm(prev => ({ ...prev, lat: latlng.lat.toFixed(6), lon: latlng.lng.toFixed(6) }));
    }
  };

  const handleFocusFacility = (lat, lon, id) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 16, { duration: 1.5 });
    }
    fetchDetailById(id);
  };

  const fetchDetailById = async (id) => {
    try {
      const res = await api.get(`/api/fasilitas/${id}`);
      setDetailFasilitas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNearbySearch = async (e) => {
    e.preventDefault();
    setIsSearchingNearby(true);
    setNearbyCenter({
      lat: parseFloat(nearbyForm.lat),
      lng: parseFloat(nearbyForm.lon),
      radius: parseInt(nearbyForm.radius)
    });
    try {
      const res = await api.get('/api/fasilitas/nearby', {
        params: {
          lat: parseFloat(nearbyForm.lat),
          lon: parseFloat(nearbyForm.lon),
          radius: parseInt(nearbyForm.radius)
        }
      });
      setNearbyResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCrudSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nama: form.nama,
        jenis: form.jenis,
        alamat: form.alamat,
        longitude: parseFloat(form.lon),
        latitude: parseFloat(form.lat)
      };
      if (form.id) {
        await api.put(`/api/fasilitas/${form.id}`, payload);
      } else {
        await api.post('/api/fasilitas/', payload);
      }
      setForm({ id: null, nama: '', jenis: '', alamat: '', lat: '', lon: '' });
      setShowCrudForm(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCrudDelete = async () => {
    if (!form.id) return;
    try {
      await api.delete(`/api/fasilitas/${form.id}`);
      setForm({ id: null, nama: '', jenis: '', alamat: '', lat: '', lon: '' });
      setShowCrudForm(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', fontFamily: 'Arial, sans-serif' }}>
      
      {/* DASHBOARD CONTROL CENTER */}
      <div style={{ width: '300px', padding: '15px', background: '#eceff1', borderRight: '2px solid #cfd8dc', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        <div style={{ borderBottom: '2px solid #b0bec5', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Dashboard SIG</h2>
          <span style={{ fontSize: '11px', color: '#78909c', fontWeight: 'bold' }}>
            {user ? 'Akses: Administrator' : 'Akses: Publik'}
          </span>
        </div>

        {user && showCrudForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '13px', borderBottom: '1px solid #b0bec5', paddingBottom: '4px' }}>
              {form.id ? 'Edit Fasilitas Publik' : 'Tambah Fasilitas Baru'}
            </h3>
            <form onSubmit={handleCrudSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <input type="text" placeholder="Nama Fasilitas" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} required style={{ padding: '6px', borderRadius: '4px', border: '1px solid #b0bec5' }} />
              <input type="text" placeholder="Kategori" value={form.jenis} onChange={e => setForm({...form, jenis: e.target.value})} required style={{ padding: '6px', borderRadius: '4px', border: '1px solid #b0bec5' }} />
              <textarea placeholder="Alamat Fisik" value={form.alamat || ''} onChange={e => setForm({...form, alamat: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #b0bec5', height: '50px' }} />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                <input type="number" step="any" placeholder="Latitude" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} required style={{ width: '48%', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #b0bec5', boxSizing: 'border-box' }} />
                <input type="number" step="any" placeholder="Longitude" value={form.lon} onChange={e => setForm({...form, lon: e.target.value})} required style={{ width: '48%', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #b0bec5', boxSizing: 'border-box' }} />
              </div>
              <span style={{ fontSize: '10px', color: '#78909c' }}>*Klik lokasi di peta untuk mengambil koordinat otomatis.</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
                <button type="submit" style={{ flex: 1, padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Simpan</button>
                <button type="button" onClick={() => setShowCrudForm(false)} style={{ padding: '8px', background: '#90a4ae', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Batal</button>
              </div>
              {form.id && (
                <button type="button" onClick={handleCrudDelete} style={{ padding: '8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '3px' }}>Hapus Permanen</button>
              )}
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {user && (
              <button onClick={() => { setForm({ id: null, nama: '', jenis: '', alamat: '', lat: '', lon: '' }); setShowCrudForm(true); }} style={{ width: '100%', padding: '10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Registrasi Fasilitas Baru
              </button>
            )}

            {/* CARI TERDEKAT (Nearby Search) */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#2c3e50', borderBottom: '1px solid #ddd', paddingBottom: '3px' }}>🔍 Cari Fasilitas Terdekat (Nearby)</h3>
              <form onSubmit={handleNearbySearch} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                  <input type="number" step="any" placeholder="Lat" value={nearbyForm.lat} onChange={e => setNearbyForm({...nearbyForm, lat: e.target.value})} required style={{ width: '48%', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  <input type="number" step="any" placeholder="Lon" value={nearbyForm.lon} onChange={e => setNearbyForm({...nearbyForm, lon: e.target.value})} required style={{ width: '48%', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <input type="number" placeholder="Radius (meter)" value={nearbyForm.radius} onChange={e => setNearbyForm({...nearbyForm, radius: e.target.value})} required style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <span style={{ fontSize: '9px', color: '#78909c' }}>*Klik lokasi di peta untuk mengambil titik pusat pencarian.</span>
                <button type="submit" style={{ padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Jalankan Kueri Spasial</button>
              </form>

              {isSearchingNearby && (
                <div style={{ marginTop: '10px', fontSize: '11px', maxHeight: '120px', overflowY: 'auto' }}>
                  <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Hasil Pencarian Jangkauan:</span>
                  {nearbyResults.length === 0 ? (
                    <div style={{ color: '#78909c', fontStyle: 'italic', marginTop: '4px' }}>Tidak ada fasilitas dalam radius ini.</div>
                  ) : (
                    <ul style={{ paddingLeft: '15px', margin: '5px 0' }}>
                      {nearbyResults.map(r => (
                        <li key={r.id} style={{ margin: '3px 0' }}>
                          <b>{r.nama}</b> ({r.jarak_m} meter)
                        </li>
                      ))}
                    </ul>
                  )}
                  <button onClick={() => { setIsSearchingNearby(false); setNearbyResults([]); setNearbyCenter(null); }} style={{ marginTop: '5px', padding: '3px 6px', background: '#90a4ae', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>Bersihkan Hasil</button>
                </div>
              )}
            </div>

            {/* DETAIL FASILITAS SELEKTIF */}
            {detailFasilitas && (
              <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #3498db' }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#2c3e50' }}>📌 Detail Fasilitas Terpilih</h3>
                <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                  <p style={{ margin: '3px 0' }}><b>Nama:</b> {detailFasilitas.nama}</p>
                  <p style={{ margin: '3px 0' }}><b>Jenis:</b> {detailFasilitas.jenis}</p>
                  <p style={{ margin: '3px 0' }}><b>Alamat:</b> {detailFasilitas.alamat || '-'}</p>
                  <p style={{ margin: '3px 0' }}><b>Koordinat:</b> {detailFasilitas.latitude}, {detailFasilitas.longitude}</p>
                </div>
                <button onClick={() => setDetailFasilitas(null)} style={{ marginTop: '6px', padding: '3px 6px', background: '#90a4ae', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>Tutup Detail</button>
              </div>
            )}

            {/* DAFTAR SEMUA FASILITAS DENGAN FITUR PENCARIAN NAMA INTEGRATIF */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                <h3 style={{ margin: 0, fontSize: '12px', color: '#2c3e50' }}>📋 Daftar Semua Fasilitas</h3>
                <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)} style={{ padding: '3px', fontSize: '11px', borderRadius: '3px', border: '1px solid #ccc' }}>
                  <option value="Semua">Semua</option>
                  <option value="Rumah Sakit">Rumah Sakit</option>
                  <option value="Sekolah">Sekolah</option>
                  <option value="Masjid">Masjid</option>
                  <option value="SPBU">SPBU</option>
                </select>
              </div>
              
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="🔍 Cari nama fasilitas..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  style={{ width: '100%', padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '11px' }}>
                {daftarFasilitas.map(f => (
                  <div 
                    key={f.id} 
                    onClick={() => handleFocusFacility(f.lat, f.lon, f.id)}
                    style={{ padding: '6px', borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    <b>{f.nama}</b>
                    <div style={{ fontSize: '10px', color: '#78909c' }}>Kategori: {f.jenis}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KANVAS PETA UTAMA */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={[-5.362000, 105.305000]} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents onMapClick={handleMapClick} />
          {data && (
            <GeoJSON 
              key={user ? 'admin' : 'public'}
              data={data} 
              style={getStyle} 
              pointToLayer={pointToLayer} 
              onEachFeature={onEachFeature} 
            />
          )}

          {/* VISUALISASI HASIL DETEKSI OBJEK SPASIAL AI (YOLOv8) */}
          {detectionData && (
            <GeoJSON 
              data={detectionData} 
              pointToLayer={(feature, latlng) => L.circleMarker(latlng, {
                radius: 7,
                fillColor: '#9b59b6',
                color: '#ffffff',
                weight: 1.5,
                fillOpacity: 0.95
              })}
              onEachFeature={(feature, layer) => {
                const { class_name, confidence } = feature.properties;
                layer.bindPopup(`
                  <div style="font-family: Arial; padding: 5px; min-width: 150px;">
                    <h3 style="margin: 0 0 5px 0; color: #8e44ad; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Deteksi Spasial AI</h3>
                    <p style="margin: 4px 0; font-size: 11px;"><b>Objek:</b> ${class_name}</p>
                    <p style="margin: 4px 0; font-size: 11px;"><b>Confidence:</b> ${(confidence * 100).toFixed(2)}%</p>
                  </div>
                `, { autoPan: false });
              }}
            />
          )}

          {/* VISUALISASI AREA RADIUS KUERI SPASIAL (NEARBY) */}
          {nearbyCenter && (
            <Circle 
              center={[nearbyCenter.lat, nearbyCenter.lng]}
              radius={nearbyCenter.radius}
              pathOptions={{
                color: '#3498db',
                fillColor: '#3498db',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 5'
              }}
            />
          )}
        </MapContainer>

        {/* INSTRUMEN KOMPAS*/}
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '10px',
          zIndex: 1000,
          background: '#ffffff',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
          cursor: 'pointer'
        }} title="Kompas Arah Utara">
          <svg width="24" height="24" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="#2c3e50" strokeWidth="6" fill="none" />
            <polygon points="50,15 35,50 50,42" fill="#e74c3c" />
            <polygon points="50,85 35,50 50,42" fill="#3498db" />
            <polygon points="50,15 65,50 50,42" fill="#c0392b" />
            <polygon points="50,85 65,50 50,42" fill="#2980b9" />
            <text x="44" y="32" fill="#2c3e50" fontSize="20" fontWeight="bold" fontFamily="Arial">N</text>
          </svg>
        </div>

        {/* LEGENDA SPASIAL*/}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          background: '#ffffff',
          padding: '12px 15px',
          borderRadius: '6px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          color: '#2c3e50',
          lineHeight: '1.8',
          borderRight: '4px solid #2980b9'
        }}>
          <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #ddd', paddingBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Legenda Fasilitas</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.keys(colors).map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: colors[key] }}></span>
                <span style={{ fontWeight: '500' }}>{key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapView;