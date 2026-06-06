import { useState } from 'react';
import MapView from './components/MapView';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import './App.css';

function MainLayout() {
  const { user, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegisterMode) {
        await api.post('/api/auth/register', { email: loginEmail, password: loginPassword });
        alert("Daftar akun admin sukses! Silakan login.");
        setIsRegisterMode(false);
      } else {
        await login(loginEmail, loginPassword);
        setShowLoginModal(false);
      }
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      alert("Gagal! Periksa kembali kredensial Anda.");
    }
  };

  return (
    <div className="app-container">
      {/* HEADER ATAS */}
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 100 100" 
            fill="none" 
            stroke="#2980b9"
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ marginRight: '12px' }}
          > 
            <path d="M50,15 C50,38 38,50 15,50 C38,50 50,62 50,85 C50,62 62,50 85,50 C62,50 50,38 50,15 Z" />
            <path d="M72,25 L88,25 M80,17 L80,33" strokeWidth="6" />
            <circle cx="22" cy="78" r="7" strokeWidth="6" />
          </svg>

          <h1 style={{ margin: 0}}>Sistem Informasi Geografis</h1>
        </div>
        
        {/* Tombol Login/Logout dinamis */}
        {!user ? (
          <button 
            onClick={() => { setIsRegisterMode(false); setShowLoginModal(true); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              backgroundColor: '#3498db', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontFamily: 'Segoe UI, Arial, sans-serif',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            <svg 
              width="15" 
              height="15" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Login Admin</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '13px', color: '#5e6164', fontWeight: 'bold', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
              <span style={{ color: '#2ecc71', marginRight: '6px', fontSize: '14px' }}>●</span>
              Sesi Admin Aktif
            </span>
            
            <button 
              onClick={logout}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                backgroundColor: '#e74c3c', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer', 
                fontWeight: 'bold',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'} 
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
            >
              <svg 
                width="15" 
                height="15" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Keluar Akun</span>
            </button>
          </div>
        )}
      </header>

      {/* Kontainer Utama Penampung Peta */}
      <main className="app-main">
        <MapView />
      </main>

      {/* POP-UP JENDELA LOGIN & REGISTRASI */}
      {showLoginModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '340px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid #3498db', paddingBottom: '5px', color: '#2c3e50', fontFamily: 'Arial' }}>
              {isRegisterMode ? 'Daftar Akun Admin' : 'Login Admin WebGIS'}
            </h3>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="email" placeholder="Alamat Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="password" placeholder="Password (Min. 6 Karakter)" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              
              <button type="submit" style={{ padding: '10px', background: isRegisterMode ? '#2e7d32' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isRegisterMode ? 'Daftar Sekarang' : 'Masuk (Login)'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '5px' }}>
                <span 
                  onClick={() => setIsRegisterMode(!isRegisterMode)} 
                  style={{ color: '#3498db', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isRegisterMode ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar di sini'}
                </span>
              </div>

              <button type="button" onClick={() => setShowLoginModal(false)} style={{ padding: '10px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
                Batal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;