// public/js/voice-cloning.js
/**
 * 🎙️ Voice Cloning Integration for Dashboard
 * Интеграция с сервисом клонирования на порту 8001
 * ✅ Привязка голосов к пользователю через X-User-ID
 */

(function() {
  'use strict';

  // 🔥 API Base URL (сервис клонирования)
  const API_BASE = 'http://localhost:8001/api/clone';
  
  // 🔥 Получаем user_id из cookie или localStorage
  function getUserId() {
    // Вариант 1: Из cookie (если авторизация через cookie)
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'user_id') return value;
    }
    
    // Вариант 2: Из localStorage (если храните там)
    const stored = localStorage.getItem('user_id');
    if (stored) return stored;
    
    // Вариант 3: Запрос к основному API (раскомментируйте если нужно)
    // return fetch('/api/auth/me', { credentials: 'include' })
    //   .then(r => r.json())
    //   .then(d => d.id);
    
    // Fallback: анонимный пользователь
    return 'anonymous_' + Math.random().toString(36).slice(2, 10);
  }

  const USER_ID = getUserId();
  console.log('🎙️ Voice cloning user_id:', USER_ID);
  
  // Элементы
  let voicesList = null;
  let uploadForm = null;
  let dropZone = null;
  let audioInput = null;
  let uploadStatus = null;
  let testBtn = null;
  let testResult = null;
  let testStatus = null;
  let serviceStatus = null;

  // Инициализация
  function init() {
    console.log('🎙️ Initializing voice cloning module...');
    
    // Элементы
    voicesList = document.getElementById('voicesList');
    uploadForm = document.getElementById('voiceUploadForm');
    dropZone = document.getElementById('voiceDropZone');
    audioInput = document.getElementById('voiceAudioInput');
    uploadStatus = document.getElementById('voiceUploadStatus');
    testBtn = document.getElementById('testVoiceBtn');
    testResult = document.getElementById('testResult');
    testStatus = document.getElementById('testStatus');
    serviceStatus = document.getElementById('voiceServiceStatus');
    
    if (!voicesList || !uploadForm) {
      console.error('❌ Voice cloning elements not found');
      return;
    }
    
    // Проверка доступности сервиса
    checkServiceAvailability();
    
    // Загрузка голосов
    loadVoices();
    
    // Настройка событий
    setupEventListeners();
    
    console.log('✅ Voice cloning module initialized');
  }

  // Проверка доступности сервиса
  async function checkServiceAvailability() {
    try {
      const resp = await fetch(`${API_BASE}/test`, { 
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'X-User-ID': USER_ID  // 🔥 Добавляем заголовок
        }
      });
      
      if (resp.ok) {
        const data = await resp.json();
        if (serviceStatus) {
          serviceStatus.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
              <i class="fas fa-check-circle" style="color: var(--success); font-size: 1.5rem;"></i>
              <div>
                <div style="font-weight: 600; color: var(--success);">✅ Сервис клонирования подключен</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">${data.message || 'Готов к работе'}</div>
              </div>
            </div>
          `;
          serviceStatus.style.background = 'rgba(34, 197, 94, 0.1)';
          serviceStatus.style.borderColor = 'var(--success)';
        }
      } else {
        throw new Error('Service unavailable');
      }
    } catch (err) {
      console.error('❌ Voice cloning service not available:', err);
      if (serviceStatus) {
        serviceStatus.innerHTML = `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 1.5rem;"></i>
            <div>
              <div style="font-weight: 600; color: var(--warning);">⚠️ Сервис клонирования недоступен</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">
                Запустите сервер на порту 8001: <code>python -m backend.run_cloner</code>
              </div>
            </div>
          </div>
        `;
        serviceStatus.style.background = 'rgba(245, 158, 11, 0.1)';
        serviceStatus.style.borderColor = 'var(--warning)';
      }
    }
  }

  // Настройка событий
  function setupEventListeners() {
    // Drag & Drop
    if (dropZone && audioInput) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.style.borderColor = 'var(--accent)';
          dropZone.style.background = 'rgba(0, 201, 255, 0.05)';
        });
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.style.borderColor = 'var(--border)';
          dropZone.style.background = 'transparent';
        });
      });
      
      dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length) {
          audioInput.files = files;
          updateFileName(files[0].name);
        }
      });
      
      dropZone.addEventListener('click', () => audioInput.click());
      
      audioInput.addEventListener('change', e => {
        if (e.target.files[0]) {
          updateFileName(e.target.files[0].name);
        }
      });
    }
    
    // Загрузка файла
    if (uploadForm) {
      uploadForm.addEventListener('submit', async e => {
        e.preventDefault();
        await uploadVoiceSample();
      });
    }
    
    // Тестирование
    const testVoiceSelect = document.getElementById('testVoiceSelect');
    if (testVoiceSelect) {
      testVoiceSelect.addEventListener('change', updateTestButton);
    }
    
    const testSpeed = document.getElementById('testSpeed');
    if (testSpeed) {
      testSpeed.addEventListener('input', e => {
        const val = document.getElementById('speedValue');
        if (val) val.textContent = e.target.value;
      });
    }
    
    if (testBtn) {
      testBtn.addEventListener('click', testClonedVoice);
    }
    
    // Проверка модели
    const checkModelBtn = document.getElementById('checkModelBtn');
    if (checkModelBtn) {
      checkModelBtn.addEventListener('click', checkModelStatus);
    }
  }

  function updateFileName(name) {
    const textEl = document.getElementById('voiceDropText');
    if (textEl) {
      textEl.innerHTML = `<strong style="color: var(--success);">✅ ${escapeHtml(name)}</strong>`;
    }
  }

  function showStatus(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
    element.style.display = 'block';
  }

  function hideStatus(element) {
    if (element) element.style.display = 'none';
  }

  // Обновление индикатора лимита
  function updateVoiceLimitIndicator(current, max) {
    const countEl = document.getElementById('voiceCount');
    const maxEl = document.getElementById('voiceMax');
    const warningEl = document.getElementById('limitWarning');
    const uploadBtn = document.getElementById('voiceUploadBtn');
    const uploadFormEl = document.getElementById('voiceUploadForm');
    
    if (countEl) countEl.textContent = current;
    if (maxEl) maxEl.textContent = max;
    
    if (warningEl && uploadBtn && uploadFormEl) {
      if (current >= max) {
        warningEl.style.display = 'inline';
        uploadBtn.disabled = true;
        uploadFormEl.style.opacity = '0.5';
        uploadFormEl.style.pointerEvents = 'none';
      } else {
        warningEl.style.display = 'none';
        uploadBtn.disabled = false;
        uploadFormEl.style.opacity = '1';
        uploadFormEl.style.pointerEvents = 'auto';
      }
    }
  }

  // Загрузка списка голосов
  async function loadVoices() {
    if (!voicesList) return;
    
    try {
      const resp = await fetch(`${API_BASE}/voices`, {
        headers: { 
          'Accept': 'application/json',
          'X-User-ID': USER_ID  // 🔥 Добавляем заголовок
        }
      });
      
      if (!resp.ok) throw new Error('Failed to load voices');
      
      const data = await resp.json();
      renderVoicesList(data.voices);
      populateTestSelect(data.voices);
      updateVoiceLimitIndicator(data.limit?.current || 0, data.limit?.max || 10);
      
    } catch (err) {
      console.error('❌ Load voices error:', err);
      voicesList.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Ошибка загрузки голосов</p>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${err.message}</p>
        </div>
      `;
    }
  }

  function renderVoicesList(voices) {
    if (!voicesList) return;
    
    if (!voices || !voices.length) {
      voicesList.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          <i class="fas fa-microphone" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>У вас пока нет клонированных голосов</p>
          <p style="font-size: 0.85rem;">Загрузите образец выше, чтобы начать</p>
        </div>
      `;
      return;
    }
    
    voicesList.innerHTML = voices.map(voice => `
      <div class="voice-item" data-id="${voice.id}" 
           style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--dark-bg); border-radius: 8px; border: 1px solid var(--border);">
        <div class="voice-info" style="flex: 1;">
          <div class="voice-name" style="font-weight: 600; margin-bottom: 0.25rem;">
            🎤 ${escapeHtml(voice.name)}
          </div>
          <div class="voice-meta" style="font-size: 0.85rem; color: var(--text-secondary);">
            ${voice.language === 'auto' ? '🔄 Авто' : (voice.language === 'ru' ? '🇷🇺 RU' : '🇬 EN')} • 
            ${voice.sample_duration?.toFixed(1) || '?'} сек • 
            ${new Date(voice.created_at).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <div class="voice-actions" style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm" onclick="window.testVoiceFromList('${voice.id}', '${escapeHtml(voice.name)}')" 
                  style="padding: 0.4rem 0.8rem;">
            🔊 Тест
          </button>
          <button class="btn btn-sm btn-red" onclick="window.deleteVoice('${voice.id}', '${escapeHtml(voice.name)}')" 
                  style="padding: 0.4rem 0.8rem; background: var(--danger);">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  function populateTestSelect(voices) {
    const select = document.getElementById('testVoiceSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Выберите голос --</option>' + 
      (voices || []).map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
    
    updateTestButton();
  }

  function updateTestButton() {
    const voiceId = document.getElementById('testVoiceSelect')?.value;
    if (testBtn) {
      testBtn.disabled = !voiceId;
    }
  }

  // Загрузка образца голоса
  async function uploadVoiceSample() {
    const file = audioInput?.files?.[0];
    const name = document.getElementById('voiceName')?.value.trim();
    const language = document.getElementById('voiceLanguage')?.value;
    
    if (!file) {
      showStatus(uploadStatus, '❌ Выберите аудио-файл', 'error');
      return;
    }
    
    if (!name) {
      showStatus(uploadStatus, '❌ Введите название голоса', 'error');
      return;
    }
    
    const btn = document.getElementById('voiceUploadBtn');
    const originalBtnText = btn?.innerHTML;
    
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span>Обработка...';
      }
      
      hideStatus(uploadStatus);
      
      console.log('📤 Отправка:', { filename: file.name, size: file.size, name, language, user_id: USER_ID });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('language', language || 'auto');
      
      const resp = await fetch(`${API_BASE}/upload-sample`, {
        method: 'POST',
        headers: {
          'X-User-ID': USER_ID  // 🔥 Добавляем заголовок
        },
        body: formData
      });
      
      const result = await resp.json().catch(() => ({ detail: 'Unknown error', message: 'Server error' }));
      
      if (resp.ok) {
        showStatus(uploadStatus, `✅ ${result.message}`, 'success');
        
        if (result.limit) {
          updateVoiceLimitIndicator(result.limit.current, result.limit.max);
        }
        
        // Сброс формы
        if (uploadForm) uploadForm.reset();
        const dropText = document.getElementById('voiceDropText');
        if (dropText) dropText.innerHTML = '<strong>Перетащите аудио-файл сюда</strong>';
        
        // Перезагрузка списка
        await loadVoices();
        
        // Автовыбор нового голоса в тесте
        const testSelect = document.getElementById('testVoiceSelect');
        if (testSelect && result.voice_id) {
          testSelect.value = result.voice_id;
          updateTestButton();
        }
        
      } else {
        const errorMsg = result.detail || result.message || `Ошибка ${resp.status}`;
        console.error('❌ Server error:', result);
        
        if (errorMsg.includes('Достигнут лимит') || errorMsg.includes('limit')) {
          showStatus(uploadStatus, `⚠️ ${errorMsg}`, 'error');
          updateVoiceLimitIndicator(10, 10);
        } else {
          showStatus(uploadStatus, `❌ ${errorMsg}`, 'error');
        }
      }
      
    } catch (err) {
      console.error('❌ Network error:', err);
      showStatus(uploadStatus, `❌ Ошибка сети: ${err.message}`, 'error');
      
    } finally {
      const btn = document.getElementById('voiceUploadBtn');
      if (btn && originalBtnText) {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
      }
    }
  }

  // Тестирование голоса
  async function testClonedVoice() {
    const voiceId = document.getElementById('testVoiceSelect')?.value;
    const text = document.getElementById('testText')?.value.trim();
    const speed = parseFloat(document.getElementById('testSpeed')?.value || 1);
    
    if (!voiceId || !text) {
      showStatus(testStatus, 'Выберите голос и введите текст', 'error');
      return;
    }
    
    const originalBtnText = testBtn?.innerHTML;
    
    try {
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = '<span class="loading"></span>Генерация...';
      }
      
      hideStatus(testStatus);
      if (testResult) testResult.innerHTML = '';
      
      const resp = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'audio/wav',
          'X-User-ID': USER_ID  // 🔥 Добавляем заголовок
        },
        body: JSON.stringify({
          voice_id: voiceId,
          text: text,
          speed: speed
        })
      });
      
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        
        if (testResult) {
          testResult.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1rem; padding: 1rem; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
              <button class="btn btn-sm" onclick="this.nextElementSibling.play(); this.textContent='▶️ Играет';" 
                      style="background: var(--success);">
                ▶️ Воспроизвести
              </button>
              <audio src="${url}" style="flex: 1;" controls autoplay></audio>
              <a href="${url}" download="cloned_${voiceId}.wav" class="btn btn-sm" 
                 style="background: var(--accent);">
                ⬇️ Скачать
              </a>
            </div>
          `;
        }
        
        const duration = resp.headers.get('X-Cloning-Duration');
        showStatus(testStatus, `✅ Сгенерировано (${duration || '?'} сек)`, 'success');
        
      } else {
        const error = await resp.json().catch(() => ({}));
        showStatus(testStatus, `❌ ${error.detail || 'Ошибка генерации'}`, 'error');
      }
      
    } catch (err) {
      showStatus(testStatus, `❌ Ошибка: ${err.message}`, 'error');
      console.error('Test error:', err);
      
    } finally {
      if (testBtn && originalBtnText) {
        testBtn.disabled = false;
        testBtn.innerHTML = originalBtnText;
      }
    }
  }

  // Удаление голоса
  window.deleteVoice = async function(voiceId, voiceName) {
    if (!confirm(`Удалить голос "${voiceName}"?\n\nЭто действие нельзя отменить.`)) return;
    
    try {
      const resp = await fetch(`${API_BASE}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          'X-User-ID': USER_ID  // 🔥 Добавляем заголовок
        }
      });
      
      if (resp.ok) {
        const result = await resp.json();
        alert(`✅ ${result.message}`);
        if (result.limit) {
          updateVoiceLimitIndicator(result.limit.current, result.limit.max);
        }
        await loadVoices();
      } else {
        const error = await resp.json().catch(() => ({}));
        alert(`❌ Ошибка: ${error.detail || 'Не удалось удалить'}`);
      }
      
    } catch (err) {
      alert(`❌ Ошибка сети: ${err.message}`);
    }
  };

  // Тест из списка
  window.testVoiceFromList = function(voiceId, voiceName) {
    const select = document.getElementById('testVoiceSelect');
    const textarea = document.getElementById('testText');
    
    if (select) select.value = voiceId;
    if (textarea) textarea.value = `Привет! Это тест голоса "${voiceName}".`;
    
    updateTestButton();
    
    // Прокрутка к секции теста
    document.querySelector('.voice-test-card')?.scrollIntoView({ behavior: 'smooth' });
    textarea?.focus();
  };

  // Проверка модели
  async function checkModelStatus() {
    const btn = document.getElementById('checkModelBtn');
    const statusEl = document.getElementById('modelStatus');
    
    if (!btn || !statusEl) return;
    
    btn.disabled = true;
    statusEl.style.display = 'block';
    statusEl.className = 'form-message info';
    statusEl.innerHTML = '<span class="loading"></span>Проверка модели...';
    
    try {
      const resp = await fetch(`${API_BASE}/test`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await resp.json();
      
      if (resp.ok) {
        statusEl.className = 'form-message success';
        statusEl.textContent = `✅ ${data.message}`;
      } else {
        statusEl.className = 'form-message error';
        statusEl.textContent = `❌ ${data.detail || 'Модель недоступна'}`;
      }
      
    } catch (err) {
      statusEl.className = 'form-message error';
      statusEl.textContent = `❌ Ошибка подключения: ${err.message}`;
      
    } finally {
      btn.disabled = false;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Авто-инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();