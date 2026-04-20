/**
 * 📊 User Activity Tracker & Dashboard Stats
 * Исправлено: CORS, куки, правильные URL
 */
(function() {
  'use strict';

  const CONFIG = {
    translatorApi: 'http://localhost:8000',
    siteApi: 'http://localhost:3000',
    autoSaveInterval: 120000,
    dashboardRefreshInterval: 30000
  };

  const tracker = {
    minutesUsed: 0,
    phrasesTranslated: 0,
    currentSessionStart: null,
    isTracking: false,
    userId: null,
    statsLoaded: false
  };

  // ==================== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ ====================
  async function getCurrentUser() {
    if (tracker.userId) return tracker.userId;
    try {
      console.log('🔄 Запрос пользователя к:', `${CONFIG.siteApi}/api/auth/me`);
      const response = await fetch(`${CONFIG.siteApi}/api/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        mode: 'cors'
      });
      console.log('📡 Ответ от /api/auth/me:', response.status, response.statusText);
      if (response.ok) {
        const user = await response.json();
        tracker.userId = user.id;
        console.log(`✅ Пользователь получен: ${user.name} (ID: ${user.id})`);
        return user.id;
      } else if (response.status === 401) {
        console.warn('⚠️ Не авторизован (401)');
        return null;
      } else {
        const errorText = await response.text().catch(() => 'unknown error');
        console.warn(`⚠️ Ошибка ${response.status}:`, errorText);
        return null;
      }
    } catch (e) {
      console.error('❌ Ошибка получения пользователя:', e.message);
      if (e.message.includes('CORS') || e.message.includes('Failed to fetch')) {
        console.error('🔥 Возможная причина: CORS не настроен на сервере');
      }
    }
    return null;
  }

  // ==================== ТРЕКИНГ ====================
  function startTracking() { tracker.currentSessionStart = Date.now(); tracker.isTracking = true; }
  function stopTracking() {
    if (tracker.currentSessionStart) {
      const duration = (Date.now() - tracker.currentSessionStart) / 1000;
      tracker.minutesUsed += duration / 60;
      tracker.currentSessionStart = null;
      tracker.isTracking = false;
    }
  }
  function trackPhrase() {
    tracker.phrasesTranslated++;
    console.log(`📊 Фраза #${tracker.phrasesTranslated}`);
    if (tracker.phrasesTranslated % 5 === 0) saveStats();
  }

  // ==================== ОТПРАВКА СТАТИСТИКИ ====================
  async function saveStats() {
    if (!tracker.userId) {
      const userId = await getCurrentUser();
      if (!userId) { console.warn('📊 Не авторизован, статистика не сохранена'); return; }
    }
    if (tracker.minutesUsed === 0 && tracker.phrasesTranslated === 0) return;
    const statsToSend = { minutesUsed: Math.round(tracker.minutesUsed * 100) / 100, phrasesTranslated: tracker.phrasesTranslated };
    console.log('📤 Отправка статистики:', statsToSend);
    try {
      const response = await fetch(`${CONFIG.siteApi}/api/user/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(statsToSend)
      });
      console.log('📡 Ответ от /api/user/stats:', response.status, response.statusText);
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Статистика сохранена:', result);
        tracker.minutesUsed = 0;
        tracker.phrasesTranslated = 0;
      } else if (response.status === 401) {
        console.warn('⚠️ Не авторизован (401), сбрасываем userId');
        tracker.userId = null;
      } else {
        const error = await response.json().catch(() => ({}));
        console.warn('❌ Ошибка сохранения:', error.error || response.status);
      }
    } catch (e) {
      console.error('❌ Ошибка сети при сохранении:', e.message);
      if (e.message.includes('CORS') || e.message.includes('Failed to fetch')) {
        console.error('🔥 CORS error! Проверьте server.js и перезапустите сервер');
      }
    }
  }

  // ==================== ЗАГРУЗКА СТАТИСТИКИ ====================
  async function loadStats() {
    if (!tracker.userId) {
      const userId = await getCurrentUser();
      if (!userId) { console.warn('📊 Не авторизован, статистика не загружена'); return null; }
    }
    try {
      console.log('🔄 Загрузка статистики для user #', tracker.userId);
      const response = await fetch(`${CONFIG.siteApi}/api/user/stats`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
        mode: 'cors'
      });
      console.log('📡 Ответ от GET /api/user/stats:', response.status);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Статистика загружена:', data);
      return data;
    } catch (e) {
      console.warn('❌ Ошибка загрузки статистики:', e.message);
      return null;
    }
  }

  // ==================== DASHBOARD ====================
  function updateDashboard(stats) {
    if (!stats) return;
    const elements = {
      minutes: document.getElementById('minutesStat'),
      phrases: document.getElementById('phrasesStat'),
      voices: document.getElementById('voicesStat'),
      accuracy: document.getElementById('accuracyStat'),
      subscription: document.getElementById('subscriptionName'),
      usageBar: document.getElementById('usageBar'),
      usageText: document.getElementById('usageText')
    };
    if (elements.minutes) elements.minutes.textContent = Math.round(stats.minutesUsed * 10) / 10;
    if (elements.phrases) elements.phrases.textContent = stats.phrasesTranslated || 0;
    if (elements.voices) elements.voices.textContent = stats.voicesCount || 5;
    if (elements.accuracy) elements.accuracy.textContent = (stats.accuracy || 0) + '%';
    if (elements.subscription) {
      const names = { free: 'Free', pro: 'Pro', team: 'Team' };
      elements.subscription.textContent = names[stats.subscription] || 'Free';
    }
    if (elements.usageBar && elements.usageText) {
      const limits = { free: 60, pro: 500, team: 9999 };
      const limit = limits[stats.subscription] || 60;
      const percent = Math.min(100, (stats.minutesUsed / limit) * 100);
      elements.usageBar.style.width = percent + '%';
      elements.usageText.textContent = `${stats.minutesUsed} / ${limit} минут`;
      if (percent > 90) elements.usageBar.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)';
      else if (percent > 70) elements.usageBar.style.background = 'linear-gradient(90deg,#f59e0b,#d97706)';
      else elements.usageBar.style.background = 'linear-gradient(90deg,#00C9FF,#7B2CBF)';
    }
  }

  async function refreshDashboard() {
    const btn = document.getElementById('refreshStatsBtn');
    if (btn) { btn.innerHTML = '⏳ Загрузка...'; btn.disabled = true; }
    try {
      if (!tracker.userId) await getCurrentUser();
      const stats = await loadStats();
      updateDashboard(stats);
    } catch (e) { console.error('📊 Dashboard update failed:', e); }
    finally { if (btn) { btn.innerHTML = '🔄 Обновить статистику'; btn.disabled = false; } }
  }

  // ==================== ИНТЕГРАЦИЯ ====================
  function integrateWithTranslator() {
    console.log('📊 Translator integration started');
    setTimeout(() => {
      const originalVoiceSpecificMessage = window.voiceSpecificMessage;
      if (originalVoiceSpecificMessage) {
        window.voiceSpecificMessage = async function(msgId, text) {
          console.log('🎤 Перехват voiceSpecificMessage');
          startTracking();
          try {
            const result = await originalVoiceSpecificMessage.call(this, msgId, text);
            trackPhrase();
            stopTracking();
            return result;
          } catch (e) { stopTracking(); throw e; }
        };
      }
      const originalVoiceNextInQueue = window.voiceNextInQueue;
      if (originalVoiceNextInQueue) {
        window.voiceNextInQueue = async function() {
          console.log('🎤 Перехват voiceNextInQueue');
          startTracking();
          try {
            const result = await originalVoiceNextInQueue.call(this);
            trackPhrase();
            stopTracking();
            return result;
          } catch (e) { stopTracking(); throw e; }
        };
      }
      console.log('🎤 voiceSpecificMessage:', typeof window.voiceSpecificMessage);
      console.log('🎤 voiceNextInQueue:', typeof window.voiceNextInQueue);
    }, 1000);
    setInterval(saveStats, CONFIG.autoSaveInterval);
    window.addEventListener('beforeunload', () => { console.log('📊 Beforeunload: сохранение статистики'); saveStats(); });
  }

  function integrateWithDashboard() {
    console.log('📊 Dashboard integration started');
    setInterval(refreshDashboard, CONFIG.dashboardRefreshInterval);
    window.loadUserStats = refreshDashboard;
    getCurrentUser().then(() => { setTimeout(refreshDashboard, 500); });
  }

  // ==================== INIT ====================
  function init() {
    const isDashboard = window.location.pathname.includes('dashboard');
    const isTranslator = window.location.pathname.includes('/ui') || window.location.port === '8000';
    console.log('📊 User Stats initialized');
    console.log('📊 Is Dashboard:', isDashboard);
    console.log('📊 Is Translator:', isTranslator);
    if (isTranslator) integrateWithTranslator();
    if (isDashboard) integrateWithDashboard();
  }

  window.UserStats = { startTracking, stopTracking, trackPhrase, saveStats, loadStats, refreshDashboard, getCurrentUser, tracker };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();