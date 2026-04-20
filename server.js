// server.js
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Инициализация SQLite
const dbPath = path.join(__dirname, 'voiceflow.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== 🔥 CORS НАСТРОЙКА (ИСПРАВЛЕННАЯ) ====================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8000'
    ];
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// 🔹 Middleware аутентификации
const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
const getExpiresAt = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Не авторизован' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const session = db.prepare('SELECT * FROM sessions WHERE user_id = ? AND token = ? AND expires_at > datetime(\'now\')').get(decoded.userId, token);
        if (!session) return res.status(401).json({ error: 'Сессия истекла' });
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ error: 'Неверный токен' });
    }
};

// 🔹 Статические файлы
app.use(express.static('public'));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));


// ==================== ПОДКЛЮЧЕНИЕ ПЛАТЕЖНЫХ МОДУЛЕЙ ====================

// ==================== ПОДКЛЮЧЕНИЕ ПЛАТЕЖНЫХ МОДУЛЕЙ ====================
const paymentModule = require('./routes/payment-routes');

// 1. Сначала передаём зависимости
paymentModule.setDependencies(authenticate, db);

// 2. Затем создаём и подключаем роутер
app.use('/api', paymentModule.createRouter());

console.log('💰 Payment module initialized');

// ==================== ПОДКЛЮЧЕНИЕ STRIPE ====================
const stripeModule = require('./routes/stripe-routes');

// 1. Сначала передаём зависимости
stripeModule.setDependencies(authenticate, db);

// 2. Затем создаём и подключаем роутер
app.use('/api/stripe', stripeModule.createRouter());

// 🔥 Отдаём raw body для webhook (важно для Stripe!)
// Но только для конкретного пути, чтобы не ломать другие JSON-парсеры
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

console.log('💳 Stripe module initialized');

// 🔥 Конфиг для фронтенда
app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    nowPaymentsEnabled: !!process.env.NOWPAYMENTS_API_KEY,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY
  });
});


// ==================== ПОДКЛЮЧЕНИЕ МОДУЛЯ ПОДПИСОК ====================
const subscriptionModule = require('./routes/subscription-routes');
subscriptionModule.setDependencies(authenticate, db);
app.use('/api/subscriptions', subscriptionModule.createRouter());
console.log('📦 Subscription module initialized');

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

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(400).json({ error: 'Email уже зарегистрирован' });
        const hashedPassword = bcrypt.hashSync(password, 10);
        const stmt = db.prepare('INSERT INTO users (name, email, password, subscription) VALUES (?, ?, ?, ?)');
        const result = stmt.run(name, email, hashedPassword, 'free');
        const userId = result.lastInsertRowid;
        const token = generateToken(userId);
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, getExpiresAt());
        res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
        res.json({ success: true, user: { id: userId, name, email, subscription: 'free' } });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Неверный email или пароль' });
        const token = generateToken(user.id);
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, getExpiresAt());
        res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, subscription: user.subscription } });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/auth/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=profile%20email`;
    res.json({ url });
});

app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
            code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code'
        });
        const { data: userInfo } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const { id: googleId, name, email, picture } = userInfo;
        let user = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(email, googleId);
        let userId;
        if (!user) {
            const result = db.prepare('INSERT INTO users (google_id, name, email, avatar, subscription) VALUES (?, ?, ?, ?, ?)').run(googleId, name, email, picture, 'free');
            userId = result.lastInsertRowid;
        } else {
            userId = user.id;
            if (!user.google_id) db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, userId);
        }
        const token = generateToken(userId);
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, getExpiresAt());
        res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
        res.redirect('/dashboard.html');
    } catch (err) { console.error(err); res.redirect('/?error=google_auth_failed'); }
});

app.get('/api/auth/me', authenticate, (req, res) => {
    try {
        const user = db.prepare('SELECT id, name, email, avatar, subscription, minutes_used, phrases_translated, created_at FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/auth/logout', authenticate, (req, res) => {
    const token = req.cookies.token;
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.clearCookie('token');
    res.json({ success: true });
});


// ==================== ПРОВЕРКА АВТОРИЗАЦИИ ====================
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('❌ GET /api/auth/me error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== КОНТЕНТНЫЕ СТРАНИЦЫ ====================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Технологии
app.get('/technology.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'technology.html'));
});

// Тарифы
app.get('/pricing.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

// FAQ
app.get('/faq.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

console.log('📄 Content pages initialized');

// ==================== СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ====================

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
        console.log(`📊 Найдено в БД: minutes=${user.minutes_used}, phrases=${user.phrases_translated}`);
        
        let voicesCount = 5;
        try {
            const voicesResp = await fetch('http://localhost:8000/api/voices', { timeout: 2000 });
            if (voicesResp.ok) {
                const voicesData = await voicesResp.json();
                voicesCount = voicesData.voices?.length || 5;
            }
        } catch (e) { console.warn('Не удалось получить список голосов'); }
        
        const accuracy = user.phrases_translated > 0 ? 98 : 0;
        const responseData = {
            userId: user.id,
            minutesUsed: Math.round(user.minutes_used * 10) / 10,
            phrasesTranslated: user.phrases_translated,
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


// ==================== ЗАПУСК СЕРВЕРА ====================
app.listen(PORT, () => {
    console.log(`🚀 Сайт (SQLite): http://localhost:${PORT}`);
    console.log(`🎙️ Переводчик: http://localhost:8000/ui`);
    console.log(`🗄️ База данных: ${dbPath}`);
    console.log(`🔐 CORS разрешён для: localhost:3000, localhost:8000`);
});