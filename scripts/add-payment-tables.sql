-- 🔥 Таблица балансов пользователей
CREATE TABLE IF NOT EXISTS user_balances (
    user_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🔥 Таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    crypto_amount REAL,
    crypto_currency TEXT,
    status TEXT DEFAULT 'pending',
    payment_id TEXT UNIQUE,
    tx_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🔥 Инициализация балансов для существующих пользователей
INSERT OR IGNORE INTO user_balances (user_id, balance)
SELECT id, 0 FROM users;

-- 🔥 Индекс для быстрого поиска транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);