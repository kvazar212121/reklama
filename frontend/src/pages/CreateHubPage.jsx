import { useNavigate } from 'react-router-dom';
import { Wand2, Film, Type, Sparkles, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './CreateHubPage.css';

const CATEGORIES = [
  {
    key: 'generate',
    route: '/studio',
    icon: <Wand2 size={40} strokeWidth={2} color="#f2c84b" />,
    title: 'G\'oyadan Video',
    subtitle: 'Animatsion video yaratish',
    desc: 'G\'oyangizni yozing — sun\'iy intellekt noldan professional reklama videosini (animatsiya, musiqa, ovoz bilan) to\'liq avtomatik tayyorlaydi.',
    badge: 'Ommabop',
    accent: '#f2c84b',
  },
  {
    key: 'overlay',
    route: '/overlay',
    icon: <Film size={40} strokeWidth={2} color="#22c55e" />,
    title: 'Videoni Boyitish',
    subtitle: 'Video ustiga animatsiya',
    desc: 'Gapirib turgan videongizni yuklang — AI aytilayotgan so\'zlarga mos animatsiyalarni video ustiga qo\'shadi. Yuzingiz hech qachon yopilmaydi.',
    badge: 'Yangi',
    accent: '#22c55e',
  },
  {
    key: 'kinetic',
    route: '/kinetic',
    icon: <Type size={40} strokeWidth={2} color="#8b5cf6" />,
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
          <button className="hub-back-btn" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={15} strokeWidth={2.4} />
            <span>Bosh sahifa</span>
          </button>
          <div className="hub-credits" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={13} fill="currentColor" strokeWidth={2.5} />
            <span>{user?.role === 'admin' ? 'Cheksiz' : `${user?.credits ?? 0} kredit`}</span>
          </div>
        </div>

        <div className="hub-hero">
          <div className="hub-badge">
            <Sparkles size={14} strokeWidth={2.4} color="#f2c84b" />
            <span>Boshlash</span>
          </div>
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
              <div className="hub-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                {c.icon}
              </div>
              <h3 className="hub-card-title">{c.title}</h3>
              <div className="hub-card-subtitle">{c.subtitle}</div>
              <p className="hub-card-desc">{c.desc}</p>
              <div className="hub-card-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>Tanlash</span>
                <ArrowRight size={15} strokeWidth={2.4} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
