// public/js/auth-check.js
(function() {
  'use strict';

  async function checkAuthAndUpdateNav() {
    try {
      // 🔥 Относительный путь — работает на любом порту
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        method: 'GET'
      });

      const navButtons = document.querySelector('.nav-buttons');
      if (!navButtons) return;

      if (response.ok) {
        const userData = await response.json();
        
        // 🔥 Обновляем кнопку "Войти" → "Личный кабинет"
        navButtons.innerHTML = `
          <a href="/dashboard.html" class="btn btn-outline">
            <i class="fas fa-user"></i> ${userData.username || 'Личный кабинет'}
          </a>
          <button onclick="window.logout && window.logout()" class="btn btn-primary">
            <i class="fas fa-sign-out-alt"></i> Выйти
          </button>
        `;
        
        // 🔥 Обновляем data-user-id для кнопки запуска приложения
        if (userData.id) {
          document.body.dataset.userId = String(userData.id);
          console.log('🔐 User ID установлен:', userData.id);
        }
        
        console.log('🔐 User authenticated:', userData.username);
      } else {
        // ❌ Не авторизован
        navButtons.innerHTML = `
          <button class="btn btn-outline" onclick="openLoginModal()">
            <i class="fas fa-sign-in-alt"></i> Войти
          </button>
          <button class="btn btn-primary" onclick="openRegisterModal()">
            <i class="fas fa-user-plus"></i> Регистрация
          </button>
        `;
        console.log('🔓 User not authenticated');
      }
    } catch (err) {
      console.log('⚠️ Auth check error:', err.message);
    }
  }

  window.refreshAuthNav = checkAuthAndUpdateNav;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthAndUpdateNav);
  } else {
    checkAuthAndUpdateNav();
  }
})();