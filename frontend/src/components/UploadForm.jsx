import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StyleSelector from './StyleSelector';
import './UploadForm.css';

const DURATIONS = ['s30', 's60'];
const MAX_IMAGES = 5;
const MAX_IDEA_LENGTH = 600;

// Har bir stilga mos avtomatik musiqa va audio kayfiyati
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

export default function UploadForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [style, setStyle] = useState('cyberpunk_neon');
  const [idea, setIdea] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [duration, setDuration] = useState('s30');
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImagesAdd = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;

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

  const validate = () => {
    const errs = {};
    if (!idea.trim()) errs.idea = "Iltimos, reklama g'oyasi yoki mahsulot tavsifini kiriting";
    if (images.length === 0) errs.image = "Iltimos, kamida bitta rasm yoki logo yuklang";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const autoMood = STYLE_MOOD_MAP[style] || 'energetic';
      const formData = new FormData();
      formData.append('idea', idea);
      formData.append('mood', autoMood);
      formData.append('duration', duration);
      formData.append('style', style);
      images.forEach((file) => formData.append('images', file));

      const res = await fetch('/api/videos/create', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        navigate(`/progress/${data.jobId}`, {
          state: { idea, mood: autoMood, duration, style, imagePreview: imagePreviews[0], jobId: data.jobId },
        });
      } else if (data.needPayment) {
        setErrors({
          idea: `${data.error} 'Tariflar' bo'limidan video paketini tanlashingiz mumkin.`,
        });
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setErrors({ idea: data.error || 'Xatolik yuz berdi' });
      }
    } catch (err) {
      setErrors({ idea: 'Server bilan aloqa xatosi: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="upload-section section" id="upload">
      <div className="container">
        <div className="upload-header">
          <div className="eyebrow">
            Video Studio
          </div>
          <h2>
            AI Reklama Roligini Yarating
          </h2>
          <p>
            10 xil professional dizayn stilidan birini tanlang, mahsulot haqida yozing va tayyor videoni oling.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="upload-stacked-container">
          {/* STEP 1: 10 XIL STIL TANLOVI */}
          <div className="upload-card-panel">
            <label className="step-label">
              <span className="step-num">01.</span>
              Dizayn va Video Stilini Tanlang (10 xil uslub)
            </label>
            <StyleSelector selected={style} onSelect={setStyle} />
          </div>

          {/* STEP 2: REKLAMA G'OYASI (TO'LIQ KENGLIKDA) */}
          <div className="upload-card-panel">
            <label className="step-label">
              <span className="step-num">02.</span>
              Reklama G'oyasi yoki Mahsulot Tavsifi
            </label>
            <textarea
              className={`form-input idea-textarea ${errors.idea ? 'error' : ''}`}
              placeholder="Masalan: Yangi kofe do'konimiz ochildi, premium qahvalar va 20% chegirma mavjud..."
              value={idea}
              onChange={(e) => { setIdea(e.target.value.slice(0, MAX_IDEA_LENGTH)); setErrors({...errors, idea: ''}); }}
              maxLength={MAX_IDEA_LENGTH}
              rows={6}
            />
            <div className="idea-char-count">{idea.length} / {MAX_IDEA_LENGTH}</div>
            {errors.idea && <span className="error-msg">⚠ {errors.idea}</span>}
          </div>

          {/* STEP 3: VIDEO DAVOMIYLIGI (TO'LIQ KENGLIKDA) */}
          <div className="upload-card-panel">
            <label className="step-label">
              <span className="step-num">03.</span>
              Video Davomiyligi
            </label>
            <div className="duration-grid">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`duration-btn ${duration === d ? 'active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {t(`upload.durations.${d}`)}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 4: MAHSULOT RASMLARI YOKI LOGO (BIR NECHTA, TO'LIQ KENGLIKDA) */}
          <div className="upload-card-panel">
            <label className="step-label">
              <span className="step-num">04.</span>
              Mahsulot Rasmlari yoki Logo (bittadan {MAX_IMAGES} tagacha)
            </label>

            {imagePreviews.length > 0 ? (
              <div className="image-grid">
                {imagePreviews.map((src, i) => (
                  <div className="image-thumb" key={i}>
                    <img src={src} alt={`rasm ${i + 1}`} />
                    <button
                      type="button"
                      className="image-thumb-remove"
                      onClick={() => handleRemoveImage(i)}
                      aria-label="Rasmni o'chirish"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <div className="image-add-tile" onClick={() => fileRef.current?.click()}>
                    <span className="image-add-icon">+</span>
                    <span>Yana qo'shish</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`image-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div>
                  <div className="dropzone-icon">🖼️</div>
                  <p className="dropzone-text">Rasm(lar) yuklash uchun bosing yoki torting</p>
                  <p className="dropzone-hint">PNG, JPG, WEBP (har biri 10 MB gacha, {MAX_IMAGES} tagacha rasm)</p>
                </div>
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
            {errors.image && <span className="error-msg">⚠ {errors.image}</span>}
          </div>

          {/* STEP 5: GENERATSIYA VA BALANS PANELI */}
          <div className="upload-card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '18px', border: '1.5px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Sizning balansingiz: </span>
                  <strong style={{ fontSize: '15px', color: user?.role === 'admin' ? '#22c55e' : (user?.credits > 0 ? '#22c55e' : '#ef4444') }}>
                    {user?.role === 'admin' ? 'Cheksiz (Admin)' : (user ? `${user.credits} ta video` : '2 ta bepul video')}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Saqlash muddati: </span>
                  <strong style={{ color: 'var(--gold)', fontSize: '13px' }}>24 soat (avtomatik o'chadi)</strong>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Format: <strong>1080p Full HD MP4</strong></span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="button button-gold btn-primary"
              style={{ width: '100%', minHeight: '60px', fontSize: '17px' }}
              disabled={submitting}
            >
              <span>{submitting ? 'Video yaratilmoqda...' : 'Videoni Generatsiya Qilish'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
