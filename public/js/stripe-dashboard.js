// public/js/stripe-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  const stripeForm = document.getElementById('stripeDepositForm');
  
  if (stripeForm) {
    stripeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const amount = parseFloat(document.getElementById('stripeAmount').value);
      const messageEl = document.getElementById('stripeMessage');
      
      if (!amount || amount < 1) {
        messageEl.textContent = '❌ Минимальная сумма: $1';
        messageEl.style.color = '#ef4444';
        messageEl.style.display = 'block';
        return;
      }
      
      // Открываем Stripe форму
      if (typeof openStripePayment === 'function') {
        openStripePayment(amount, 'USD');
      } else {
        messageEl.textContent = '❌ Stripe не загружен';
        messageEl.style.color = '#ef4444';
        messageEl.style.display = 'block';
      }
    });
  }
});