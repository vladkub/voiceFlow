// public/js/stripe-ui.js
/**
 * 💳 Stripe UI - Frontend Integration
 */

(function() {
  'use strict';

  // Загрузка Stripe.js
  function loadStripeScript() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  let stripe = null;
  let elements = null;
  let cardElement = null;

  // Инициализация Stripe
  async function initStripe() {
    await loadStripeScript();
    
    // Получаем publishable key с сервера
    const response = await fetch('/api/config');
    const config = await response.json();
    
    stripe = Stripe(config.stripePublishableKey);
    elements = stripe.elements();
    
    // Создаём элемент карты
    cardElement = elements.create('card', {
      style: {
        base: {
          color: '#ffffff',
          fontFamily: '"Space Grotesk", sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#64748B'
          }
        },
        invalid: {
          color: '#ef4444',
          iconColor: '#ef4444'
        }
      }
    });
    
    return { stripe, elements, cardElement };
  }

  // Создание платежа
  async function createStripePayment(amount, currency) {
    try {
      const response = await fetch('/api/stripe/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, currency })
      });
      
      return await response.json();
    } catch (err) {
      console.error('Stripe payment error:', err);
      throw err;
    }
  }

  // Подтверждение платежа
  async function confirmPayment(clientSecret, cardHolderName) {
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: cardHolderName
        }
      }
    });
    
    return result;
  }

  // Показать форму оплаты Stripe
  // Показать форму оплаты Stripe
function showStripeModal(paymentData) {
    const modal = document.getElementById('stripePaymentModal');
    if (!modal) return;
    
    // 🔥 Устанавливаем сумму
    document.getElementById('stripeAmount').textContent = 
        `${paymentData.amount} ${paymentData.currency.toUpperCase()}`;
    
    // 🔥 ВАЖНО: Сохраняем clientSecret в скрытое поле!
    const secretInput = document.getElementById('stripe-client-secret');
    if (secretInput) {
        secretInput.value = paymentData.clientSecret;
        console.log('🔑 Client Secret saved:', paymentData.clientSecret.substring(0, 30) + '...');
    } else {
        console.error('❌ Hidden input #stripe-client-secret not found!');
    }
    
    // Монтируем элемент карты
    if (cardElement) {
        cardElement.mount('#stripe-card-element');
    }
    
    modal.style.display = 'flex';
}

  // Скрыть форму
  function hideStripeModal() {
    const modal = document.getElementById('stripePaymentModal');
    if (modal) modal.style.display = 'none';
    if (cardElement) cardElement.unmount();
  }

  // Глобальные функции
  window.openStripePayment = async function(amount, currency) {
    try {
      // Инициализация Stripe
      await initStripe();
      
      // Создание Payment Intent
      const paymentData = await createStripePayment(amount, currency);
      
      if (!paymentData.success) {
        alert('❌ ' + (paymentData.error || 'Ошибка создания платежа'));
        return;
      }
      
      // Показываем форму
      showStripeModal(paymentData);
      
    } catch (err) {
      console.error('Stripe error:', err);
      alert('Ошибка: ' + err.message);
    }
  };

  window.confirmStripePayment = async function() {
    const cardHolderName = document.getElementById('stripe-card-holder').value;
    const submitBtn = document.getElementById('stripe-submit-btn');
    const messageEl = document.getElementById('stripe-message');
    
    if (!cardHolderName.trim()) {
      messageEl.textContent = '❌ Введите имя держателя карты';
      messageEl.style.color = '#ef4444';
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Обработка...';
    messageEl.textContent = '';
    
    try {
      // Получаем clientSecret из модального окна
      const clientSecret = document.getElementById('stripe-client-secret').value;
      
      const result = await confirmPayment(clientSecret, cardHolderName);
      
      if (result.error) {
        messageEl.textContent = '❌ ' + result.error.message;
        messageEl.style.color = '#ef4444';
      } else if (result.paymentIntent.status === 'succeeded') {
        messageEl.textContent = '✅ Оплата успешна!';
        messageEl.style.color = '#22c55e';
        
        setTimeout(() => {
          hideStripeModal();
          window.location.reload(); // Обновить баланс
        }, 2000);
      }
    } catch (err) {
      messageEl.textContent = '❌ Ошибка: ' + err.message;
      messageEl.style.color = '#ef4444';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '💳 Оплатить';
    }
  };

  window.closeStripeModal = function() {
    hideStripeModal();
  };

  console.log('💳 Stripe UI initialized');
})();