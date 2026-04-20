// scripts/test-nowpayments-api-v2.js
/**
 * 🔑 NowPayments API Tester v2
 * Проверяет подключение и создание платежей
 */

require('dotenv').config();

const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const BASE_URL = SANDBOX 
  ? 'https://api-sandbox.nowpayments.io' 
  : 'https://api.nowpayments.io';

console.log('🔑 NowPayments API Test v2');
console.log('================================\n');
console.log('🌐 Base URL:', BASE_URL);
console.log('🧪 Sandbox mode:', SANDBOX ? '✅ Yes' : '❌ No');
console.log('🔑 API Key loaded:', API_KEY ? '✅ Yes' : '❌ No');
console.log('🔐 IPN Secret loaded:', IPN_SECRET ? '✅ Yes' : '❌ No');

if (API_KEY) {
  console.log('\n📋 API Key info:');
  console.log('   • Starts with:', API_KEY.substring(0, 15) + '...');
  console.log('   • Length:', API_KEY.length);
  console.log('   • Format:', API_KEY.includes('-') ? 'NowPayments format ✅' : 'Unknown format');
}

console.log('\n🔄 Testing API endpoints...\n');

async function testEndpoints() {
  // Тест 1: Статус API
  console.log('📡 Test 1: GET /v1/status');
  try {
    const response = await fetch(`${BASE_URL}/v1/status`);
    console.log('   Status:', response.status, response.statusText);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅', data.message || 'OK');
    }
  } catch (err) {
    console.log('   ❌', err.message);
  }

  // Тест 2: Доступные валюты
  console.log('\n📡 Test 2: GET /v1/currency');
  try {
    const response = await fetch(`${BASE_URL}/v1/currency`);
    console.log('   Status:', response.status, response.statusText);
    if (response.ok) {
      const data = await response.json();
      const currencies = data.currencies || [];
      console.log('   ✅ Available currencies:', currencies.length);
      console.log('   🔝 Top 10:', currencies.slice(0, 10).join(', '));
    } else {
      console.log('   ⚠️ 404 - May not be available in Sandbox');
    }
  } catch (err) {
    console.log('   ❌', err.message);
  }

  // Тест 3: Конвертация
  console.log('\n📡 Test 3: GET /v2/estimate');
  try {
    const response = await fetch(
      `${BASE_URL}/v2/estimate?currency_from=usd&currency_to=usdttrc20&amount=10`,
      { headers: { 'x-api-key': API_KEY } }
    );
    console.log('   Status:', response.status, response.statusText);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ 10 USD ≈', data.estimated_amount, data.currency_to);
    } else {
      console.log('   ⚠️ May require valid API key');
    }
  } catch (err) {
    console.log('   ❌', err.message);
  }

  // Тест 4: Создание платежа
  console.log('\n📡 Test 4: POST /v1/payment');
  if (!API_KEY || API_KEY.length < 30) {
    console.log('   ⏭️  Skipped (API key too short)');
  } else {
    try {
      const response = await fetch(`${BASE_URL}/v1/payment`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: 1,
          price_currency: 'usd',
          pay_currency: 'usdttrc20',
          order_id: `test_${Date.now()}`,
          ipn_callback_url: 'https://example.com/webhook'
        })
      });

      console.log('   Status:', response.status, response.statusText);
      
      const text = await response.text();
      
      if (response.ok) {
        const data = JSON.parse(text);
        console.log('   ✅ Payment created!');
        console.log('   📊 Payment ID:', data.payment_id);
        console.log('   💰 Amount:', data.pay_amount, data.pay_currency);
        console.log('   📍 Address:', data.pay_address);
        console.log('    Created:', data.created_at);
      } else {
        console.log('   ❌ Error:', text.substring(0, 200));
      }
    } catch (err) {
      console.log('   ❌', err.message);
    }
  }

  console.log('\n================================');
  console.log('✅ Testing complete!\n');
}

testEndpoints();