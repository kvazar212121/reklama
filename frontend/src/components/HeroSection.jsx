import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
            <div className="eyebrow">
              Professional AI Video Platformasi
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
                onClick={() => navigate('/studio')}
              >
                <span className="hero-cta-icon">🎬</span>
                <span>Bepul Boshlash</span>
                <span className="hero-cta-arrow">→</span>
              </button>
              <a href="#pricing" className="button button-line btn-secondary">
                <span>💳</span> Tariflar & Narxlar
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
                <div className="studio-play" onClick={onStart} title="Video yaratish">
                  ▶
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
