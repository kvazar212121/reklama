import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './CreateHubPage.css';

const CATEGORIES = [
  {
    key: 'generate',
    route: '/studio',
    icon: '🎬',
    title: 'G\'oyadan Video',
    subtitle: 'Animatsion video yaratish',
    desc: 'G\'oyangizni yozing — sun\'iy intellekt noldan professional reklama videosini (animatsiya, musiqa, ovoz bilan) to\'liq avtomatik tayyorlaydi.',
    badge: 'Ommabop',
    accent: '#f2c84b',
  },
  {
    key: 'overlay',
    route: '/overlay',
    icon: '🎞️',
    title: 'Videoni Boyitish',
    subtitle: 'Video ustiga animatsiya',
    desc: 'Gapirib turgan videongizni yuklang — AI aytilayotgan so\'zlarga mos animatsiyalarni video ustiga qo\'shadi. Yuzingiz hech qachon yopilmaydi.',
    badge: 'Yangi',
    accent: '#22c55e',
  },
  {
    key: 'kinetic',
    route: '/kinetic',
    icon: '✍️',
    title: 'Animatsion Matn',
    subtitle: 'Ovoz/matndan kinetic typography',
    desc: 'Ovozli fayl yoki matn yuklang — AI gaplaringizni turli chiroyli dizaynlarda animatsion matn (kinetic typography) qilib chiqaradi. Video kerak emas.',
    badge: 'Yangi',
    accent: '#8b5cf6',
  },
];

export default function CreateHubPage({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="hub-page">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />

      <div className="hub-container">
        <div className="hub-top-bar">
          <button className="hub-back-btn" onClick={() => navigate('/')}>← Bosh sahifa</button>
          <div className="hub-credits">⚡ {user?.role === 'admin' ? 'Cheksiz' : `${user?.credits ?? 0} kredit`}</div>
        </div>

        <div className="hub-hero">
          <div className="hub-badge"><span>🚀</span> Boshlash</div>
          <h1>Qanday video <span>yaratmoqchisiz?</span></h1>
          <p>Uchta rejimdan birini tanlang — har biri turli maqsad uchun.</p>
        </div>

        <div className="hub-cards">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className="hub-card"
              onClick={() => navigate(c.route)}
              style={{ '--accent': c.accent }}
            >
              <span className="hub-card-badge">{c.badge}</span>
              <div className="hub-card-icon">{c.icon}</div>
              <h3 className="hub-card-title">{c.title}</h3>
              <div className="hub-card-subtitle">{c.subtitle}</div>
              <p className="hub-card-desc">{c.desc}</p>
              <div className="hub-card-cta">Tanlash →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
