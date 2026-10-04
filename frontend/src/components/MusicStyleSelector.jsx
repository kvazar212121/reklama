import { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Gem,
  Minus,
  Activity,
  PartyPopper,
  Briefcase,
  Sparkles,
  Radio,
  Megaphone,
  Film,
  Check,
  Play,
  Pause,
} from 'lucide-react';
import './StyleSelector.css';

// 10 ta musiqa uslubi uchun ikonka (hubmusic.py preset'lari bilan 1:1 mos)
const MUSIC_ICON_COMPONENTS = {
  kiberpank: Zap,
  oltin: Gem,
  minimal: Minus,
  kinetik: Activity,
  reels: PartyPopper,
  biznes: Briefcase,
  izometriya: Sparkles,
  retro: Radio,
  savdo: Megaphone,
  kinematik: Film,
};

const MUSIC_THEMES = {
  kiberpank: { bg: 'linear-gradient(145deg, #090e24 0%, #1c082b 100%)', border: 'rgba(0, 240, 255, 0.35)', accent: '#00f0ff' },
  oltin: { bg: 'linear-gradient(145deg, #161107 0%, #291b05 100%)', border: 'rgba(242, 200, 75, 0.4)', accent: '#f2c84b' },
  minimal: { bg: 'linear-gradient(145deg, #0b1a29 0%, #15273b 100%)', border: 'rgba(56, 189, 248, 0.35)', accent: '#38bdf8' },
  kinetik: { bg: 'linear-gradient(145deg, #241403 0%, #331505 100%)', border: 'rgba(245, 158, 11, 0.4)', accent: '#f59e0b' },
  reels: { bg: 'linear-gradient(145deg, #240713 0%, #0d1e24 100%)', border: 'rgba(254, 44, 85, 0.4)', accent: '#fe2c55' },
  biznes: { bg: 'linear-gradient(145deg, #061930 0%, #0d284e 100%)', border: 'rgba(56, 189, 248, 0.4)', accent: '#38bdf8' },
  izometriya: { bg: 'linear-gradient(145deg, #130c2e 0%, #241247 100%)', border: 'rgba(168, 85, 247, 0.4)', accent: '#a855f7' },
  retro: { bg: 'linear-gradient(145deg, #211309 0%, #2f190c 100%)', border: 'rgba(224, 122, 95, 0.4)', accent: '#e07a5f' },
  savdo: { bg: 'linear-gradient(145deg, #2c0808 0%, #3d0c0c 100%)', border: 'rgba(239, 68, 68, 0.4)', accent: '#ef4444' },
  kinematik: { bg: 'linear-gradient(145deg, #09090e 0%, #191611 100%)', border: 'rgba(251, 191, 36, 0.4)', accent: '#fbbf24' },
};

// Backend ishlamay qolsa ham sahifa buzilmasligi uchun zaxira ro'yxat
const DEFAULT_MUSIC_STYLES = [
  { id: 'kiberpank', label: 'Bass & Energetik', description: "Qorong'i, tez sintezatorlar, hard baraban.", bpm: 128 },
  { id: 'oltin', label: 'Nafis & Hashamatli', description: 'Sekin torli akkordlar, yumshoq bas.', bpm: 96 },
  { id: 'minimal', label: 'Minimal & Sokin', description: 'Toza, siyrak, deyarli sezilmaydigan fon.', bpm: 112 },
  { id: 'kinetik', label: 'Ritmik & Aniq', description: "Stakkato ritm, aniq zarbalar.", bpm: 124 },
  { id: 'reels', label: 'Quvnoq & Viral', description: "Quvnoq, tez o'tishlar, TikTok kayfiyati.", bpm: 122 },
  { id: 'biznes', label: 'Jiddiy & Xotirjam', description: 'Xotirjam, ishonchli, korporativ ohang.', bpm: 100 },
  { id: 'izometriya', label: "O'yinchoqsimon & Yorqin", description: "Shishasimon qo'ng'iroqlar, yengil kayfiyat.", bpm: 110 },
  { id: 'retro', label: 'Retro & Nostalgik', description: '80-lar uslubi, lenta tebranishi.', bpm: 108 },
  { id: 'savdo', label: 'Shoshilinch & Baland', description: 'Baland clap, sirena, chegirma uchun.', bpm: 126 },
  { id: 'kinematik', label: 'Epik & Keng', description: 'Sekin, keng, kino darajasidagi dramatizm.', bpm: 84 },
];

export default function MusicStyleSelector({ selected, onSelect }) {
  const [musicStyles, setMusicStyles] = useState(DEFAULT_MUSIC_STYLES);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch('/api/videos/music-styles')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.musicStyles?.length === 10) {
          setMusicStyles(data.musicStyles);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Sahifadan chiqishda/komponent yo'qolganda musiqani to'xtatish
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const togglePreview = (e, id) => {
    e.stopPropagation(); // kartani tanlab qo'ymasligi uchun
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`/music-previews/${id}.mp3`);
    audio.addEventListener('ended', () => setPlayingId(null));
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(id);
  };

  return (
    <div className="styles-grid-5x2">
      {musicStyles.map((m) => {
        const IconComponent = MUSIC_ICON_COMPONENTS[m.id] || Sparkles;
        const theme = MUSIC_THEMES[m.id] || MUSIC_THEMES.kiberpank;
        const isSelected = selected === m.id;

        return (
          <div
            key={m.id}
            className={`style-card-pro ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(m.id)}
            style={{
              background: theme.bg,
              borderColor: isSelected ? 'var(--gold)' : theme.border,
              boxShadow: isSelected ? '0 14px 36px rgba(0,0,0,0.4), 0 0 20px rgba(242, 200, 75, 0.4)' : '0 6px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="style-header-row">
              <div
                className="style-icon-box"
                style={{ background: `${theme.accent}29`, color: theme.accent, borderColor: theme.border }}
              >
                <IconComponent size={24} strokeWidth={2.2} />
              </div>
              <span
                className="style-badge-tag"
                style={{
                  background: isSelected ? 'var(--gold)' : `${theme.accent}30`,
                  color: isSelected ? 'var(--ink)' : theme.accent,
                  borderColor: isSelected ? 'var(--gold)' : theme.border,
                }}
              >
                {m.bpm} BPM
              </span>
            </div>

            <div className="style-title-pro">{m.label}</div>
            <div className="style-desc-pro">{m.description}</div>

            <div className="style-palette-row">
              <button
                type="button"
                className="music-preview-btn"
                onClick={(e) => togglePreview(e, m.id)}
                style={{
                  background: playingId === m.id ? theme.accent : `${theme.accent}22`,
                  color: playingId === m.id ? 'var(--ink)' : theme.accent,
                  borderColor: theme.border,
                }}
              >
                {playingId === m.id ? <Pause size={13} strokeWidth={2.5} /> : <Play size={13} strokeWidth={2.5} />}
                {playingId === m.id ? 'Tinglanmoqda' : 'Eshitish'}
              </button>
              {isSelected && (
                <span className="selected-check">
                  <Check size={14} strokeWidth={3} /> Tanlandi
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
