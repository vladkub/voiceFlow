// services/subscription-service.js
/**
 * 📦 Subscription Service - Управление тарифами
 */

require('dotenv').config();

const TARIFFS = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    durationDays: 30,
    minutesLimit: 60,
    voicesLimit: 5,
    features: {
      basicVoices: true,
      communitySupport: true,
      description: 'Базовый функционал для начала'
    },
    color: '#64748B'
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 19.99,
    durationDays: 30,
    minutesLimit: 500,
    voicesLimit: 50,
    features: {
      basicVoices: true,
      premiumVoices: true,
      prioritySupport: true,
      apiAccess: true,
      description: 'Для активных пользователей'
    },
    color: '#00C9FF',
    popular: true
  },
  team: {
    name: 'team',
    displayName: 'Team',
    price: 49.99,
    durationDays: 30,
    minutesLimit: 9999,
    voicesLimit: 999,
    features: {
      basicVoices: true,
      premiumVoices: true,
      allVoices: true,
      prioritySupport: true,
      apiAccess: true,
      teamManagement: true,
      analytics: true,
      description: 'Для команд и бизнеса'
    },
    color: '#7B2CBF'
  }
};

class SubscriptionService {
  constructor(db) {
    this.db = db;
  }

  getAvailablePlans() {
    return Object.values(TARIFFS).filter(t => t.name !== 'free');
  }

  getPlanByName(name) {
    return TARIFFS[name];
  }

  async getCurrentSubscription(userId) {
    const subscription = this.db.prepare(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.display_name,
        sp.price,
        sp.minutes_limit,
        sp.voices_limit,
        sp.features
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND us.status = 'active' 
        AND us.expires_at > datetime('now')
      ORDER BY us.purchased_at DESC
      LIMIT 1
    `).get(userId);

    if (!subscription) {
      const freePlan = TARIFFS.free;
      return {
        plan: 'free',
        displayName: freePlan.displayName,
        price: 0,
        minutesLimit: freePlan.minutesLimit,
        voicesLimit: freePlan.voicesLimit,
        features: freePlan.features,
        expiresAt: null,
        isExpired: false
      };
    }

    return {
      plan: subscription.plan_name,
      displayName: subscription.display_name,
      price: subscription.price,
      minutesLimit: subscription.minutes_limit,
      voicesLimit: subscription.voices_limit,
      features: subscription.features ? JSON.parse(subscription.features) : {},
      purchasedAt: subscription.purchased_at,
      expiresAt: subscription.expires_at,
      autoRenew: subscription.auto_renew,
      isExpired: new Date(subscription.expires_at) < new Date()
    };
  }

  async canPurchase(userId, planName) {
    const plan = TARIFFS[planName];
    if (!plan) return { can: false, error: 'Тариф не найден' };
    if (plan.price === 0) return { can: true };

    const balance = this.db.prepare(
      'SELECT balance FROM user_balances WHERE user_id = ?'
    ).get(userId);

    if (!balance || balance.balance < plan.price) {
      return { 
        can: false, 
        error: 'Недостаточно средств',
        required: plan.price,
        current: balance?.balance || 0
      };
    }

    return { can: true };
  }

  async purchaseWithBalance(userId, planName) {
    const plan = TARIFFS[planName];
    if (!plan) throw new Error('Тариф не найден');

    const canBuy = await this.canPurchase(userId, planName);
    if (!canBuy.can) {
      throw new Error(canBuy.error);
    }

    const db = this.db;
    
    try {
      db.prepare('BEGIN').run();

      const balanceResult = db.prepare(`
        UPDATE user_balances 
        SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND balance >= ?
      `).run(plan.price, userId, plan.price);

      if (balanceResult.changes === 0) {
        throw new Error('Не удалось списать средства');
      }

      db.prepare(`
        UPDATE user_subscriptions 
        SET status = 'superseded' 
        WHERE user_id = ? AND status = 'active'
      `).run(userId);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

      const result = db.prepare(`
        INSERT INTO user_subscriptions 
        (user_id, plan_id, status, expires_at, payment_method, transaction_id)
        VALUES (
          ?, 
          (SELECT id FROM subscription_plans WHERE name = ?),
          'active',
          ?,
          'balance',
          ?
        )
      `).run(
        userId,
        planName,
        expiresAt.toISOString(),
        `bal_${userId}_${Date.now()}`
      );

      db.prepare(`
        INSERT INTO transactions (user_id, amount, currency, status, payment_id)
        VALUES (?, ?, 'USD', 'completed', ?)
      `).run(
        userId,
        -plan.price,
        `sub_${planName}_${Date.now()}`
      );

      db.prepare('COMMIT').run();

      console.log(`✅ Subscription purchased: user #${userId}, plan ${planName}, $${plan.price}`);

      return {
        success: true,
        plan: planName,
        price: plan.price,
        expiresAt: expiresAt.toISOString(),
        newBalance: db.prepare('SELECT balance FROM user_balances WHERE user_id = ?').get(userId).balance
      };

    } catch (err) {
      db.prepare('ROLLBACK').run();
      console.error('❌ Purchase error:', err.message);
      throw err;
    }
  }

  async checkExpiredSubscriptions() {
    const expired = this.db.prepare(`
      SELECT id, user_id, plan_name 
      FROM user_subscriptions 
      WHERE status = 'active' AND expires_at <= datetime('now')
    `).all();

    for (const sub of expired) {
      const subDetails = this.db.prepare(`
        SELECT us.*, sp.price 
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = ?
      `).get(sub.id);

      if (subDetails.auto_renew) {
        const balance = this.db.prepare(
          'SELECT balance FROM user_balances WHERE user_id = ?'
        ).get(subDetails.user_id);

        if (balance && balance.balance >= subDetails.price) {
          const newExpires = new Date();
          newExpires.setDate(newExpires.getDate() + 30);
          
          this.db.prepare(`
            UPDATE user_subscriptions 
            SET expires_at = ?, purchased_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newExpires.toISOString(), sub.id);
          
          this.db.prepare(`
            UPDATE user_balances 
            SET balance = balance - ? 
            WHERE user_id = ?
          `).run(subDetails.price, subDetails.user_id);
          
          console.log(`🔄 Auto-renewed: user #${subDetails.user_id}, plan ${sub.plan_name}`);
          continue;
        }
      }

      this.db.prepare(`
        UPDATE user_subscriptions SET status = 'expired' WHERE id = ?
      `).run(sub.id);
      
      const freePlanId = this.db.prepare(
        'SELECT id FROM subscription_plans WHERE name = ?'
      ).get('free').id;
      
      this.db.prepare(`
        INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_method)
        VALUES (?, ?, 'active', datetime('now', '+30 days'), 'free')
      `).run(subDetails.user_id, freePlanId);
      
      console.log(`⏰ Expired: user #${subDetails.user_id}, plan ${sub.plan_name}`);
    }

    return { checked: expired.length };
  }

  async getUsageStats(userId, plan) {
    // 🔥 minutes_used хранится в таблице users
    const userStats = this.db.prepare(`
      SELECT minutes_used, phrases_translated, updated_at 
      FROM users WHERE id = ?
    `).get(userId);

    const planConfig = TARIFFS[plan] || TARIFFS.free;
    const minutesUsed = userStats?.minutes_used || 0;
    
    return {
      minutesUsed: Math.round(minutesUsed * 10) / 10,
      minutesLimit: planConfig.minutesLimit,
      minutesRemaining: Math.max(0, planConfig.minutesLimit - minutesUsed),
      usagePercent: Math.min(100, (minutesUsed / planConfig.minutesLimit) * 100),
      isOverLimit: minutesUsed > planConfig.minutesLimit,
      phrasesTranslated: userStats?.phrases_translated || 0,
      lastUpdated: userStats?.updated_at
    };
  }
}

// 🔥 Правильный экспорт класса
module.exports = SubscriptionService;