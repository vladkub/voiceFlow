// public/js/subscription-ui.js
/**
 * 📦 Subscription UI - Dashboard Integration
 */

(function() {
  'use strict';

  let currentPlan = null;
  let selectedPlanForPurchase = null;

  // Загрузка текущей подписки
  async function loadCurrentSubscription() {
    try {
      const resp = await fetch('/api/subscriptions/current', { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load subscription');
      const data = await resp.json();
      
      currentPlan = data.subscription;
      
      // Обновляем отображение
      const planNameEl = document.getElementById('currentPlanName');
      const expiresEl = document.getElementById('subscriptionExpires');
      const minutesUsageEl = document.getElementById('minutesUsage');
      const minutesProgressEl = document.getElementById('minutesProgress');
      
      if (planNameEl) {
        planNameEl.textContent = data.subscription.displayName;
        planNameEl.style.color = getPlanColor(data.subscription.plan);
      }
      
      if (expiresEl) {
        if (data.subscription.expiresAt) {
          const expiresDate = new Date(data.subscription.expiresAt);
          expiresEl.innerHTML = `Действует до: ${expiresDate.toLocaleDateString('ru-RU')}`;
        } else {
          expiresEl.textContent = 'Действует: бессрочно';
        }
      }
      
      // Прогресс минут
      if (minutesUsageEl && minutesProgressEl && data.usage) {
        const used = Math.round(data.usage.minutesUsed);
        const limit = data.usage.minutesLimit;
        const percent = Math.min(100, (used / limit) * 100);
        
        minutesUsageEl.textContent = `${used} / ${limit}`;
        minutesProgressEl.style.width = `${percent}%`;
        
        // Цвет прогресса
        if (percent > 90) minutesProgressEl.style.background = '#ef4444';
        else if (percent > 70) minutesProgressEl.style.background = '#f59e0b';
        else minutesProgressEl.style.background = '#22c55e';
      }
      
    } catch (e) {
      console.error('Subscription load error:', e);
      const planNameEl = document.getElementById('currentPlanName');
      if (planNameEl) planNameEl.textContent = 'Free';
    }
  }

  // Загрузка доступных тарифов
  async function loadAvailablePlans() {
    try {
      const resp = await fetch('/api/subscriptions/plans');
      if (!resp.ok) throw new Error('Failed to load plans');
      const data = await resp.json();
      
      const container = document.getElementById('plansContainer');
      if (!container) return;
      
      container.innerHTML = data.plans.map(plan => `
        <div style="background: #0f172a; border: 2px solid ${plan.color}; border-radius: 16px; padding: 20px; position: relative; ${plan.popular ? 'box-shadow: 0 0 20px rgba(0,201,255,0.3)' : ''}">
          ${plan.popular ? '<div style="position:absolute;top:-10px;right:20px;background:#00C9FF;color:white;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">Популярный</div>' : ''}
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:1.3rem;font-weight:700;color:white;margin-bottom:4px;">${plan.displayName}</div>
            <div style="font-size:1.5rem;font-weight:700;color:${plan.color};">$${plan.price}<span style="font-size:0.9rem;color:#64748B">/мес</span></div>
          </div>
          <ul style="list-style:none;padding:0;margin:0 0 20px 0;font-size:0.85rem;color:#94a3b8;">
            <li style="margin:8px 0;">✅ ${plan.minutesLimit} минут/мес</li>
            <li style="margin:8px 0;">✅ ${plan.voicesLimit} голосов</li>
            ${plan.features.premiumVoices ? '<li style="margin:8px 0;">✅ Премиум голоса</li>' : ''}
            ${plan.features.prioritySupport ? '<li style="margin:8px 0;">✅ Приоритетная поддержка</li>' : ''}
            ${plan.features.apiAccess ? '<li style="margin:8px 0;">✅ API доступ</li>' : ''}
          </ul>
          <button onclick="openPurchaseModal('${plan.name}')" 
                  style="width:100%;background:${plan.color};color:white;padding:10px;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
            Выбрать
          </button>
        </div>
      `).join('');
      
    } catch (e) {
      console.error('Plans load error:', e);
      const container = document.getElementById('plansContainer');
      if (container) {
        container.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px;">Ошибка загрузки тарифов</div>';
      }
    }
  }

  // Открытие модального окна покупки
  window.openPurchaseModal = async function(planName) {
    selectedPlanForPurchase = planName;
    const plan = { free: {name:'Free',price:0}, pro: {name:'Pro',price:19.99}, team: {name:'Team',price:49.99} }[planName];
    
    // Загружаем баланс для отображения
    try {
      const balanceResp = await fetch('/api/user/balance', { credentials: 'include' });
      const balanceData = await balanceResp.json();
      
      document.getElementById('purchasePlanName').textContent = plan.name;
      document.getElementById('purchasePrice').textContent = `$${plan.price}`;
      document.getElementById('purchaseBalance').textContent = `$${balanceData.balance.toFixed(2)}`;
      
      // Блокируем кнопку если недостаточно средств
      const confirmBtn = document.getElementById('confirmPurchaseBtn');
      if (balanceData.balance < plan.price) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.6';
        confirmBtn.textContent = '❌ Недостаточно средств';
      } else {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.textContent = '✅ Подтвердить покупку';
      }
    } catch (e) {
      console.error('Balance load error:', e);
    }
    
    document.getElementById('purchaseModal').style.display = 'flex';
    document.getElementById('purchaseMessage').textContent = '';
  };

  // Закрытие модального окна
  window.closePurchaseModal = function() {
    document.getElementById('purchaseModal').style.display = 'none';
    selectedPlanForPurchase = null;
  };

  // Подтверждение покупки
  window.confirmPurchase = async function() {
    if (!selectedPlanForPurchase) return;
    
    const confirmBtn = document.getElementById('confirmPurchaseBtn');
    const messageEl = document.getElementById('purchaseMessage');
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Обработка...';
    messageEl.textContent = '';
    
    try {
      const resp = await fetch('/api/subscriptions/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planName: selectedPlanForPurchase })
      });
      
      const result = await resp.json();
      
      if (resp.ok) {
        messageEl.textContent = '✅ ' + result.message;
        messageEl.style.color = '#22c55e';
        
        // Обновляем интерфейс
        setTimeout(() => {
          closePurchaseModal();
          loadCurrentSubscription();
          // Обновляем баланс в других блоках
          if (typeof loadBalance === 'function') loadBalance();
        }, 1500);
      } else {
        messageEl.textContent = '❌ ' + (result.error || 'Ошибка покупки');
        messageEl.style.color = '#ef4444';
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Подтвердить покупку';
      }
    } catch (err) {
      console.error('Purchase error:', err);
      messageEl.textContent = '❌ Ошибка сети: ' + err.message;
      messageEl.style.color = '#ef4444';
      confirmBtn.disabled = false;
      confirmBtn.textContent = '✅ Подтвердить покупку';
    }
  };

  // Вспомогательная функция для цвета тарифа
  function getPlanColor(planName) {
    const colors = { free: '#64748B', pro: '#00C9FF', team: '#7B2CBF' };
    return colors[planName] || '#64748B';
  }

  // Инициализация
  function init() {
    loadCurrentSubscription();
    loadAvailablePlans();
    
    // Авто-обновление каждые 30 секунд
    setInterval(loadCurrentSubscription, 30000);
    
    console.log('📦 Subscription UI initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();