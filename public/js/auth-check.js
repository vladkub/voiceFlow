// public/js/auth-check.js
(function() {
  'use strict';

  /** Выход: на страницах без auth.js/dashboard.js нет window.logout — используем запасной путь. */
  window.siteNavLogout = async function siteNavLogout() {
    if (typeof window.logout === 'function') {
      return window.logout();
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('dashboard') || path.includes('checkout')) {
      window.location.href = '/?logged_out=1';
      return;
    }
    if (typeof window.refreshAuthNav === 'function') {
      await window.refreshAuthNav();
    } else {
      window.location.reload();
    }
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isHomePage() {
    const p = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    return p === '/' || p.toLowerCase().endsWith('/index.html');
  }

  async function checkAuthAndUpdateNav() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        method: 'GET'
      });

      const navButtons = document.querySelector('.nav-buttons');
      if (!navButtons) return;

      if (response.ok) {
        const userData = await response.json();
        const displayName = escapeHtml(userData.username || '') || 'Кабинет';
        const uid = userData.id != null ? String(userData.id) : '';
        const uiHref = uid
          ? '/ui?user_id=' + encodeURIComponent(uid)
          : '/ui';

        navButtons.innerHTML = `
          <div class="nav-user-menu">
            <button type="button" class="btn btn-outline nav-user-btn" aria-haspopup="true" aria-expanded="false" aria-controls="navUserDropdown" id="navUserMenuBtn">
              <i class="fas fa-user" aria-hidden="true"></i>
              <span>${displayName}</span>
              <i class="fas fa-chevron-down nav-user-chevron" aria-hidden="true"></i>
            </button>
            <div class="nav-user-dropdown" id="navUserDropdown" role="menu" aria-labelledby="navUserMenuBtn">
              <a href="/dashboard.html" class="nav-user-dropdown-item" role="menuitem" data-site-i18n="auth.cabinet">Личный кабинет</a>
              <a href="${uiHref}" target="_blank" rel="noopener noreferrer" class="nav-user-dropdown-item" role="menuitem" data-site-i18n="nav.launch_app">Запустить приложение</a>
              <button type="button" class="nav-user-dropdown-item nav-user-dropdown-item--danger" role="menuitem" data-site-i18n="auth.logout" onclick="window.siteNavLogout()">Выйти</button>
            </div>
          </div>
        `;

        if (userData.id) {
          document.body.dataset.userId = String(userData.id);
        }
        if (typeof window.applySiteLangTo === 'function') {
          window.applySiteLangTo(navButtons);
        }
      } else {
        if (isHomePage()) {
          navButtons.innerHTML = `
            <button type="button" class="btn btn-outline" id="authBtn" onclick="window.openLoginModal && window.openLoginModal()">
              <span data-site-i18n="auth.login">Войти</span>
            </button>
            <button type="button" class="btn btn-primary" id="registerBtn" onclick="window.openRegisterModal && window.openRegisterModal()">
              <span data-site-i18n="auth.register">Регистрация</span>
            </button>
          `;
        } else {
          navButtons.innerHTML = `
            <a href="/dashboard.html" class="btn btn-outline">
              <span data-site-i18n="auth.login">Войти</span>
            </a>
            <a href="/dashboard.html?register=1" class="btn btn-primary">
              <span data-site-i18n="auth.register">Регистрация</span>
            </a>
          `;
        }
      }
    } catch (err) {
      /* ignore */
    }
  }

  window.refreshAuthNav = checkAuthAndUpdateNav;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthAndUpdateNav);
  } else {
    checkAuthAndUpdateNav();
  }
})();
