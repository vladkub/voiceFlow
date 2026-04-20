// routes/stripe-routes.js
/**
 * 💳 Stripe Routes - API Endpoints
 * Исправлено: маршруты создаются после инъекции зависимостей
 */

const express = require('express');
const stripeService = require('../services/stripe-service');

let authenticateMiddleware = null;
let db = null;

/**
 * 🔥 Установка зависимостей (вызывается из server.js ПЕРЕД createRouter)
 */
function setDependencies(auth, database) {
  authenticateMiddleware = auth;
  db = database;
}

/**
 * 🔥 Создание роутера (вызывается ПОСЛЕ setDependencies)
 */
function createRouter() {
  const router = express.Router();

  // 🔹 POST /api/stripe/create - Создание платежа
  router.post('/create', (req, res, next) => {
    if (!authenticateMiddleware) {
      return res.status(500).json({ error: 'Stripe module not initialized' });
    }
    
    authenticateMiddleware(req, res, async () => {
      const { amount, currency = 'USD' } = req.body;
      const userId = req.userId;

      console.log(`💳 Stripe create: user #${userId}, amount: ${amount} ${currency}`);

      if (!amount || amount < 1) {
        return res.status(400).json({ error: 'Минимальная сумма: $1' });
      }

      try {
        const orderId = `stripe_${userId}_${Date.now()}`;

        // 1. Создаём запись в БД (pending)
        db.prepare(`
          INSERT INTO transactions (user_id, amount, currency, crypto_currency, status, payment_id)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `).run(userId, amount, currency, 'stripe', orderId);

        // 2. Создаём Payment Intent в Stripe
        const payment = await stripeService.createPaymentIntent(amount, currency, userId, orderId);

        // 3. Обновляем payment_id
        db.prepare(`
          UPDATE transactions SET payment_id = ? WHERE payment_id = ?
        `).run(payment.paymentIntentId, orderId);

        res.json({
          success: true,
          paymentIntentId: payment.paymentIntentId,
          clientSecret: payment.clientSecret,
          amount: payment.amount,
          currency: payment.currency
        });

      } catch (err) {
        console.error('❌ Stripe create error:', err);
        res.status(500).json({ error: 'Ошибка создания платежа: ' + err.message });
      }
    });
  });

  // 🔹 POST /api/stripe/webhook - Webhook от Stripe (БЕЗ аутентификации!)
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    // Получаем raw body для проверки подписи
    let rawBody;
    if (req.body instanceof Buffer) {
      rawBody = req.body;
    } else {
      rawBody = Buffer.from(JSON.stringify(req.body));
    }

    console.log('🔔 Stripe webhook received');

    // Проверка подписи
    const verification = stripeService.verifyWebhookSignature(rawBody, signature);
    
    if (!verification.valid) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = verification.event;
    console.log(`📊 Event type: ${event.type}`);

    try {
      // Обработка успешного платежа
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        const userId = parseInt(paymentIntent.metadata.userId);
        const amount = paymentIntent.amount / 100; // Конвертируем из центов

        console.log(`✅ Payment succeeded: ${orderId}, user #${userId}, $${amount}`);

        // Находим транзакцию
        const transaction = db.prepare(
          'SELECT * FROM transactions WHERE payment_id = ?'
        ).get(paymentIntent.id);

        if (transaction && transaction.status !== 'completed') {
          // Обновляем статус транзакции
          db.prepare(`
            UPDATE transactions 
            SET status = 'completed', 
                completed_at = CURRENT_TIMESTAMP 
            WHERE payment_id = ?
          `).run(paymentIntent.id);

          // 🔥 Зачисляем баланс
          db.prepare(`
            UPDATE user_balances 
            SET balance = balance + ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
          `).run(amount, userId);

          console.log(`✅ Balance credited: user #${userId}, +$${amount}`);
        }
      }

      // Обработка отменённого платежа
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        
        console.log(`❌ Payment failed: ${orderId}`);
        
        db.prepare(`
          UPDATE transactions SET status = 'failed' WHERE payment_id = ?
        `).run(paymentIntent.id);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('❌ Webhook error:', err);
      res.status(500).json({ error: 'Webhook error' });
    }
  });

  // 🔹 GET /api/stripe/status - Проверка статуса платежа
  router.get('/status/:paymentIntentId', (req, res, next) => {
    if (!authenticateMiddleware) {
      return res.status(500).json({ error: 'Stripe module not initialized' });
    }
    authenticateMiddleware(req, res, async () => {
      try {
        const status = await stripeService.getPaymentStatus(req.params.paymentIntentId);
        res.json(status);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  // 🔹 GET /api/stripe/methods - Доступные методы оплаты
  router.get('/methods', async (req, res) => {
    try {
      const methods = await stripeService.getPaymentMethods();
      res.json({ methods });
    } catch (err) {
      res.json({ methods: [] });
    }
  });

  return router;
}

// Экспортируем функцию создания роутера и setDependencies
module.exports = { createRouter, setDependencies };