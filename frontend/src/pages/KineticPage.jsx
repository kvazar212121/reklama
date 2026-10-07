import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './KineticPage.css';

const DESIGNS = [
  { key: 'bold_impact',   icon: '💥', label: 'Bold Impact',   desc: 'Yirik, qalin harflar, kuchli urg\'u. Motivatsion va reklama uchun.', featured: true },
  { key: 'minimal_clean', icon: '⚪', label: 'Minimal Clean',  desc: 'Toza, sodda, oq fon. Jiddiy va professional ohang.' },
  { key: 'neon_cyber',    icon: '🌃', label: 'Neon Cyber',     desc: 'Neon ranglar, qora fon, futuristik uslub.' },
  { key: 'gradient_pop',  icon: '🌈', label: 'Gradient Pop',   desc: 'Yorqin gradientlar, quvnoq va zamonaviy.' },
  { key: 'editorial',     icon: '📰', label: 'Editorial',      desc: 'Jurnal uslubi, nafis serif shriftlar.' },
  { key: 'handwritten',   icon: '✏️', label: 'Handwritten',    desc: 'Qo\'lda yozilgan, samimiy va iliq ohang.' },
];

const RATIOS = [
  { key: '9:16', label: '9:16', hint: 'Reels / TikTok / Shorts' },
  { key: '1:1',  label: '1:1',  hint: 'Instagram post' },
  { key: '4:5',  label: '4:5',  hint: 'Instagram portret' },
  { key: '16:9', label: '16:9', hint: 'YouTube / landshaft' },
];

export default function KineticPage({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('audio'); // 'audio' yoki 'text'
  const [audio, setAudio] = useState(null);
  const [audioName, setAudioName] = useState('');
  const [text, setText] = useState('');
  const [design, setDesign] = useState('bold_impact');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [addMusic, setAddMusic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const okType = file.type.startsWith('audio/') || file.type.startsWith('video/');
    if (!okType) {
      setError('Iltimos, ovozli fayl tanlang (MP3, WAV, M4A yoki video)');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError('Fayl hajmi 200 MB dan oshmasligi kerak');
      return;
    }
    setError('');
    setAudio(file);
    setAudioName(file.name);
  };

  const handleSubmit = async () => {
    if (!user) {
      if (confirm('Davom etish uchun avval Google orqali kiring.\n\nHozir kirasizmi?')) {
        window.location.href = '/auth/google';
      }
      return;
    }
    if (mode === 'audio' && !audio) {
      setError('Iltimos, ovozli faylni yuklang');
      return;
    }
    if (mode === 'text' && text.trim().length < 3) {
      setError('Iltimos, matn kiriting');
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
      if (mode === 'audio') formData.append('video', audio); // backend 'video' maydonini kutadi (audio ham qabul qilinadi)
      else formData.append('text', text.trim());
      formData.append('design', design);
      formData.append('aspectRatio', aspectRatio);
      formData.append('addMusic', addMusic ? '1' : '0');

      const res = await fetch('/api/videos/kinetic', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.jobId) {
        navigate(`/progress/${data.jobId}`, { state: { jobId: data.jobId, kinetic: true } });
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

  const canSubmit = mode === 'audio' ? Boolean(audio) : text.trim().length >= 3;

  return (
    <div className="kin-page">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />

      <div className="kin-container">
        <div className="kin-top-bar">
          <button className="kin-back-btn" onClick={() => navigate('/create')}>← Orqaga</button>
          <div className="kin-brand">✍️ Animatsion <b>Matn</b></div>
          <div className="kin-credits">⚡ {user?.role === 'admin' ? 'Cheksiz' : `${user?.credits ?? 0} kredit`}</div>
        </div>

        <div className="kin-hero">
          <h1>Gaplaringizni <span>animatsion matn</span>ga aylantiring</h1>
          <p>
            Ovozli fayl yoki matn yuklang — sun'iy intellekt so'zlaringizni aniqlab,
            ularni tanlagan dizayningizda chiroyli harakatlanuvchi matn (kinetic typography)
            qilib chiqaradi. Hech qanday video yoki yuz ko'rsatilmaydi — faqat animatsion matn.
          </p>
        </div>

        {/* MODE SWITCH */}
        <div className="kin-mode-switch">
          <button className={`kin-mode-btn ${mode === 'audio' ? 'active' : ''}`} onClick={() => setMode('audio')}>
            🎤 Ovozli fayl
          </button>
          <button className={`kin-mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
            ⌨️ Matn yozish
          </button>
        </div>

        {/* INPUT */}
        {mode === 'audio' ? (
          <div
            className={`kin-drop ${dragOver ? 'dragover' : ''} ${audio ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              hidden
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {!audio ? (
              <div className="kin-drop-empty">
                <div className="kin-drop-icon">🎤</div>
                <div className="kin-drop-title">Ovozli faylni shu yerga tashlang yoki tanlang</div>
                <div className="kin-drop-sub">MP3, WAV, M4A yoki video — 200 MB gacha</div>
              </div>
            ) : (
              <div className="kin-file-chosen">
                <div className="kin-file-icon">🎧</div>
                <div className="kin-file-name">{audioName}</div>
                <button
                  className="kin-change-btn"
                  onClick={(e) => { e.stopPropagation(); setAudio(null); setAudioName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >
                  ✕ Boshqa fayl
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="kin-text-wrap">
            <textarea
              className="kin-textarea"
              placeholder="Animatsion matnga aylantirmoqchi bo'lgan gaplaringizni shu yerga yozing..."
              value={text}
              maxLength={3000}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="kin-text-count">{text.length} / 3000</div>
          </div>
        )}

        {/* DESIGN */}
        <div className="kin-section">
          <h3 className="kin-section-title">Dizayn uslubi</h3>
          <div className="kin-design-grid">
            {DESIGNS.map((d) => (
              <button
                key={d.key}
                className={`kin-design-card ${design === d.key ? 'active' : ''}`}
                onClick={() => setDesign(d.key)}
              >
                {d.featured && <span className="kin-design-badge">Tavsiya</span>}
                <div className="kin-design-icon">{d.icon}</div>
                <div className="kin-design-label">{d.label}</div>
                <div className="kin-design-desc">{d.desc}</div>
                <div className={`kin-design-check ${design === d.key ? 'visible' : ''}`}>✓</div>
              </button>
            ))}
          </div>
        </div>

        {/* RATIO */}
        <div className="kin-section">
          <h3 className="kin-section-title">Video formati</h3>
          <div className="kin-ratio-row">
            {RATIOS.map((r) => (
              <button
                key={r.key}
                className={`kin-ratio-card ${aspectRatio === r.key ? 'active' : ''}`}
                onClick={() => setAspectRatio(r.key)}
              >
                <div className="kin-ratio-label">{r.label}</div>
                <div className="kin-ratio-hint">{r.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* MUSIC TOGGLE */}
        <div className="kin-section">
          <label className="kin-music-toggle">
            <input type="checkbox" checked={addMusic} onChange={(e) => setAddMusic(e.target.checked)} />
            <span className="kin-music-slider" />
            <span className="kin-music-text">
              🎵 Fon musiqa qo'shilsin
              <small>Animatsiyaga mos ritmli fon musiqa (tavsiya etiladi)</small>
            </span>
          </label>
        </div>

        {error && <div className="kin-error">⚠ {error}</div>}

        <button className="kin-submit-btn" disabled={submitting || !canSubmit} onClick={handleSubmit}>
          {submitting ? 'Yuklanmoqda...' : '✨ Animatsion matn yaratish (1 kredit)'}
        </button>
      </div>
    </div>
  );
}
