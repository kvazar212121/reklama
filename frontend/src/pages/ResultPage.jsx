import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ResultPage.css';

const MOOD_LABELS = {
  energetic: 'Energetik 🔥',
  calm: "Xotirjam 🌿",
  happy: 'Quvnoq ✨',
  cinematic: 'Kinematik 🎬',
  corporate: 'Korporativ 💼',
};

export default function ResultPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const jobId = params.jobId || location.state?.jobId;
  const [videoUrl, setVideoUrl] = useState(location.state?.videoUrl || null);
  const { idea, imagePreview, mood, duration } = location.state || {};

  useEffect(() => {
    if (!videoUrl && jobId) {
      fetch(`/api/videos/status/${jobId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.videoUrl) {
            setVideoUrl(data.videoUrl);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [jobId, videoUrl]);

  const handleDownload = () => {
    if (jobId) {
      window.location.href = `/api/videos/download/${jobId}`;
    } else if (videoUrl) {
      window.location.href = videoUrl;
    } else {
      alert('Video topilmadi');
    }
  };

  return (
    <div className="result-page">
      <div className="orb orb-purple result-orb-1" />
      <div className="orb orb-cyan result-orb-2" />

      <div className="container result-content">
        {/* Success Badge */}
        <div className="result-success-icon animate-pulse-glow">🎉</div>

        <div className="result-header">
          <h1 className="result-title">{t('result.title')}</h1>
          <p className="result-subtitle">{t('result.subtitle')}</p>
        </div>

        {/* Tez orada o'chirilishi haqida ogohlantirish */}
        <div className="result-expiry-banner">
          <span className="result-expiry-icon">⏳</span>
          <span>
            Bu video <strong>24 soatdan</strong> so'ng serverdan avtomatik o'chiriladi — <strong>hoziroq yuklab oling!</strong>
          </span>
        </div>

        {/* Video Player Card */}
        <div className="result-video-card card">
          <div className="result-video-player">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="result-video-el"
              />
            ) : imagePreview ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img src={imagePreview} alt="video thumbnail" className="result-thumbnail" />
                <div className="result-video-overlay">
                  <div className="result-play-btn">▶</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '60px', color: 'var(--text-muted)' }}>
                🎬 Video pleyer yuklanmoqda...
              </div>
            )}
          </div>

          <div className="result-info">
            <div className="result-meta">
              <span className="result-tag">✓ MP4 Ready</span>
              <span className="result-tag">✓ 1080p HD</span>
              <span className="result-tag">✓ Ovoz dizayni</span>
            </div>
            {idea && <p className="result-idea">"{idea}"</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button className="btn-primary result-download-btn" onClick={handleDownload}>
            <span>⬇</span> {t('result.download')}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            <span>+</span> {t('result.createNew')}
          </button>
        </div>

        {/* Info Cards */}
        <div className="result-details">
          <div className="result-detail-card card">
            <span className="detail-icon">⏱</span>
            <span className="detail-label">Davomiyligi</span>
            <span className="detail-value gradient-text">{duration ? t(`upload.durations.${duration}`) : '—'}</span>
          </div>
          <div className="result-detail-card card">
            <span className="detail-icon">📐</span>
            <span className="detail-label">Sifat</span>
            <span className="detail-value gradient-text">1080p HD</span>
          </div>
          <div className="result-detail-card card">
            <span className="detail-icon">🎵</span>
            <span className="detail-label">Kayfiyat</span>
            <span className="detail-value gradient-text">{MOOD_LABELS[mood] || 'Energetik 🔥'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
