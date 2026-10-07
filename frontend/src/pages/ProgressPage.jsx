import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Film, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import './ProgressPage.css';

const PROGRESS_STEPS = [
  { id: 'analyzing', num: '01', title: "G'oya Tahlili", desc: "DeepSeek Flash ssenariyni tahlil qilmoqda" },
  { id: 'designing', num: '02', title: "Vizual Dizayn", desc: "1920x1080 maket va ranglar tanlanmoqda" },
  { id: 'animating', num: '03', title: "Animatsiyalar", desc: "Silliq CSS harakatlari integratsiya qilinmoqda" },
  { id: 'music',     num: '04', title: "Audio & Musiqa", desc: "Stilga mos musiqa sinxronlashtirilmoqda" },
  { id: 'rendering', num: '05', title: "Video Render",  desc: "1080p Full HD video yig'ilmoqda" },
];

export default function ProgressPage({ theme, onThemeToggle }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const jobId = params.jobId || location.state?.jobId;
  const { idea, mood, duration, style, imagePreview } = location.state || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(15);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!jobId && !idea) {
      navigate('/');
      return;
    }

    let isMounted = true;
    let timer = null;

    const checkStatus = async () => {
      if (!jobId) {
        setProgress((prev) => {
          const next = prev + 12;
          if (next >= 100) {
            navigate('/result', { state: { idea, mood, duration, style, imagePreview } });
            return 100;
          }
          setCurrentStep(Math.min(Math.floor((next / 100) * 5), 4));
          return next;
        });
        return;
      }

      try {
        const res = await fetch(`/api/videos/status/${jobId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (data.success) {
          const { status, videoUrl, error } = data;

          if (videoUrl || status === 'done') {
            setProgress(100);
            setCurrentStep(5);
            if (timer) clearInterval(timer);
            setTimeout(() => {
              navigate(`/result/${jobId}`, {
                state: { jobId, videoUrl, idea: idea || data.idea, mood, duration, style, imagePreview },
              });
            }, 600);
          } else if (status === 'pending') {
            setProgress(25);
            setCurrentStep(0);
          } else if (status === 'processing') {
            setProgress((prev) => Math.min(prev + 10, 88));
            setCurrentStep((prev) => Math.min(prev + 1, 4));
          } else if (status === 'failed') {
            if (timer) clearInterval(timer);
            setErrorMsg(error || 'Video yaratishda xatolik yuz berdi');
          }
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    checkStatus();
    timer = setInterval(checkStatus, 3000);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [jobId]);

  return (
    <div className="progress-page">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />
      <div className="progress-content">
        {/* Header */}
        <div className="progress-header">
          <div className="progress-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={46} strokeWidth={2.2} color="#f2c84b" />
          </div>
          <h1 className="progress-title">Videongiz Tayyorlanmoqda</h1>
          <p className="progress-subtitle">
            Sun'iy intellekt video rolikni to'liq mustaqil yaratmoqda. Sifat uchun bu jarayon bir necha daqiqadan bir soatgacha davom etishi mumkin — sahifani yopmasdan kuting.
          </p>
        </div>

        {errorMsg ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertCircle size={48} strokeWidth={2} color="#ef4444" />
            </div>
            <h3 style={{ color: '#ef4444', marginBottom: '12px' }}>Xatolik yuz berdi</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{errorMsg}</p>
            <button className="btn-primary" onClick={() => navigate('/create')}>
              Qayta urinish
            </button>
          </div>
        ) : (
          <>
            {/* ── TEPADA YUMALOQ PROGRESS & AYLANUVCHI ORBITAL SPINNER ── */}
            <div className="progress-circle-wrapper">
              {/* Tashqi SVG Progress Halqasi */}
              <svg className="progress-ring" width="220" height="220">
                <circle
                  cx="110" cy="110" r="95"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="10"
                />
                <circle
                  className="progress-ring-fill"
                  cx="110" cy="110" r="95"
                  fill="none"
                  stroke="url(#progressGoldGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 95}`}
                  strokeDashoffset={`${2 * Math.PI * 95 * (1 - progress / 100)}`}
                />
                <defs>
                  <linearGradient id="progressGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f2c84b" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Ichida Aylanuvchi Dinamik Spinner */}
              <div className="inner-orbit-spinner">
                <div className="orbit-ring-1" />
                <div className="orbit-ring-2" />
                <div className="orbit-pulse-core" />
              </div>

              {/* Markazdagi Foiz Ko'rsatkichi */}
              <div className="progress-percent-box">
                <span className="progress-percent-val">{progress}%</span>
                <span className="progress-percent-lbl">Tayyorlanmoqda</span>
              </div>
            </div>

            {/* ── O'RTADA CHAPDAN O'NGGA SURILIB KELUVCHI YONMA-YON ETAPLAR ── */}
            <div className="horizontal-stepper">
              {PROGRESS_STEPS.map((step, index) => {
                const isDone = index < currentStep;
                const isActive = index === currentStep;
                const isPending = index > currentStep;

                return (
                  <div
                    key={step.id}
                    className={`step-chip-card ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                    style={{ animationDelay: `${index * 0.12}s` }}
                  >
                    <div className="step-chip-top">
                      <span className="step-num-badge">{step.num}</span>
                      <div className="step-status-icon">
                        {isDone ? (
                          <Check size={14} strokeWidth={3} />
                        ) : isActive ? (
                          <span className="step-spinner" />
                        ) : (
                          '○'
                        )}
                      </div>
                    </div>

                    <div className="step-chip-title">{step.title}</div>
                    <div className="step-chip-desc">{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
