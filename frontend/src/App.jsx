import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import './index.css';

import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import HowItWorks from './components/HowItWorks';
import PricingSection from './components/PricingSection';
import ProgressPage from './pages/ProgressPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';
import StudioPage from './pages/StudioPage';

function HomePage() {
  return (
    <>
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
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/progress/:jobId" element={<ProgressPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/result/:jobId" element={<ResultPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
