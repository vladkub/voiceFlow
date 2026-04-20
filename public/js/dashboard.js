// public/js/dashboard.js
/**
 * 📊 Dashboard Logic - Navigation & Data Loading
 * ✅ Синхронизация user_id с модулем клонирования голосов
 * ✅ Обработка 401 Unauthorized — автоматический редирект на вход
 */

(function() {
  'use strict';

  // 🔥 Универсальная функция для запросов с обработкой 401
  async function fetchWithAuth(url, options = {}) {
    const resp = await fetch(url, { 
      credentials: 'include',
      ...options 
    });
    
    // 🔥 Если 401 — перенаправляем на вход
    if (resp.status === 401) {
      console.log('🔒 401 Unauthorized, redirect на /login.html');
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      throw new Error('Unauthorized');
    }
    
    if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
    return resp;
  }

  // Переключение секций
  function initNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sections = document.querySelectorAll('.content-section');

    sidebarItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Убираем активный класс у всех
        sidebarItems.forEach(i => i.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        // Добавляем активный класс текущему
        item.classList.add('active');
        const sectionId = item.dataset.section + '-section';
        document.getElementById(sectionId).classList.add('active');
        
        console.log('📋 Section switched:', sectionId);
      });
    });
  }

  // Загрузка статистики
  async function loadStats() {
    try {
      const resp = await fetchWithAuth('/api/user/stats');
      const data = await resp.json();
      
      // Обновляем статистику
      document.getElementById('statMinutes').textContent = data.minutesUsed.toFixed(1);
      document.getElementById('statPhrases').textContent = data.phrasesTranslated;
      document.getElementById('statVoices').textContent = data.voicesCount;
      document.getElementById('statAccuracy').textContent = data.accuracy + '%';
      
      // Мини-статистика в сайдбаре
      document.getElementById('sidebarMinutes').textContent = data.minutesUsed.toFixed(1);
      document.getElementById('sidebarPhrases').textContent = data.phrasesTranslated;
      document.getElementById('sidebarVoices').textContent = data.voicesCount;
      document.getElementById('sidebarAccuracy').textContent = data.accuracy + '%';
      
      // Прогресс тарифа
      const subscription = await fetchWithAuth('/api/subscriptions/current');
      const subData = await subscription.json();
      
      if (subData.usage) {
        const percent = subData.usage.usagePercent;
        document.getElementById('usageProgressBar').style.width = percent + '%';
        document.getElementById('usageText').textContent = 
          `${subData.usage.minutesUsed} / ${subData.usage.minutesLimit} минут`;
        document.getElementById('usagePercent').textContent = percent.toFixed(1) + '%';
      }
      
    } catch (err) {
      if (err.message === 'Unauthorized') return; // Уже перенаправили
      console.error('❌ Stats load error:', err);
    }
  }

  // Загрузка профиля
  async function loadProfile() {
    try {
      const resp = await fetchWithAuth('/api/auth/me');
      const data = await resp.json();
      
      document.getElementById('topUsername').textContent = data.username || 'Пользователь';
      document.getElementById('profileEmail').textContent = data.email || '-';
      document.getElementById('profileCreatedAt').textContent = 
        new Date(data.createdAt).toLocaleDateString('ru-RU');
      document.getElementById('profileId').textContent = data.id;
      
      // 🔥 Синхронизация user_id для модуля клонирования голосов
      if (data.id) {
        const realUserId = String(data.id);
        
        // Сохраняем в localStorage для модуля клонирования
        localStorage.setItem('voiceTranslator_userId', realUserId);
        console.log('🔐 Синхронизирован user_id для клонирования:', realUserId);
        
        // 🔥 Обновляем data-атрибут body для надёжности
        document.body.dataset.userId = realUserId;
        
        // 🔥 Если модуль клонирования уже инициализирован — перезагрузим голоса
        if (typeof window.loadClonedVoices === 'function') {
          console.log('🔄 Перезагружаем список клонированных голосов...');
          window.loadClonedVoices();
        }
      }
      
    } catch (err) {
      if (err.message === 'Unauthorized') return; // Уже перенаправили
      console.error('❌ Profile load error:', err);
    }
  }

  // Смена пароля
  const passwordForm = document.getElementById('changePasswordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const messageEl = document.getElementById('passwordMessage');
      
      if (newPassword !== confirmPassword) {
        messageEl.textContent = '❌ Пароли не совпадают';
        messageEl.className = 'form-message error';
        return;
      }
      
      try {
        const resp = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const result = await resp.json();
        
        if (resp.ok) {
          messageEl.textContent = '✅ Пароль успешно изменён!';
          messageEl.className = 'form-message success';
          passwordForm.reset();
        } else {
          messageEl.textContent = '❌ ' + (result.error || 'Ошибка смены пароля');
          messageEl.className = 'form-message error';
        }
      } catch (err) {
        messageEl.textContent = '❌ Ошибка сети: ' + err.message;
        messageEl.className = 'form-message error';
      }
    });
  }

  // Выход
  window.logout = async function() {
    if (!confirm('Вы действительно хотите выйти?')) return;
    
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      // 🔥 Очистить localStorage при выходе
      localStorage.removeItem('voiceTranslator_userId');
      localStorage.removeItem('voiceTranslator_voice');
      localStorage.removeItem('voiceTranslator_useCloned');
      // 🔥 Перенаправить на страницу входа
      window.location.href = '/login.html';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login.html';
    }
  };

  // Покупка тарифа
  window.purchasePlan = async function(planName) {
    if (!confirm(`Вы действительно хотите купить тариф ${planName}?`)) return;
    
    try {
      const resp = await fetchWithAuth('/api/subscriptions/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName })
      });
      
      const result = await resp.json();
      
      if (resp.ok) {
        alert('✅ ' + result.message);
        loadSubscription();
      } else {
        alert('❌ ' + (result.error || 'Ошибка покупки'));
      }
    } catch (err) {
      if (err.message === 'Unauthorized') return; // Уже перенаправили
      alert('❌ Ошибка сети: ' + err.message);
    }
  };

  // Загрузка подписки
  async function loadSubscription() {
    try {
      const resp = await fetchWithAuth('/api/subscriptions/current');
      const data = await resp.json();
      
      document.getElementById('currentPlanName').textContent = data.subscription.displayName;
      document.getElementById('currentPlanBadge').textContent = data.subscription.displayName;
      document.getElementById('currentPlanPrice').textContent = 
        data.subscription.price > 0 ? `$${data.subscription.price}/мес` : 'Бесплатный тариф';
      
      if (data.subscription.expiresAt) {
        document.getElementById('planExpires').textContent = 
          'Действует до: ' + new Date(data.subscription.expiresAt).toLocaleDateString('ru-RU');
      }
      
      document.getElementById('planMinutesUsed').textContent = data.usage.minutesUsed;
      document.getElementById('planMinutesLimit').textContent = data.usage.minutesLimit;
      document.getElementById('planProgressBar').style.width = data.usage.usagePercent + '%';
      
    } catch (err) {
      if (err.message === 'Unauthorized') return; // Уже перенаправили
      console.error('❌ Subscription load error:', err);
    }
  }

  // Загрузка транзакций
  async function loadTransactions() {
    try {
      const resp = await fetchWithAuth('/api/user/transactions');
      const transactions = await resp.json();
      
      const container = document.getElementById('transactionsList');
      if (!container) return;
      
      if (transactions.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2rem;">Нет транзакций</div>';
        return;
      }
      
      container.innerHTML = transactions.map(tx => `
        <div class="transaction-item">
          <div class="transaction-info">
            <span class="transaction-status">${tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}</span>
            <span class="transaction-amount">${tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(2)} ${tx.currency}</span>
            <span class="transaction-date">${new Date(tx.created_at).toLocaleString('ru-RU')}</span>
          </div>
          <div class="transaction-details">
            <span class="transaction-type">${tx.crypto_currency ? tx.crypto_currency : 'Пополнение'}</span>
            <span class="transaction-status-text">${tx.status === 'completed' ? 'Успешно' : tx.status === 'pending' ? 'В обработке' : 'Отменено'}</span>
          </div>
        </div>
      `).join('');
      
    } catch (err) {
      if (err.message === 'Unauthorized') return; // Уже перенаправили
      console.error('❌ Transactions load error:', err);
    }
  }

  // Инициализация
  function init() {
    initNavigation();
    loadStats();
    loadProfile();
    loadSubscription();
    loadTransactions();
    
    // Обновление каждые 30 секунд
    setInterval(loadStats, 30000);
    
    console.log('📊 Dashboard initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();