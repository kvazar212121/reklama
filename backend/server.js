require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const SQLiteStore  = require('connect-sqlite3')(session);
const path         = require('path');
const fs           = require('fs');

// ── Config & Init ──────────────────────────────────────────────────────────
require('./models/db');
const passport = require('./config/passport');
const { startQueue } = require('./services/queue');
const { startCleanupCron } = require('./services/cleanup');

const app  = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reklam.hubservis.uz';

// Reverse proxy (Nginx) ishonchli xost deb belgilash
app.set('trust proxy', 1);

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(cookieParser());

// Webhook uchun raw body kerak bo'lishi mumkinligi uchun maxsus middleware
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook/lemonsqueezy') {
    next();
  } else {
    express.json({ limit: '5mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// CORS — frontenddan so'rovlarga ruxsat
app.use(cors({
  origin: [FRONTEND_URL, 'https://reklam.hubservis.uz', 'http://localhost:3030', 'http://10.0.0.162:3030'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Session — SQLite'da saqlanadi
const sessionStore = new SQLiteStore({
  db: 'sessions.db',
  dir: path.resolve(__dirname, './data'),
});

const isHttps = FRONTEND_URL.startsWith('https://') || process.env.NODE_ENV === 'production';

app.use(session({
  name: 'adforge_session',
  secret: process.env.SESSION_SECRET || 'adforge_super_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  proxy: true,
  cookie: {
    secure: isHttps,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// ── Static fayllar: output videolar ───────────────────────────────────────
const outputDir = path.resolve(process.env.OUTPUT_DIR || './output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
app.use('/output', express.static(outputDir));

// ── Static fayllar: uploads ────────────────────────────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ── Static fayllar: musiqa uslubi namunalari (Studio'da oldindan eshitish) ──
const musicPreviewsDir = path.resolve(__dirname, 'assets/hubmusic/previews');
if (!fs.existsSync(musicPreviewsDir)) fs.mkdirSync(musicPreviewsDir, { recursive: true });
app.use('/music-previews', express.static(musicPreviewsDir));
app.use('/music-previews', express.static(path.resolve(__dirname, 'assets/music')));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/auth',         require('./routes/auth'));
app.use('/api/videos',   require('./routes/videos'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV,
    user: req.user ? { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } : null,
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `${req.method} ${req.path} topilmadi` });
});

// ── Global xato tutgich ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ success: false, error: 'Ichki server xatosi' });
});

// ── Server ishga tushishi ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 AdForge AI Backend running on port ${PORT}`);
  startQueue();
  startCleanupCron();
});

module.exports = app;
