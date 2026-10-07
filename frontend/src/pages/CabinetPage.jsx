import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Film, CreditCard, Sparkles, Download, Eye, Sun, Moon, Home, HelpCircle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../components/Navbar.css';
import './CabinetPage.css';

const STATUS_LABELS = {
  pending: { label: 'Navbatda', className: 'status-pending' },
  processing: { label: 'Yaratilmoqda', className: 'status-processing' },
  done: { label: 'Tayyor', className: 'status-done' },
  failed: { label: 'Xatolik', className: 'status-failed' },
  expired: { label: 'Muddati tugagan', className: 'status-failed' },
};

const DURATION_LABELS = { s30: '30 soniya', s60: '60 soniya' };

const TX_STATUS_LABELS = {
  paid: { label: "To'landi", className: 'status-done' },
  pending: { label: 'Kutilmoqda', className: 'status-pending' },
  failed: { label: 'Muvaffaqiyatsiz', className: 'status-failed' },
};

const SECTIONS = [
  { id: 'overview', icon: <LayoutDashboard size={16} strokeWidth={2.2} />, label: 'Umumiy' },
  { id: 'videos',   icon: <Film size={16} strokeWidth={2.2} />,            label: 'Videolarim' },
  { id: 'payments', icon: <CreditCard size={16} strokeWidth={2.2} />,      label: "To'lovlar tarixi" },
];

const LANGUAGES = [
  { code: 'uz', label: "O'z" },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CabinetPage({ theme, onThemeToggle }) {
  const { i18n } = useTranslation();
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalPaidUsd, setTotalPaidUsd] = useState(0);
  const [credits, setCredits] = useState(0);
  const [role, setRole] = useState('user');
  const [memberSince, setMemberSince] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }

    const load = async () => {
      try {
        const [myRes, limitsRes, txRes] = await Promise.all([
          fetch('/api/videos/my', { credentials: 'include' }),
          fetch('/api/videos/limits'),
          fetch('/api/payments/my', { credentials: 'include' }),
        ]);

        const myData = await myRes.json();
        if (myData.success) {
          setJobs(myData.jobs || []);
          setCredits(myData.credits || 0);
          setRole(myData.role || 'user');
          setMemberSince(myData.memberSince);
        }

        const limitsData = await limitsRes.json();
        if (limitsData.success) setLimits(limitsData.limits);

        if (txRes.ok) {
          const txData = await txRes.json();
          if (txData.success) {
            setTransactions(txData.transactions || []);
            setTotalPaidUsd(txData.totalPaidUsd || 0);
          }
        }
      } catch (err) {
        console.error('Kabinet ma\'lumotlarini yuklashda xatolik:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return <div className="cabinet-loading-screen"><p>Yuklanmoqda...</p></div>;
  }

  const isAdmin = role === 'admin';

  const renderVideos = () => (
    jobs.length === 0 ? (
      <div className="cabinet-empty">
        <p>Hali video yaratmagansiz.</p>
        <button className="btn-topup" onClick={() => navigate('/studio')}>Birinchi videongizni yarating</button>
      </div>
    ) : (
      <div className="job-list">
        {jobs.map((job) => {
          const st = STATUS_LABELS[job.status] || { label: job.status, className: '' };
          return (
            <div key={job.id} className="job-row">
              <div className="job-main">
                <p className="job-idea" title={job.idea}>{job.idea}</p>
                <div className="job-meta">
                  <span>{DURATION_LABELS[job.duration] || job.duration}</span>
                  <span>•</span>
                  <span>{formatDate(job.createdAt)}</span>
                  {job.imageCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{job.imageCount} ta rasm</span>
                    </>
                  )}
                </div>
                {job.status === 'failed' && job.error && (
                  <p className="job-error">{job.error}</p>
                )}
              </div>
              <div className="job-actions">
                <span className={`status-badge ${st.className}`}>{st.label}</span>
                {job.status === 'done' && job.videoUrl && (
                  <>
                    <a className="btn-view" href={job.videoUrl} target="_blank" rel="noreferrer">Ko'rish</a>
                    <a className="btn-download" href={`/api/videos/download/${job.id}`}>⬇ Yuklab olish</a>
                  </>
                )}
                {job.status === 'processing' && (
                  <button className="btn-view" onClick={() => navigate(`/progress/${job.id}`)}>Jarayonni ko'rish</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  const renderPayments = () => (
    <>
      <div className="tx-summary">Jami to'lagan mablag'ingiz: <b>${totalPaidUsd.toFixed(2)}</b></div>
      {transactions.length === 0 ? (
        <div className="cabinet-empty"><p>Hali to'lov tarixi yo'q.</p></div>
      ) : (
        <div className="job-list">
          {transactions.map((tx) => {
            const st = TX_STATUS_LABELS[tx.status] || { label: tx.status, className: '' };
            return (
              <div key={tx.id} className="job-row">
                <div className="job-main">
                  <p className="job-idea">{tx.plan_name || 'Tarif'} — {tx.credits_added} ta video krediti</p>
                  <div className="job-meta">
                    <span>${tx.amount_usd.toFixed(2)}</span>
                    <span>•</span>
                    <span>{formatDate(tx.created_at)}</span>
                    {tx.test_mode === 1 && <><span>•</span><span>Test rejimi</span></>}
                  </div>
                </div>
                <div className="job-actions">
                  <span className={`status-badge ${st.className}`}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const renderOverview = () => (
    <>
      <div className="create-video-banner" onClick={() => navigate('/create')}>
        <div className="create-video-banner-text">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} strokeWidth={2.4} color="#f2c84b" />
            <span>Yangi video yaratish</span>
          </h2>
          <p>G'oyangizni yozing — AI siz uchun professional reklama videosini tayyorlaydi</p>
        </div>
        <button className="btn-create-video" onClick={() => navigate('/create')}>Video yaratish →</button>
      </div>

      {limits && (
        <div className="limits-grid">
          <div className="limit-card">
            <span className="limit-title">Bitta so'rovga rasm</span>
            <span className="limit-value">{limits.maxImages} tagacha</span>
          </div>
          <div className="limit-card">
            <span className="limit-title">G'oya matni</span>
            <span className="limit-value">{limits.maxIdeaLength} belgigacha</span>
          </div>
          <div className="limit-card">
            <span className="limit-title">Video uzunligi</span>
            <span className="limit-value">30 yoki 60 soniya</span>
          </div>
          <div className="limit-card">
            <span className="limit-title">Bepul kreditlar</span>
            <span className="limit-value">{limits.freeTierEnabled ? `${limits.freeCreditsPerUser} ta (yangi userlar uchun)` : 'O\'chirilgan'}</span>
          </div>
        </div>
      )}

      <h2 className="section-subheading">So'nggi videolar</h2>
      {jobs.length === 0 ? (
        <div className="cabinet-empty">
          <p>Hali video yaratmagansiz.</p>
          <button className="btn-topup" onClick={() => navigate('/studio')}>Birinchi videongizni yarating</button>
        </div>
      ) : (
        <div className="job-list">
          {jobs.slice(0, 5).map((job) => {
            const st = STATUS_LABELS[job.status] || { label: job.status, className: '' };
            return (
              <div key={job.id} className="job-row">
                <div className="job-main">
                  <p className="job-idea" title={job.idea}>{job.idea}</p>
                  <div className="job-meta">
                    <span>{DURATION_LABELS[job.duration] || job.duration}</span>
                    <span>•</span>
                    <span>{formatDate(job.createdAt)}</span>
                  </div>
                </div>
                <div className="job-actions">
                  <span className={`status-badge ${st.className}`}>{st.label}</span>
                  {job.status === 'done' && job.videoUrl && (
                    <>
                      <a className="btn-view" href={job.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={13} strokeWidth={2.4} />
                        <span>Ko'rish</span>
                      </a>
                      <a className="btn-download" href={`/api/videos/download/${job.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Download size={13} strokeWidth={2.4} />
                        <span>Yuklab olish</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {jobs.length > 5 && (
            <button className="btn-view-all" onClick={() => setSection('videos')}>Barcha videolarni ko'rish →</button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="cabinet-shell">
      {/* Yuqoridagi ingichka panel — faqat logo, til, mavzu, chiqish */}
      <header className="cabinet-topbar">
        <div className="cabinet-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={18} strokeWidth={2.4} color="#f2c84b" />
          </div>
          <span>airek<b style={{ color: 'var(--gold)' }}>.uz</b></span>
        </div>
        <div className="cabinet-topbar-actions">
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
          <button className="theme-toggle" onClick={onThemeToggle} title="Mavzuni o'zgartirish" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'dark' ? <Sun size={16} strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />}
          </button>
          <button className="btn-logout" onClick={logout}>Chiqish</button>
        </div>
      </header>

      <div className="cabinet-layout">
        {/* Chap tarafdagi yagona (yopishgan) sidebar paneli */}
        <aside className="cabinet-sidebar">
          <div className="sidebar-block sidebar-profile">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="cabinet-avatar" />
            ) : (
              <div className="cabinet-avatar cabinet-avatar-fallback">{user.name ? user.name[0].toUpperCase() : 'U'}</div>
            )}
            <div className="sidebar-profile-info">
              <p className="sidebar-name">{user.name}</p>
              <p className="sidebar-email" title={user.email}>{user.email}</p>
              {isAdmin && <span className="admin-badge">Admin</span>}
            </div>
          </div>

          <div className="sidebar-block sidebar-credits">
            <span className="credits-label">Hisobingizda</span>
            <span className="credits-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} fill="currentColor" color="#f2c84b" />
              <span>{isAdmin ? 'Cheksiz' : `${credits} ta video`}</span>
            </span>
            <button className="btn-topup" onClick={() => navigate('/#pricing')}>To'ldirish</button>
          </div>

          <nav className="sidebar-block sidebar-nav">
            <p className="sidebar-nav-heading">Dashboard</p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`sidebar-nav-item ${section === s.id ? 'active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                <span className="sidebar-nav-icon">{s.icon}</span>
                <span>{s.label}</span>
                {s.id === 'videos' && jobs.length > 0 && <span className="sidebar-nav-count">{jobs.length}</span>}
              </button>
            ))}
          </nav>

          <nav className="sidebar-block sidebar-nav">
            <p className="sidebar-nav-heading">Sayt</p>
            <button className="sidebar-nav-item" onClick={() => navigate('/')}>
              <span className="sidebar-nav-icon"><Home size={15} strokeWidth={2.2} /></span><span>Bosh sahifa</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => navigate('/#how-it-works')}>
              <span className="sidebar-nav-icon"><HelpCircle size={15} strokeWidth={2.2} /></span><span>Qanday ishlaydi</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => navigate('/#pricing')}>
              <span className="sidebar-nav-icon"><CreditCard size={15} strokeWidth={2.2} /></span><span>Tariflar</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => navigate('/create')}>
              <span className="sidebar-nav-icon"><Sparkles size={15} strokeWidth={2.2} /></span><span>Video Yaratish</span>
            </button>
          </nav>
        </aside>

        {/* O'ng tarafdagi dashboard kontenti */}
        <main className="cabinet-main">
          <div className="cabinet-main-header">
            <h1>{SECTIONS.find((s) => s.id === section)?.label}</h1>
            {memberSince && <p className="cabinet-since">A'zo bo'lgan sana: {formatDate(memberSince)}</p>}
          </div>

          {loading ? (
            <p className="cabinet-loading">Yuklanmoqda...</p>
          ) : section === 'overview' ? (
            renderOverview()
          ) : section === 'videos' ? (
            renderVideos()
          ) : (
            renderPayments()
          )}
        </main>
      </div>
    </div>
  );
}
