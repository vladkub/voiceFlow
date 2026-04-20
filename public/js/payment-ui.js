/**
 * 💰 Payment UI - Dashboard Integration
 * Фронтенд для управления балансом и платежами
 */

(function() {
  'use strict';

  // Загрузка баланса
  async function loadBalance() {
    try {
      const resp = await fetch('/api/user/balance', { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load balance');
      const data = await resp.json();
      
      const balanceEl = document.getElementById('currentBalance');
      const currencyEl = document.getElementById('balanceCurrency');
      
      if (balanceEl) balanceEl.textContent = `$${data.balance.toFixed(2)}`;
      if (currencyEl) currencyEl.textContent = data.currency;
    } catch (e) {
      console.error('Balance load error:', e);
      const balanceEl = document.getElementById('currentBalance');
      if (balanceEl) balanceEl.textContent = '$0.00';
    }
  }

  // Загрузка истории транзакций
  async function loadTransactions() {
    try {
      const resp = await fetch('/api/user/transactions', { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load transactions');
      const transactions = await resp.json();
      
      const container = document.getElementById('transactionsList');
      if (!container) return;
      
      if (transactions.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748B; padding: 20px;">Нет транзакций</div>';
        return;
      }
      
      container.innerHTML = transactions.map(tx => `
        <div style="background: #0f172a; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600; color: white;">
              ${tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}
              ${tx.crypto_amount ? `${tx.crypto_amount.toFixed(4)} ${tx.crypto_currency}` : `${tx.amount} ${tx.currency}`}
            </div>
            <div style="font-size: 0.85rem; color: #64748B;">
              ${new Date(tx.created_at).toLocaleString()}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; color: ${tx.status === 'completed' ? '#22c55e' : tx.status === 'pending' ? '#f59e0b' : '#ef4444'};">
              ${tx.status === 'completed' ? 'Успешно' : tx.status === 'pending' ? 'В обработке' : 'Отменено'}
            </div>
            <div style="font-size: 0.85rem; color: #64748B;">
              +$${tx.amount.toFixed(2)}
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Transactions load error:', e);
      const container = document.getElementById('transactionsList');
      if (container) {
        container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Ошибка загрузки</div>';
      }
    }
  }

  // Создание платежа
  async function createPayment(amount, cryptoCurrency) {
    try {
      const resp = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, currency: 'USD', cryptoCurrency })
      });
      
      return await resp.json();
    } catch (e) {
      console.error('Payment error:', e);
      throw e;
    }
  }

  // Копирование адреса
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showMessage('📋 Адрес скопирован!', 'success');
    });
  }

  // Показ сообщений
  function showMessage(text, type) {
    const message = document.getElementById('depositMessage');
    if (!message) return;
    message.textContent = text;
    message.style.display = text ? 'block' : 'none';
    message.style.color = type === 'success' ? '#22c55e' : '#ef4444';
  }

  // Инициализация
  function init() {
    const depositForm = document.getElementById('depositForm');
    const paymentModal = document.getElementById('paymentModal');
    
    if (depositForm) {
      depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const cryptoCurrency = document.getElementById('cryptoCurrency').value;
        const btn = document.getElementById('createPaymentBtn');
        
        btn.disabled = true;
        btn.innerHTML = '⏳ Создание...';
        showMessage('', '');
        
        try {
          const result = await createPayment(amount, cryptoCurrency);
          
          if (result.success) {
            // Показываем модальное окно
            document.getElementById('paymentAmount').textContent = `${result.payAmount} ${result.payCurrency}`;
            document.getElementById('paymentAddress').textContent = result.payAddress;
            
            // Кнопка копирования
            const copyBtn = document.querySelector('[onclick="copyPaymentAddress()"]');
            if (copyBtn) {
              copyBtn.onclick = () => copyToClipboard(result.payAddress);
            }
            
            if (paymentModal) paymentModal.style.display = 'flex';
            
            // Авто-обновление баланса
            const checkInterval = setInterval(() => {
              loadBalance();
              loadTransactions();
            }, 10000);
            
            // Закрыть через 5 минут
            setTimeout(() => {
              clearInterval(checkInterval);
              if (paymentModal) paymentModal.style.display = 'none';
              loadBalance();
              loadTransactions();
            }, 300000);
            
          } else {
            showMessage(result.error || 'Ошибка создания платежа', 'error');
          }
        } catch (err) {
          showMessage('Ошибка сети: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '🚀 Создать платёж';
        }
      });
    }
    
    // Глобальные функции
    window.closePaymentModal = function() {
      if (paymentModal) paymentModal.style.display = 'none';
      loadBalance();
      loadTransactions();
    };
    
    window.copyPaymentAddress = function() {
      const address = document.getElementById('paymentAddress').textContent;
      copyToClipboard(address);
    };
    
    // Загрузка при инициализации
    loadBalance();
    loadTransactions();
    
    console.log('💰 Payment UI initialized');
  }

  // Автозапуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();