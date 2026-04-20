-- 🔥 Таблица тарифов (планы подписки)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- 'free', 'pro', 'team'
    display_name TEXT NOT NULL,          -- 'Free', 'Pro', 'Team'
    price REAL NOT NULL,                 -- Цена в USD
    duration_days INTEGER DEFAULT 30,    -- Срок действия (дней)
    minutes_limit REAL,                  -- Лимит минут в месяц
    voices_limit INTEGER,                -- Лимит голосов
    features TEXT,                       -- JSON с фичами
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔥 Таблица активных подписок пользователей
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active',        -- 'active', 'expired', 'cancelled'
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,       -- Дата окончания
    auto_renew BOOLEAN DEFAULT 0,        -- Автопродление
    payment_method TEXT,                 -- 'balance', 'stripe', 'nowpayments'
    transaction_id TEXT,                 -- ID транзакции оплаты
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 🔥 Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 🔥 Инициализация тарифов (3 плана)
INSERT OR IGNORE INTO subscription_plans (name, display_name, price, duration_days, minutes_limit, voices_limit, features) VALUES
('free', 'Free', 0, 30, 60, 5, '{"basic_voices": true, "community_support": true}'),
('pro', 'Pro', 19.99, 30, 500, 50, '{"basic_voices": true, "premium_voices": true, "priority_support": true, "api_access": true}'),
('team', 'Team', 49.99, 30, 9999, 999, '{"basic_voices": true, "premium_voices": true, "all_voices": true, "priority_support": true, "api_access": true, "team_management": true, "analytics": true}');

-- 🔥 Триггер: при создании пользователя — бесплатная подписка
CREATE TRIGGER IF NOT EXISTS create_free_subscription
AFTER INSERT ON users
BEGIN
    INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_method)
    SELECT NEW.id, id, 'active', datetime('now', '+30 days'), 'free'
    FROM subscription_plans WHERE name = 'free';
END;