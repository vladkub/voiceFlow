// routes/payment-routes.js
/**
 * 💰 Payment Routes - API Endpoints
 * Исправлено: маршруты создаются после инъекции зависимостей
 */

const express = require('express');
const paymentService = require('../services/payment-service');

let authenticateMiddleware = null;
let db = null;

/**
 * 🔥 Функция для установки зависимостей (вызывается из server.js)
 */
function setDependencies(auth, database) {
  authenticateMiddleware = auth;
  db = database;
}

/**
 * 🔥 Функция создания роутера (вызывается после setDependencies)
 */
function createRouter() {
  const router = express.Router();

  // 🔹 GET /api/user/balance
  router.get('/user/balance', (req, res, next) => {
    if (!authenticateMiddleware) return res.status(500).json({ error: 'Payment module not initialized' });
    authenticateMiddleware(req, res, () => {
      try {
        const balance = db.prepare(
          'SELECT balance, currency, updated_at FROM user_balances WHERE user_id = ?'
        ).get(req.userId);

        if (!balance) {
          db.prepare('INSERT INTO user_balances (user_id, balance) VALUES (?, 0)').run(req.userId);
          return res.json({ balance: 0, currency: 'USD' });
        }

        res.json({
          balance: Math.round(balance.balance * 100) / 100,
          currency: balance.currency,
          updatedAt: balance.updated_at
        });
      } catch (err) {
        console.error('❌ GET /api/user/balance error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });
  });

  // 🔹 GET /api/user/transactions
  router.get('/user/transactions', (req, res, next) => {
    if (!authenticateMiddleware) return res.status(500).json({ error: 'Payment module not initialized' });
    authenticateMiddleware(req, res, () => {
      try {
        const transactions = db.prepare(`
          SELECT id, amount, currency, crypto_amount, crypto_currency, status, created_at, completed_at
          FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
        `).all(req.userId);
        res.json(transactions);
      } catch (err) {
        console.error('❌ GET /api/user/transactions error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });
  });

  // 🔹 POST /api/payment/create
  // 🔹 POST /api/payment/create (ИСПРАВЛЕННЫЙ ПОРЯДОК)
// 🔥 ИСПРАВЛЕННЫЙ КОД: нормализация валют
router.post('/payment/create', (req, res, next) => {
  if (!authenticateMiddleware) {
    return res.status(500).json({ error: 'Payment module not initialized' });
  }
  
  authenticateMiddleware(req, res, async () => {
    const { amount, currency = 'USD', cryptoCurrency = 'USDT' } = req.body;
    const userId = req.userId;

    console.log(`💰 Create payment: user #${userId}, amount: ${amount} ${currency}`);

    if (!amount || amount < 5) {
      return res.status(400).json({ error: 'Минимальная сумма: $5' });
    }

    try {
      // 🔥 НОРМАЛИЗАЦИЯ ВАЛЮТ (нижний регистр + сеть)
      const normalizeCurrency = (curr) => {
        const c = curr.toLowerCase().trim();
        // Добавляем сеть для USDT по умолчанию
        if (c === 'usdt') return 'usdttrc20';
        if (c === 'usdc') return 'usdctrc20';
        return c; // btc, eth, ton и т.д.
      };

      const paymentId = `pay_${userId}_${Date.now()}`;
      
      console.log(`🔄 Calling NowPayments API for order: ${paymentId}`);
      
      const invoice = await paymentService.createInvoice(
        amount, 
        normalizeCurrency(currency),      // 🔥 "USD" → "usd"
        normalizeCurrency(cryptoCurrency), // 🔥 "USDT" → "usdttrc20"
        paymentId
      );
      
      console.log(`✅ API success, creating DB record for invoice: ${invoice.invoiceId}`);
      
      const result = db.prepare(`
        INSERT INTO transactions (user_id, amount, currency, crypto_currency, status, payment_id)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(userId, amount, currency, cryptoCurrency, invoice.invoiceId);

      console.log(`✅ Transaction created in DB: id=${result.lastInsertRowid}`);

      res.json({
        success: true,
        invoiceId: invoice.invoiceId,
        payAddress: invoice.payAddress,
        payAmount: invoice.payAmount,
        payCurrency: invoice.payCurrency,
        purchaseId: invoice.purchaseId
      });

    } catch (err) {
      console.error('❌ Create payment error:', err.message);
      
      // 🔥 Улучшенная обработка ошибок
      if (err.message.includes('Can not get estimate')) {
        return res.status(400).json({ 
          error: 'Невозможно конвертировать валюты. Попробуйте другую криптовалюту.',
          hint: 'Поддерживаемые: USDT (TRC20), USDC, BTC, ETH, TON, LTC'
        });
      }
      if (err.message.includes('429')) {
        return res.status(429).json({ 
          error: 'Слишком много запросов. Подождите 1 минуту и попробуйте снова.'
        });
      }
      
      res.status(500).json({ 
        error: 'Ошибка создания платежа: ' + err.message
      });
    }
  });
});

  // 🔹 POST /api/payment/webhook (без аутентификации!)
  router.post('/payment/webhook', async (req, res) => {
    const signature = req.headers['x-nowpayments-sig'];
    const payload = req.body;

    console.log(`🔔 Webhook: order=${payload.order_id}, status=${payload.payment_status}`);

    if (!paymentService.verifyWebhookSignature(payload, signature)) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      const transaction = db.prepare('SELECT * FROM transactions WHERE payment_id = ?').get(payload.order_id);
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

      if (payload.payment_status === 'finished' && transaction.status !== 'completed') {
        db.prepare(`
          UPDATE transactions SET status = 'completed', crypto_amount = ?, crypto_currency = ?, tx_hash = ?, completed_at = CURRENT_TIMESTAMP
          WHERE payment_id = ?
        `).run(payload.pay_amount, payload.pay_currency, payload.txn_id, payload.order_id);

        db.prepare(`
          UPDATE user_balances SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
        `).run(transaction.amount, transaction.user_id);

        console.log(`✅ Balance credited: user #${transaction.user_id}, +${transaction.amount}`);
      }
      res.json({ result: 'OK' });
    } catch (err) {
      console.error('❌ Webhook error:', err);
      res.status(500).json({ error: 'Webhook error' });
    }
  });

  // 🔹 GET /api/payment/currencies (без аутентификации)
  router.get('/payment/currencies', async (req, res) => {
    try {
      const currencies = await paymentService.getAvailableCurrencies();
      res.json({ currencies });
    } catch (err) {
      res.json({ currencies: ['USDT', 'USDC', 'BTC', 'ETH', 'TON', 'LTC'] });
    }
  });

  return router;
}

// Экспортируем функцию создания роутера и setDependencies
module.exports = { createRouter, setDependencies };