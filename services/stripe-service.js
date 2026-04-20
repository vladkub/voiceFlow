// services/stripe-service.js
/**
 * 💳 Stripe Payment Service
 * Обработка платежей картами через Stripe
 */

const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CONFIG = {
  currency: process.env.STRIPE_CURRENCY || 'usd',
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/dashboard.html?payment=success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/dashboard.html?payment=cancelled',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
};

class StripeService {
  /**
   * Создание Payment Intent (платежа)
   */
  async createPaymentIntent(amount, currency, userId, orderId) {
    try {
      console.log('\n💳 ====== СОЗДАНИЕ STRIPE ПЛАТЕЖА ======');
      console.log('Amount:', amount, currency);
      console.log('User ID:', userId);
      console.log('Order ID:', orderId);

      // Stripe принимает сумму в минорах (центы для USD)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          userId: userId.toString(),
          orderId: orderId
        },
        automatic_payment_methods: {
          enabled: true, // Включает карты, Apple Pay, Google Pay
        },
      });

      console.log('✅ Payment Intent создан:', paymentIntent.id);
      console.log('Client Secret:', paymentIntent.client_secret.substring(0, 30) + '...');

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency,
        orderId: orderId
      };
    } catch (error) {
      console.error('❌ Stripe createPaymentIntent error:', error.message);
      throw error;
    }
  }

  /**
   * Проверка статуса платежа
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        status: paymentIntent.status, // 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled'
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: paymentIntent.created
      };
    } catch (error) {
      console.error('❌ Stripe getPaymentStatus error:', error.message);
      throw error;
    }
  }

  /**
   * Проверка подписи вебхука
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        CONFIG.webhookSecret
      );
      return { valid: true, event };
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message);
      return { valid: false, error };
    }
  }

  /**
   * Получить доступные методы оплаты
   */
  async getPaymentMethods() {
    return [
      { type: 'card', name: 'Банковская карта', enabled: true },
      { type: 'apple_pay', name: 'Apple Pay', enabled: true },
      { type: 'google_pay', name: 'Google Pay', enabled: true },
      { type: 'link', name: 'Link (Stripe)', enabled: true }
    ];
  }
}

module.exports = new StripeService();