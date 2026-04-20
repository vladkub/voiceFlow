// services/payment-service.js
/**
 * 💰 Payment Service - NowPayments Integration
 * С ОТЛАДКОЙ для диагностики проблем с API ключом
 */

const crypto = require('crypto');
require('dotenv').config();

// 🔥 ОТЛАДКА: Проверяем, что переменные окружения загружены
console.log('\n🔍 ====== ОТЛАДКА: payment-service.js ======');
console.log('📄 NOWPAYMENTS_API_KEY из .env:', process.env.NOWPAYMENTS_API_KEY ? '✅ Загружен' : '❌ НЕ загружен');
console.log('📄 NOWPAYMENTS_IPN_SECRET:', process.env.NOWPAYMENTS_IPN_SECRET ? '✅ Загружен' : '❌ НЕ загружен');
console.log('📄 NOWPAYMENTS_SANDBOX:', process.env.NOWPAYMENTS_SANDBOX);
console.log('📄 WEBHOOK_URL:', process.env.WEBHOOK_URL);
console.log('🔍 ==========================================\n');

const CONFIG = {
  apiKey: process.env.NOWPAYMENTS_API_KEY,
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
  sandbox: process.env.NOWPAYMENTS_SANDBOX === 'true',
  baseUrl: process.env.NOWPAYMENTS_SANDBOX === 'true' 
    ? 'https://api-sandbox.nowpayments.io' 
    : 'https://api.nowpayments.io',
  minAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 5,
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3000/api/payment/webhook'
};

// 🔥 ОТЛАДКА: Показываем конфигурацию
console.log('⚙️  CONFIG:');
console.log('   • API Key loaded:', CONFIG.apiKey ? '✅ Yes' : '❌ No');
console.log('   • API Key length:', CONFIG.apiKey?.length || 0);
console.log('   • API Key starts with:', CONFIG.apiKey ? CONFIG.apiKey.substring(0, 15) + '...' : 'N/A');
console.log('   • API Key has spaces:', CONFIG.apiKey?.includes(' ') ? '❌ Yes' : '✅ No');
console.log('   • Base URL:', CONFIG.baseUrl);
console.log('   • Webhook URL:', CONFIG.webhookUrl);
console.log('   • Sandbox mode:', CONFIG.sandbox);
console.log('');

class PaymentService {
  async createInvoice(amount, currency, cryptoCurrency, orderId) {
    console.log('\n💰 ====== СОЗДАНИЕ ПЛАТЕЖА ======');
    console.log('📊 Amount:', amount, currency);
    console.log('📊 Crypto:', cryptoCurrency);
    console.log('📊 Order ID:', orderId);
    console.log('📡 URL:', `${CONFIG.baseUrl}/v1/payment`);
    console.log('🔑 API Key (first 20):', CONFIG.apiKey ? CONFIG.apiKey.substring(0, 20) + '...' : 'NOT SET');
    console.log('🔑 API Key length:', CONFIG.apiKey?.length || 0);
    
    try {
      const requestBody = {
        price_amount: amount,
        price_currency: currency,
        pay_currency: cryptoCurrency,
        order_id: orderId,
        ipn_callback_url: CONFIG.webhookUrl
      };
      
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${CONFIG.baseUrl}/v1/payment`, {
        method: 'POST',
        headers: {
          'x-api-key': CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('\n📡 ====== ОТВЕТ API ======');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Response body:', responseText.substring(0, 500));
      
      if (!response.ok) {
        let errorData = { message: responseText };
        try { 
          errorData = JSON.parse(responseText); 
        } catch {}
        
        console.log('\n❌ ====== ОШИБКА ======');
        console.log('Error code:', errorData.code);
        console.log('Error message:', errorData.message);
        console.log('Error status:', errorData.status);
        console.log('========================\n');
        
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      
      console.log('\n✅ ====== УСПЕХ ======');
      console.log('Payment ID:', data.payment_id);
      console.log('Address:', data.pay_address);
      console.log('Amount:', data.pay_amount, data.pay_currency);
      console.log('======================\n');
      
      return {
        success: true,
        invoiceId: data.payment_id,
        payAddress: data.pay_address,
        payAmount: data.pay_amount,
        payCurrency: data.pay_currency,
        orderId: data.order_id,
        purchaseId: data.purchase_id,
        createdAt: data.created_at
      };
    } catch (error) {
      console.log('\n❌ ====== ИСКЛЮЧЕНИЕ ======');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('===========================\n');
      throw error;
    }
  }

  verifyWebhookSignature(payload, signature) {
    console.log('\n🔐 ====== ПРОВЕРКА WEBHOOK ======');
    console.log('Payload:', JSON.stringify(payload, null, 2).substring(0, 200));
    console.log('Signature from header:', signature);
    
    if (!CONFIG.ipnSecret) {
      console.warn('⚠️  IPN Secret not configured');
      return true;
    }
    
    const sortedParams = Object.keys(payload)
      .sort()
      .map(k => `${k}=${payload[k]}`)
      .join('&');

    console.log('Sorted params:', sortedParams.substring(0, 200));
    
    const expectedSignature = crypto
      .createHmac('sha512', CONFIG.ipnSecret)
      .update(sortedParams)
      .digest('hex');

    console.log('Expected signature:', expectedSignature.substring(0, 50) + '...');
    console.log('Received signature:', signature.substring(0, 50) + '...');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    console.log('Signature valid:', isValid ? '✅ Yes' : '❌ No');
    console.log('================================\n');
    
    return isValid;
  }

  async getAvailableCurrencies() {
    try {
      const response = await fetch(`${CONFIG.baseUrl}/v1/currency`, {
        headers: { 'x-api-key': CONFIG.apiKey }
      });
      
      if (!response.ok) {
        console.warn('⚠️  Could not fetch currencies');
        return ['USDT', 'USDC', 'BTC', 'ETH', 'TON', 'LTC'];
      }
      
      const data = await response.json();
      return data.currencies || ['USDT', 'USDC', 'BTC', 'ETH', 'TON', 'LTC'];
    } catch (error) {
      console.error('❌ Get currencies error:', error.message);
      return ['USDT', 'USDC', 'BTC', 'ETH', 'TON', 'LTC'];
    }
  }
}

module.exports = new PaymentService();