import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CreditCard, Play } from 'lucide-react';
import './HeroSection.css';

export default function HeroSection({ onStart }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <section className="hero" id="home">
        <div className="container hero-layout">
          {/* Left Copy */}
          <div className="hero-copy">
            <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} strokeWidth={2.4} color="#f2c84b" />
              <span>Professional AI Video Platformasi</span>
            </div>

            <h1>
              Reklama videoni
              <span>soniyalarda yarating.</span>
            </h1>

            <p className="hero-lead">
              G'oyangiz va rasmingizni yuboring. Sun'iy intellekt siz uchun yuqori konversiyali, musiqali va 1080p sifatli professional reklama roligini to'liq avtomatik tayyorlab beradi.
            </p>

            <div className="hero-actions">
              <button
                className="hero-cta-btn"
                onClick={() => navigate('/create')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
              >
                <Sparkles size={18} strokeWidth={2.4} />
                <span>Bepul Boshlash</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </button>
              <a href="#pricing" className="button button-line btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} strokeWidth={2.2} />
                <span>Tariflar & Narxlar</span>
              </a>
            </div>
          </div>

          {/* Right Visual / Studio Mockup */}
          <div className="hero-visual">
            <div className="hero-studio-card">
              <div className="studio-top">
                <div className="studio-dots">
                  <span className="studio-dot red" />
                  <span className="studio-dot yellow" />
                  <span className="studio-dot green" />
                </div>
                <span className="studio-title">airek Studio v2.0</span>
              </div>

              <div className="studio-screen">
                <div className="studio-play" onClick={() => navigate('/create')} title="Video yaratish" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={30} fill="currentColor" strokeWidth={0} />
                </div>
              </div>

              <div className="studio-meta">
                <div className="studio-pill">
                  <strong>1080p</strong>
                  <span>Full HD Sifat</span>
                </div>
                <div className="studio-pill">
                  <strong>30s</strong>
                  <span>Tezkor Render</span>
                </div>
                <div className="studio-pill">
                  <strong>AI Audio</strong>
                  <span>Musiqa bilan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HubServis Signature Ticker Tape */}
      <div className="ticker">
        <div className="ticker-track">
          <div className="ticker-item">AI REKLAMA VIDEOLARI</div>
          <div className="ticker-item">FULL HD 1080P SIFAT</div>
          <div className="ticker-item">DASTLABKI 2 TA VIDEO MUTLAQO BEPUL</div>
          <div className="ticker-item">VISA & MASTERCARD TO'LOV</div>
          <div className="ticker-item">YENGIL VA TEZKOR GENERATSIYA</div>
          <div className="ticker-item">AI REKLAMA VIDEOLARI</div>
          <div className="ticker-item">FULL HD 1080P SIFAT</div>
          <div className="ticker-item">DASTLABKI 2 TA VIDEO MUTLAQO BEPUL</div>
          <div className="ticker-item">VISA & MASTERCARD TO'LOV</div>
        </div>
      </div>
    </>
  );
}
