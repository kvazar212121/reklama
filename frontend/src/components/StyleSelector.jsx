import { useState, useEffect } from 'react';
import {
  Zap,
  Crown,
  Sparkles,
  Type,
  Flame,
  Building2,
  Box,
  Radio,
  ShoppingBag,
  Film,
  Check
} from 'lucide-react';
import './StyleSelector.css';

// 10 ta original vektor SVG ikonka
const STYLE_ICON_COMPONENTS = {
  cyberpunk_neon: Zap,
  luxury_gold: Crown,
  minimal_clean: Sparkles,
  kinetic_typography: Type,
  tiktok_viral: Flame,
  corporate_blue: Building2,
  isometric_3d: Box,
  retro_vintage: Radio,
  ecommerce_sale: ShoppingBag,
  cinematic_epic: Film,
};

// 10 ta stil uchun individual rangli fonlar va tematik stillar
const STYLE_THEMES = {
  cyberpunk_neon: {
    bg: 'linear-gradient(145deg, #090e24 0%, #1c082b 100%)',
    border: 'rgba(0, 240, 255, 0.35)',
    accent: '#00f0ff',
    iconBg: 'rgba(0, 240, 255, 0.16)',
    iconColor: '#00f0ff',
    badgeBg: 'rgba(0, 240, 255, 0.18)',
    badgeColor: '#00f0ff',
  },
  luxury_gold: {
    bg: 'linear-gradient(145deg, #161107 0%, #291b05 100%)',
    border: 'rgba(242, 200, 75, 0.4)',
    accent: '#f2c84b',
    iconBg: 'rgba(242, 200, 75, 0.18)',
    iconColor: '#f2c84b',
    badgeBg: 'rgba(242, 200, 75, 0.2)',
    badgeColor: '#f2c84b',
  },
  minimal_clean: {
    bg: 'linear-gradient(145deg, #0b1a29 0%, #15273b 100%)',
    border: 'rgba(56, 189, 248, 0.35)',
    accent: '#38bdf8',
    iconBg: 'rgba(56, 189, 248, 0.16)',
    iconColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    badgeColor: '#38bdf8',
  },
  kinetic_typography: {
    bg: 'linear-gradient(145deg, #241403 0%, #331505 100%)',
    border: 'rgba(245, 158, 11, 0.4)',
    accent: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.18)',
    iconColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeColor: '#f59e0b',
  },
  tiktok_viral: {
    bg: 'linear-gradient(145deg, #240713 0%, #0d1e24 100%)',
    border: 'rgba(254, 44, 85, 0.4)',
    accent: '#fe2c55',
    iconBg: 'rgba(254, 44, 85, 0.18)',
    iconColor: '#fe2c55',
    badgeBg: 'rgba(254, 44, 85, 0.2)',
    badgeColor: '#fe2c55',
  },
  corporate_blue: {
    bg: 'linear-gradient(145deg, #061930 0%, #0d284e 100%)',
    border: 'rgba(56, 189, 248, 0.4)',
    accent: '#38bdf8',
    iconBg: 'rgba(56, 189, 248, 0.16)',
    iconColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    badgeColor: '#38bdf8',
  },
  isometric_3d: {
    bg: 'linear-gradient(145deg, #130c2e 0%, #241247 100%)',
    border: 'rgba(168, 85, 247, 0.4)',
    accent: '#a855f7',
    iconBg: 'rgba(168, 85, 247, 0.18)',
    iconColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.2)',
    badgeColor: '#a855f7',
  },
  retro_vintage: {
    bg: 'linear-gradient(145deg, #211309 0%, #2f190c 100%)',
    border: 'rgba(224, 122, 95, 0.4)',
    accent: '#e07a5f',
    iconBg: 'rgba(224, 122, 95, 0.18)',
    iconColor: '#e07a5f',
    badgeBg: 'rgba(224, 122, 95, 0.2)',
    badgeColor: '#e07a5f',
  },
  ecommerce_sale: {
    bg: 'linear-gradient(145deg, #2c0808 0%, #3d0c0c 100%)',
    border: 'rgba(239, 68, 68, 0.4)',
    accent: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.18)',
    iconColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.2)',
    badgeColor: '#ef4444',
  },
  cinematic_epic: {
    bg: 'linear-gradient(145deg, #09090e 0%, #191611 100%)',
    border: 'rgba(251, 191, 36, 0.4)',
    accent: '#fbbf24',
    iconBg: 'rgba(251, 191, 36, 0.18)',
    iconColor: '#fbbf24',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
    badgeColor: '#fbbf24',
  },
};

const DEFAULT_STYLES = [
  // ── QATOR 1 (TEPADA 5 TA KARTA) ──
  {
    id: 'cyberpunk_neon',
    name: 'Kiberpank & Neon',
    badge: 'Futuristik',
    description: 'Qorong\'i fon, yorqin neon nurlar va yuqori texnologik dinamika.',
    colors: ['#0a0a16', '#00f0ff', '#ff0055', '#7000ff']
  },
  {
    id: 'luxury_gold',
    name: 'Hashamatli Oltin',
    badge: 'Premium',
    description: 'Qora va oltin uyg\'unligi, elitar va qimmatbaho brend uslubi.',
    colors: ['#070709', '#d4af37', '#f3e5ab', '#1c1b18']
  },
  {
    id: 'minimal_clean',
    name: 'Zamonaviy Minimal',
    badge: 'Apple uslubi',
    description: 'Shaffof va toza kompozitsiya, mukammal silliq harakatlar.',
    colors: ['#0f172a', '#38bdf8', '#f8fafc', '#1e293b']
  },
  {
    id: 'kinetic_typography',
    name: 'Kinetik Tipografika',
    badge: 'Jo\'shqin',
    description: 'Katta qalin harflar, tezkor matn o\'zgarishlari va yuqori ritm.',
    colors: ['#f2c84b', '#071b2b', '#ffffff', '#ff4757']
  },
  {
    id: 'tiktok_viral',
    name: 'Reels & TikTok',
    badge: 'Viral',
    description: 'Pop-up elementlar, emojilar va yoshlarbop dinamik video formati.',
    colors: ['#fe2c55', '#25f4ee', '#000000', '#ffffff']
  },

  // ── QATOR 2 (PASTDA 5 TA KARTA) ──
  {
    id: 'corporate_blue',
    name: 'Biznes & Korporativ',
    badge: 'B2B & Moliya',
    description: 'To\'q ko\'k tonlar, tizimli ma\'lumot kartalari va jiddiy ishonch.',
    colors: ['#0a192f', '#0070f3', '#64ffda', '#ccd6f6']
  },
  {
    id: 'isometric_3d',
    name: '3D Izometriya',
    badge: '3D Grafika',
    description: 'Qatlamli 3D kartalar, chuqurlik illyuziyasi va suzuvchi ob\'ektlar.',
    colors: ['#111827', '#6366f1', '#ec4899', '#8b5cf6']
  },
  {
    id: 'retro_vintage',
    name: 'Retro & Nostalgiya',
    badge: 'Vintage',
    description: 'Issiq vintage ranglar, analog plyonka hissi va samimiy muhit.',
    colors: ['#2c1810', '#e07a5f', '#f4f1de', '#3d405b']
  },
  {
    id: 'ecommerce_sale',
    name: 'Savdo & Chegirma',
    badge: 'Katta Sotuv',
    description: 'Mahsulotni oldinga chiqaruvchi narx teglari va aksiya uslubi.',
    colors: ['#dc2626', '#f59e0b', '#000000', '#ffffff']
  },
  {
    id: 'cinematic_epic',
    name: 'Kinematik & Epik',
    badge: 'Kino Darajasi',
    description: 'Dramatik yorug\'lik nurlari, sekin masshtab va epik film hissi.',
    colors: ['#000000', '#1c1917', '#38bdf8', '#fbbf24']
  },
];

export default function StyleSelector({ selected, onSelect }) {
  const [styles, setStyles] = useState(DEFAULT_STYLES);

  useEffect(() => {
    fetch('/api/videos/styles')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.styles?.length === 10) {
          setStyles(data.styles);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="styles-grid-5x2">
      {styles.map((s) => {
        const IconComponent = STYLE_ICON_COMPONENTS[s.id] || Sparkles;
        const theme = STYLE_THEMES[s.id] || STYLE_THEMES.cyberpunk_neon;
        const isSelected = selected === s.id;

        return (
          <div
            key={s.id}
            className={`style-card-pro ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(s.id)}
            style={{
              background: theme.bg,
              borderColor: isSelected ? 'var(--gold)' : theme.border,
              boxShadow: isSelected ? '0 14px 36px rgba(0,0,0,0.4), 0 0 20px rgba(242, 200, 75, 0.4)' : '0 6px 20px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header: Icon & Badge */}
            <div className="style-header-row">
              <div
                className="style-icon-box"
                style={{
                  background: theme.iconBg,
                  color: theme.iconColor,
                  borderColor: theme.border,
                }}
              >
                <IconComponent size={24} strokeWidth={2.2} />
              </div>
              <span
                className="style-badge-tag"
                style={{
                  background: isSelected ? 'var(--gold)' : theme.badgeBg,
                  color: isSelected ? 'var(--ink)' : theme.badgeColor,
                  borderColor: isSelected ? 'var(--gold)' : theme.border,
                }}
              >
                {s.badge}
              </span>
            </div>

            {/* Title */}
            <div className="style-title-pro">{s.name}</div>

            {/* Description */}
            <div className="style-desc-pro">{s.description}</div>

            {/* Footer: Palette & Selection Check */}
            <div className="style-palette-row">
              {s.colors?.slice(0, 4).map((c, i) => (
                <span
                  key={i}
                  className="palette-circle"
                  style={{ background: c }}
                  title={c}
                />
              ))}

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
