import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import HowItWorks from './components/HowItWorks';
import PricingSection from './components/PricingSection';
import ProgressPage from './pages/ProgressPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';
import StudioPage from './pages/StudioPage';
import CabinetPage from './pages/CabinetPage';

// Lemon Squeezy to'lovidan qaytganda ko'rsatiladigan xabar.
// Kredit webhook orqali qo'shiladi, AuthContext uni avtomatik qayta yuklaydi.
function PaymentBanner() {
  const { paymentNotice, clearPaymentNotice, user } = useAuth();
  if (!paymentNotice) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '76px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      maxWidth: '92vw',
      padding: '14px 18px',
      borderRadius: '14px',
      background: 'rgba(34, 197, 94, 0.12)',
      border: '1px solid rgba(34, 197, 94, 0.45)',
      color: '#22c55e',
      fontWeight: 600,
      fontSize: '14px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    }}>
      <span>🎉 To'lov muvaffaqiyatli qabul qilindi!</span>
      {user && typeof user.credits === 'number' && (
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          Balansingiz: {user.credits} ta video
        </span>
      )}
      <button
        onClick={clearPaymentNotice}
        aria-label="Yopish"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// Yangi foydalanuvchi birinchi marta kirganda 1 ta bepul video krediti bildirishnomasi
function WelcomeBonusBanner() {
  const [show, setShow] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasBonusParam = params.get('welcome_bonus') === '1';
    const notSeen = !localStorage.getItem('adforge_welcome_seen');
    if (hasBonusParam || (user && user.credits === 1 && notSeen)) {
      setShow(true);
      localStorage.setItem('adforge_welcome_seen', '1');
      if (hasBonusParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '76px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      maxWidth: '92vw',
      padding: '14px 20px',
      borderRadius: '14px',
      background: 'rgba(234, 179, 8, 0.15)',
      border: '1px solid rgba(234, 179, 8, 0.5)',
      color: '#eab308',
      fontWeight: 600,
      fontSize: '14px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    }}>
      <span>🎁 Xush kelibsiz! Sizga 1 ta bepul video krediti berildi (30 soniyalik animatsiya uchun).</span>
      <button
        onClick={() => setShow(false)}
        aria-label="Yopish"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <PaymentBanner />
      <WelcomeBonusBanner />
      <HeroSection />
      <HowItWorks />
      <PricingSection />
      <footer style={{
        background: 'var(--ink)',
        color: 'white',
        borderTop: '1px solid rgba(255, 255, 255, 0.14)',
        padding: '50px 0 36px',
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--display)',
              fontSize: '1.2rem',
              fontWeight: '900',
              marginBottom: '6px',
              letterSpacing: '-0.05em',
            }}>
              ADFORGE<span style={{ color: 'var(--gold)' }}>.AI</span>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', margin: 0 }}>
              Professional AI Reklama Video Platformasi
            </p>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', margin: 0 }}>
            © {new Date().getFullYear()} AdForge AI. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </>
  );
}

function AppLayout({ children, theme, onThemeToggle }) {
  return (
    <>
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <AppLayout theme={theme} onThemeToggle={toggleTheme}>
              <HomePage />
            </AppLayout>
          } />
          <Route path="/admin" element={
            <AppLayout theme={theme} onThemeToggle={toggleTheme}>
              <AdminPage />
            </AppLayout>
          } />
          <Route path="/studio" element={<StudioPage theme={theme} onThemeToggle={toggleTheme} />} />
          <Route path="/cabinet" element={<CabinetPage theme={theme} onThemeToggle={toggleTheme} />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/progress/:jobId" element={<ProgressPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/result/:jobId" element={<ResultPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
