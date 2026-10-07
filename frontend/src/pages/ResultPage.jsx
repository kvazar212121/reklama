import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Download, Copy, Plus, User, Clock, Maximize2, Palette, Music, ShieldCheck, Check, AlertCircle, Pause, Play, Volume2, VolumeX, FileText, Zap, Type } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './ResultPage.css';

const MOOD_LABELS = {
  energetic: 'Energetik',
  calm: 'Xotirjam',
  happy: 'Quvnoq',
  cinematic: 'Kinematik',
  corporate: 'Korporativ',
};

const STYLE_NAMES = {
  cyberpunk_neon: 'Kiberpank Neon',
  luxury_minimal: 'Lüks Minimalizm',
  dynamic_modern: 'Dinamik Zamonaviy',
  bold_impact: 'Bold Impact',
  minimal_clean: 'Minimal Clean',
  neon_cyber: 'Neon Cyber',
  gradient_pop: 'Gradient Pop',
  editorial: 'Editorial',
  handwritten: 'Handwritten',
};

export default function ResultPage({ theme, onThemeToggle }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const videoRef = useRef(null);

  const jobId = params.jobId || location.state?.jobId;
  const [videoUrl, setVideoUrl] = useState(location.state?.videoUrl || null);
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(!videoUrl);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const { idea, imagePreview, mood, duration, style } = location.state || {};

  // Status polling: agar videoUrl yo'q bo'lsa yoki tayyor bo'lishini kutayotgan bo'lsa
  useEffect(() => {
    if (!jobId) {
      if (!videoUrl) setLoading(false);
      return;
    }

    let isMounted = true;
    let pollTimer = null;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/videos/status/${jobId}`);
        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          setJobData(data);
          if (data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setLoading(false);
            if (pollTimer) clearInterval(pollTimer);
          } else if (data.status === 'failed') {
            setErrorMsg(data.error || 'Video yaratishda xatolik yuz berdi');
            setLoading(false);
            if (pollTimer) clearInterval(pollTimer);
          }
        }
      } catch (err) {
        console.error('Result status fetch error:', err);
      }
    };

    fetchStatus();
    // Har 2.5 soniyada qayta tekshirib turadi
    if (!videoUrl) {
      pollTimer = setInterval(fetchStatus, 2500);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
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

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + `/result/${jobId || ''}`;
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      prompt('Video havolasi:', fullUrl);
    });
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const currentIdea = idea || jobData?.idea || '';
  const currentMood = mood || jobData?.mood || '';
  const currentDuration = duration || jobData?.duration || 's30';
  const currentStyle = style || jobData?.style || '';

  return (
    <div className="res-page">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />

      {/* Yuqori boshqaruv paneli */}
      <div className="res-top-bar">
        <div className="res-top-inner">
          <div className="res-top-left">
            <button className="res-back-btn" onClick={() => navigate('/create')}>
              ← Yangi video yaratish
            </button>
            <div className="res-badge-ready">
              <span className="res-dot-pulse" />
              1080p HD Tayyor
            </div>
          </div>

          <div className="res-top-right">
            <div className="res-credits-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} fill="currentColor" />
              <span>{user?.role === 'admin' ? 'Cheksiz' : `${user?.credits ?? 0} kredit`}</span>
            </div>
            {videoUrl && (
              <button className="res-quick-download-btn" onClick={handleDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} strokeWidth={2.6} />
                <span>Yuklab olish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Asosiy ishchi maydon: ikkala chekkagacha keng yoyilgan Cinema Studio */}
      <div className="res-workspace">
        <div className="res-grid">
          {/* Chap / Markaz: Katta Cinema Pleyer Maydoni */}
          <div className="res-stage-wrapper">
            <div className="res-cinema-stage">
              {videoUrl ? (
                <div className="res-player-box" onClick={togglePlay}>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="res-video-element"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Pleyer ustidagi tezkor boshqaruv paneli */}
                  <div className="res-stage-overlay-bar" onClick={(e) => e.stopPropagation()}>
                    <button className="res-stage-btn" onClick={togglePlay} title={isPlaying ? 'Pauza' : 'Ijro'} style={{ display: 'flex', alignItems: 'center' }}>
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="res-stage-btn" onClick={toggleMute} title={isMuted ? 'Ovozni yoqish' : 'Ovozsiz'} style={{ display: 'flex', alignItems: 'center' }}>
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <div className="res-stage-spacer" />
                    <span className="res-stage-pill">MP4 • 1080p</span>
                    <button className="res-stage-btn" onClick={toggleFullscreen} title="To'liq ekran" style={{ display: 'flex', alignItems: 'center' }}>
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="res-loading-box">
                  <div className="res-spinner" />
                  <h3>Videongiz tayyorlanmoqda...</h3>
                  <p>Sun'iy intellekt videoni qayta ishlamoqda. Sahifani yopmasdan kuting.</p>
                </div>
              ) : errorMsg ? (
                <div className="res-error-box">
                  <div className="res-error-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                    <AlertCircle size={44} strokeWidth={2} color="#ef4444" />
                  </div>
                  <h3>Xatolik yuz berdi</h3>
                  <p>{errorMsg}</p>
                  <button className="res-retry-btn" onClick={() => navigate('/create')}>
                    Qaytadan urinish
                  </button>
                </div>
              ) : imagePreview ? (
                <div className="res-player-box">
                  <img src={imagePreview} alt="Preview" className="res-video-element" />
                </div>
              ) : (
                <div className="res-loading-box">
                  <div className="res-spinner" />
                  <h3>Video pleyer yuklanmoqda...</h3>
                </div>
              )}
            </div>

            {/* Video tagidagi tezkor banner */}
            <div className="res-bottom-alert">
              <span className="res-alert-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <Clock size={20} strokeWidth={2.2} color="#f2c84b" />
              </span>
              <span>
                <strong>15 kunlik saqlash muddati:</strong> Ushbu video server xotirasini tejash uchun 15 kundan keyin o'chiriladi. Iltimos, hoziroq yuklab oling!
              </span>
            </div>
          </div>

          {/* O'ng tomon: Butun chekkagacha yopishgan Amallar & Ma'lumotlar Paneli */}
          <div className="res-side-panel">
            {/* Katta Yuklab Olish Kartasi */}
            <div className="res-card res-action-card">
              <div className="res-action-header">
                <div className="res-action-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={34} strokeWidth={2.4} color="#f2c84b" />
                </div>
                <div>
                  <h2 className="res-action-title">Video Tayyor!</h2>
                  <p className="res-action-sub">Yuqori sifatli 1080p MP4 formatida</p>
                </div>
              </div>

              <button
                className="res-primary-download-btn"
                onClick={handleDownload}
                disabled={!videoUrl}
              >
                <span className="res-dl-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <Download size={24} strokeWidth={2.6} />
                </span>
                <span className="res-dl-text">
                  <b>Videoni Yuklab Olish</b>
                  <small>Full HD 1080p • MP4 (H.264)</small>
                </span>
              </button>

              <div className="res-action-buttons">
                <button className="res-secondary-btn" onClick={handleCopyLink}>
                  <Copy size={15} strokeWidth={2.2} />
                  <span>{copied ? 'Nusxalandi!' : 'Havolani nusxalash'}</span>
                </button>
                <button className="res-secondary-btn" onClick={() => navigate('/create')}>
                  <Plus size={15} strokeWidth={2.4} />
                  <span>Yangi video yaratish</span>
                </button>
                <button className="res-secondary-btn" onClick={() => navigate('/cabinet')}>
                  <User size={15} strokeWidth={2.2} />
                  <span>Videolarim ro'yxati</span>
                </button>
              </div>
            </div>

            {/* Video Tafsilotlari Kartasi */}
            <div className="res-card res-details-card">
              <h3 className="res-card-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} strokeWidth={2.2} color="#f2c84b" />
                <span>Video ma'lumotlari</span>
              </h3>

              {currentIdea && (
                <div className="res-idea-box">
                  <span className="res-idea-label">G'oya / Ssenariy:</span>
                  <p className="res-idea-text">"{currentIdea}"</p>
                </div>
              )}

              <div className="res-specs-grid">
                <div className="res-spec-item">
                  <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Clock size={18} strokeWidth={2.2} color="#f2c84b" />
                  </span>
                  <div className="res-spec-info">
                    <span className="res-spec-label">Davomiyligi</span>
                    <span className="res-spec-value">
                      {currentDuration === 's60' ? '60 soniya' : '30 soniya'}
                    </span>
                  </div>
                </div>

                <div className="res-spec-item">
                  <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Maximize2 size={18} strokeWidth={2.2} color="#f2c84b" />
                  </span>
                  <div className="res-spec-info">
                    <span className="res-spec-label">Formati</span>
                    <span className="res-spec-value">
                      {jobData?.aspect_ratio || '9:16'} (Reels / Shorts)
                    </span>
                  </div>
                </div>

                <div className="res-spec-item">
                  <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Palette size={18} strokeWidth={2.2} color="#f2c84b" />
                  </span>
                  <div className="res-spec-info">
                    <span className="res-spec-label">Dizayn uslubi</span>
                    <span className="res-spec-value">
                      {STYLE_NAMES[currentStyle] || currentStyle || 'Maxsus AI dizayn'}
                    </span>
                  </div>
                </div>

                <div className="res-spec-item">
                  <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Music size={18} strokeWidth={2.2} color="#f2c84b" />
                  </span>
                  <div className="res-spec-info">
                    <span className="res-spec-label">Audio & Musiqa</span>
                    <span className="res-spec-value">
                      {currentMood ? MOOD_LABELS[currentMood] || currentMood : 'Sinxron audio'}
                    </span>
                  </div>
                </div>

                {jobData?.jobType === 'overlay' && (
                  <div className="res-spec-item">
                    <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                      <Type size={18} strokeWidth={2.2} color="#f2c84b" />
                    </span>
                    <div className="res-spec-info">
                      <span className="res-spec-label">Subtitrlar</span>
                      <span className="res-spec-value">
                        {jobData?.addSubtitles === 0 ? "O'chirilgan" : "Dinamik karaoke"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="res-spec-item">
                  <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <ShieldCheck size={18} strokeWidth={2.2} color="#22c55e" />
                  </span>
                  <div className="res-spec-info">
                    <span className="res-spec-label">Sifati</span>
                    <span className="res-spec-value">1080p Full HD • 60 FPS</span>
                  </div>
                </div>

                <div className="res-spec-item">
                  <span className="res-spec-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Check size={18} strokeWidth={2.8} color="#22c55e" />
                  </span>
                  <div className="res-spec-info">
                    <span className="res-spec-label">Himoya</span>
                    <span className="res-spec-value">Suv belgisisiz (No Watermark)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
