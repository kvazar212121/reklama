import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StyleSelector from '../components/StyleSelector';
import MusicStyleSelector from '../components/MusicStyleSelector';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import './StudioPage.css';

const DURATIONS = ['s30', 's60'];
const MAX_IMAGES = 5;
const MAX_IDEA_LENGTH = 1200;

// Har bir dizayn stiliga mos "aqlli" boshlang'ich musiqa uslubi — foydalanuvchi
// Musiqa Uslubi bosqichida istalganini keyin o'zi o'zgartirishi mumkin.
const STYLE_MUSIC_MAP = {
  cyberpunk_neon: 'kiberpank',
  luxury_gold: 'oltin',
  minimal_clean: 'minimal',
  kinetic_typography: 'kinetik',
  tiktok_viral: 'reels',
  corporate_blue: 'biznes',
  isometric_3d: 'izometriya',
  retro_vintage: 'retro',
  ecommerce_sale: 'savdo',
  cinematic_epic: 'kinematik',
};

const STYLE_MOOD_MAP = {
  cyberpunk_neon: 'energetic',
  luxury_gold: 'calm',
  minimal_clean: 'calm',
  kinetic_typography: 'energetic',
  tiktok_viral: 'happy',
  corporate_blue: 'corporate',
  isometric_3d: 'energetic',
  retro_vintage: 'calm',
  ecommerce_sale: 'energetic',
  cinematic_epic: 'cinematic',
};

const ASPECT_RATIOS = [
  {
    key: '9:16',
    label: '9:16',
    subtitle: 'Vertikal',
    desc: 'TikTok, Instagram Reels, YouTube Shorts uchun eng zo\'r format.',
    badge: 'Eng mashhur',
    w: 54,
    h: 96,
    platforms: '📱 TikTok · Reels · Stories',
  },
  {
    key: '16:9',
    label: '16:9',
    subtitle: 'Gorizontal',
    desc: 'YouTube, Facebook, TV va veb-saytlar uchun klassik keng ekran formati.',
    badge: null,
    w: 96,
    h: 54,
    platforms: '🖥 YouTube · Facebook · TV',
  },
  {
    key: '1:1',
    label: '1:1',
    subtitle: 'Kvadrat',
    desc: 'Instagram post, Facebook reklama va universal ijtimoiy tarmoq formati.',
    badge: null,
    w: 76,
    h: 76,
    platforms: '📷 Instagram · Facebook',
  },
  {
    key: '4:5',
    label: '4:5',
    subtitle: 'Portret',
    desc: 'Instagram feed uchun optimallashtrilgan vertikal format. Ekranda ko\'proq joy oladi.',
    badge: null,
    w: 64,
    h: 80,
    platforms: '📸 Instagram Feed',
  },
];

const STEPS = [
  { num: '01', label: 'Dizayn Stili', icon: '🎨' },
  { num: '02', label: "Reklama G'oyasi", icon: '✍️' },
  { num: '03', label: 'Video Davomiyligi', icon: '⏱' },
  { num: '04', label: 'Musiqa Uslubi', icon: '🎵' },
  { num: '05', label: 'Video Formati', icon: '📐' },
  { num: '06', label: 'Rasm & Logo', icon: '🖼️' },
];

export default function StudioPage({ theme, onThemeToggle }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [style, setStyle] = useState('cyberpunk_neon');
  const [idea, setIdea] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [duration, setDuration] = useState('s30');
  const [musicStyle, setMusicStyle] = useState(() => STYLE_MUSIC_MAP['cyberpunk_neon']);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImagesAdd = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) return;
    const room = MAX_IMAGES - images.length;
    const accepted = incoming.slice(0, room);
    setImages((prev) => [...prev, ...accepted]);
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviews((prev) => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
    setErrors((prev) => ({ ...prev, image: '' }));
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleImagesAdd(e.dataTransfer.files);
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 1 && !idea.trim()) errs.idea = "Iltimos, reklama g'oyasini kiriting";
    if (step === 5 && images.length === 0) errs.image = 'Iltimos, kamida bitta rasm yuklang';
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    const errs = validateStep(5);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (!user) {
      if (confirm("Video yaratish va saqlash uchun avval Google orqali kiring.\n\nHozir kirasizmi?")) {
        window.location.href = '/auth/google';
      }
      return;
    }

    const needed = duration === 's60' ? 2 : 1;
    if (user.role !== 'admin' && user.credits < needed) {
      if (duration === 's60' && user.credits === 1) {
        setErrors({
          submit: "60 soniyali video yaratish uchun 2 ta kredit talab qilinadi. Sizda 1 ta kredit bor (30 soniyali video uchun). Iltimos, 30 soniyani tanlang yoki 'Tariflar' bo'limidan paket xarid qiling.",
        });
      } else {
        setErrors({
          submit: "Video yaratish uchun hisobingizda kredit yo'q. 'Tariflar' bo'limidan video paketini tanlashingiz mumkin.",
        });
      }
      return;
    }

    setSubmitting(true);
    try {
      const autoMood = STYLE_MOOD_MAP[style] || 'energetic';
      const formData = new FormData();
      formData.append('idea', idea);
      formData.append('mood', autoMood);
      formData.append('duration', duration);
      formData.append('style', style);
      formData.append('musicStyle', musicStyle);
      formData.append('aspectRatio', aspectRatio);
      images.forEach((file) => formData.append('images', file));

      const res = await fetch('/api/videos/create', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        navigate(`/progress/${data.jobId}`, {
          state: {
            idea,
            mood: autoMood,
            duration,
            aspectRatio,
            style,
            musicStyle,
            imagePreview: imagePreviews[0],
            jobId: data.jobId,
          },
        });
      } else if (data.needPayment) {
        setErrors({
          submit: `${data.error} 'Tariflar' bo'limidan video paketini tanlashingiz mumkin.`,
        });
      } else {
        setErrors({ submit: data.error || 'Xatolik yuz berdi' });
      }
    } catch (err) {
      setErrors({ submit: 'Server bilan aloqa xatosi: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = ((currentStep) / (STEPS.length - 1)) * 100;

  return (
    <div className="studio-page">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />

      <div className="studio-container">
        {/* ── TOP HEADER ── */}
        <div className="studio-top-bar">
          <button className="studio-back-btn" onClick={() => navigate('/')}>
            ← Orqaga
          </button>
          <div className="studio-brand">
            <span className="studio-brand-icon">🎬</span>
            <span>
              airek<b style={{ color: 'var(--gold)' }}>.uz</b> Studio
            </span>
          </div>
          <div className="studio-balance-badge">
            <span>⚡</span>
            <span>
              {user?.role === 'admin'
                ? 'Cheksiz'
                : user
                ? `${user.credits} ta video`
                : '2 ta bepul'}
            </span>
          </div>
        </div>

        {/* ── STEP INDICATOR ── */}
        <div className="studio-step-indicator">
          {STEPS.map((s, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={i} className={`studio-step-dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                <div className="studio-step-circle">
                  {isDone ? '✓' : <span>{s.icon}</span>}
                </div>
                <span className="studio-step-label">{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={`studio-step-line ${isDone ? 'done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="studio-progress-bar">
          <div
            className="studio-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* ── STEP CONTENT ── */}
        <div className="studio-step-content" key={currentStep}>
          {/* STEP 0 — STIL */}
          {currentStep === 0 && (
            <div className="studio-panel studio-panel-full">
              <div className="studio-panel-header">
                <div className="studio-panel-header-left">
                  <span className="studio-panel-num">01</span>
                  <div className="studio-panel-title-wrap">
                    <h2 className="studio-panel-title">Dizayn va Video Stilini Tanlang</h2>
                    <p className="studio-panel-sub">10 xil professional uslubdan birini tanlang</p>
                  </div>
                </div>
                <div className="studio-panel-header-nav">
                  <button className="studio-btn-next" onClick={goNext}>
                    Keyingisi →
                  </button>
                </div>
              </div>
              <StyleSelector selected={style} onSelect={setStyle} />
            </div>
          )}

          {/* STEP 1 — G'OYA */}
          {currentStep === 1 && (
            <div className="studio-panel studio-panel-centered">
              <div className="studio-panel-header">
                <div className="studio-panel-header-left">
                  <span className="studio-panel-num">02</span>
                  <div className="studio-panel-title-wrap">
                    <h2 className="studio-panel-title">Reklama G'oyasi yoki Mahsulot Tavsifi</h2>
                    <p className="studio-panel-sub">
                      AI siz uchun to'liq skript, vizual va musiqa tanlaydi
                    </p>
                  </div>
                </div>
                <div className="studio-panel-header-nav">
                  <button className="studio-btn-prev" onClick={goPrev} disabled={submitting}>
                    ← Orqaga
                  </button>
                  <button className="studio-btn-next" onClick={goNext}>
                    Keyingisi →
                  </button>
                </div>
              </div>

              <div className="studio-idea-wrap">
                <div className="studio-idea-examples">
                  {[
                    "Yangi smartfon: 108MP kamera, 5000mAh batareya, bugun 20% chegirma",
                    "Bolalar kiyimlari do'koni: yumshoq, xavfsiz, 2-10 yosh uchun",
                    "Premium kofe: Efiopiya arabikasi, har ertalab yetkazib beramiz",
                  ].map((ex, i) => (
                    <button
                      key={i}
                      className="studio-example-chip"
                      onClick={() => { setIdea(ex); setErrors({}); }}
                    >
                      {ex.slice(0, 42)}…
                    </button>
                  ))}
                </div>

                <textarea
                  className={`studio-idea-textarea ${errors.idea ? 'error' : ''}`}
                  placeholder="Masalan: Yangi kofe do'konimiz ochildi, premium qahvalar va 20% chegirma mavjud. Maqsad: 25-40 yoshli erkaklar va ayollar..."
                  value={idea}
                  onChange={(e) => {
                    setIdea(e.target.value.slice(0, MAX_IDEA_LENGTH));
                    setErrors({ ...errors, idea: '' });
                  }}
                  maxLength={MAX_IDEA_LENGTH}
                  rows={8}
                />
                <div className="studio-char-row">
                  <span>{errors.idea && <span className="studio-error">⚠ {errors.idea}</span>}</span>
                  <span className="studio-char-count">{idea.length} / {MAX_IDEA_LENGTH}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — DAVOMIYLIK */}
          {currentStep === 2 && (
            <div className="studio-panel studio-panel-centered">
              <div className="studio-panel-header">
                <div className="studio-panel-header-left">
                  <span className="studio-panel-num">03</span>
                  <div className="studio-panel-title-wrap">
                    <h2 className="studio-panel-title">Video Davomiyligi</h2>
                    <p className="studio-panel-sub">Reklamangiz uchun eng mos uzunlikni tanlang</p>
                  </div>
                </div>
                <div className="studio-panel-header-nav">
                  <button className="studio-btn-prev" onClick={goPrev} disabled={submitting}>
                    ← Orqaga
                  </button>
                  <button className="studio-btn-next" onClick={goNext}>
                    Keyingisi →
                  </button>
                </div>
              </div>

              <div className="studio-duration-cards">
                {[
                  {
                    key: 's30',
                    label: '30 soniya',
                    icon: '⚡',
                    desc: 'TikTok, Instagram Reels, storieslar uchun. (1 ta kredit — Bepul sinov uchun)',
                    badge: 'Bepul sinov (1 kredit)',
                    featured: true,
                  },
                  {
                    key: 's60',
                    label: '60 soniya',
                    icon: '🎬',
                    desc: 'YouTube, Facebook va TV uchun. (2 ta kredit talab qilinadi)',
                    badge: '2 ta kredit',
                    featured: false,
                  },
                ].map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={`studio-duration-card ${duration === d.key ? 'active' : ''}`}
                    onClick={() => setDuration(d.key)}
                  >
                    {d.badge && <span className="studio-dur-badge">{d.badge}</span>}
                    <div className="studio-dur-icon">{d.icon}</div>
                    <div className="studio-dur-label">{d.label}</div>
                    <div className="studio-dur-desc">{d.desc}</div>
                    <div className={`studio-dur-check ${duration === d.key ? 'visible' : ''}`}>✓</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — MUSIQA USLUBI */}
          {currentStep === 3 && (
            <div className="studio-panel studio-panel-full">
              <div className="studio-panel-header">
                <div className="studio-panel-header-left">
                  <span className="studio-panel-num">04</span>
                  <div className="studio-panel-title-wrap">
                    <h2 className="studio-panel-title">Musiqa Uslubini Tanlang</h2>
                    <p className="studio-panel-sub">10 xil uslubdan birini tanlang — energetik bassdan tortib, sokin va jiddiygacha</p>
                  </div>
                </div>
                <div className="studio-panel-header-nav">
                  <button className="studio-btn-prev" onClick={goPrev} disabled={submitting}>
                    ← Orqaga
                  </button>
                  <button className="studio-btn-next" onClick={goNext}>
                    Keyingisi →
                  </button>
                </div>
              </div>
              <MusicStyleSelector selected={musicStyle} onSelect={setMusicStyle} />
            </div>
          )}

          {/* STEP 4 — VIDEO FORMATI */}
          {currentStep === 4 && (
            <div className="studio-panel studio-panel-centered">
              <div className="studio-panel-header">
                <div className="studio-panel-header-left">
                  <span className="studio-panel-num">05</span>
                  <div className="studio-panel-title-wrap">
                    <h2 className="studio-panel-title">Video Formati</h2>
                    <p className="studio-panel-sub">Qaysi platformaga mos o'lchamni tanlang</p>
                  </div>
                </div>
                <div className="studio-panel-header-nav">
                  <button className="studio-btn-prev" onClick={goPrev} disabled={submitting}>
                    ← Orqaga
                  </button>
                  <button className="studio-btn-next" onClick={goNext}>
                    Keyingisi →
                  </button>
                </div>
              </div>

              <div className="studio-aspect-cards">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.key}
                    type="button"
                    className={`studio-aspect-card ${aspectRatio === ar.key ? 'active' : ''}`}
                    onClick={() => setAspectRatio(ar.key)}
                  >
                    {ar.badge && <span className="studio-aspect-badge">{ar.badge}</span>}
                    <div className="studio-aspect-frame-wrap">
                      <div
                        className={`studio-aspect-frame ${aspectRatio === ar.key ? 'active' : ''}`}
                        style={{ width: ar.w, height: ar.h }}
                      >
                        <span className="studio-aspect-ratio-text">{ar.label}</span>
                      </div>
                    </div>
                    <div className="studio-aspect-label">{ar.subtitle}</div>
                    <div className="studio-aspect-size">{ar.label}</div>
                    <div className="studio-aspect-desc">{ar.desc}</div>
                    <div className="studio-aspect-platforms">{ar.platforms}</div>
                    <div className={`studio-dur-check ${aspectRatio === ar.key ? 'visible' : ''}`}>✓</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 — RASMLAR */}
          {currentStep === 5 && (
            <div className="studio-panel studio-panel-centered">
              <div className="studio-panel-header">
                <div className="studio-panel-header-left">
                  <span className="studio-panel-num">06</span>
                  <div className="studio-panel-title-wrap">
                    <h2 className="studio-panel-title">Mahsulot Rasmlari yoki Logo</h2>
                    <p className="studio-panel-sub">
                      1 dan {MAX_IMAGES} tagacha rasm yuklang (PNG, JPG, WEBP · har biri 10MB gacha)
                    </p>
                  </div>
                </div>
                <div className="studio-panel-header-nav">
                  <button className="studio-btn-prev" onClick={goPrev} disabled={submitting}>
                    ← Orqaga
                  </button>
                  <button
                    className="studio-btn-submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="studio-submit-spinner" />
                        Video yaratilmoqda...
                      </>
                    ) : (
                      <>🚀 Videoni Generatsiya Qilish</>
                    )}
                  </button>
                </div>
              </div>

              {imagePreviews.length > 0 ? (
                <div className="studio-image-grid">
                  {imagePreviews.map((src, i) => (
                    <div className="studio-img-thumb" key={i}>
                      <img src={src} alt={`rasm ${i + 1}`} />
                      <button
                        type="button"
                        className="studio-img-remove"
                        onClick={() => handleRemoveImage(i)}
                        aria-label="O'chirish"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <div className="studio-img-add" onClick={() => fileRef.current?.click()}>
                      <span className="studio-img-add-icon">+</span>
                      <span>Qo'shish</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`studio-dropzone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="studio-dropzone-icon">🖼️</div>
                  <p className="studio-dropzone-title">Rasm(lar) yuklash uchun bosing yoki shu yerga torting</p>
                  <p className="studio-dropzone-hint">PNG, JPG, WEBP · {MAX_IMAGES} tagacha · har biri 10MB gacha</p>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { handleImagesAdd(e.target.files); e.target.value = ''; }}
              />
              {errors.image && <span className="studio-error">⚠ {errors.image}</span>}

              {/* Summary before submit */}
              <div className="studio-summary-card">
                <div className="studio-summary-title">📋 Buyurtma Xulosasi</div>
                <div className="studio-summary-grid">
                  <div className="studio-summary-item">
                    <span className="studio-summary-lbl">Stil</span>
                    <span className="studio-summary-val">{style.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="studio-summary-item">
                    <span className="studio-summary-lbl">Davomiylik</span>
                    <span className="studio-summary-val">{duration === 's30' ? '30 soniya' : '60 soniya'}</span>
                  </div>
                  <div className="studio-summary-item">
                    <span className="studio-summary-lbl">Musiqa</span>
                    <span className="studio-summary-val">{musicStyle}</span>
                  </div>
                  <div className="studio-summary-item">
                    <span className="studio-summary-lbl">Format</span>
                    <span className="studio-summary-val">{aspectRatio}</span>
                  </div>
                  <div className="studio-summary-item">
                    <span className="studio-summary-lbl">Rasmlar</span>
                    <span className="studio-summary-val">{images.length} ta yuklangan</span>
                  </div>
                  <div className="studio-summary-item">
                    <span className="studio-summary-lbl">Balans</span>
                    <span className="studio-summary-val" style={{ color: '#22c55e' }}>
                      {user?.role === 'admin' ? 'Cheksiz' : user ? `${user.credits} ta video` : '1 ta bepul video'}
                    </span>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="studio-submit-error">
                  ⚠ {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
