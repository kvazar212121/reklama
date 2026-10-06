import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './OverlayPage.css';

const INTENSITIES = [
  { key: 'light',  icon: '✨', label: 'Yengil',   desc: 'Kam, nozik animatsiya + subtitr. Jiddiy/rasmiy videolar uchun.' },
  { key: 'medium', icon: '⚡', label: 'O\'rtacha', desc: 'Subtitr doimiy, muhim so\'zlarga grafika, ba\'zan to\'liq animatsiya. Tavsiya etiladi.', featured: true },
  { key: 'heavy',  icon: '🔥', label: 'Intensiv', desc: 'Deyarli har so\'zga animatsiya, tez kesimlar — viral reels uslubi.' },
];

export default function OverlayPage({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [intensity, setIntensity] = useState('medium');
  const [addMusic, setAddMusic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Iltimos, video fayl tanlang (MP4, MOV, WEBM)');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError('Video hajmi 200 MB dan oshmasligi kerak');
      return;
    }
    setError('');
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user) {
      if (confirm('Video yuklash uchun avval Google orqali kiring.\n\nHozir kirasizmi?')) {
        window.location.href = '/auth/google';
      }
      return;
    }
    if (!video) {
      setError('Iltimos, gapirib turgan videongizni yuklang');
      return;
    }
    if (user.role !== 'admin' && user.credits < 1) {
      setError("Hisobingizda kredit yo'q. 'Tariflar' bo'limidan paket sotib oling.");
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('video', video);
      formData.append('intensity', intensity);
      formData.append('addMusic', addMusic ? '1' : '0');

      const res = await fetch('/api/videos/overlay', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.jobId) {
        navigate(`/progress/${data.jobId}`, { state: { jobId: data.jobId, overlay: true } });
      } else if (data.requireLogin) {
        if (confirm(`${data.error}\n\nHozir kirasizmi?`)) window.location.href = '/auth/google';
      } else if (data.needPayment) {
        setError(`${data.error}`);
      } else {
        setError(data.error || 'Xatolik yuz berdi');
      }
    } catch (err) {
      setError('Server bilan aloqa xatosi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay-page">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />

      <div className="overlay-container">
        <div className="overlay-top-bar">
          <button className="overlay-back-btn" onClick={() => navigate('/')}>← Orqaga</button>
          <div className="overlay-brand">🎞️ Video ustiga <b>Animatsiya</b></div>
          <div className="overlay-credits">⚡ {user?.role === 'admin' ? 'Cheksiz' : `${user?.credits ?? 0} kredit`}</div>
        </div>

        <div className="overlay-hero">
          <h1>Gapirib turgan videongizni <span>jonlantiring</span></h1>
          <p>
            Videongizni yuklang — sun'iy intellekt ovozingizdan har bir so'zni aniqlab,
            aytilayotgan gaplarga mos animatsiyalarni, grafikalarni va tovush effektlarini
            video ustiga avtomatik qo'shib beradi. Yuzingiz hech qachon yopilmaydi.
          </p>
        </div>

        {/* VIDEO UPLOAD */}
        <div
          className={`overlay-drop ${dragOver ? 'dragover' : ''} ${video ? 'has-video' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => !video && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {!video ? (
            <div className="overlay-drop-empty">
              <div className="overlay-drop-icon">📹</div>
              <div className="overlay-drop-title">Videoni shu yerga tashlang yoki tanlang</div>
              <div className="overlay-drop-sub">MP4, MOV, WEBM — 200 MB gacha</div>
            </div>
          ) : (
            <div className="overlay-preview-wrap">
              <video src={videoPreview} className="overlay-preview" controls />
              <button
                className="overlay-change-btn"
                onClick={(e) => { e.stopPropagation(); setVideo(null); setVideoPreview(null); fileInputRef.current.value = ''; }}
              >
                ✕ Boshqa video tanlash
              </button>
            </div>
          )}
        </div>

        {/* INTENSITY */}
        <div className="overlay-section">
          <h3 className="overlay-section-title">Animatsiya zichligi</h3>
          <div className="overlay-intensity-cards">
            {INTENSITIES.map((it) => (
              <button
                key={it.key}
                className={`overlay-int-card ${intensity === it.key ? 'active' : ''}`}
                onClick={() => setIntensity(it.key)}
              >
                {it.featured && <span className="overlay-int-badge">Tavsiya</span>}
                <div className="overlay-int-icon">{it.icon}</div>
                <div className="overlay-int-label">{it.label}</div>
                <div className="overlay-int-desc">{it.desc}</div>
                <div className={`overlay-int-check ${intensity === it.key ? 'visible' : ''}`}>✓</div>
              </button>
            ))}
          </div>
        </div>

        {/* MUSIC TOGGLE */}
        <div className="overlay-section">
          <label className="overlay-music-toggle">
            <input type="checkbox" checked={addMusic} onChange={(e) => setAddMusic(e.target.checked)} />
            <span className="overlay-music-slider" />
            <span className="overlay-music-text">
              🎵 Past ovozli fon musiqa qo'shilsin
              <small>Ovozingizga xalaqit bermaydigan tinch fon musiqa (tavsiya etiladi)</small>
            </span>
          </label>
        </div>

        {/* SAFE ZONE INFO */}
        <div className="overlay-info-box">
          <div className="overlay-info-icon">🛡️</div>
          <div>
            <strong>Yuzingiz himoyalanadi.</strong> Animatsiyalar faqat chekka va chetki hududlarda
            chiqadi — gapirayotgan yuzingiz hech qachon yopilmaydi. Ba'zi joylarda butun ekran
            qisqa animatsiyaga o'tishi mumkin (cutaway) va yana sizga qaytadi.
          </div>
        </div>

        {error && <div className="overlay-error">⚠ {error}</div>}

        <button className="overlay-submit-btn" disabled={submitting || !video} onClick={handleSubmit}>
          {submitting ? 'Yuklanmoqda...' : '🎬 Animatsiya qo\'shish (1 kredit)'}
        </button>
      </div>
    </div>
  );
}
