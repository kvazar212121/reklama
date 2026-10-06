import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const LANGUAGES = [
  { code: 'uz', label: "O'z" },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

export default function Navbar({ theme, onThemeToggle }) {
  const { t, i18n } = useTranslation();
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">🎬</div>
          <span>airek<b style={{ color: 'var(--gold)' }}>.uz</b></span>
        </div>

        {/* Nav Links */}
        <ul className="navbar-nav">
          <li><button className="nav-link-btn" onClick={() => scrollToSection('home')}>{t('nav.home')}</button></li>
          <li><button className="nav-link-btn" onClick={() => scrollToSection('how-it-works')}>{t('nav.howItWorks')}</button></li>
          <li><button className="nav-link-btn" onClick={() => scrollToSection('pricing')}>Tariflar</button></li>
          <li><button className="nav-link-btn nav-link-studio" onClick={() => navigate('/studio')}>🎬 Video Yaratish</button></li>
          <li><button className="nav-link-btn nav-link-overlay" onClick={() => navigate('/overlay')}>🎞️ Video Jonlantirish</button></li>
          {user && <li><button className="nav-link-btn" onClick={() => navigate('/cabinet')}>👤 Kabinet</button></li>}
        </ul>

        {/* Actions */}
        <div className="navbar-actions">
          {/* User Credits Badge */}
          {user && (
            <div
              onClick={() => navigate('/cabinet')}
              style={{
                background: 'rgba(242, 200, 75, 0.15)',
                color: 'var(--gold)',
                border: '1px solid rgba(242, 200, 75, 0.3)',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Shaxsiy kabinetga o'tish"
            >
              <span>⚡</span>
              <span>{`${user.credits || 0} ta video`}</span>
            </div>
          )}

          {/* Language Selector */}
          <div className="lang-selector">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={onThemeToggle}
            title="Mavzuni o'zgartirish"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* User Auth / Google Login */}
          {loading ? (
            <div style={{ width: '80px', height: '36px', opacity: 0.5 }}></div>
          ) : user ? (
            <div className="user-profile">
              <div
                onClick={() => navigate('/cabinet')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                title="Shaxsiy kabinet"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="user-avatar" />
                ) : (
                  <div className="user-avatar">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                )}
                <span className="user-name" title={user.email}>{user.name}</span>
              </div>
              <button className="btn-logout" onClick={logout} title={t('nav.logout')}>
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <button
              className="btn-google-login"
              onClick={loginWithGoogle}
              title={t('nav.googleLogin')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{t('nav.googleLogin')}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
