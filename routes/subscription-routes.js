// routes/subscription-routes.js
/**
 * 📦 Subscription Routes - API Endpoints
 */

const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/subscription-service');

let authenticateMiddleware = null;
let db = null;
let subscriptionService = null;

function setDependencies(auth, database) {
  authenticateMiddleware = auth;
  db = database;
  subscriptionService = new SubscriptionService(db);
}

function createRouter() {
  const router = express.Router();

  // 🔹 GET /api/subscriptions/plans - Доступные тарифы
  router.get('/plans', (req, res) => {
    try {
      const plans = subscriptionService.getAvailablePlans();
      res.json({ plans });
    } catch (err) {
      console.error('❌ GET /api/subscriptions/plans error:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  // 🔹 GET /api/subscriptions/current - Текущая подписка
  router.get('/current', authenticateMiddleware, async (req, res) => {
    try {
      const subscription = await subscriptionService.getCurrentSubscription(req.userId);
      const usage = await subscriptionService.getUsageStats(req.userId, subscription.plan);
      
      res.json({
        subscription,
        usage
      });
    } catch (err) {
      console.error('❌ GET /api/subscriptions/current error:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  // 🔹 POST /api/subscriptions/purchase - Купить тариф с баланса
  router.post('/purchase', authenticateMiddleware, async (req, res) => {
    const { planName } = req.body;
    const userId = req.userId;

    console.log(`📦 Purchase request: user #${userId}, plan ${planName}`);

    if (!planName || !['pro', 'team'].includes(planName)) {
      return res.status(400).json({ error: 'Неверный тариф' });
    }

    try {
      const result = await subscriptionService.purchaseWithBalance(userId, planName);
      
      res.json({
        success: true,
        message: `Тариф ${result.plan} активирован!`,
        ...result
      });
    } catch (err) {
      console.error('❌ Purchase error:', err.message);
      
      if (err.message.includes('Недостаточно средств')) {
        return res.status(400).json({ 
          error: 'Недостаточно средств',
          hint: 'Пополните баланс для покупки тарифа'
        });
      }
      
      res.status(500).json({ error: 'Ошибка покупки: ' + err.message });
    }
  });

  // 🔹 POST /api/subscriptions/cancel - Отменить автопродление
  router.post('/cancel', authenticateMiddleware, async (req, res) => {
    try {
      const result = db.prepare(`
        UPDATE user_subscriptions 
        SET auto_renew = 0 
        WHERE user_id = ? AND status = 'active'
      `).run(req.userId);

      res.json({
        success: true,
        message: result.changes > 0 ? 'Автопродление отключено' : 'Нет активной подписки'
      });
    } catch (err) {
      console.error('❌ Cancel error:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  // 🔹 POST /api/subscriptions/renew - Продлить подписку вручную
  router.post('/renew', authenticateMiddleware, async (req, res) => {
    const { planName } = req.body;
    const userId = req.userId;

    try {
      const plan = subscriptionService.getPlanByName(planName);
      if (!plan) return res.status(400).json({ error: 'Тариф не найден' });

      // Проверка баланса
      const balance = db.prepare(
        'SELECT balance FROM user_balances WHERE user_id = ?'
      ).get(userId);

      if (!balance || balance.balance < plan.price) {
        return res.status(400).json({ 
          error: 'Недостаточно средств для продления',
          required: plan.price,
          current: balance?.balance || 0
        });
      }

      // Продление
      const newExpires = new Date();
      newExpires.setDate(newExpires.getDate() + plan.durationDays);

      db.prepare(`
        UPDATE user_subscriptions 
        SET expires_at = ?, purchased_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND status = 'active'
      `).run(newExpires.toISOString(), userId);

      db.prepare(`
        UPDATE user_balances 
        SET balance = balance - ? 
        WHERE user_id = ?
      `).run(plan.price, userId);

      res.json({
        success: true,
        message: 'Подписка продлена!',
        newExpiresAt: newExpires.toISOString()
      });
    } catch (err) {
      console.error('❌ Renew error:', err);
      res.status(500).json({ error: 'Ошибка продления: ' + err.message });
    }
  });

  // 🔹 GET /api/subscriptions/check-expired - Проверка истёкших (для крона)
  router.get('/check-expired', async (req, res) => {
    // 🔐 В продакшене добавить проверку токена/ключа!
    try {
      const result = await subscriptionService.checkExpiredSubscriptions();
      res.json(result);
    } catch (err) {
      console.error('❌ Check expired error:', err);
      res.status(500).json({ error: 'Ошибка проверки' });
    }
  });

  return router;
}

module.exports = { createRouter, setDependencies };