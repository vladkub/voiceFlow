// server.js
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// PM2 may start before .env is applied; re-read pool flags after dotenv.
try {
  const pool = require('./services/translator-pool');
  if (typeof pool.reloadPoolConfig === 'function') pool.reloadPoolConfig();
} catch (e) { /* pool optional until routes load */ }

const app = express();
const PORT = process.env.PORT || 3000;
const siteSitemap = require('./services/site-sitemap');
const translatorApiModule = require('./routes/translator-api-routes');
const captcha = require('./services/captcha');

// 🔹 Инициализация SQLite
const dbPath = path.join(__dirname, 'voiceflow.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function ensureDatabaseSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      avatar TEXT,
      subscription TEXT DEFAULT 'free',
      minutes_used INTEGER DEFAULT 0,
      phrases_translated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}
ensureDatabaseSchema();

const chatPresetService = require('./services/chat-preset');
chatPresetService.ensureUserConversationColumns(db);

try {
  const paySql = fs.readFileSync(path.join(__dirname, 'scripts', 'add-payment-tables.sql'), 'utf8');
  const subSql = fs.readFileSync(path.join(__dirname, 'scripts', 'add-subscriptions-table.sql'), 'utf8');
  db.exec(paySql);
  db.exec(subSql);
} catch (e) {
  console.warn('DB migration scripts:', e.message);
}

if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim().length < 8) {
  console.warn('⚠️ JWT_SECRET missing or too short — set a long random value in .env');
}

// ==================== CORS ====================
function normalizeOrigin(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function collectAllowedOrigins() {
  const list = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
  ];
  const add = (u) => {
    const n = normalizeOrigin(u);
    if (n && list.indexOf(n) === -1) list.push(n);
  };
  add(process.env.SITE_PUBLIC_URL);
  (process.env.ALLOWED_ORIGINS || '').split(/[\s,]+/).forEach(add);
  const ip = (process.env.SERVER_PUBLIC_IP || '').trim();
  if (ip) {
    add('http://' + ip);
    add('https://' + ip);
  }
  return list;
}

function resolveCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const allowed = collectAllowedOrigins();
  if (allowed.indexOf(origin) !== -1) return origin;
  const host = (req.headers.host || '').split(',')[0].trim();
  if (host) {
    try {
      const o = new URL(origin);
      const hostName = host.split(':')[0];
      if (o.host === host || o.hostname === hostName) return origin;
    } catch (e) { /* ignore */ }
  }
  console.warn('CORS blocked origin:', origin, 'host:', host);
  return false;
}

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};

function isSeoPublicPath(reqPath) {
  return reqPath === '/robots.txt' || reqPath === '/sitemap.xml' || reqPath === '/healthz';
}

app.get('/robots.txt', (req, res) => {
  const staticPath = path.join(__dirname, 'public', 'robots.txt');
  if (fs.existsSync(staticPath)) {
    return res.type('text/plain').sendFile(staticPath);
  }
  res.type('text/plain').send(siteSitemap.buildRobotsTxt(req));
});

app.get('/sitemap.xml', (req, res) => {
  const staticPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(staticPath)) {
    return res.type('application/xml').sendFile(staticPath);
  }
  res.type('application/xml').send(siteSitemap.buildSitemapXml(req));
});

app.use((req, res, next) => {
  if (isSeoPublicPath(req.path)) return next();
  const resolved = resolveCorsOrigin(req);
  if (resolved === false) {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }
  cors({ ...corsOptions, origin: resolved })(req, res, next);
});
app.options('*', (req, res, next) => {
  const resolved = resolveCorsOrigin(req);
  if (resolved === false) {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }
  cors({ ...corsOptions, origin: resolved })(req, res, next);
});

app.use(cookieParser());

// Translator proxy — до express.json(), иначе POST /api/control уходит в Python без тела.
translatorApiModule.setDependencies((req, headers) => {
  if (headers['x-user-id'] || headers['X-User-ID']) return;
  const cookieUid = req.cookies && req.cookies.user_id;
  if (cookieUid) {
    headers['X-User-ID'] = String(cookieUid);
    return;
  }
  const desktopUid = req.cookies && req.cookies.vf_desktop_session;
  if (desktopUid && /^\d+$/.test(String(desktopUid).trim())) {
    headers['X-User-ID'] = String(desktopUid).trim();
    return;
  }
  const token = req.cookies && req.cookies.token;
  if (!token || !process.env.JWT_SECRET) return;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    headers['X-User-ID'] = String(decoded.userId);
  } catch (e) { /* ignore */ }
});
app.use(translatorApiModule.createRouter());
const _tpSummary = translatorApiModule.getPoolSummary();
if (_tpSummary.enabled) {
  console.log(
    `🌐 Translator pool: ${_tpSummary.workers} workers (${_tpSummary.default} …)`
  );
} else {
  console.log('🌐 Translator API →', process.env.TRANSLATOR_API_URL || 'http://127.0.0.1:8002');
}

app.use(express.json());

const SITE_UI_LOCALE_CODES = new Set([
  'en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'pl', 'nl', 'sv', 'tr', 'el', 'cs', 'ca', 'br',
  'zh', 'ja', 'ko', 'hi', 'ar', 'vi', 'kk', 'uz', 'ky', 'tg', 'te', 'gu', 'tl', 'fa', 'uk', 'ka', 'eo',
]);

function defaultSiteLang(req) {
  const c = (req.cookies && req.cookies.siteLang) || '';
  const cl = String(c).toLowerCase().trim();
  if (SITE_UI_LOCALE_CODES.has(cl)) return cl;
  const h = req.headers['accept-language'] || '';
  const parts = h.split(',');
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i].trim().split(';')[0].trim().toLowerCase();
    if (!seg) continue;
    const p = seg.split('-')[0];
    if (SITE_UI_LOCALE_CODES.has(p)) return p;
  }
  return 'ru';
}

function redirectWithQuery(res, status, destPath, req) {
  const q = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(status, destPath + q);
}

const PUBLIC_PAGES = [
  'dashboard', 'login', 'features', 'technology', 'pricing', 'faq', 'contacts', 'checkout', 'trial-setup', 'trial-chat',
  'privacy', 'terms',
];

const siteSeoHead = require('./services/site-seo-head');
const sitePageMeta = require('./services/site-page-meta');
const siteFaqSchema = require('./services/site-faq-schema');
const siteAnalytics = require('./services/site-analytics');
const siteVisitCounter = require('./services/site-visit-counter');

siteVisitCounter.setDatabase(db);
siteVisitCounter.ensureSchema();

function escapeHtmlAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

const NOINDEX_PAGE_IDS = new Set(['dashboard', 'login', 'checkout', 'trial-setup', 'trial-chat']);

function injectRobotsNoindex(html) {
  const tag = '<meta name="robots" content="noindex, nofollow">';
  if (/<meta\s+name=["']robots["']/i.test(html)) {
    return html.replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i, tag);
  }
  if (/<meta\s+charset=/i.test(html)) {
    return html.replace(/(<meta\s+charset=[^>]+>)/i, `$1\n    ${tag}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${tag}`);
}

function buildLocalizedPublicHtml(filePath, lang, opts) {
  const options = opts && typeof opts === 'object' ? opts : {};
  const { req = null, barePath = '/', pageId = null } = options;
  let body = fs.readFileSync(filePath, 'utf8');
  const lc = String(lang || 'en').toLowerCase();
  body = body.replace(/<html[^>]*>/i, `<html lang="${escapeHtmlAttr(lc)}">`);
  if (pageId && sitePageMeta.isSeoMarketingPage(pageId)) {
    body = sitePageMeta.applyPageMeta(body, pageId, lc);
  }
  if (pageId && NOINDEX_PAGE_IDS.has(pageId)) {
    body = injectRobotsNoindex(body);
  }
  const seoBlock = siteSeoHead.buildSeoHeadLinks(req, lc, barePath);
  body = siteSeoHead.injectSeoHeadLinks(body, seoBlock);
  body = siteSeoHead.localizeInternalNavLinks(body, lc);
  if (pageId === 'faq') {
    body = siteFaqSchema.injectFaqSchema(body, lc);
  }
  body = siteAnalytics.injectAnalyticsHead(body);
  if (siteVisitCounter.isEnabled()) {
    siteVisitCounter.recordPageView({ path: normalizeBarePath(barePath), lang: lc });
  }
  return body;
}

function normalizeBarePath(bare) {
  if (!bare || bare === '/') return '/';
  const b = String(bare).trim();
  if (!b.startsWith('/')) return `/${b}`;
  return b.replace(/\/+$/, '') || '/';
}

// 🔹 Middleware аутентификации
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in .env');
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};
const getExpiresAt = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const SESSION_COOKIE_OPTS = { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', path: '/' };

/** JWT для Node + cookie user_id для Python-переводчика (/ui). */
function issueSessionCookies(res, userId) {
  const token = generateToken(userId);
  db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    userId, token, getExpiresAt(),
  );
  res.cookie('token', token, SESSION_COOKIE_OPTS);
  res.cookie('user_id', String(userId), SESSION_COOKIE_OPTS);
  return token;
}

function resolveVfDesktopSessionUserId(req) {
  try {
    const v = String(req.headers['x-voiceflow-client'] || req.headers['X-VoiceFlow-Client'] || '')
      .trim()
      .toLowerCase();
    if (v !== 'desktop') return null;
    const raw = req.cookies && req.cookies.vf_desktop_session;
    const id = parseInt(String(raw || '').trim(), 10);
    if (!Number.isFinite(id) || id < 1) return null;
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    return row ? id : null;
  } catch {
    return null;
  }
}

const authenticate = (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const session = db
        .prepare("SELECT * FROM sessions WHERE user_id = ? AND token = ? AND expires_at > datetime('now')")
        .get(decoded.userId, token);
      if (session) {
        req.userId = decoded.userId;
        return next();
      }
    } catch {
      /* fall through — e.g. try desktop cookie */
    }
  }
  const desktopUid = resolveVfDesktopSessionUserId(req);
  if (desktopUid) {
    req.userId = desktopUid;
    return next();
  }
  return res.status(401).json({ error: 'Не авторизован' });
};

// 🔹 Статические файлы
const { detectSiteLanguage } = require('./public/js/site-lang-detect-node');

app.get('/api/site/detect-language', async (req, res) => {
  try {
    const result = await detectSiteLanguage(req);
    res.json(result);
  } catch (e) {
    console.warn('detect-language:', e.message);
    res.json({ lang: 'en', source: 'default' });
  }
});

const siteUiTranslateCache = new Map();

async function translateUiText(text, targetLang) {
  const q = String(text || '').trim();
  const tl = String(targetLang || '').trim().toLowerCase();
  if (!q || !tl || tl === 'en') return q;
  const targetMap = {
    br: 'pt', // Brazilian Portuguese UI code -> Google target code
  };
  const googleTl = targetMap[tl] || tl;
  const cacheKey = `${tl}::${q}`;
  if (siteUiTranslateCache.has(cacheKey)) return siteUiTranslateCache.get(cacheKey);
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t' +
    `&tl=${encodeURIComponent(googleTl)}&q=${encodeURIComponent(q)}`;
  try {
    const r = await axios.get(url, { timeout: 12000 });
    const data = r && r.data;
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const out = data[0]
        .map((row) => (Array.isArray(row) && row[0] ? String(row[0]) : ''))
        .join('')
        .trim();
      const finalText = out || q;
      siteUiTranslateCache.set(cacheKey, finalText);
      return finalText;
    }
  } catch (e) {
    console.warn('site-ui-translate:', e.message || e);
  }
  siteUiTranslateCache.set(cacheKey, q);
  return q;
}

app.post('/api/site/translate-ui', async (req, res) => {
  try {
    const langRaw = req.body && req.body.lang != null ? String(req.body.lang) : '';
    const lang = langRaw.toLowerCase().slice(0, 8);
    if (!SITE_UI_LOCALE_CODES.has(lang)) {
      return res.status(400).json({ error: 'invalid_lang' });
    }
    const entries = req.body && req.body.entries && typeof req.body.entries === 'object' ? req.body.entries : {};
    const keys = Object.keys(entries).slice(0, 120);
    const out = {};
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = entries[k];
      const src = typeof v === 'string' ? v : '';
      if (!src) continue;
      out[k] = await translateUiText(src, lang);
    }
    return res.json({ ok: true, lang, translations: out });
  } catch (e) {
    console.warn('translate-ui route:', e.message || e);
    return res.status(500).json({ error: 'translate_failed' });
  }
});

app.get('/', (req, res) => redirectWithQuery(res, 302, `/${defaultSiteLang(req)}/`, req));

app.get('/index.html', (req, res) => redirectWithQuery(res, 301, `/${defaultSiteLang(req)}/`, req));

PUBLIC_PAGES.forEach((name) => {
  app.get(`/${name}`, (req, res) => redirectWithQuery(res, 301, `/${defaultSiteLang(req)}/${name}`, req));
  app.get(`/${name}.html`, (req, res) => redirectWithQuery(res, 301, `/${defaultSiteLang(req)}/${name}`, req));
});

/** Только /en → /en/ (без слэша). Не использовать /:lang — иначе ловит /en/ и редирект в цикле. */
app.get(/^\/([a-z]{2})$/, (req, res, next) => {
  const lc = String(req.params[0] || '').toLowerCase();
  if (!SITE_UI_LOCALE_CODES.has(lc)) return next();
  return redirectWithQuery(res, 301, `/${lc}/`, req);
});

app.get('/healthz', (req, res) => {
  res.type('text/plain').send('ok');
});

app.use(express.static('public'));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));

// Voice translator UI — before /:lang routes (otherwise "ui" -> 404)
const frontendDir = path.join(__dirname, 'frontend');
const frontendIndex = path.join(frontendDir, 'index.html');
if (fs.existsSync(frontendIndex)) {
  app.get('/ui', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(frontendIndex);
  });
  app.use('/ui', express.static(frontendDir, { index: false }));
  console.log('UI translator mounted at /ui');
} else {
  console.warn('frontend/index.html not found — /ui disabled');
}

// ==================== ПОДКЛЮЧЕНИЕ ПЛАТЕЖНЫХ МОДУЛЕЙ ====================

// ==================== ПОДКЛЮЧЕНИЕ ПЛАТЕЖНЫХ МОДУЛЕЙ ====================
const paymentModule = require('./routes/payment-routes');

// 1. Сначала передаём зависимости
paymentModule.setDependencies(authenticate, db);

// 2. Затем создаём и подключаем роутер
app.use('/api', paymentModule.createRouter());

console.log('💰 Payment module initialized');

// ==================== ОПЛАТА КАРТОЙ (Rampex, NexaPay или Stripe) ====================
const cardProvider = (
  process.env.CARD_PAYMENT_PROVIDER ||
  (process.env.LAVA_API_KEY
    ? 'lava'
    : process.env.RAMPEX_API_KEY
      ? 'rampex'
      : process.env.NEXAPAY_API_KEY
        ? 'nexapay'
        : process.env.STRIPE_SECRET_KEY
          ? 'stripe'
          : 'none')
).toLowerCase();

if (cardProvider === 'lava') {
  const lavaModule = require('./routes/lava-routes');
  lavaModule.setDependencies(authenticate, db);
  app.use('/api/lava', lavaModule.createRouter());
  console.log('💳 Card payments: lava.top');
} else if (cardProvider === 'rampex') {
  const rampexModule = require('./routes/rampex-routes');
  rampexModule.setDependencies(authenticate, db);
  app.use('/api/rampex', rampexModule.createRouter());
  console.log('💳 Card payments: Rampex');
} else if (cardProvider === 'nexapay') {
  const nexapayModule = require('./routes/nexapay-routes');
  nexapayModule.setDependencies(authenticate, db);
  app.use('/api/nexapay', nexapayModule.createRouter());
  console.log('💳 Card payments: NexaPay');
} else if (cardProvider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
  const stripeModule = require('./routes/stripe-routes');
  stripeModule.setDependencies(authenticate, db);
  app.use('/api/stripe', stripeModule.createRouter());
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  console.log('💳 Card payments: Stripe');
} else {
  console.warn('⚠️ Card payments disabled (set NEXAPAY_API_KEY or STRIPE_SECRET_KEY)');
}

function resolveGoogleRedirectUri(req) {
  const explicit = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  const site = (process.env.SITE_PUBLIC_URL || '').trim().replace(/\/$/, '');

  if (explicit && !/localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+/i.test(explicit)) {
    return explicit;
  }
  if (site && !/localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+/i.test(site)) {
    return `${site}/api/auth/google/callback`;
  }

  if (req && typeof req.get === 'function') {
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http')
      .split(',')[0]
      .trim();
    const host = String(req.get('x-forwarded-host') || req.get('host') || '')
      .split(',')[0]
      .trim();
    if (host && !/127\.0\.0\.1|localhost/i.test(host)) {
      return `${proto}://${host}/api/auth/google/callback`;
    }
  }

  if (explicit) return explicit;
  if (site) return `${site}/api/auth/google/callback`;
  return 'http://localhost:8000/api/auth/google/callback';
}

function googleOAuthReady() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function safeAuthRedirect(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard';
  const s = raw.trim();
  if (!s.startsWith('/') || s.startsWith('//')) return '/dashboard';
  let path = s.split('#')[0] || '/dashboard';
  if (path.endsWith('.html')) path = path.slice(0, -5);
  return path;
}

/** Одноразовые токены: десктопный Google OAuth (Electron → 127.0.0.1 → POST complete). */
const desktopOAuthTokens = new Map();

function desktopOAuthCleanup() {
  const t = Date.now();
  for (const [k, v] of desktopOAuthTokens.entries()) {
    if (!v || v.exp < t) desktopOAuthTokens.delete(k);
  }
}

function isValidDesktopOAuthPort(p) {
  const n = parseInt(p, 10);
  return Number.isFinite(n) && n >= 1024 && n <= 65535;
}

function desktopOAuthStore(userId) {
  desktopOAuthCleanup();
  const token = crypto.randomBytes(32).toString('base64url');
  desktopOAuthTokens.set(token, { userId, exp: Date.now() + 300000 });
  return token;
}

function desktopOAuthTake(token) {
  desktopOAuthCleanup();
  const t = String(token || '').trim();
  if (!t) return null;
  const row = desktopOAuthTokens.get(t);
  desktopOAuthTokens.delete(t);
  if (!row || row.exp < Date.now()) return null;
  return row.userId;
}

function encodeGoogleOAuthState(redirect, useDesktop, desktopPort) {
  const payload = {
    r: safeAuthRedirect(redirect),
    n: crypto.randomBytes(12).toString('base64url'),
  };
  if (useDesktop && isValidDesktopOAuthPort(desktopPort)) {
    payload.d = 1;
    payload.p = parseInt(desktopPort, 10);
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function parseGoogleOAuthState(state) {
  const out = { redirect: '/dashboard', desktop: false, desktop_port: null };
  if (!state || typeof state !== 'string') return out;
  try {
    const pad = '='.repeat((4 - (state.length % 4)) % 4);
    const data = JSON.parse(Buffer.from(state + pad, 'base64url').toString('utf8'));
    if (data && typeof data === 'object') {
      out.redirect = safeAuthRedirect(data.r);
      out.desktop = !!data.d;
      if (data.p != null && isValidDesktopOAuthPort(data.p)) out.desktop_port = parseInt(data.p, 10);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Убрать служебные query-параметры десктоп-OAuth из redirect (после успешного входа в браузере). */
function stripVfDesktopHintFromRedirect(redirectPath) {
  try {
    const s = String(redirectPath || '').trim();
    const hashIdx = s.indexOf('#');
    const noHash = hashIdx >= 0 ? s.slice(0, hashIdx) : s;
    const qIdx = noHash.indexOf('?');
    if (qIdx < 0) return noHash || '/dashboard';
    const path = noHash.slice(0, qIdx) || '/dashboard';
    const sp = new URLSearchParams(noHash.slice(qIdx + 1));
    sp.delete('vf_desktop_oauth');
    sp.delete('vf_desktop_port');
    const rest = sp.toString();
    return rest ? `${path}?${rest}` : path;
  } catch {
    return String(redirectPath || '/dashboard').split('?')[0] || '/dashboard';
  }
}

/**
 * Если в OAuth state не дошли флаги desktop, восстановить их из redirect (?vf_desktop_oauth=1&vf_desktop_port=).
 * Так браузер после Google получает 302 на 127.0.0.1, а не веб-чат на talkpilot.pro.
 */
function resolveDesktopOAuthContext(oauthCtx) {
  const red = oauthCtx.redirect || '/dashboard';
  if (oauthCtx.desktop && oauthCtx.desktop_port != null && isValidDesktopOAuthPort(oauthCtx.desktop_port)) {
    return { ...oauthCtx, redirect: stripVfDesktopHintFromRedirect(red) };
  }
  try {
    const pathAndQuery = red.startsWith('/') ? `http://local.invalid${red}` : red;
    const u = new URL(pathAndQuery);
    if (u.searchParams.get('vf_desktop_oauth') === '1') {
      const p = u.searchParams.get('vf_desktop_port');
      if (isValidDesktopOAuthPort(p)) {
        return {
          redirect: stripVfDesktopHintFromRedirect(u.pathname + (u.search || '')),
          desktop: true,
          desktop_port: parseInt(p, 10),
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { ...oauthCtx, redirect: stripVfDesktopHintFromRedirect(red) };
}

function desktopLoopbackCallbackUrl(port, params) {
  const q = new URLSearchParams();
  if (params.error) q.set('error', String(params.error));
  if (params.token) q.set('token', String(params.token));
  if (params.ok) q.set('ok', String(params.ok));
  const qs = q.toString();
  return `http://127.0.0.1:${port}/callback${qs ? `?${qs}` : ''}`;
}

// 🔥 Конфиг для фронтенда
app.get('/api/config', (req, res) => {
  const cp = (
    process.env.CARD_PAYMENT_PROVIDER ||
    (process.env.LAVA_API_KEY
      ? 'lava'
      : process.env.RAMPEX_API_KEY
        ? 'rampex'
        : process.env.NEXAPAY_API_KEY
          ? 'nexapay'
          : process.env.STRIPE_SECRET_KEY
            ? 'stripe'
            : 'none')
  ).toLowerCase();
  res.json({
    cardPaymentProvider: cp,
    cardPaymentsEnabled:
      cp === 'lava'
        ? !!(process.env.LAVA_API_KEY && process.env.LAVA_OFFER_ID)
        : cp === 'rampex'
          ? !!process.env.RAMPEX_API_KEY
          : cp === 'nexapay'
            ? !!process.env.NEXAPAY_API_KEY
            : cp === 'stripe'
              ? !!process.env.STRIPE_SECRET_KEY
              : false,
    stripePublishableKey: cp === 'stripe' ? process.env.STRIPE_PUBLISHABLE_KEY : null,
    lavaEnabled: cp === 'lava' && !!(process.env.LAVA_API_KEY && process.env.LAVA_OFFER_ID),
    rampexEnabled: cp === 'rampex' && !!process.env.RAMPEX_API_KEY,
    nexapayEnabled: cp === 'nexapay' && !!process.env.NEXAPAY_API_KEY,
    nowPaymentsEnabled: (() => {
      try {
        const ps = require('./services/payment-service');
        return ps.isConfigured();
      } catch {
        return !!process.env.NOWPAYMENTS_API_KEY;
      }
    })(),
    nowPaymentsSandbox: (() => {
      try {
        return require('./services/payment-service').isSandbox();
      } catch {
        return process.env.NOWPAYMENTS_SANDBOX === 'true';
      }
    })(),
    stripeEnabled: cp === 'stripe' && !!process.env.STRIPE_SECRET_KEY,
    googleAuthEnabled: googleOAuthReady(),
    captchaEnabled: captcha.captchaEnabled(),
    analytics: siteAnalytics.publicConfig(),
  });
});

// ==================== СТАТИСТИКА ПОСЕЩЕНИЙ САЙТА ====================
app.post('/api/analytics/beacon', (req, res) => {
  if (!siteVisitCounter.isEnabled()) {
    return res.status(204).end();
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  siteVisitCounter.recordSessionBeacon({
    path: body.path,
    lang: body.lang,
    referrer: body.referrer,
    utm_source: body.utm_source,
    utm_medium: body.utm_medium,
    utm_campaign: body.utm_campaign,
    device_category: body.device_category,
  });
  res.status(204).end();
});

app.get('/api/analytics/site-stats', (req, res) => {
  if (!siteVisitCounter.checkStatsSecret(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const days = Number(req.query.days) || 30;
  res.json(siteVisitCounter.getSummary(days));
});

// ==================== ФОРМА ОБРАТНОЙ СВЯЗИ ====================
const contactMail = require('./services/contact-mail');
if (contactMail.brevoConfigured()) {
  console.log(`✉️ Contact form → ${contactMail.SUPPORT_EMAIL} (Brevo API)`);
} else if (contactMail.smtpConfigured()) {
  console.log(`✉️ Contact form → ${contactMail.SUPPORT_EMAIL} (SMTP)`);
} else {
  console.warn(
    `⚠️ Contact form: set SMTP_* or BREVO_API_KEY in .env (mail to ${contactMail.SUPPORT_EMAIL})`,
  );
}

app.post('/api/contact', async (req, res) => {
  try {
    await contactMail.sendContactMessage(req.body || {});
    res.json({ success: true, message: 'Сообщение отправлено' });
  } catch (err) {
    if (err.code === 'VALIDATION') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'SMTP_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Сейчас не удалось отправить сообщение. Напишите нам на support@talkpilot.pro',
        mailto: contactMail.SUPPORT_EMAIL,
        code: 'mail_unavailable',
      });
    }
    console.error('❌ /api/contact:', err);
    res.status(500).json({ error: 'Не удалось отправить сообщение. Попробуйте позже или напишите на support@talkpilot.pro' });
  }
});

// ==================== ПОДКЛЮЧЕНИЕ МОДУЛЯ ПОДПИСОК ====================
const subscriptionModule = require('./routes/subscription-routes');
subscriptionModule.setDependencies(authenticate, db);
app.use('/api/subscriptions', subscriptionModule.createRouter());
console.log('📦 Subscription module initialized');

const dashboardApiModule = require('./routes/dashboard-api-routes');
dashboardApiModule.setDependencies(authenticate, db);
app.use('/api', dashboardApiModule.createRouter());
console.log('📊 Dashboard API (voices, sparklines) initialized');

const cloneApiModule = require('./routes/clone-api-routes');
app.use('/api/clone', cloneApiModule.createRouter());
console.log('🎙️ Clone API mounted at /api/clone');

// 🔥 Крон: проверка истёкших подписок каждые 6 часов
setInterval(async () => {
  try {
    const result = await (new (require('./services/subscription-service'))(db)).checkExpiredSubscriptions();
    console.log(`🔄 Checked expired subscriptions: ${result.checked} processed`);
  } catch (err) {
    console.error('❌ Cron subscription check error:', err);
  }
}, 6 * 60 * 60 * 1000); // 6 часов


// ==================== API РОУТЫ ====================

app.get('/api/auth/captcha', (req, res) => {
    if (!captcha.captchaEnabled()) {
        return res.json({ enabled: false });
    }
    const challenge = captcha.createChallenge();
    res.json({ enabled: true, id: challenge.id, question: challenge.question });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
    try {
        const captchaCheck = captcha.verifyChallenge(req.body.captchaId, req.body.captchaAnswer);
        if (!captchaCheck.ok) return res.status(400).json({ error: captchaCheck.error });

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(400).json({ error: 'Email уже зарегистрирован' });
        const hashedPassword = bcrypt.hashSync(password, 10);
        const stmt = db.prepare('INSERT INTO users (name, email, password, subscription) VALUES (?, ?, ?, ?)');
        const result = stmt.run(name, email, hashedPassword, 'free');
        const userId = result.lastInsertRowid;
        issueSessionCookies(res, userId);
        res.json({ success: true, user: { id: userId, name, email, subscription: 'free' } });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/health', (req, res) => {
    try {
        const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
        res.json({
            ok: true,
            jwt: !!(process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim()),
            port: PORT,
            db: dbPath,
            users,
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Введите email и пароль' });
    if (!process.env.JWT_SECRET || !String(process.env.JWT_SECRET).trim()) {
        console.error('POST /api/auth/login: JWT_SECRET missing in .env');
        return res.status(503).json({ error: 'Сервер не настроен (JWT_SECRET в .env)' });
    }
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
        if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });
        if (!user.password) {
            return res.status(400).json({ error: 'Этот аккаунт создан через Google. Войдите через Google.' });
        }
        let valid = false;
        try {
            valid = bcrypt.compareSync(password, user.password);
        } catch (bcErr) {
            console.error('POST /api/auth/login bcrypt:', bcErr.message || bcErr);
            return res.status(500).json({ error: 'Ошибка проверки пароля в базе' });
        }
        if (!valid) return res.status(400).json({ error: 'Неверный email или пароль' });
        issueSessionCookies(res, user.id);
        const isDesktop =
            String(req.headers['x-voiceflow-client'] || req.headers['X-VoiceFlow-Client'] || '')
                .trim()
                .toLowerCase() === 'desktop';
        if (isDesktop) {
            const secure = !!(req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https'));
            res.cookie('vf_desktop_session', String(user.id), { ...SESSION_COOKIE_OPTS, secure });
        }
        res.json({
            success: true,
            user_id: user.id,
            user: { id: user.id, name: user.name, email: user.email, subscription: user.subscription },
        });
    } catch (err) {
        console.error('POST /api/auth/login:', err.message || err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/auth/google', (req, res) => {
    if (!googleOAuthReady()) {
        return res.status(503).json({
            detail: 'Вход через Google не настроен. Укажите GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET в .env',
        });
    }
    const useDesktop =
        (req.query.desktop === '1' || req.query.desktop === 'true') &&
        isValidDesktopOAuthPort(req.query.desktop_port);
    const redirectUri = resolveGoogleRedirectUri(req);
    const redirect = safeAuthRedirect(req.query.redirect);
    const state = encodeGoogleOAuthState(redirect, useDesktop, req.query.desktop_port);
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
        prompt: 'select_account',
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

function oauthRedirectOnGoogleError(res, errorCode, oauthCtx) {
    const redirectAfter = oauthCtx.redirect || '/dashboard';
    if (oauthCtx.desktop && oauthCtx.desktop_port != null) {
        return res.redirect(302, desktopLoopbackCallbackUrl(oauthCtx.desktop_port, { error: errorCode }));
    }
    return res.redirect(
        302,
        `/login?error=${encodeURIComponent(errorCode)}&redirect=${encodeURIComponent(redirectAfter)}`,
    );
}

app.get('/api/auth/google/callback', async (req, res) => {
    const { code, error, state } = req.query;
    const oauthCtx = resolveDesktopOAuthContext(parseGoogleOAuthState(state));
    const redirectAfter = oauthCtx.redirect || '/dashboard';
    if (error) return oauthRedirectOnGoogleError(res, 'google_denied', oauthCtx);
    if (!code) return oauthRedirectOnGoogleError(res, 'google_no_code', oauthCtx);
    if (!googleOAuthReady()) {
        return oauthRedirectOnGoogleError(res, 'google_not_configured', oauthCtx);
    }
    const redirectUri = resolveGoogleRedirectUri(req);
    try {
        const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });
        if (!tokens || !tokens.access_token) {
            return oauthRedirectOnGoogleError(res, 'google_token_failed', oauthCtx);
        }
        const { data: userInfo } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const googleId = userInfo && userInfo.id != null ? String(userInfo.id) : '';
        const email = userInfo && userInfo.email ? String(userInfo.email).trim() : '';
        const name =
            (userInfo && userInfo.name && String(userInfo.name).trim()) ||
            (email ? email.split('@')[0] : 'User');
        const picture = userInfo && userInfo.picture ? String(userInfo.picture) : '';
        if (!googleId || !email) {
            return oauthRedirectOnGoogleError(res, 'google_profile_failed', oauthCtx);
        }
        let user = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(email, googleId);
        let userId;
        if (!user) {
            const result = db
                .prepare('INSERT INTO users (google_id, name, email, avatar, subscription) VALUES (?, ?, ?, ?, ?)')
                .run(googleId, name, email, picture || null, 'free');
            userId = result.lastInsertRowid;
        } else {
            userId = user.id;
            if (!user.google_id) db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, userId);
        }
        if (oauthCtx.desktop && oauthCtx.desktop_port != null) {
            const oneTime = desktopOAuthStore(userId);
            return res.redirect(
                302,
                desktopLoopbackCallbackUrl(oauthCtx.desktop_port, { token: oneTime, ok: '1' }),
            );
        }
        issueSessionCookies(res, userId);
        return res.redirect(redirectAfter);
    } catch (err) {
        console.error(err);
        return oauthRedirectOnGoogleError(res, 'google_auth_failed', oauthCtx);
    }
});

app.post('/api/auth/desktop-oauth-complete', (req, res) => {
    const token = req.body && req.body.token != null ? String(req.body.token).trim() : '';
    if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });
    const userId = desktopOAuthTake(token);
    if (!userId) return res.status(400).json({ ok: false, error: 'invalid_or_expired_token' });
    const secure = !!(req.secure || (req.headers['x-forwarded-proto'] || '').includes('https'));
    res.cookie('vf_desktop_session', String(userId), { ...SESSION_COOKIE_OPTS, secure });
    return res.json({ ok: true, user_id: userId });
});

app.get('/api/auth/current-user', (req, res) => {
    const token = req.cookies.token;
    if (!token || !process.env.JWT_SECRET) {
        return res.json({ id: 'anonymous', authenticated: false });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const session = db.prepare(
            "SELECT 1 FROM sessions WHERE user_id = ? AND token = ? AND expires_at > datetime('now')",
        ).get(decoded.userId, token);
        if (!session) return res.json({ id: 'anonymous', authenticated: false });
        return res.json({ id: String(decoded.userId), authenticated: true });
    } catch {
        return res.json({ id: 'anonymous', authenticated: false });
    }
});

app.get('/api/auth/me', authenticate, (req, res) => {
    try {
        const user = db.prepare(
            `SELECT id, name, email, avatar, subscription, minutes_used, phrases_translated, created_at,
                    ai_conversation_description, phrase_silence_sec, chat_preset_json
             FROM users WHERE id = ?`,
        ).get(req.userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        const phraseRaw = user.phrase_silence_sec;
        const phraseSec =
            phraseRaw != null && phraseRaw !== '' && Number.isFinite(Number(phraseRaw))
                ? Number(phraseRaw)
                : null;
        res.json({
            id: user.id,
            name: user.name,
            username: user.name,
            email: user.email,
            avatar: user.avatar,
            subscription: user.subscription,
            minutes_used: user.minutes_used,
            phrases_translated: user.phrases_translated,
            created_at: user.created_at,
            createdAt: user.created_at,
            ai_conversation_description: user.ai_conversation_description || '',
            phrase_silence_sec: phraseSec,
            chat_preset: chatPresetService.parseChatPresetJson(user.chat_preset_json),
        });
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.put('/api/user/conversation-settings', authenticate, (req, res) => {
    try {
        const body = req.body || {};
        const rawDesc =
            body.ai_conversation_description != null ? String(body.ai_conversation_description) : '';
        if (rawDesc.trim().length > chatPresetService.AI_TOPIC_MAX_LEN) {
            return res.status(400).json({
                error: `Не более ${chatPresetService.AI_TOPIC_MAX_LEN} символов`,
            });
        }
        const text = chatPresetService.normalizeAiTopic(rawDesc);

        let phraseVal = null;
        if (body.phrase_silence_sec != null) {
            phraseVal = chatPresetService.clampPhraseSilence(body.phrase_silence_sec);
            if (phraseVal == null) {
                return res.status(400).json({
                    error: `Пауза между фразами: от ${chatPresetService.PHRASE_SILENCE_MIN} до ${chatPresetService.PHRASE_SILENCE_MAX} с`,
                });
            }
        }

        let normalizedPreset = null;
        if (body.chat_preset != null) {
            normalizedPreset = chatPresetService.normalizeChatPreset(body.chat_preset);
        }

        if (phraseVal != null && normalizedPreset != null) {
            db.prepare(
                'UPDATE users SET ai_conversation_description = ?, phrase_silence_sec = ?, chat_preset_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ).run(text || null, phraseVal, JSON.stringify(normalizedPreset), req.userId);
        } else if (phraseVal != null) {
            db.prepare(
                'UPDATE users SET ai_conversation_description = ?, phrase_silence_sec = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ).run(text || null, phraseVal, req.userId);
        } else if (normalizedPreset != null) {
            db.prepare(
                'UPDATE users SET ai_conversation_description = ?, chat_preset_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ).run(text || null, JSON.stringify(normalizedPreset), req.userId);
        } else {
            db.prepare(
                'UPDATE users SET ai_conversation_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ).run(text || null, req.userId);
        }

        const out = {
            status: 'ok',
            ai_conversation_description: text,
            phrase_silence_sec: phraseVal,
        };
        if (normalizedPreset != null) out.chat_preset = normalizedPreset;
        res.json(out);
    } catch (err) {
        console.error('PUT /api/user/conversation-settings:', err);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

app.post('/api/auth/logout', authenticate, (req, res) => {
    const token = req.cookies.token;
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.clearCookie('token', { path: '/' });
    res.clearCookie('user_id', { path: '/' });
    res.json({ success: true });
});

app.get('/api/user/conversations', authenticate, (req, res) => {
    try {
        const limitRaw = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
        const rows = db.prepare(
            `SELECT id, created_at, title, message_count
             FROM conversation_sessions
             WHERE user_id = ?
             ORDER BY datetime(created_at) DESC
             LIMIT ?`,
        ).all(String(req.userId), limit);
        res.json(rows || []);
    } catch (err) {
        console.error('❌ GET /api/user/conversations error:', err);
        res.status(500).json({ error: 'Ошибка загрузки истории' });
    }
});

app.get('/api/user/conversations/:sessionId', authenticate, (req, res) => {
    try {
        const sid = String(req.params.sessionId || '').trim();
        if (!sid) return res.status(400).json({ error: 'Некорректный id' });
        const row = db.prepare(
            `SELECT id, user_id, created_at, title, message_count, messages_json
             FROM conversation_sessions
             WHERE id = ? AND user_id = ?`,
        ).get(sid, String(req.userId));
        if (!row) return res.status(404).json({ error: 'Беседа не найдена' });
        let messages = [];
        try {
            messages = JSON.parse(row.messages_json || '[]');
        } catch {
            messages = [];
        }
        res.json({
            id: row.id,
            user_id: row.user_id,
            created_at: row.created_at,
            title: row.title || '',
            message_count: Number(row.message_count) || 0,
            messages: Array.isArray(messages) ? messages : [],
        });
    } catch (err) {
        console.error('❌ GET /api/user/conversations/:sessionId error:', err);
        res.status(500).json({ error: 'Ошибка загрузки беседы' });
    }
});


app.get('/api/user/stats', authenticate, async (req, res) => {
    console.log(`📊 GET /api/user/stats для user #${req.userId}`);
    try {
        const users = await db.prepare(
            'SELECT id, name, email, minutes_used, phrases_translated, subscription, created_at, updated_at FROM users WHERE id = ?'
        ).all(req.userId);
        if (users.length === 0) {
            console.warn(`⚠️ Пользователь #${req.userId} не найден в БД`);
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        const user = users[0];
        console.log(`📊 Найдено в users: minutes=${user.minutes_used}, phrases=${user.phrases_translated}`);

        let phrasesFromEvents = 0;
        try {
            const ev = db.prepare(
                `SELECT COALESCE(SUM(phrases_delta), 0) AS total
                 FROM user_activity_events
                 WHERE user_id = ?`,
            ).get(String(req.userId));
            phrasesFromEvents = Number(ev?.total) || 0;
        } catch (e) {
            // Таблица могла ещё не быть создана на старых инстансах.
            phrasesFromEvents = 0;
        }
        let phrasesFromSessions = 0;
        try {
            const sess = db.prepare(
                `SELECT COALESCE(SUM(message_count), 0) AS total
                 FROM conversation_sessions
                 WHERE user_id = ?`,
            ).get(String(req.userId));
            phrasesFromSessions = Number(sess?.total) || 0;
        } catch (e) {
            phrasesFromSessions = 0;
        }

        const phrasesTotal = Math.max(
            0,
            Number(user.phrases_translated) || 0,
            phrasesFromEvents,
            phrasesFromSessions,
        );
        
        const voicesCount = 8;
        
        const accuracy = 100;
        const responseData = {
            userId: user.id,
            minutesUsed: Math.round(user.minutes_used * 10) / 10,
            phrasesTranslated: phrasesTotal,
            voicesCount: voicesCount,
            accuracy: accuracy,
            subscription: user.subscription,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
        console.log('📊 Отправка ответа:', responseData);
        res.json(responseData);
    } catch (err) {
        console.error('❌ GET /api/user/stats error:', err);
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

app.post('/api/user/stats', authenticate, async (req, res) => {
    const { minutesUsed, phrasesTranslated } = req.body;
    console.log(`📊 POST /api/user/stats для user #${req.userId}`);
    console.log(`📊 Данные: minutesUsed=${minutesUsed}, phrasesTranslated=${phrasesTranslated}`);
    
    if (typeof minutesUsed !== 'number' || typeof phrasesTranslated !== 'number') {
        console.warn('⚠️ Неверный формат данных');
        return res.status(400).json({ error: 'Неверный формат данных' });
    }
    
    try {
        const currentStats = await db.prepare(
            'SELECT minutes_used, phrases_translated FROM users WHERE id = ?'
        ).get(req.userId);
        if (!currentStats) {
            console.warn(`⚠️ Пользователь #${req.userId} не найден`);
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        console.log(`📊 До обновления: minutes=${currentStats.minutes_used}, phrases=${currentStats.phrases_translated}`);
        
        const result = await db.prepare(
            `UPDATE users SET minutes_used = minutes_used + ?, phrases_translated = phrases_translated + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(Math.max(0, minutesUsed), Math.max(0, phrasesTranslated), req.userId);
        
        console.log(`📊 Изменено строк: ${result.changes}`);
        
        const newStats = await db.prepare(
            'SELECT minutes_used, phrases_translated FROM users WHERE id = ?'
        ).get(req.userId);
        console.log(`📊 После обновления: minutes=${newStats.minutes_used}, phrases=${newStats.phrases_translated}`);
        
        if (result.changes === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json({ success: true, updated: true, newMinutes: newStats.minutes_used, newPhrases: newStats.phrases_translated });
    } catch (err) {
        console.error('❌ POST /api/user/stats error:', err);
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

// 🔥 Сброс статистики (опционально, для админа/тестов)
app.post('/api/user/stats/reset', authenticate, async (req, res) => {
    try {
        await db.prepare(
            'UPDATE users SET minutes_used = 0, phrases_translated = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(req.userId);
        console.log(`📊 Stats reset for user #${req.userId}`);
        res.json({ success: true, reset: true });
    } catch (err) {
        console.error('❌ POST /api/user/stats/reset error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// ==================== СМЕНА ПАРОЛЯ ПОЛЬЗОВАТЕЛЯ ====================

app.post('/api/user/password', authenticate, async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    
    console.log(`🔐 POST /api/user/password для user #${req.userId}`);
    
    // Валидация входных данных
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: 'Новые пароли не совпадают' });
    }
    
    // Минимальная длина пароля
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }
    
    try {
        // Получаем пользователя из БД
        const users = await db.prepare(
            'SELECT id, password, google_id FROM users WHERE id = ?'
        ).all(req.userId);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const user = users[0];
        
        // Если пользователь зарегистрирован через Google (нет пароля)
        if (!user.password && user.google_id) {
            return res.status(400).json({ 
                error: 'Для аккаунтов Google смена пароля недоступна. Привяжите пароль в настройках.' 
            });
        }
        
        // Проверяем текущий пароль
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            console.warn(`⚠️ Неверный текущий пароль для user #${req.userId}`);
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }
        
        // Хешируем новый пароль
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // Обновляем пароль в БД
        const result = await db.prepare(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(hashedNewPassword, req.userId);
        
        if (result.changes === 0) {
            return res.status(500).json({ error: 'Не удалось обновить пароль' });
        }
        
        // 🔥 Опционально: удалить все сессии пользователя (требует повторного входа)
        // await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.userId);
        
        console.log(`✅ Пароль успешно изменён для user #${req.userId}`);
        res.json({ success: true, message: 'Пароль успешно изменён' });
        
    } catch (err) {
        console.error('❌ POST /api/user/password error:', err);
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});


PUBLIC_PAGES.forEach((name) => {
  app.get(`/:lang/${name}.html`, (req, res) => {
    const lc = String(req.params.lang || '').toLowerCase();
    if (!SITE_UI_LOCALE_CODES.has(lc)) return res.status(404).send('Not Found');
    redirectWithQuery(res, 301, `/${lc}/${name}`, req);
  });
  app.get(`/:lang/${name}`, (req, res) => {
    const lc = String(req.params.lang || '').toLowerCase();
    if (!SITE_UI_LOCALE_CODES.has(lc)) return res.status(404).send('Not Found');
    const fp = path.join(__dirname, 'public', `${name}.html`);
    const pageId = sitePageMeta.isSeoMarketingPage(name) ? name : null;
    const body = buildLocalizedPublicHtml(fp, lc, { req, barePath: `/${name}`, pageId });
    res.type('html').send(body);
  });
});

app.get('/:lang/', (req, res) => {
  const lc = String(req.params.lang || '').toLowerCase();
  if (!SITE_UI_LOCALE_CODES.has(lc)) return res.status(404).send('Not Found');
  const fp = path.join(__dirname, 'public', 'index.html');
  const body = buildLocalizedPublicHtml(fp, lc, { req, barePath: '/', pageId: 'index' });
  res.type('html').send(body);
});

// ==================== ЗАПУСК СЕРВЕРА ====================
app.listen(PORT, () => {
    let userCount = 0;
    try { userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c; } catch (e) { /* ignore */ }
    console.log(`🚀 Сайт (SQLite): http://localhost:${PORT}`);
    console.log(`🗄️ База данных: ${dbPath} (users: ${userCount})`);
    console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'loaded' : 'MISSING — login will fail'}`);
    const ac = siteAnalytics.getConfig();
    if (ac.ga4) console.log(`📊 GA4: ${ac.ga4}`);
    if (ac.metrika) console.log(`📊 Yandex Metrika: ${ac.metrika}`);
    if (siteVisitCounter.isEnabled()) console.log('📊 Server visit counter: on');
});