/**
 * 💬 Voice Translator — Full-Page Chat Interface with Cloned Voices
 * ✅ Всё на одном порту 8000 — относительные пути для API
 * ✅ credentials: 'include' для отправки куки на сервер
 * ✅ URL параметр — только подсказка, сервер всегда проверяет авторизацию
 */

// 🔥 Пустая строка = текущий домен/порт (работает на :8000)
const CONFIG = { apiBaseUrl: '', pollInterval: 800 };

// 🔥 IIFE wrapper — ВСЁ должно быть внутри!
(function() {
  'use strict';
  
  // 🔥 Функция для получения user_id
  // 🔐 ПРИОРИТЕТ: 
  //   1. URL параметр — для инициализации на localhost
  //   2. localStorage — если уже есть подтверждённый реальный ID
  //   3. API — сервер вернёт ТОЛЬКО если кука совпадает
  //   4. anonymous — fallback если ничего не найдено
  async function getUserId() {
    // 🔥 1. URL параметр — для инициализации
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('user_id');
    if (userIdFromUrl && !userIdFromUrl.startsWith('anonymous_')) {
      localStorage.setItem('voiceTranslator_userId', userIdFromUrl);
      console.log('🔐 Получен user_id из URL:', userIdFromUrl);
      return userIdFromUrl;
    }
    
    // 🔥 2. Проверяем localStorage
    let stored = localStorage.getItem('voiceTranslator_userId');
    if (stored && !stored.startsWith('anonymous_')) {
      console.log('🔐 Используем сохранённый user_id:', stored);
      return stored;
    }
    
    // 🔥 3. Пытаемся получить из API с куками
    try {
      const resp = await fetch(`${CONFIG.apiBaseUrl}/api/auth/current-user`, {
        credentials: 'include'
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.id && data.id !== 'anonymous') {
          localStorage.setItem('voiceTranslator_userId', data.id);
          console.log('🔐 Получен user_id из API:', data.id);
          return data.id;
        }
      }
    } catch (err) {
      console.log('⚠️ Не удалось получить user_id из API:', err.message);
    }
    
    // 🔥 4. Fallback на anonymous
    const newId = 'anonymous_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('voiceTranslator_userId', newId);
    console.log('🔐 Создан anonymous user_id:', newId);
    return newId;
  }
  
  // 🔥 ВАЖНО: Инициализация state — userId будет обновлён в init()
  const state = { 
    isRunning: false, conferenceMode: false, unmuteMode: false, 
    aiEnabled: false, aiTopic: '', isProcessing: false, 
    pollTimer: null, chatPollTimer: null, selectedType: 'statement',
    selectedVoice: localStorage.getItem('voiceTranslator_voice') || 'en-US-JennyNeural',
    useClonedVoice: localStorage.getItem('voiceTranslator_useCloned') === 'true',
    clonedVoices: [],
    standardVoices: [],
    userId: 'anonymous'  // ← Временное значение, обновится в init()
  };
  const $ = id => document.getElementById(id);
  const elements = {};
  let typeModal = null, currentTypeMsgId = null, currentSuggestions = [], syncTargetInput = null;
  const msgElements = {};

  function initDOM() {
    elements.startBtn = $('startBtn');
    elements.stopBtn = $('stopBtn');
    elements.testBtn = $('testBtn');
    elements.conferenceToggle = $('conferenceToggle');
    elements.aiToggle = $('aiToggle');
    elements.aiTopicInput = $('aiTopicInput');
    elements.statusDiv = $('status');
    elements.logDiv = $('logDiv');
    elements.userMessages = $('user-messages');
    elements.partnerMessages = $('partner-messages');
    elements.chatContainer = null;
  }

  function log(msg, type = 'system') {
    if (!elements.logDiv) return console.log(`[${type}] ${msg}`);
    const entry = document.createElement('div'); entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    elements.logDiv.appendChild(entry); elements.logDiv.scrollTop = elements.logDiv.scrollHeight;
  }

  function updateStatus() {
    if (!elements.statusDiv) return;
    elements.statusDiv.textContent = state.isRunning ? t('statusRunning') : t('statusStopped');
    elements.statusDiv.className = `status ${state.isRunning ? 'running' : 'stopped'}`;
  }

  // 🔥 Обновлённая функция apiRequest с передачей user_id и куки
  async function apiRequest(endpoint, options = {}) {
    // 🔥 Относительный путь (работает на любом порту)
    const url = `${CONFIG.apiBaseUrl}${endpoint}`;
    
    // 🔥 Добавляем заголовок X-User-ID
    const headers = {
      'Content-Type': 'application/json',
      'X-User-ID': state.userId,
      ...options.headers
    };
    
    // 🔥 credentials: 'include' для отправки куки!
    const resp = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'include'
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    return await resp.json();
  }

  async function sendControl(action) {
    try {
      log(t('logInit').replace('🚀 ', '') + ` ${action}...`, 'system');
      await apiRequest('/api/control', { method: 'POST', body: JSON.stringify({ action }) });
      pollStatus();
    } catch (e) { log(t('logError') + e.message, 'error'); }
  }

  async function startListening() { await sendControl('start'); }
  async function stopListening() { await sendControl('stop'); hideTypeModal(); }

  async function testAudio() {
    log(t('logTest'), 'system');
    try {
      const endpoint = state.selectedVoice?.startsWith('cloned:') ? '/api/tts-cloned' : '/api/tts';
      await apiRequest(endpoint, { 
        method: 'POST', 
        body: JSON.stringify({ text: 'Test', voice: state.selectedVoice, play_locally: true }) 
      });
    } catch (e) { log(t('logError') + e.message, 'error'); }
  }

  // 🔥 Функция для обновления селектора голосов
  function updateVoiceSelect(select) {
    if (!select) return;
    
    select.innerHTML = '';
    
    if (state.useClonedVoice && state.clonedVoices.length > 0) {
      // 🔥 Показываем ТОЛЬКО клонированные голоса
      const optGroup = document.createElement('optgroup');
      optGroup.label = `🎤 Мои клонированные голоса (${state.clonedVoices.length})`;
      
      state.clonedVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = `cloned:${v.id}`;
        opt.textContent = `🎤 ${v.name}`;
        opt.dataset.cloned = 'true';
        if (`cloned:${v.id}` === state.selectedVoice) opt.selected = true;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
      
      // Если выбранный голос не найден — выбираем первый
      if (!select.value && state.clonedVoices.length > 0) {
        select.value = `cloned:${state.clonedVoices[0].id}`;
        state.selectedVoice = select.value;
        localStorage.setItem('voiceTranslator_voice', state.selectedVoice);
      }
      
    } else {
      // 🔥 Показываем ВСЕ стандартные голоса
      const optGroup = document.createElement('optgroup');
      optGroup.label = `🔊 Стандартные голоса (${state.standardVoices.length})`;
      
      // Используем ВСЕ загруженные стандартные голоса
      const voicesToUse = state.standardVoices.length > 0 
        ? state.standardVoices 
        : [
            'en-US-JennyNeural',
            'en-US-GuyNeural', 
            'en-US-AriaNeural',
            'ru-RU-SvetlanaNeural',
            'ru-RU-DmitryNeural'
          ];
      
      voicesToUse.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        opt.dataset.cloned = 'false';
        if (v === state.selectedVoice) opt.selected = true;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
      
      // Если выбранный голос не найден — выбираем первый
      if (!select.value && voicesToUse.length > 0) {
        select.value = voicesToUse[0];
        state.selectedVoice = select.value;
        localStorage.setItem('voiceTranslator_voice', state.selectedVoice);
      }
    }
  }

  // 🔥 Загрузка голосов с передачей user_id
  async function loadVoices() {
    try {
      const data = await apiRequest('/api/voices');
      const select = document.getElementById('voiceSelect');
      const useClonedCheckbox = document.getElementById('useClonedVoice');
      
      // 🔥 Сохраняем ВСЕ данные о голосах
      state.clonedVoices = data.cloned_voices || [];
      state.standardVoices = data.voices || [];
      
      // 🔥 Устанавливаем состояние галочки
      if (useClonedCheckbox) {
        useClonedCheckbox.checked = state.useClonedVoice;
      }
      
      // 🔥 Обновляем список голосов
      updateVoiceSelect(select);
      
      // 🔥 Логируем для отладки
      console.log('📊 Загружено голосов:', {
        стандартные: state.standardVoices.length,
        клонированные: state.clonedVoices.length,
        user_id: state.userId,
        данные: data
      });
      
    } catch (e) { 
      console.error('Load voices error:', e); 
    }
  }

  async function previewVoice() {
    const select = document.getElementById('voiceSelect');
    const btn = document.getElementById('previewVoiceBtn');
    if (!select || !btn) return;
    
    const voice = select.value?.trim();
    if (!voice) return;
    
    const originalText = btn.textContent;
    btn.textContent = '⏳...'; 
    btn.disabled = true;
    
    try {
      // 🔥 Определяем эндпоинт
      const endpoint = voice.startsWith('cloned:') 
        ? '/api/preview-cloned-voice' 
        : '/api/preview-voice';
      
      // 🔥 Получаем user_id из НЕСКОЛЬКИХ источников
      const userId = state.userId || 
                     document.body.dataset.userId || 
                     new URLSearchParams(window.location.search).get('user_id') ||
                     localStorage.getItem('voiceTranslator_userId') ||
                     'anonymous';
      
      console.log('🔊 Preview voice:', voice, 'user_id:', userId);
      
      const resp = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        credentials: 'include',  // 🔥 Куки тоже отправляем!
        body: JSON.stringify({ voice })
      });
      
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play();
        log(t('logPlaying') + voice, 'success');
      } else { 
        const errorText = await resp.text();
        console.error('❌ Preview error:', resp.status, errorText);
        alert('Ошибка предпрослушивания: ' + resp.status); 
      }
    } catch (e) { 
      console.error('❌ Preview exception:', e);
      alert(`Ошибка: ${e.message}`); 
    } finally { 
      btn.textContent = '🔊'; 
      btn.disabled = false; 
    }
  }

  async function toggleAI(enabled) {
    state.aiEnabled = enabled;
    await apiRequest('/api/ai-config', { method: 'POST', body: JSON.stringify({ enabled, topic: state.aiTopic }) });
    toggleAiTopicInput(enabled);
  }

  function toggleAiTopicInput(enabled, shouldFocus = true) {
    const wrapper = document.getElementById('ai-topic-wrapper');
    const input = document.getElementById('aiTopicInput');
    if (!wrapper) return;
    if (enabled) {
      wrapper.style.display = 'flex';
      setTimeout(() => { wrapper.style.width = '300px'; wrapper.style.opacity = '1'; }, 10);
      if (shouldFocus && input) input.focus();
    } else {
      wrapper.style.width = '0'; wrapper.style.opacity = '0';
      setTimeout(() => { wrapper.style.display = 'none'; }, 300);
    }
  }

  function showChatModal() {
      loadVoices();
      startChatPolling();
      log(t('logChatOpen'), 'system');
  }

  function hideChatModal() {
      stopChatPolling();
      hideTypeModal();
  }

  async function toggleConferenceMode(enabled) {
    try {
      log(enabled ? t('logConferenceOn') : t('logConferenceOff'), 'system');
      await apiRequest('/api/conference-mode', { method: 'POST', body: JSON.stringify({ enabled }) });
      state.conferenceMode = enabled;
    } catch (e) { 
      log(t('logError') + e.message, 'error');
      if (elements.conferenceToggle) {
        elements.conferenceToggle.checked = !enabled;
      }
    }
  }

  function handleChatClick(e) {
    const deleteBtn = e.target.closest('.msg-delete');
    if (deleteBtn) { e.stopPropagation(); const bubble = deleteBtn.closest('.msg-bubble'); if (bubble) handleDelete(parseInt(bubble.dataset.msgId)); }
  }

  document.addEventListener('keydown', function(e) {
    if (state.isProcessing) return;
    
    const activeTag = document.activeElement?.tagName;
    const activeType = document.activeElement?.type;
    const isTextInput = (activeTag === 'INPUT' && activeType === 'text') || activeTag === 'TEXTAREA';

    if (isTextInput) {
        if (e.key === 'Enter') {
             const input = document.activeElement?.closest('.msg-input');
             if (input) {
                 e.preventDefault(); 
                 e.stopPropagation();
                 const bubble = input.closest('.msg-bubble');
                 voiceSpecificMessage(parseInt(bubble.dataset.msgId), input.value);
             }
        }
        return;
    }
    
    if (typeModal) {
        handleTypeModalKeydown(e);
        return; 
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      openTypeModal();
      return false;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      voiceNextInQueue();
      return false;
    }
  }, true);

  function openTypeModal() {
    if (typeModal) return;
    const bubble = findNextUnvoicedInDOM();
    if (!bubble) { log(t('modalNoMessages'), 'system'); return; }
    currentTypeMsgId = parseInt(bubble.dataset.msgId);
    const originalText = bubble.querySelector('input')?.value || '';
    state.selectedType = 'statement';
    syncTargetInput = bubble.querySelector('input.msg-input');
    
    typeModal = document.createElement('div');
    typeModal.id = 'type-modal';
    typeModal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:600px;background:#1e293b;border:2px solid #475569;border-radius:16px;padding:1.5rem;z-index:9999;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:1rem;';
    typeModal.innerHTML = `
      <button id="close-type-modal-btn" style="position:absolute;top:1rem;right:1rem;background:transparent;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">✖</button>
      <h2 style="margin:0;font-size:1.3rem;color:white;">${t('modalTitle')}</h2>
      <input id="type-input" type="text" value="${originalText.replace(/"/g, '&quot;')}" style="width:100%;padding:0.8rem;font-size:1.1rem;background:#0f172a;border:1px solid #334155;border-radius:8px;color:white;outline:none;" />
      <div id="suggestions-container" style="display:flex;flex-direction:column;gap:0.5rem;min-height:20px;"></div>
      <div style="display:flex;gap:0.8rem;margin:0.5rem 0;">
        <button id="btn-type-q" style="flex:1;padding:0.8rem;font-size:1rem;border:2px solid #334155;border-radius:8px;background:#0f172a;color:white;cursor:pointer;">${t('modalQuestion')}</button>
        <button id="btn-type-s" style="flex:1;padding:0.8rem;font-size:1rem;border:2px solid #334155;border-radius:8px;background:#0f172a;color:white;cursor:pointer;">${t('modalStatement')}</button>
      </div>
      <p style="margin:0;font-size:0.85rem;color:#94a3b8;text-align:center;">${t('modalHint')}</p>`;
    document.body.appendChild(typeModal);
    typeModal.focus();
    const closeBtn = typeModal.querySelector('#close-type-modal-btn');
    if (closeBtn) { closeBtn.onclick = hideTypeModal; closeBtn.onmouseover = () => closeBtn.style.color = '#fff'; closeBtn.onmouseout = () => closeBtn.style.color = '#94a3b8'; }
    const inputEl = typeModal.querySelector('#type-input');
    inputEl.focus(); inputEl.select();
    inputEl.addEventListener('input', (e) => { if (syncTargetInput) syncTargetInput.value = e.target.value; });
    typeModal.querySelector('#btn-type-q').onclick = () => { applyTypeToInput('question'); hideTypeModalAndVoice(); };
    typeModal.querySelector('#btn-type-s').onclick = () => { applyTypeToInput('statement'); hideTypeModalAndVoice(); };
    typeModal.addEventListener('keydown', handleTypeModalKeydown);
    if (state.aiEnabled) { loadSuggestions(currentTypeMsgId, originalText); } else { typeModal.querySelector('#suggestions-container').innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('modalEnableAI')}</div>`; }
  }

  async function loadSuggestions(msgId, text) {
    const container = typeModal?.querySelector('#suggestions-container');
    if (!container) return;
    container.innerHTML = `<div style="color:#64748b;text-align:center;">${t('modalLoading')}</div>`;
    try {
      const resp = await apiRequest('/api/suggestions', { method: 'POST', body: JSON.stringify({ text, msg_id: msgId, msg_type: state.aiTopic }) });
      if (resp.suggestions?.length) { currentSuggestions = resp.suggestions; renderSuggestions(container, currentSuggestions); } 
      else { container.innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('modalNoSuggestions')}</div>`; }
    } catch (err) { container.innerHTML = `<div style="color:#ef4444;text-align:center;">${t('modalError')}</div>`; }
  }

  function renderSuggestions(container, suggestions) {
    container.innerHTML = '';
    suggestions.forEach((text, index) => {
      const keyNum = index + 3;
      const div = document.createElement('div');
      div.style.cssText = `display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:6px;cursor:pointer;`;
      div.innerHTML = `<span style="background:#334155;color:#94a3b8;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:bold;">${keyNum}</span><span style="color:#e2e8f0;font-size:0.95rem;">${text}</span>`;
      div.onclick = () => { selectSuggestion(text, div); };
      container.appendChild(div);
    });
  }

  function selectSuggestion(text, element) {
    const input = typeModal?.querySelector('#type-input');
    if (input) { input.value = text; if (syncTargetInput) syncTargetInput.value = text; element.style.background = '#1e3a8a'; element.style.borderColor = '#3b82f6'; setTimeout(() => { element.style.background = '#0f172a'; element.style.borderColor = '#334155'; }, 500); input.focus(); }
  }

  function hideTypeModalAndVoice() { const text = typeModal?.querySelector('#type-input').value; hideTypeModal(); voiceSpecificMessage(currentTypeMsgId, text); }
  function applyTypeToInput(type) { const input = document.getElementById('type-input'); if (!input) return; let val = input.value.trimEnd().replace(/[.!?]+$/, ''); input.value = val + (type === 'question' ? '?' : '.'); if (syncTargetInput) syncTargetInput.value = input.value; input.focus(); }
  function hideTypeModal() { if (typeModal) { typeModal.removeEventListener('keydown', handleTypeModalKeydown); typeModal.remove(); typeModal = null; currentSuggestions = []; currentTypeMsgId = null; syncTargetInput = null; } }
  function handleTypeModalKeydown(e) { if (e.key === 'Escape') { hideTypeModal(); return; } if (e.key === '1') { e.preventDefault(); applyTypeToInput('question'); return; } if (e.key === '2') { e.preventDefault(); applyTypeToInput('statement'); return; } const keyNum = parseInt(e.key); if (keyNum >= 3 && keyNum <= 7) { e.preventDefault(); const idx = keyNum - 3; if (currentSuggestions[idx]) { const container = typeModal?.querySelector('#suggestions-container'); selectSuggestion(currentSuggestions[idx], container?.children[idx]); } return; } if (e.key === 'Enter' && !state.isProcessing) { e.preventDefault(); const text = typeModal?.querySelector('#type-input')?.value; hideTypeModal(); if (text) voiceSpecificMessage(currentTypeMsgId, text); } }
  function findNextUnvoicedInDOM() { if (!elements.userMessages || !elements.partnerMessages) return null; const allBubbles = [...elements.userMessages.querySelectorAll('.msg-bubble'), ...elements.partnerMessages.querySelectorAll('.msg-bubble')]; for (let b of allBubbles) { if (b.querySelector('.msg-status')?.textContent.includes(t('msgStatusWaiting').split(' ')[1])) return b; } return null; }

  async function voiceSpecificMessage(msgId, text) { 
    if (!text?.trim() || state.isProcessing) return; 
    state.isProcessing = true; 
    updateMsgStatus(msgId, t('msgStatusVoicing'), '#facc15'); 
    
    try { 
      // 🔥 Определяем эндпоинт для клонированных голосов
      const endpoint = state.selectedVoice?.startsWith('cloned:') 
        ? '/api/tts-cloned' 
        : '/api/voice';
      
      const res = await apiRequest(endpoint, { 
        method: 'POST', 
        body: JSON.stringify({ 
          msg_id: msgId, 
          text, 
          voice: state.selectedVoice 
        }) 
      }); 
      
      if (res.status === 'played') { 
        updateMessageFromHistory(res); 
        log(t('logVoiced') + msgId, 'success'); 
      } 
    } catch (err) { 
      log(t('logError') + err.message, 'error'); 
    } finally { 
      state.isProcessing = false; 
    } 
  }

  async function voiceNextInQueue() { 
    if (state.isProcessing) return; 
    state.isProcessing = true; 
    
    try { 
      // 🔥 Определяем эндпоинт для клонированных голосов
      const endpoint = state.selectedVoice?.startsWith('cloned:') 
        ? '/api/tts-cloned' 
        : '/api/voice';
      
      const res = await apiRequest(endpoint, { 
        method: 'POST', 
        body: JSON.stringify({ voice: state.selectedVoice }) 
      }); 
      
      if (res.status === 'played') log(t('logNext'), 'success'); 
      else if (res.status === 'no_unvoiced_messages') log(t('logNoPhrases'), 'system'); 
    } catch (e) { 
      log(t('logError') + e.message, 'error'); 
    } finally { 
      state.isProcessing = false; 
    } 
  }

  async function handleDelete(msgId) { if (state.isProcessing) return; try { await apiRequest('/api/delete_message', { method: 'POST', body: JSON.stringify({ msg_id: msgId }) }); log(t('logDeleted') + msgId, 'system'); } catch (e) { log(t('logError') + e.message, 'error'); } }
  function updateMsgStatus(msgId, text, color) { const el = msgElements[msgId]; if (el) { const st = el.querySelector('.msg-status'); if (st) { st.textContent = text; st.style.color = color; } } }
  function updateMessageFromHistory(res) { const el = msgElements[res.msg_id]; if (!el) return; const input = el.querySelector('.msg-input'); const statusEl = el.querySelector('.msg-status'); const delBtn = el.querySelector('.msg-delete'); if (input) { const s = document.createElement('span'); s.style.color = 'white'; s.textContent = input.value; input.replaceWith(s); } if (delBtn) delBtn.remove(); if (statusEl) { statusEl.textContent = t('msgStatusDone'); statusEl.style.color = '#22c55e'; } }
  function scrollToTop(column) { if (column) column.scrollTo({ top: 0, behavior: 'smooth' }); }

  function renderChat(messages) { 
    if (!elements.userMessages || !elements.partnerMessages) return; 
    if (typeModal) return; 
    const currentIds = new Set(Object.keys(msgElements)); 
    const incomingIds = new Set(messages.map(m => String(m.id))); 
    currentIds.forEach(id => { if (!incomingIds.has(id)) { msgElements[id]?.remove(); delete msgElements[id]; } }); 
    let newUser = false, newPartner = false; 
    for (let i = messages.length - 1; i >= 0; i--) { 
      const msg = messages[i]; 
      const idStr = String(msg.id); 
      let el = msgElements[idStr]; 
      if (!el) { 
        el = createMessageElement(msg); 
        msgElements[idStr] = el; 
        const col = msg.speaker === 'user' ? elements.userMessages : elements.partnerMessages; 
        col.prepend(el); 
        if (msg.speaker === 'user') newUser = true; else newPartner = true; 
      } else { 
        updateMessageStatus(el, msg.status); 
      } 
    } 
    if (newUser && elements.userMessages.scrollTop < 100) scrollToTop(elements.userMessages); 
    if (newPartner && elements.partnerMessages.scrollTop < 100) scrollToTop(elements.partnerMessages); 
  }

  function createMessageElement(msg) { 
    const isUser = msg.speaker === 'user'; 
    const color = isUser ? '#3b82f6' : '#22c55e'; 
    const isEditable = msg.status === 'recognized' && isUser; 
    const div = document.createElement('div'); 
    div.className = 'msg-bubble'; 
    if (isUser) div.classList.add('user'); else div.classList.add('partner'); 
    div.dataset.msgId = msg.id; 
    div.style.cssText = `display:flex;flex-direction:column;gap:0.3rem;`; 
    div.innerHTML = `<div class="msg-content" style="max-width:90%;background:${color};padding:0.8rem 1rem;border-radius:16px;display:flex;flex-direction:column;gap:0.4rem;${isEditable ? 'border:2px solid #facc15;' : ''}"><div style="display:flex;align-items:center;gap:0.5rem;${isUser ? '' : 'flex-direction:row-reverse'};">${isEditable ? `<input class="msg-input" type="text" value="${msg.original.replace(/"/g, '&quot;')}" style="flex:1;background:transparent;border:none;color:white;font-size:1rem;outline:none;text-align:${isUser ? 'left' : 'right'};" />` : `<span class="msg-text" style="color:white;font-size:1rem;text-align:${isUser ? 'left' : 'right'};">${msg.original}</span>`}${isEditable ? `<button class="msg-delete" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:1.2rem;">×</button>` : ''}</div></div><div class="msg-meta" style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#94a3b8;${isUser ? '' : 'flex-direction:row-reverse'}"><span class="msg-status" style="font-weight:500;color:#eab308;">${t('msgStatusWaiting')}</span><span>${new Date(msg.timestamp * 1000).toLocaleTimeString()}</span></div>`; 
    return div; 
  }

  function updateMessageStatus(el, status) { const stEl = el.querySelector('.msg-status'); if (!stEl) return; const map = { recognized: {t: t('msgStatusWaiting'), c:'#eab308'}, playing: {t: t('msgStatusVoicing'), c:'#3b82f6'}, done: {t: t('msgStatusDone'), c:'#22c55e'} }; const s = map[status] || map.recognized; if (stEl.textContent !== s.t) stEl.textContent = s.t; stEl.style.color = s.c; }
  function startChatPolling() { if (state.chatPollTimer) return; fetchChat(); state.chatPollTimer = setInterval(fetchChat, CONFIG.pollInterval); }
  function stopChatPolling() { if (state.chatPollTimer) { clearInterval(state.chatPollTimer); state.chatPollTimer = null; } }
  async function fetchChat() { try { const resp = await fetch(`${CONFIG.apiBaseUrl}/api/chat`); if (!resp.ok) return; renderChat((await resp.json()).messages || []); } catch (e) { console.warn(e); } }

  async function pollStatus() { 
    try { 
      const resp = await fetch(`${CONFIG.apiBaseUrl}/api/status`); 
      if (resp.ok) { 
        const d = await resp.json(); 
        state.isRunning = d.running; 
        state.conferenceMode = d.conference_mode; 
        state.unmuteMode = d.unmute_mode || false; 
        state.aiEnabled = d.ai_enabled || false; 
        state.aiTopic = d.ai_topic || ''; 
        updateStatus(); 
        if (elements.conferenceToggle) elements.conferenceToggle.checked = state.conferenceMode;
        if (elements.aiToggle) elements.aiToggle.checked = state.aiEnabled; 
        if (elements.aiTopicInput) { 
          elements.aiTopicInput.value = state.aiTopic; 
          toggleAiTopicInput(state.aiEnabled, false); 
        } 
      } 
    } catch (e) { console.warn(e); } 
  }

  function setupEventListeners() { 
    if (elements.startBtn) elements.startBtn.onclick = startListening; 
    if (elements.stopBtn) elements.stopBtn.onclick = stopListening; 
    if (elements.testBtn) elements.testBtn.onclick = testAudio; 
    if (elements.conferenceToggle) elements.conferenceToggle.onchange = (e) => toggleConferenceMode(e.target.checked);
    if (elements.aiToggle) elements.aiToggle.onchange = (e) => toggleAI(e.target.checked);
    
    // 🔥 Обработчик галочки "Использовать клонированный голос"
    const useClonedCheckbox = document.getElementById('useClonedVoice');
    if (useClonedCheckbox) {
      useClonedCheckbox.onchange = (e) => {
        state.useClonedVoice = e.target.checked;
        localStorage.setItem('voiceTranslator_useCloned', state.useClonedVoice);
        
        // Обновляем селектор голосов
        const select = document.getElementById('voiceSelect');
        if (select) {
          updateVoiceSelect(select);
        }
        
        log(state.useClonedVoice ? '🎙️ Используется клонированный голос' : '🔊 Используется стандартный голос', 'system');
      };
    }
    
    const voiceSelect = document.getElementById('voiceSelect');
    if (voiceSelect) { 
      voiceSelect.onchange = (e) => { 
        state.selectedVoice = e.target.value; 
        localStorage.setItem('voiceTranslator_voice', state.selectedVoice); 
      }; 
    }
    
    const previewBtn = document.getElementById('previewVoiceBtn');
    if (previewBtn) previewBtn.onclick = previewVoice;
    
    const resetBtn = document.getElementById('reset-state');
    if (resetBtn) resetBtn.onclick = () => { apiRequest('/api/reset-state', {method:'POST'}).then(()=>log(t('logReset'),'system')); };
  }

  async function init() { 
    initDOM(); 
    setupEventListeners(); 
    log(t('logInit'), 'system'); 
    
    // 🔥 Синхронизируем user_id ПЕРЕД инициализацией
    state.userId = await getUserId();
    console.log('🔐 Инициализирован user_id:', state.userId);
    
    let r = 0; 
    while (r < 5) { 
      try { 
        if ((await fetch(`${CONFIG.apiBaseUrl}/api/health`, {timeout:2000})).ok) { 
          log(t('logConnected'), 'success'); 
          break; 
        } 
      } catch {} 
      r++; 
      log(`⏳ ${r}/5...`, 'system'); 
      await new Promise(res=>setTimeout(res,1000)); 
    } 
    
    showChatModal();
    await loadVoices();  // 🔥 Загружаем голоса (включая клонированные)
    applyTranslations();
    
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = currentLang;
    
    pollStatus(); 
    setInterval(pollStatus, 1000); 
    log(t('logReady'), 'success'); 
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('beforeunload', () => { stopChatPolling(); });
  
})();  // ← Закрывающая скобка IIFE