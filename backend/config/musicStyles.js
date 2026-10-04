/**
 * AdForge AI — 10 ta Musiqa Uslubi Katalogi
 *
 * hubmusic.py (backend/assets/hubmusic/hubmusic.py) dagi PRESETS lug'atining
 * tavsif qismi bilan bir xil — u yerdagi audio-sintez parametrlari (bpm, seed,
 * drums va h.k.) bu yerda qaytarilmaydi, faqat foydalanuvchiga ko'rsatiladigan
 * nom/tavsif saqlanadi. Ikkala ro'yxat ham bir xil 10 ta kalit (id) ishlatadi —
 * biri o'zgarsa, ikkinchisi ham mos ravishda yangilanishi kerak.
 */

const MUSIC_STYLES = [
  {
    id: 'kiberpank',
    label: 'Bass & Energetik',
    description: "Qorong'i, tez, detune qilingan sintezatorlar, hard baraban — kiberpank energiyasi.",
    bpm: 128,
  },
  {
    id: 'oltin',
    label: 'Nafis & Hashamatli',
    description: "Sekin, torli akkordlar, yumshoq bas, nafis pluck — premium brend hissi.",
    bpm: 96,
  },
  {
    id: 'minimal',
    label: 'Minimal & Sokin',
    description: "Toza, siyrak, yumshoq baraban, jim akkordlar — deyarli sezilmaydigan fon.",
    bpm: 112,
  },
  {
    id: 'kinetik',
    label: 'Ritmik & Aniq',
    description: "Stakkato ritm, matn harflariga mos aniq zarbalar — dinamik tipografika uchun.",
    bpm: 124,
  },
  {
    id: 'reels',
    label: "Quvnoq & Viral",
    description: "Quvnoq, doira+clap, yorqin pluck, tez o'tishlar — TikTok/Reels kayfiyati.",
    bpm: 122,
  },
  {
    id: 'biznes',
    label: 'Jiddiy & Xotirjam',
    description: "Xotirjam, ishonchli, ortiqcha effektsiz — korporativ va professional ohang.",
    bpm: 100,
  },
  {
    id: 'izometriya',
    label: "O'yinchoqsimon & Yorqin",
    description: "Shishasimon qo'ng'iroqlar, o'yinchoq kayfiyat — yengil va texnologik.",
    bpm: 110,
  },
  {
    id: 'retro',
    label: 'Retro & Nostalgik',
    description: "80-lar uslubi: kvadrat lead, lenta tebranishi, gated pad.",
    bpm: 108,
  },
  {
    id: 'savdo',
    label: 'Shoshilinch & Baland',
    description: "Shoshilinch, baland clap, sirena va tez o'tishlar — chegirma/aksiya uchun.",
    bpm: 126,
  },
  {
    id: 'kinematik',
    label: 'Epik & Keng',
    description: "Sekin, keng, timpani va kuchli yakun — kino darajasidagi dramatizm.",
    bpm: 84,
  },
];

const VALID_MUSIC_STYLE_IDS = MUSIC_STYLES.map((m) => m.id);

const getMusicStyleById = (id) => MUSIC_STYLES.find((m) => m.id === id);

module.exports = { MUSIC_STYLES, VALID_MUSIC_STYLE_IDS, getMusicStyleById };
