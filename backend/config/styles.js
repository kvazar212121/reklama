/**
 * AdForge AI — 10 ta Professional Video Stili Katalogi
 */

const VIDEO_STYLES = [
  {
    id: 'cyberpunk_neon',
    name: 'Kiberpank & Neon',
    name_en: 'Cyberpunk & Neon',
    name_ru: 'Киберпанк & Неон',
    icon: '⚡',
    badge: 'Futuristik',
    description: 'Qorong\'i fon, yorqin neon nurlar, glitch effektlar va yuqori texnologik dinamika.',
    colors: ['#0a0a16', '#00f0ff', '#ff0055', '#7000ff'],
    promptRules: `
STIL: Kiberpank & Neon Dinamikasi.
- Fon: Chuqur qora (#0a0a16) bilan neon to'r (grid) va lazer nurlari.
- Ranglar: Kiber zangori (#00f0ff), yorqin pushti (#ff0055) va neon binafsha (#7000ff).
- Effektlar: Neon sarlavhalar (text-shadow: 0 0 20px cyan, 0 0 40px pink), yengil glitch animatsiyasi, kiber ramkalar.
- Ritm: Tezkor, pulsatsiyalanuvchi, kelajak texnologiyasi ruhiyatida.
`,
  },
  {
    id: 'luxury_gold',
    name: 'Hashamatli Oltin',
    name_en: 'Luxury Gold',
    name_ru: 'Премиум Золото',
    icon: '👑',
    badge: 'Premium',
    description: 'Qora va oltin uyg\'unligi, nafis harakatlar, elitar va qimmatbaho brend uslubi.',
    colors: ['#070709', '#d4af37', '#f3e5ab', '#1c1b18'],
    promptRules: `
STIL: Hashamatli Oltin & Elitar Dizayn.
- Fon: Boy qora obsidian gradient (#070709 dan #151410 gacha) bilan oltin zarrachalar yoki nozik nurlar.
- Ranglar: Metallik oltin (#d4af37, #f3e5ab), fil suyagi va chuqur qora.
- Effektlar: Sekin va salobatli paydo bo'lish, oltin chegaralar, yaltirovchi chiziqlar, nozik nafis serif/sans tipografika.
- Ritm: Salobatli, xotirjam, yuqori narx va sifat hissini beruvchi.
`,
  },
  {
    id: 'minimal_clean',
    name: 'Zamonaviy Minimalizm',
    name_en: 'Modern Minimal',
    name_ru: 'Минимализм',
    icon: '⚪',
    badge: 'Apple uslubi',
    description: 'Shaffof, toza va aniq kompozitsiya, mukammal tipografika va silliq harakatlar.',
    colors: ['#0f172a', '#38bdf8', '#f8fafc', '#1e293b'],
    promptRules: `
STIL: Zamonaviy Toza Minimalizm (Apple / Linear uslubida).
- Fon: Chuqur neytral gradient yoki zamonaviy monoxrom (#0f172a / #1e293b).
- Ranglar: Toza oq (#ffffff), osmon moviyligi (#38bdf8), yumshoq kulrang.
- Effektlar: Katta aniq tipografika, nozik 1px chegaralar, mukammal bo'shliqlar (whitespace), silliq kubik-bezier siljishlar.
- Ritm: Aniq, tushunarli, har bir so'z o'z o'rnida.
`,
  },
  {
    id: 'kinetic_typography',
    name: 'Kinetik Tipografika',
    name_en: 'Kinetic Typography',
    name_ru: 'Кинетическая Типографика',
    icon: '💥',
    badge: 'Jo\'shqin',
    description: 'Katta qalin harflar, tezkor matn o\'zgarishlari va diqqatni bir zumda tortuvchi harakat.',
    colors: ['#f2c84b', '#071b2b', '#ffffff', '#ff4757'],
    promptRules: `
STIL: Kinetik Tipografika & Tezkor Matn Hujumi.
- Fon: Yuqori kontrastli sariq (#f2c84b) va to'q navy (#071b2b) o'rtasidagi almashinuvlar.
- Ranglar: Qalin qora, olovrang qizil, kontrast oq.
- Effektlar: Matnlar ekranga yorib kiradi, bo'g'inma-bo'g'in yoki so'zma-so'z tezkor o'zgaradi, rotatsiya va masshtab keskin sakraydi.
- Ritm: Juda tez, dinamik, tomoshabinni ekrandan uzilmaslikka majbur qiladi.
`,
  },
  {
    id: 'tiktok_viral',
    name: 'Reels & TikTok Trend',
    name_en: 'Reels & TikTok Viral',
    name_ru: 'Reels & TikTok Тренд',
    icon: '🔥',
    badge: 'Viral',
    description: 'Ijtimoiy tarmoqlar uchun maxsus: pop-up stikerlar, emojilar va yorqin dinamika.',
    colors: ['#fe2c55', '#25f4ee', '#000000', '#ffffff'],
    promptRules: `
STIL: TikTok & Instagram Reels Viral Formati.
- Fon: Qora yoki yorqin kontrastli pop gradient.
- Ranglar: TikTok qizil (#fe2c55), zangori (#25f4ee), sariq va oq.
- Effektlar: Sakrab chiquvchi piktogrammalar, emojilar, qiziqarli so'z belgilashlari (highlight pill), tezkor almashtirishlar.
- Ritm: Yoshlarbop, qiziqarli, emotsional va to'g'ridan-to'g'ri tomoshabinga qaratilgan.
`,
  },
  {
    id: 'corporate_blue',
    name: 'Biznes & Korporativ',
    name_en: 'Corporate Blue',
    name_ru: 'Бизнес & Корпоратив',
    icon: '🏢',
    badge: 'B2B & Moliya',
    description: 'Ishonchli to\'q ko\'k tonlar, tizimli kartalar, statistika va professional jiddiylik.',
    colors: ['#0a192f', '#0070f3', '#64ffda', '#ccd6f6'],
    promptRules: `
STIL: Professional Biznes & B2B Korporativ.
- Fon: Ishonchli to'q dengiz ko'ki (#0a192f) va chuqur indigo.
- Ranglar: Korporativ ko'k (#0070f3), yashil zangori aksent (#64ffda), sof oq.
- Effektlar: Chiroyli ma'lumot bloklari, progress indikatorlari, ishonch belgilari (checkmarks), barqaror silliq animatsiyalar.
- Ritm: Ishonchli, jiddiy, investitsiya va xizmat kafolatini ta'minlovchi.
`,
  },
  {
    id: 'isometric_3d',
    name: '3D Izometriya & Grafika',
    name_en: '3D Isometric',
    name_ru: '3D Изометрия',
    icon: '🧊',
    badge: 'Zamonaviy',
    description: 'Qatlamli 3D kartalar, chuqurlik illyuziyasi, suzuvchi ob\'ektlar va interaktiv soyalar.',
    colors: ['#111827', '#6366f1', '#ec4899', '#8b5cf6'],
    promptRules: `
STIL: 3D Izometrik Qatlamlar & Motion Grafika.
- Fon: Chuqur zamonaviy kosmik binafsha (#111827).
- Ranglar: Indigo (#6366f1), yorqin pushti (#ec4899) va binafsha (#8b5cf6).
- Effektlar: CSS transform3d, rotateX(20deg) rotateY(-20deg) burchaklar, qatlamli kartalar (multi-layer float), chuqur soyalar.
- Ritm: Texnologik, ilmiy, zamonaviy ilovalar va platformalar ko'rinishi.
`,
  },
  {
    id: 'retro_vintage',
    name: 'Retro & Nostalgiya',
    name_en: 'Retro Vintage',
    name_ru: 'Ретро & Винтаж',
    icon: '📻',
    badge: 'Nostalgiya',
    description: 'Issiq vintage ranglar, analog plyonka hissi va qadrdon samimiy muhit.',
    colors: ['#2c1810', '#e07a5f', '#f4f1de', '#3d405b'],
    promptRules: `
STIL: Retro Vintage & Analog Nostalgiya.
- Fon: Issiq to'q jigarrang yoki qaymoqrang vintage (#2c1810 / #f4f1de).
- Ranglar: Terrakota (#e07a5f), to'q zaytun, sarg'ish qog'oz rangi.
- Effektlar: Nozik plyonka donadorligi (grain), klassik ramkalar, retro tipografika, yumshoq yorug'lik.
- Ritm: Samimiy, iliq, an'anaviy va qadriyatlarga asoslangan.
`,
  },
  {
    id: 'ecommerce_sale',
    name: 'Savdo & Katta Chegirma',
    name_en: 'E-commerce Sale',
    name_ru: 'Распродажа & Скидки',
    icon: '🏷️',
    badge: 'Yuqori Savdo',
    description: 'Mahsulotni oldinga chiqaruvchi, narx teglari, chegirma va harakatga chaqiruvchi uslub.',
    colors: ['#dc2626', '#f59e0b', '#000000', '#ffffff'],
    promptRules: `
STIL: E-commerce Sotuv & Katta Aksiya.
- Fon: E'tiborni tortuvchi dinamik to'q qizil (#dc2626) va olovrang gradient.
- Ranglar: Qizil, sariq (#f59e0b), qora va oq.
- Effektlar: Narx teglari, "CHEGIRMA", "FOYDALI TAKLIF" nishonlari, pulsatsiyalanuvchi tugmalar, mahsulot ramkasi.
- Ritm: Shoshilinchlik hissi (FOMO), aniq taklif, zudlik bilan buyurtma berishga undash.
`,
  },
  {
    id: 'cinematic_epic',
    name: 'Kinematik & Epik',
    name_en: 'Cinematic Epic',
    name_ru: 'Кинематографичный',
    icon: '🎬',
    badge: 'Kino Darajasi',
    description: 'Dramatik yorug\'lik nurlari, sekin masshtablash (zoom), keng ekran va epik muhit.',
    colors: ['#000000', '#1c1917', '#38bdf8', '#fbbf24'],
    promptRules: `
STIL: Epik Kinematik Film Treyleri.
- Fon: To'liq qora (#000000) bilan dramatik projektor nurlari va tuman effekti.
- Ranglar: Kinematik tillarang nurlar, sovuq ko'k yorug'lik, qorong'ulik.
- Effektlar: Sekin harakatlanuvchi masshtab (Ken Burns effekti), qorong'ulikdan yorug'likka o'tish, kino titrlari uslubidagi shriftlar.
- Ritm: Epik, hayajonli, brendning qudratini namoyon etuvchi.
`,
  },
];

const getStyleById = (styleId) => {
  return VIDEO_STYLES.find((s) => s.id === styleId) || VIDEO_STYLES[0];
};

module.exports = { VIDEO_STYLES, getStyleById };
