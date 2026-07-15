/**
 * 💬 TalkPilot — Full-Page Chat Interface with Cloned Voices
 * ✅ ✅ ИСПРАВЛЕНО: Подсказки через AITunnel API (отдельная переменная ключа)
 */

// 🔥 Пустая строка = текущий домен/порт (работает на :8000)
const CONFIG = { apiBaseUrl: '', pollInterval: 800 };
try {
  window.__VF_UI_BUILD = '20260605regionapi';
} catch (_) {
  /* ignore */
}

// 🔥 OpenRouter API ключ (для других функций, если используется)
const OPENROUTER_API_KEY = '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';

// 🔥 AITunnel API ключ — ОТДЕЛЬНАЯ переменная (замените на ваш ключ)
// Получите ключ на: https://aitunnel.ru/dashboard/api-keys
const AITUNNEL_API_KEY = 'sk-aitunnel-prIhaYBbOrNdrU4qQlKk6EvtkmIWKAvW';

// 🔥 IIFE wrapper — ВСЁ должно быть внутри!
(function() {
  'use strict';
  
  async function loadProfileConversationPreset() {
    try {
      const resp = await fetch(`${CONFIG.apiBaseUrl}/api/auth/me`, { credentials: 'include' });
      if (!resp.ok) return;
      const data = await resp.json();
      const preset = data.ai_conversation_description != null ? String(data.ai_conversation_description).trim() : '';
      /** Полная строка темы в формате как в модалке (title, \\n\\n, desc или только описание с \\n\\n). */
      state.profileAiConversationDescription = preset;
      let hasLocalTopic = false;
      try {
        hasLocalTopic = !!(localStorage.getItem('voiceTranslator_aiTopic') || '').trim();
      } catch (e) { /* ignore */ }
      if (!hasLocalTopic && preset) {
        state.aiTopic = preset;
        try { localStorage.setItem('voiceTranslator_aiTopic', preset); } catch (e) { /* ignore */ }
      }
      const ps = data.phrase_silence_sec;
      if (typeof ps === 'number' && Number.isFinite(ps)) {
        await postPhraseSilence(ps);
      }
      const cp = data.chat_preset;
      if (cp && typeof cp === 'object') {
        if (cp.recognitionMode === 'basic' || cp.recognitionMode === 'pro') {
          state.recognitionMode = cp.recognitionMode;
          try {
            localStorage.setItem('voiceTranslator_recognitionMode', cp.recognitionMode);
          } catch (e) {
            /* ignore */
          }
        }
        if (typeof cp.autoPlay === 'boolean') {
          let hasLocalAutoPlay = false;
          try {
            hasLocalAutoPlay = localStorage.getItem('voiceTranslator_autoPlay') != null;
          } catch (e) { /* ignore */ }
          if (!hasLocalAutoPlay) {
            state.autoPlay = cp.autoPlay;
            try {
              localStorage.setItem('voiceTranslator_autoPlay', cp.autoPlay ? 'true' : 'false');
            } catch (e) {
              /* ignore */
            }
          }
        }
        if (typeof cp.aiEnabled === 'boolean') {
          await toggleAI(cp.aiEnabled);
        }
        if (typeof cp.userSpeakLang === 'string' && cp.userSpeakLang.trim()) {
          var rawU = String(cp.userSpeakLang).trim().slice(0, 12);
          var normU = typeof window.vfNormalizeConversationLang === 'function' ? window.vfNormalizeConversationLang(rawU) : '';
          state.userSpeakLang = normU || rawU;
          if (typeof window.vfNormalizeConversationLang === 'function' && !window.vfNormalizeConversationLang(state.userSpeakLang)) {
            state.userSpeakLang = 'ru';
          }
          try {
            localStorage.setItem('voiceTranslator_userSpeakLang', state.userSpeakLang);
          } catch (e) {
            /* ignore */
          }
        }
        if (typeof cp.partnerSpeakLang === 'string' && cp.partnerSpeakLang.trim()) {
          var rawP = String(cp.partnerSpeakLang).trim().slice(0, 12);
          var normP = typeof window.vfNormalizeConversationLang === 'function' ? window.vfNormalizeConversationLang(rawP) : '';
          state.partnerSpeakLang = normP || rawP;
          if (typeof window.vfNormalizeConversationLang === 'function' && !window.vfNormalizeConversationLang(state.partnerSpeakLang)) {
            state.partnerSpeakLang = 'en';
          }
          try {
            localStorage.setItem('voiceTranslator_partnerSpeakLang', state.partnerSpeakLang);
          } catch (e) {
            /* ignore */
          }
        }
        if (typeof cp.useClonedVoice === 'boolean') {
          state.useClonedVoice = cp.useClonedVoice;
          try {
            localStorage.setItem('voiceTranslator_useCloned', cp.useClonedVoice ? 'true' : 'false');
          } catch (e) {
            /* ignore */
          }
        }
        const tss = typeof cp.ttsStandardVoice === 'string' ? cp.ttsStandardVoice.trim() : '';
        if (tss && !tss.startsWith('cloned:')) {
          state.selectedStandardVoice = tss.slice(0, 96);
          try {
            localStorage.setItem('voiceTranslator_standardVoice', state.selectedStandardVoice);
          } catch (e) {
            /* ignore */
          }
        }
        const tsc = typeof cp.ttsClonedVoice === 'string' ? cp.ttsClonedVoice.trim() : '';
        if (tsc.startsWith('cloned:')) {
          state.selectedClonedVoice = tsc.slice(0, 96);
          try {
            localStorage.setItem('voiceTranslator_clonedVoice', state.selectedClonedVoice);
          } catch (e) {
            /* ignore */
          }
        }
        try {
          getActiveVoiceForPlayback();
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn('⚠️ Не удалось загрузить описание беседы из профиля:', e.message);
    }
  }

  async function getUserId() {
    // 1) Сессия по cookie — без ?user_id= в URL (раньше X-User-ID: anonymous_* давал 403 при наличии cookie)
    try {
      const resp = await fetch(`${CONFIG.apiBaseUrl}/api/auth/current-user`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        const rid = data && data.id != null ? String(data.id).trim() : '';
        const looksAnonymous =
          !rid ||
          rid.toLowerCase() === 'anonymous' ||
          rid.toLowerCase().startsWith('anonymous_');
        if (data.authenticated === true && rid && !looksAnonymous) {
          localStorage.setItem('voiceTranslator_userId', String(data.id));
          console.log('🔐 user_id из сессии (cookie):', data.id);
          return String(data.id);
        }
        if (data.authenticated === false) {
          try {
            const kept = localStorage.getItem('voiceTranslator_userId') || '';
            // Не сбрасываем guest id trial-setup → иначе clone_user_id и sample «теряются».
            if (!kept.startsWith('anonymous_')) {
              localStorage.removeItem('voiceTranslator_userId');
            }
          } catch (clearErr) {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.log('⚠️ Не удалось получить user_id из current-user:', err.message);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('user_id');
    if (userIdFromUrl && !userIdFromUrl.startsWith('anonymous_')) {
      localStorage.setItem('voiceTranslator_userId', userIdFromUrl);
      console.log('🔐 Получен user_id из URL:', userIdFromUrl);
      return userIdFromUrl;
    }
    try {
      const existing = localStorage.getItem('voiceTranslator_userId') || '';
      if (existing.startsWith('anonymous_')) {
        console.log('🔐 Сохранён guest user_id:', existing);
        return existing;
      }
    } catch (keepErr) {
      /* ignore */
    }
    const newId = 'anonymous_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('voiceTranslator_userId', newId);
    console.log('🔐 Создан anonymous user_id:', newId);
    return newId;
  }
  
  const state = { 
    isRunning: false, conferenceMode: false, vbCableReady: false, unmuteMode: false, 
    aiEnabled: false, aiTopic: '', isProcessing: false, 
    pollTimer: null, chatPollTimer: null, selectedType: 'statement',
    selectedVoice: localStorage.getItem('voiceTranslator_voice') || 'en-US-JennyNeural',
    selectedStandardVoice: localStorage.getItem('voiceTranslator_standardVoice') || (localStorage.getItem('voiceTranslator_voice') || 'en-US-JennyNeural'),
    selectedClonedVoice: localStorage.getItem('voiceTranslator_clonedVoice') || '',
    useClonedVoice: localStorage.getItem('voiceTranslator_useCloned') === 'true',
    cloneViaModal: true,
    modalWarmupInProgress: false,
    browserMicMode: false,
    clonedVoices: [], standardVoices: [], userId: 'anonymous',
    recognitionMode: localStorage.getItem('voiceTranslator_recognitionMode') || 'basic',
    // Автовоспроизведение перевода после распознавания (opt-out: только voiceTranslator_autoPlay === 'false')
    autoPlay: localStorage.getItem('voiceTranslator_autoPlay') !== 'false',
    userSpeakLang: localStorage.getItem('voiceTranslator_userSpeakLang') || 'ru',
    partnerSpeakLang: localStorage.getItem('voiceTranslator_partnerSpeakLang') || 'en',
    // 🔥 НОВОЕ: Отслеживание последней фразы партнёра (по ID сообщения)
    lastPartnerPhrase: '',
    lastPartnerMsgId: null,
    aiSuggestionsCache: new Map(),
    /** Счётчик, чтобы старый ответ API не перезаписывал подсказки для новой реплики. */
    _aiSuggestionsGen: 0,
    /* По умолчанию — третья колонка справа; «bottom» только если пользователь явно выбрал. */
    aiSuggestionsLayout: localStorage.getItem('voiceTranslator_aiSuggestionsLayout') === 'bottom' ? 'bottom' : 'column',
    /** Тема+контекст из ЛК (как в модалке: title\\n\\ndesc); подставляется в AI, если нет темы в state/localStorage */
    profileAiConversationDescription: '',
    /** Время успешного POST /api/ai-config — чтобы pollStatus не затёр включение AI из-за гонки со старым GET /status */
    _lastAiToggleAt: 0,
    translationPaused: false,
    _syncTranslationPauseUi: false,
    phraseSilenceSec: null,
    phraseSilenceMin: 0.8,
    phraseSilenceMax: 3.0,
    micRmsThreshold: null,
    micRmsThresholdMin: 0.0003,
    micRmsThresholdMax: 0.018,
    userTtsVolume: (() => {
      try {
        const v = parseFloat(localStorage.getItem('voiceTranslator_userTtsVolume') || '');
        return Number.isFinite(v) ? v : null;
      } catch (e) {
        return null;
      }
    })(),
    userTtsVolumeMin: 0.25,
    userTtsVolumeMax: 3.0,
    /** Демо-диалог: сессия с бэкенда (не трогает AudioEngine). Только из ?trial_session= */
    trialSessionId: null,
    /** В демо показываем только клон, загруженный в мастере trial-setup. */
    trialCloneVoiceId: null,
    /** Edge shortName партнёра из настроек демо-сессии (серверный TTS и Web Speech fallback для реплик партнёра). */
    trialPartnerEdgeVoice: null,
    /** Языки из trial-setup (приоритет над localStorage при озвучке для собеседника). */
    trialSettings: null,
    /** Демо исчерпан (5 реплик партнёра) — блок микрофона и отправки. */
    trialLimitReached: false,
    /** null — ещё не запрашивали; true/false — тариф включает Pro STT или нет */
    subscriptionAllowsProStt: null,
    /** null — ещё не запрашивали; true/false — тариф включает клонирование озвучки (Ultimate+, не Pro) */
    subscriptionAllowsVoiceClone: null,
    subscriptionActive: false,
    subscriptionPlanId: 'none',
    subscriptionDisplayName: '',
    sessionEmail: '',
    sessionUserId: '',
    minutesLimit: 0,
    minutesUsed: 0,
    minutesRemaining: 0,
    runtimeCountdownSec: null,
    runtimeCountdownActive: false,
    /** Пользователь нажал «Стоп» — не автовосстанавливать сессию через pollStatus/ensureServerSessionRunning. */
    userRequestedStop: false,
    /** null: ещё не запрашивали; true: есть сессия; false: нет входа (401) */
    _headerPlanAuth: null
  };

  let runtimeCountdownTimer = null;

  function getTrialSessionIdFromUrl() {
    try {
      const u = new URLSearchParams(window.location.search).get('trial_session');
      return (u || '').trim();
    } catch (e) {
      return '';
    }
  }

  function isTrialMode() {
    return !!(state.trialSessionId && String(state.trialSessionId).trim());
  }

  const PRO_STT_ALLOWED_PLAN_IDS = new Set([
    'pro', 'pro_1h', 'pro_20h', 'ultimate_1h', 'ultimate_20h', 'team', 'business',
    'p1p', 'p1u', 'p20p', 'p20u'
  ]);

  const VOICE_CLONE_ALLOWED_PLAN_IDS = new Set([
    'ultimate_1h', 'ultimate_20h', 'team', 'business', 'p1u', 'p20u'
  ]);

  function planIdAllowsProStt(planId) {
    return PRO_STT_ALLOWED_PLAN_IDS.has(String(planId || '').trim().toLowerCase());
  }

  function planIdAllowsVoiceClone(planId) {
    return VOICE_CLONE_ALLOWED_PLAN_IDS.has(String(planId || '').trim().toLowerCase());
  }

  function isProRecognitionLocked() {
    if (isTrialMode()) return false;
    if (state.subscriptionAllowsProStt !== true && state.subscriptionAllowsProStt !== false) return false;
    return state.subscriptionAllowsProStt === false;
  }

  function isAiAssistantLocked() {
    return isProRecognitionLocked();
  }

  function isVoiceCloneLocked() {
    if (isTrialMode()) return false;
    if (state.subscriptionAllowsVoiceClone !== true && state.subscriptionAllowsVoiceClone !== false) return false;
    return state.subscriptionAllowsVoiceClone === false;
  }

  function canStartTranslation() {
    if (isTrialMode()) return !state.trialLimitReached;
    if (state._headerPlanAuth === false) return false;
    if (state.subscriptionActive !== true) return false;
    return (Number(state.minutesRemaining) || 0) > 0;
  }

  function syncAiAssistantGateUi() {
    const locked = isAiAssistantLocked();
    if (elements.aiTopicGroup) {
      elements.aiTopicGroup.classList.toggle('ai-topic-group--premium-locked', locked);
    }
    const aiLab = document.getElementById('aiToggleLabel');
    if (aiLab) {
      try {
        aiLab.title = locked ? t('aiAssistantToggleHintLocked') : '';
      } catch (e) {
        /* ignore */
      }
    }
    syncVoiceCloneGateUi();
  }
  window.syncAiAssistantGateUi = syncAiAssistantGateUi;

  function syncVoiceCloneGateUi() {
    const locked = isVoiceCloneLocked();
    const cluster = elements.voiceToolbarCluster || document.getElementById('voiceToolbarCluster');
    if (cluster) {
      cluster.classList.toggle('voice-toolbar-cluster--clone-locked', locked);
    }
    const cloneLab = document.getElementById('useClonedVoiceLabel');
    if (cloneLab) {
      try {
        cloneLab.title = locked ? t('voiceCloneToggleHintLocked') : '';
      } catch (e) {
        /* ignore */
      }
    }
  }
  window.syncVoiceCloneGateUi = syncVoiceCloneGateUi;

  function syncProRecognitionGateUi() {
    const locked = isProRecognitionLocked();
    if (elements.modeProBtn) {
      elements.modeProBtn.classList.toggle('mode-btn--locked', locked);
      elements.modeProBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
      try {
        elements.modeProBtn.title = locked ? t('modeProBtnTitleLocked') : t('modeProBtnTitle');
      } catch (e) {
        /* ignore */
      }
    }
    syncAiAssistantGateUi();
  }
  window.syncProRecognitionGateUi = syncProRecognitionGateUi;

  function openProUpgradeModal() {
    if (!elements.proUpgradeModal) return;
    elements.proUpgradeModal.classList.add('open');
    elements.proUpgradeModal.setAttribute('aria-hidden', 'false');
    if (typeof applyTranslations === 'function') applyTranslations();
    setTimeout(() => elements.proUpgradeModalClose?.focus(), 50);
  }

  function closeProUpgradeModal() {
    if (!elements.proUpgradeModal) return;
    elements.proUpgradeModal.classList.remove('open');
    elements.proUpgradeModal.setAttribute('aria-hidden', 'true');
  }

  function openAiAssistantUpgradeModal() {
    if (!elements.aiAssistantUpgradeModal) return;
    elements.aiAssistantUpgradeModal.classList.add('open');
    elements.aiAssistantUpgradeModal.setAttribute('aria-hidden', 'false');
    if (typeof applyTranslations === 'function') applyTranslations();
    setTimeout(() => elements.aiAssistantUpgradeModalClose?.focus(), 50);
  }

  function closeAiAssistantUpgradeModal() {
    if (!elements.aiAssistantUpgradeModal) return;
    elements.aiAssistantUpgradeModal.classList.remove('open');
    elements.aiAssistantUpgradeModal.setAttribute('aria-hidden', 'true');
  }

  function openVoiceCloneUpgradeModal() {
    if (!elements.voiceCloneUpgradeModal) return;
    elements.voiceCloneUpgradeModal.classList.add('open');
    elements.voiceCloneUpgradeModal.setAttribute('aria-hidden', 'false');
    if (typeof applyTranslations === 'function') applyTranslations();
    setTimeout(() => elements.voiceCloneUpgradeModalClose?.focus(), 50);
  }

  function closeVoiceCloneUpgradeModal() {
    if (!elements.voiceCloneUpgradeModal) return;
    elements.voiceCloneUpgradeModal.classList.remove('open');
    elements.voiceCloneUpgradeModal.setAttribute('aria-hidden', 'true');
  }

  function pricingPageUrl() {
    return new URL('/pricing', siteOriginForCabinet()).href;
  }

  function openSubscriptionRequiredModal(reason) {
    if (!elements.subscriptionRequiredModal || isTrialMode()) return;
    const hintEl = elements.subscriptionRequiredModalHint;
    if (hintEl) {
      hintEl.textContent =
        reason === 'no_minutes'
          ? t('subscriptionRequiredModalHintNoMinutes')
          : t('subscriptionRequiredModalHint');
    }
    const priceLink = elements.subscriptionRequiredModalPricingLink;
    const dashLink = elements.subscriptionRequiredModalDashboardLink;
    if (priceLink) priceLink.href = pricingPageUrl();
    if (dashLink) dashLink.href = dashboardTariffUrl();
    elements.subscriptionRequiredModal.classList.add('open');
    elements.subscriptionRequiredModal.setAttribute('aria-hidden', 'false');
    if (typeof applyTranslations === 'function') applyTranslations();
    setTimeout(() => elements.subscriptionRequiredModalClose?.focus(), 50);
  }

  function closeSubscriptionRequiredModal() {
    if (!elements.subscriptionRequiredModal) return;
    elements.subscriptionRequiredModal.classList.remove('open');
    elements.subscriptionRequiredModal.setAttribute('aria-hidden', 'true');
  }

  function openStartErrorModal(opts) {
    if (!elements.micErrorModal) return;
    const titleKey = (opts && opts.titleKey) || 'micErrorModalTitle';
    const hintText = (opts && opts.hintText) || t('startMicError');
    if (elements.micErrorModalHeading) {
      elements.micErrorModalHeading.textContent = t(titleKey);
    }
    if (elements.micErrorModalHint) {
      elements.micErrorModalHint.textContent = hintText;
    }
    elements.micErrorModal.classList.add('open');
    elements.micErrorModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => elements.micErrorModalClose?.focus(), 50);
  }

  function closeStartErrorModal() {
    if (!elements.micErrorModal) return;
    elements.micErrorModal.classList.remove('open');
    elements.micErrorModal.setAttribute('aria-hidden', 'true');
  }

  function maybeShowSubscriptionRequiredModal() {
    if (isTrialMode()) return;
    if (state._headerPlanAuth !== true) return;
    if (canStartTranslation()) return;
    const reason = state.subscriptionActive !== true ? 'no_plan' : 'no_minutes';
    openSubscriptionRequiredModal(reason);
  }

  function schedulePostRecognitionModeBasicQuiet() {
    if (isTrialMode() || !isProRecognitionLocked()) return;
    if (recognitionQuietBasicTimer) return;
    recognitionQuietBasicTimer = setTimeout(() => {
      recognitionQuietBasicTimer = null;
      void (async () => {
        try {
          await apiRequest('/api/recognition-mode', {
            method: 'POST',
            body: JSON.stringify({ mode: 'basic' })
          });
        } catch (e) {
          console.warn('⚠️ Не удалось сбросить режим распознавания на Basic:', e);
        }
      })();
    }, 400);
  }

  let aiConfigQuietDisableTimer = null;
  function schedulePostAiConfigDisabledQuiet() {
    if (isTrialMode() || !isAiAssistantLocked()) return;
    if (aiConfigQuietDisableTimer) return;
    aiConfigQuietDisableTimer = setTimeout(() => {
      aiConfigQuietDisableTimer = null;
      void (async () => {
        try {
          const topic = (state.aiTopic && String(state.aiTopic).trim()) || 'general conversation';
          await apiRequest('/api/ai-config', {
            method: 'POST',
            body: JSON.stringify({ enabled: false, topic })
          });
        } catch (e) {
          console.warn('⚠️ Не удалось выключить AI на сервере:', e);
        }
      })();
    }, 400);
  }

  async function fetchSubscriptionRecognitionGate() {
    if (isTrialMode()) {
      state.subscriptionAllowsProStt = true;
      state.subscriptionAllowsVoiceClone = true;
      syncProRecognitionGateUi();
      return;
    }
    const uid = state.userId;
    if (!uid || String(uid).startsWith('anonymous_')) {
      state.subscriptionAllowsProStt = true;
      state.subscriptionAllowsVoiceClone = true;
      syncProRecognitionGateUi();
      return;
    }
    try {
      const data = await apiRequest('/api/subscriptions/current');
      const planId = data && data.plan_id != null ? String(data.plan_id) : 'none';
      state.subscriptionAllowsProStt = data.active === true && planIdAllowsProStt(planId);
      state.subscriptionAllowsVoiceClone = data.active === true && planIdAllowsVoiceClone(planId);
    } catch (e) {
      console.warn('⚠️ Не удалось загрузить тариф для режима Pro:', e);
      state.subscriptionAllowsProStt = null;
      state.subscriptionAllowsVoiceClone = null;
    }
    syncProRecognitionGateUi();
  }

  function trialDefaultEdgeVoiceForLang(partnerLang) {
    if (typeof window.vfDefaultEdgeVoiceForLang === 'function') {
      return window.vfDefaultEdgeVoiceForLang(partnerLang);
    }
    const pl = String(partnerLang || 'en').toLowerCase().slice(0, 2);
    const map = (window.VF_EDGE_VOICE_DEFAULT && typeof window.VF_EDGE_VOICE_DEFAULT === 'object')
      ? window.VF_EDGE_VOICE_DEFAULT
      : { en: 'en-IE-ConnorNeural', de: 'de-DE-ConradNeural', ru: 'ru-RU-DmitryNeural' };
    if (Object.prototype.hasOwnProperty.call(map, pl)) {
      const v = map[pl];
      return v == null ? '' : v;
    }
    return map.en || 'en-IE-ConnorNeural';
  }

  function edgeVoiceLangPrefix(voiceId) {
    const m = String(voiceId || '').match(/^([a-z]{2})(?:-[a-z]{2})?-/i);
    return m ? m[1].toLowerCase() : '';
  }

  function resolveTrialPartnerEdgeVoice(voiceId, partnerLang) {
    const pl = String(partnerLang || state.partnerSpeakLang || 'en').toLowerCase().slice(0, 2);
    const v = String(voiceId || '').trim();
    if (typeof window.vfLangHasNativeEdgeVoice === 'function' && !window.vfLangHasNativeEdgeVoice(pl)) {
      return '';
    }
    if (v && !v.startsWith('cloned:') && edgeVoiceLangPrefix(v) === pl) return v;
    const mapped = trialDefaultEdgeVoiceForLang(pl);
    return mapped || '';
  }

  function syncTrialPartnerVoiceToPartnerLang(partnerLang) {
    if (!isTrialMode()) return;
    state.trialPartnerEdgeVoice = resolveTrialPartnerEdgeVoice(state.trialPartnerEdgeVoice, partnerLang);
  }

  function trialLangParamsForApi() {
    if (!isTrialMode()) return {};
    return {
      user_speak_lang: String(state.userSpeakLang || 'ru').toLowerCase().slice(0, 2),
      partner_speak_lang: String(state.partnerSpeakLang || 'en').toLowerCase().slice(0, 2),
    };
  }

  /** Edge shortName партнёра для синхронизации с сессией демо (не путать с «моим» голосом в voiceSelect). */
  function trialPartnerEdgeVoiceForApi() {
    if (!isTrialMode()) return '';
    syncTrialPartnerVoiceToPartnerLang(state.partnerSpeakLang);
    const v = String(state.trialPartnerEdgeVoice || '').trim();
    if (!v || v.startsWith('cloned:')) return '';
    return v;
  }

  function edgeVoiceGenderHint(edgeShortName) {
    const low = String(edgeShortName || '').toLowerCase();
    if (/dariya|svetlana|jenny|katja|denise|elvira|sonia|francisca|shruti|dhwani|dilara|aigul|madina|blessica|hoaimy|eka|joana|aria/i.test(low)) {
      return 'female';
    }
    if (/dmitry|guy|connor|conrad|henri|alvaro|diego|marek|ostap|maarten|mattias|ahmet|nestoras|antonin|keita|yunxi|injoon|madhur|hamed/i.test(low)) {
      return 'male';
    }
    return '';
  }

  function trialPickSpeechSynthesisVoice(edgeShortName) {
    const sn = (edgeShortName || '').trim();
    if (!sn || sn.startsWith('cloned:') || typeof speechSynthesis === 'undefined') return null;
    try {
      const voices = speechSynthesis.getVoices();
      if (!voices || !voices.length) return null;
      const parts = sn.split('-').filter(Boolean);
      if (parts.length < 3) return null;
      const loc = `${parts[0]}-${parts[1]}`.toLowerCase();
      const langPrefix = parts[0].toLowerCase();
      const hint = parts[2].replace(/Neural$/i, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
      const norm = (x) => String(x || '').toLowerCase().replace(/_/g, '-');
      const hit = (name) => String(name || '').toLowerCase().includes(hint);
      let m = voices.find((v) => norm(v.lang).startsWith(loc) && hit(v.name));
      if (m) return m;
      const gender = edgeVoiceGenderHint(sn);
      const femaleName = /irina|milena|svetlana|dariya|elena|anna|zira|natalia|oksana|tatyana|female|woman|женск/i;
      const maleName = /pavel|dmitri|dmitry|yuri|ivan|aleksei|male|man|мужск/i;
      if (gender === 'female') {
        m = voices.find((v) => norm(v.lang).startsWith(langPrefix) && femaleName.test(v.name));
        if (m) return m;
      } else if (gender === 'male') {
        m = voices.find((v) => norm(v.lang).startsWith(langPrefix) && maleName.test(v.name));
        if (m) return m;
      }
      m = voices.find((v) => norm(v.lang).startsWith(loc));
      return m || null;
    } catch (e) {
      return null;
    }
  }

  async function ensureSpeechVoicesLoaded() {
    if (typeof speechSynthesis === 'undefined') return;
    if (speechSynthesis.getVoices().length) return;
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try {
          speechSynthesis.onvoiceschanged = null;
        } catch (e) {
          /* ignore */
        }
        resolve();
      };
      const onV = () => {
        if (speechSynthesis.getVoices().length) finish();
      };
      speechSynthesis.onvoiceschanged = onV;
      onV();
      setTimeout(finish, 600);
      try {
        speechSynthesis.getVoices();
      } catch (e) {
        finish();
      }
    });
  }

  let trialSpeechRecog = null;
  let trialPhraseInFlight = false;
  let trialAutoplayBusy = false;
  /** Текстовая реплика (подсказка / ввод): блокируем параллельный upload с микрофона. */
  let trialTextSubmitLock = false;
  let trialSuggestionPickLock = false;
  /** Детальный этап для строки статуса в демо: encode | upload | user_tts | partner_tts */
  let trialMicStatus = null;
  let trialLastMicStatusPhase = '';
  let trialChatPollTimer = null;
  let trialProcessingWatchdog = null;
  /** Ответ собеседника после turn, пока пользователь не нажал Play (автовоспроизведение выкл.). */
  let trialPendingPartnerTurn = null;
  let trialReleasedPartnerSeq = 0;
  /** Счётчик хода: отбрасываем устаревший ответ микрофона после подсказки/текста. */
  let trialMicTurnEpoch = 0;
  /** Ход, для которого уже получен ответ сервера — не отменять release/озвучку собеседника. */
  let trialActiveApplyEpoch = 0;
  let trialLastSpokenPartnerSeq = 0;
  let trialLastSpokenPartnerText = '';
  /** Игнорировать onstop MediaRecorder после отправки подсказки/текста. */
  let trialIgnoreMicRecorderStopUpload = false;
  let trialListenResumeTimer = null;
  let trialMicStream = null;
  let trialMicAudioCtx = null;
  let trialMicAnalyser = null;
  let trialMicLevelTimer = null;
  let trialMicLastRms = 0;
  let desktopBasicSpeechRecog = null;
  let desktopBasicSpeechListening = false;
  let desktopBasicLastSubmittedPhrase = '';
  let desktopBasicLastSubmittedAt = 0;
  let browserMicStream = null;
  let browserMicRecorder = null;
  let browserMicUploading = false;
  let browserMicCaptureActive = false;
  let browserMicChunkTimer = null;
  let browserMicRawStream = null;
  let browserMicAudioCtx = null;
  let browserMicGainNode = null;
  let browserMicDestNode = null;
  let browserMicAnalyser = null;
  let browserMicLevelTimer = null;
  let browserMicLastRms = 0;
  let browserMicDisplayRms = 0;
  let browserMicChunkPeakRms = 0;
  let browserMicLastSttHintAt = 0;
  let browserMicPcmBuffers = [];
  let browserMicScriptProcessor = null;
  let browserMicSilentGain = null;
  let browserMicUsePcmUpload = true;
  const browserMicUploadQueue = [];
  let browserMicLastFlushAt = 0;
  let browserMicHadSpeechInChunk = false;
  let browserMicSilenceAccumMs = 0;
  let browserMicPrerollBuffers = [];
  let browserMicSpeechOnsetAt = 0;
  /** Демо: момент последней громкой речи (выше on-порога), для конца фразы по таймеру. */
  let browserMicLastStrongSpeechAt = 0;
  /** После озвучки / включения мика — не отправлять обрезок с первого тика. */
  let browserMicPostResumeUntil = 0;
  let browserMicNoiseCalibrating = false;
  let browserMicNoiseCalibTimer = null;
  const browserMicNoiseCalibSamples = [];
  /** Порог VAD только на текущую сессию микрофона (автокалибровка фона). */
  let browserMicSessionAutoThreshold = null;
  let micRmsThresholdUserTouched = false;
  let trialMicHeardHintAt = 0;
  let browserMicCaptureStartedAt = 0;
  /** Усиление перед захватом — на VPS без серверного мика (Pro/AITunnel). */
  const BROWSER_MIC_CAPTURE_GAIN = 9.0;
  const TRIAL_MIC_CAPTURE_GAIN = 14.5;
  const BROWSER_MIC_TARGET_RATE = 16000;

  function browserMicCaptureGainValue() {
    return isTrialMode() ? TRIAL_MIC_CAPTURE_GAIN : BROWSER_MIC_CAPTURE_GAIN;
  }

  const LS_AUDIO_INPUT = 'voiceTranslator_audioInputDeviceId';
  const LS_AUDIO_OUTPUT = 'voiceTranslator_audioOutputDeviceId';

  function safeCloseAudioContext(ctx) {
    if (!ctx) return;
    try {
      if (ctx.state !== 'closed') void ctx.close();
    } catch (e) {
      /* ignore */
    }
  }

  function getAudioInputDeviceId() {
    try {
      return String(localStorage.getItem(LS_AUDIO_INPUT) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function getAudioOutputDeviceId() {
    try {
      return String(localStorage.getItem(LS_AUDIO_OUTPUT) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function setAudioInputDeviceId(id) {
    try {
      const v = String(id || '').trim();
      if (v) localStorage.setItem(LS_AUDIO_INPUT, v);
      else localStorage.removeItem(LS_AUDIO_INPUT);
    } catch (e) {
      /* ignore */
    }
  }

  function setAudioOutputDeviceId(id) {
    try {
      const v = String(id || '').trim();
      if (v) localStorage.setItem(LS_AUDIO_OUTPUT, v);
      else localStorage.removeItem(LS_AUDIO_OUTPUT);
    } catch (e) {
      /* ignore */
    }
  }

  /** Разные deviceId: микрофон не держит BT в HFP — озвучка в наушники без полной остановки захвата. */
  function trialHasSplitAudioDevices() {
    const inId = getAudioInputDeviceId();
    const outId = getAudioOutputDeviceId();
    if (!inId || !outId) return false;
    return inId !== outId;
  }

  function browserMicAudioConstraints() {
    const base = {
      echoCancellation: true,
      noiseSuppression: !isTrialMode(),
      autoGainControl: true,
      channelCount: 1,
    };
    const devId = getAudioInputDeviceId();
    if (devId) base.deviceId = { exact: devId };
    return base;
  }

  function audioDeviceOptionLabel(dev) {
    const label = (dev && dev.label ? String(dev.label) : '').trim();
    if (label) return label;
    if (dev && dev.kind === 'audioinput') return t('audioDeviceUnlabeledInput');
    return t('audioDeviceUnlabeledOutput');
  }

  let vfAudioDevicesPrimed = false;

  /** Без краткого getUserMedia Chromium/Electron отдаёт deviceId="" и пустые label — списки выглядят пустыми. */
  async function primeAudioDeviceLabels() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return false;
    }
    if (vfAudioDevicesPrimed) return true;
    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      probe.getTracks().forEach((tr) => {
        try {
          tr.stop();
        } catch (_) {
          /* ignore */
        }
      });
      vfAudioDevicesPrimed = true;
      return true;
    } catch (e) {
      console.warn('primeAudioDeviceLabels:', e);
      return false;
    }
  }

  async function refreshAudioDeviceLists() {
    const inSel = elements.audioInputDevice;
    const outSel = elements.audioOutputDevice;
    if (!inSel || !outSel || !navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      return;
    }
    await primeAudioDeviceLabels();
    let devices = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      console.warn('enumerateDevices:', e);
      return;
    }
    const savedIn = getAudioInputDeviceId();
    const savedOut = getAudioOutputDeviceId();
    const defaultLabel = t('audioDeviceDefault') || 'System default';
    const fillSelect = (sel, kind, saved) => {
      const prev = sel.value;
      sel.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = defaultLabel;
      sel.appendChild(def);
      devices
        .filter((d) => d.kind === kind && String(d.deviceId || '').trim())
        .forEach((dev) => {
          const opt = document.createElement('option');
          opt.value = dev.deviceId;
          opt.textContent = audioDeviceOptionLabel(dev);
          sel.appendChild(opt);
        });
      const pick = saved || prev;
      if (pick && [...sel.options].some((o) => o.value === pick)) sel.value = pick;
      else sel.value = '';
    };
    fillSelect(inSel, 'audioinput', savedIn);
    fillSelect(outSel, 'audiooutput', savedOut);
    syncAudioDevicesPermissionHint();
  }

  function syncAudioDevicesPermissionHint() {
    const el = document.getElementById('audioDevicesPermissionHint');
    if (!el) return;
    const inSel = elements.audioInputDevice;
    const outSel = elements.audioOutputDevice;
    const sparse =
      (inSel && inSel.options.length <= 1) && (outSel && outSel.options.length <= 1);
    el.hidden = !sparse;
  }

  async function ensureAudioDeviceListsFromUserGesture() {
    await primeAudioDeviceLabels();
    await refreshAudioDeviceLists();
  }

  async function onAudioInputDeviceSelectChange() {
    const id = elements.audioInputDevice ? elements.audioInputDevice.value : '';
    setAudioInputDeviceId(id);
    if (!browserMicCaptureActive || !state.isRunning) return;
    stopBrowserMicCapture();
    try {
      await startBrowserMicCapture();
    } catch (e) {
      console.warn('audio input device switch:', e);
      log(t('audioDeviceMicRestartFailed'), 'error');
    }
  }

  async function onAudioOutputDeviceSelectChange() {
    const id = elements.audioOutputDevice ? elements.audioOutputDevice.value : '';
    setAudioOutputDeviceId(id);
    try {
      if (vfMasterAudio) await vfApplyAudioSink(vfMasterAudio);
      if (vfTrialPlaybackAudio) await vfApplyAudioSink(vfTrialPlaybackAudio);
    } catch (e) {
      console.warn('audio output device switch:', e);
    }
  }

  function initAudioDeviceSelectors() {
    const onGesture = () => void ensureAudioDeviceListsFromUserGesture();
    const bindGesture = (el) => {
      if (!el || el.dataset.vfAudioGestureBound) return;
      el.dataset.vfAudioGestureBound = '1';
      el.addEventListener('pointerdown', onGesture);
    };
    if (elements.audioInputDevice) {
      bindGesture(elements.audioInputDevice);
      elements.audioInputDevice.addEventListener('change', () => {
        void onAudioInputDeviceSelectChange();
      });
    }
    if (elements.audioOutputDevice) {
      bindGesture(elements.audioOutputDevice);
      elements.audioOutputDevice.addEventListener('change', () => {
        void onAudioOutputDeviceSelectChange();
      });
    }
    bindGesture(elements.audioDevicesCard);
  }

  /** Pro и демо (Basic+Pro): MediaRecorder WebM/Opus. PCM/WAV — только вне демо Basic. */
  function preferBrowserMicMediaRecorder() {
    return state.recognitionMode === 'pro' || isTrialMode();
  }

  let trialMicPausedForTts = false;

  /** На время TTS отключаем дорожку микрофона, захват не пересоздаём (быстрее, чем stop/start getUserMedia). */
  async function trialRunWithMicPausedForPlayback(fn) {
    if (!isTrialMode()) return fn();
    trialMicPausedForTts = true;
    trialSetMicInputEnabled(false);
    unlockBrowserAudioForPlayback();
    await prepareAudioOutputForPlayback();
    try {
      return await fn();
    } finally {
      trialSetMicInputEnabled(true);
      trialMicPausedForTts = false;
      browserMicArmPostResumeGrace(80);
      updateStatus();
      void drainSpeechSynthesisIfActive(1200);
    }
  }

  async function ensureTrialMicReadyAfterPlayback(delayMs) {
    trialClearListenResumeTimer();
    if (!isTrialMode() || !state.isRunning || state.trialLimitReached) return;
    const run = async () => {
      trialAutoplayBusy = false;
      trialMicPausedForTts = false;
      trialSetMicInputEnabled(true);
      if (!browserMicCaptureActive) {
        try {
          await startBrowserMicCapture();
        } catch (e) {
          console.warn('ensureTrialMicReadyAfterPlayback:', e);
          return;
        }
      }
      browserMicArmPostResumeGrace(60);
      trialClearMicStatus();
      updateStatus();
    };
    const delay = typeof delayMs === 'number' ? delayMs : 0;
    if (delay > 0) {
      trialListenResumeTimer = setTimeout(() => {
        trialListenResumeTimer = null;
        void run();
      }, delay);
    } else {
      void run();
    }
  }

  function trialSetMicInputEnabled(enabled) {
    const on = enabled !== false;
    const stream = browserMicRawStream || browserMicStream;
    if (!stream || typeof stream.getAudioTracks !== 'function') return;
    stream.getAudioTracks().forEach((tr) => {
      try {
        tr.enabled = on;
      } catch (e) {
        /* ignore */
      }
    });
  }

  function trialBlocksMicUpload() {
    if (trialTextSubmitLock || trialMicPausedForTts) return true;
    if (trialAutoplayBusy && trialMicStatus !== 'partner_tts') return true;
    return false;
  }

  /** Перед POST /api/trial/turn: не даём MediaRecorder/PCM отправить второй ход параллельно. */
  function trialPauseMicForUserTextSubmit() {
    if (!isTrialMode()) return;
    trialTextSubmitLock = true;
    trialIgnoreMicRecorderStopUpload = true;
    trialClearMicUploadRetry();
    browserMicUploadQueue.length = 0;
    trialSetMicInputEnabled(false);
    browserMicHadSpeechInChunk = false;
    browserMicSilenceAccumMs = 0;
    browserMicSpeechOnsetAt = 0;
    browserMicLastStrongSpeechAt = 0;
    clearBrowserMicPreroll();
    browserMicPcmBuffers = [];
    if (browserMicChunkTimer) {
      clearTimeout(browserMicChunkTimer);
      clearInterval(browserMicChunkTimer);
      browserMicChunkTimer = null;
    }
    if (browserMicRecorder && browserMicRecorder.state !== 'inactive') {
      try {
        browserMicRecorder.ondataavailable = null;
        browserMicRecorder.onstop = null;
        browserMicRecorder.stop();
      } catch (e) {
        /* ignore */
      }
    }
    browserMicRecorder = null;
  }

  /** Подпись сервиса STT для консоли браузера (демо, микрофон). */
  function trialSttServiceConsoleLabel(serviceId) {
    const id = String(serviceId || '').toLowerCase();
    if (id === 'vosk') return 'Vosk (сервер)';
    if (id.includes('aitunnel')) return 'AITunnel · gpt-4o-mini-transcribe';
    return serviceId || 'неизвестно';
  }

  function logTrialSttServiceToConsole(payload) {
    if (!isTrialMode() || !payload) return;
    const svc = String(payload.stt_service || '').trim();
    const eng = String(payload.stt_engine || '').trim();
    const label = svc
      ? trialSttServiceConsoleLabel(svc)
      : eng && eng !== 'unknown'
        ? eng
        : '';
    if (!label) return;
    const mode = state.recognitionMode === 'pro' ? 'Pro' : 'Basic';
    const text = String(payload.user_text || payload.user_tts_partner_lang || '').trim();
    const engineTag = svc.includes('aitunnel')
      ? 'aitunnel'
      : svc === 'vosk' || eng === 'Vosk'
        ? 'vosk'
        : svc || eng;
    console.info(
      `[TalkPilot демо · ${mode}] STT: ${engineTag} (${label})` +
        (text ? ` — «${text.slice(0, 80)}${text.length > 80 ? '…' : ''}»` : ''),
      { stt_service: svc || undefined, stt_engine: eng || undefined }
    );
  }

  function clearTrialProcessingWatchdog() {
    if (trialProcessingWatchdog) {
      clearTimeout(trialProcessingWatchdog);
      trialProcessingWatchdog = null;
    }
  }

  /** Сброс «Обрабатываю…», если запрос/озвучка зависли. */
  function armTrialProcessingWatchdog(ms) {
    clearTrialProcessingWatchdog();
    const limit = typeof ms === 'number' ? ms : 75000;
    trialProcessingWatchdog = setTimeout(() => {
      trialProcessingWatchdog = null;
      if (!trialPhraseInFlight && !trialAutoplayBusy) return;
      trialPhraseInFlight = false;
      trialAutoplayBusy = false;
      trialTextSubmitLock = false;
      browserMicUploading = false;
      browserMicUploadQueue.length = 0;
      log(t('trialProcessingStuck'), 'error');
      updateStatus();
      void fetchChat();
    }, limit);
  }

  function syncTrialChatPolling() {
    const needPoll =
      isTrialMode() && state.isRunning && (trialPhraseInFlight || trialAutoplayBusy);
    if (!needPoll) {
      if (trialChatPollTimer) {
        clearInterval(trialChatPollTimer);
        trialChatPollTimer = null;
      }
      return;
    }
    void fetchChat();
    if (trialChatPollTimer) return;
    trialChatPollTimer = setInterval(() => {
      if (!isTrialMode() || !state.isRunning || (!trialPhraseInFlight && !trialAutoplayBusy)) {
        if (trialChatPollTimer) {
          clearInterval(trialChatPollTimer);
          trialChatPollTimer = null;
        }
        return;
      }
      void fetchChat();
    }, state.recognitionMode === 'pro' ? 650 : 1000);
  }

  function probeBrowserStorageWritable() {
    try {
      const k = '__vf_storage_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      const name = e && e.name ? String(e.name) : '';
      if (name === 'QuotaExceededError' || (e && String(e.message || '').includes('QUOTA'))) {
        log(t('browserStorageFull'), 'error');
      }
      return false;
    }
  }

  async function openBrowserMicStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: browserMicAudioConstraints(),
      });
    } catch (e) {
      const devId = getAudioInputDeviceId();
      if (!devId) throw e;
      console.warn('openBrowserMicStream: deviceId failed, fallback to default', e);
      setAudioInputDeviceId('');
      if (elements.audioInputDevice) elements.audioInputDevice.value = '';
      log(t('audioDeviceMicFallback'), 'system');
      return await navigator.mediaDevices.getUserMedia({
        audio: browserMicAudioConstraints(),
      });
    }
  }

  async function trialFetchJson(url, options, timeoutMs) {
    const ms = typeof timeoutMs === 'number' ? timeoutMs : 120000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const resp = await fetch(url, { ...options, signal: ctrl.signal });
      const d = await resp.json().catch(() => ({}));
      return { resp, d };
    } catch (e) {
      if (e && e.name === 'AbortError') {
        throw new Error('trial_request_timeout');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async function drainSpeechSynthesisIfActive(maxMs) {
    if (typeof speechSynthesis === 'undefined') return;
    if (!speechSynthesis.speaking && !speechSynthesis.pending) return;
    await drainSpeechSynthesisQueue(typeof maxMs === 'number' ? maxMs : 8000);
  }

  /** Desktop Web Speech в Electron может спамить chunked upload (-2); отключаем по умолчанию. */
  function shouldUseDesktopWebSpeech() {
    return false;
  }

  function browserMicChunkRms(samples) {
    if (!samples || !samples.length) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
  }

  function trialMicWarmingUp() {
    return !!(browserMicPostResumeUntil && Date.now() < browserMicPostResumeUntil);
  }

  function trialMicPlaybackBlocksListen() {
    return trialMicPausedForTts;
  }

  /** После речи идёт отсчёт паузы из «Пауза между фразами» — ещё не отправляем. */
  function trialMicPhraseEnding() {
    if (!isTrialMode() || !browserMicHadSpeechInChunk) return false;
    if (browserMicPostResumeUntil && Date.now() < browserMicPostResumeUntil) return false;
    const speechDur = browserMicSpeechOnsetAt ? Date.now() - browserMicSpeechOnsetAt : 0;
    if (speechDur < browserMicMinSpeechMsBeforeFlush()) return false;
    if (browserMicTrialPhrasePauseComplete()) return false;
    const pauseMs = browserMicSilenceFlushMs();
    const sinceStrong = browserMicLastStrongSpeechAt
      ? Date.now() - browserMicLastStrongSpeechAt
      : 0;
    return (
      (sinceStrong > 80 && sinceStrong < pauseMs) ||
      (browserMicSilenceAccumMs > 0 && browserMicSilenceAccumMs < pauseMs)
    );
  }

  let trialMicUploadRetryTimer = null;

  function trialScheduleMicUploadRetry() {
    if (trialMicUploadRetryTimer) return;
    trialMicUploadRetryTimer = setTimeout(() => {
      trialMicUploadRetryTimer = null;
      void drainBrowserMicUploadQueue();
    }, 450);
  }

  function trialClearMicUploadRetry() {
    if (trialMicUploadRetryTimer) {
      clearTimeout(trialMicUploadRetryTimer);
      trialMicUploadRetryTimer = null;
    }
  }

  function trialClearMicStatus() {
    trialMicStatus = null;
  }

  function trialSetMicStatus(phase) {
    trialMicStatus = phase || null;
    if (isTrialMode()) updateStatus();
  }

  function trialMicUserSpeaking() {
    if (!isTrialMode() || !browserMicHadSpeechInChunk) return false;
    if (trialMicPhraseEnding()) return false;
    if (browserMicPostResumeUntil && Date.now() < browserMicPostResumeUntil) return false;
    if (browserMicTrialPhrasePauseComplete()) return false;
    return browserMicLastRms > browserMicSpeechOnRmsThreshold();
  }

  function trialMicWaitingForPlayback() {
    if (!isTrialMode() || !browserMicCaptureActive || trialPhraseInFlight) return false;
    return trialBlocksMicUpload() && (trialMicPlaybackBlocksListen() || trialMicWarmingUp());
  }

  function trialMicStatusPhase() {
    if (!isTrialMode() || !state.isRunning) return '';
    if (trialMicStatus === 'encode') return 'encode';
    if (trialMicStatus === 'upload') return 'upload';
    if (trialPhraseInFlight) return 'processing';
    if (trialMicPausedForTts) {
      if (trialMicStatus === 'user_tts') return 'user_tts';
      return 'speaking';
    }
    if (trialPendingPartnerTurn) return 'press_play';
    if (trialMicWaitingForPlayback()) return 'wait_playback';
    if (trialMicWarmingUp()) return browserMicCaptureActive ? 'mic_resume' : 'mic_warmup';
    if (trialMicPhraseEnding()) return 'pause';
    if (trialMicUserSpeaking()) return 'recording';
    if (browserMicCaptureActive) return 'listening';
    if (trialAutoplayBusy) {
      if (trialMicStatus === 'partner_tts') return 'partner_tts';
      return 'speaking';
    }
    if (browserMicCaptureActive) return 'listening';
    return '';
  }

  function trialResetMicStatusPhase() {
    trialLastMicStatusPhase = '';
  }

  /** Лёгкое обновление строки статуса — без перезапуска таймеров и опроса. */
  function trialRefreshMicStatus() {
    if (!isTrialMode() || !state.isRunning || !elements.statusDiv) return;
    const phase = trialMicStatusPhase();
    if (phase === trialLastMicStatusPhase) return;
    trialLastMicStatusPhase = phase;
    const label = resolveTrialStatusLabel();
    if (!label) return;
    elements.statusDiv.textContent = label;
    elements.statusDiv.className = `status ${state.isRunning ? 'running' : 'stopped'}`;
  }
  function resolveTrialStatusLabel() {
    if (!isTrialMode() || !state.isRunning) return null;

    if (trialMicStatus === 'encode') return t('statusTrialEncoding');
    if (trialMicStatus === 'upload') return t('statusTrialUploading');
    if (trialPhraseInFlight) return t('statusTrialProcessing');

    if (trialMicPausedForTts) {
      if (trialMicStatus === 'user_tts') return t('statusTrialSpeakingUser');
      return t('statusTrialSpeaking');
    }

    if (trialPendingPartnerTurn) return t('statusTrialPressPlay');

    if (trialMicWaitingForPlayback()) return t('statusTrialWaitPlayback');

    if (trialMicWarmingUp()) {
      return browserMicCaptureActive ? t('statusTrialMicResume') : t('statusTrialMicWarmup');
    }

    if (trialMicPhraseEnding()) return t('statusTrialPhrasePause');

    if (trialMicUserSpeaking()) return t('statusTrialRecording');

    if (browserMicCaptureActive) return t('statusTrialListening');

    if (trialAutoplayBusy && trialMicStatus === 'partner_tts') return t('statusTrialSpeakingPartner');

    return null;
  }

  function browserMicArmPostResumeGrace(ms) {
    const def = isTrialMode() ? 240 : 280;
    browserMicPostResumeUntil = Date.now() + (typeof ms === 'number' ? ms : def);
    browserMicHadSpeechInChunk = false;
    browserMicSilenceAccumMs = 0;
    browserMicSpeechOnsetAt = 0;
    browserMicLastStrongSpeechAt = 0;
    clearBrowserMicPreroll();
  }

  function browserMicMarkStrongSpeech(rms) {
    if (isTrialMode() && browserMicHadSpeechInChunk) {
      if (browserMicLevelLoopDetectsSpeech(rms)) {
        browserMicLastStrongSpeechAt = Date.now();
      }
      return;
    }
    if (typeof rms === 'number' && rms > browserMicSpeechOnRmsThreshold()) {
      browserMicLastStrongSpeechAt = Date.now();
    }
  }

  function browserMicTrialPhrasePauseComplete() {
    if (!isTrialMode() || !browserMicHadSpeechInChunk) return false;
    const pauseMs = browserMicSilenceFlushMs();
    if (browserMicLevelLoopDetectsSpeech(browserMicLastRms)) return false;
    const sinceStrong = browserMicLastStrongSpeechAt
      ? Date.now() - browserMicLastStrongSpeechAt
      : Infinity;
    if (sinceStrong >= pauseMs) return true;
    return browserMicSilenceAccumMs >= pauseMs;
  }

  function defaultBrowserMicRmsThreshold() {
    if (isTrialMode()) return 0.004;
    if (isVoiceFlowDesktopClient() || state.recognitionMode === 'pro') return 0.004;
    return 0.002;
  }

  function browserMicNoiseCalibMultiplier() {
    if (isTrialMode()) return 2.35;
    if (state.recognitionMode === 'pro') return 2.35;
    return 2.5;
  }

  function browserMicNoiseCalibDurationMs() {
    return isTrialMode() ? 1400 : 1200;
  }

  function browserMicSortedPercentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
    return sorted[idx];
  }

  function micSensitivityPopoverOpen() {
    const pop = elements.micSensitivityPopover;
    return !!(pop && !pop.hasAttribute('hidden'));
  }

  function syncMicSensitivityUiSilently(threshold) {
    if (micSensitivityPopoverOpen() || document.activeElement === elements.micRmsThresholdRange) return;
    updateMicSensitivityUIFromServer(threshold);
  }

  function applyNoiseCalibrationFromSamples(samples) {
    if (!samples || samples.length < 4 || micRmsThresholdUserTouched) return null;
    const sorted = samples.slice().sort((a, b) => a - b);
    const p50 = browserMicSortedPercentile(sorted, 0.5);
    const p75 = browserMicSortedPercentile(sorted, 0.75);
    const floor = Math.max(p50, p75 * 0.88);
    const tmin = state.micRmsThresholdMin;
    const tmax = state.micRmsThresholdMax;
    const span = Math.max(0.00005, tmax - tmin);
    let th = Math.max(floor * browserMicNoiseCalibMultiplier(), floor + span * 0.02);
    th = Math.min(tmax, Math.max(tmin, th));
    browserMicSessionAutoThreshold = th;
    syncMicSensitivityUiSilently(th);
    return th;
  }

  function browserMicNoiseCalibPushSample(rms) {
    if (!browserMicNoiseCalibrating || !Number.isFinite(rms)) return;
    browserMicNoiseCalibSamples.push(rms);
  }

  function finishBrowserMicNoiseCalibration() {
    browserMicNoiseCalibrating = false;
    browserMicNoiseCalibTimer = null;
    const th = applyNoiseCalibrationFromSamples(browserMicNoiseCalibSamples.splice(0));
    if (th != null) {
      console.info(`[TalkPilot] Mic auto-calibration: threshold ${th.toFixed(5)}`);
    }
  }

  function cancelBrowserMicNoiseCalibration() {
    browserMicNoiseCalibrating = false;
    browserMicNoiseCalibSamples.length = 0;
    if (browserMicNoiseCalibTimer) {
      clearTimeout(browserMicNoiseCalibTimer);
      browserMicNoiseCalibTimer = null;
    }
  }

  function startBrowserMicNoiseCalibration() {
    if (micRmsThresholdUserTouched) return;
    cancelBrowserMicNoiseCalibration();
    browserMicNoiseCalibrating = true;
    browserMicNoiseCalibTimer = setTimeout(finishBrowserMicNoiseCalibration, browserMicNoiseCalibDurationMs());
  }

  async function maybeEarlyCalibrateMicNoise() {
    if (isTrialMode() || micRmsThresholdUserTouched || browserMicCaptureActive || browserMicNoiseCalibrating) return;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return;
    let perm = 'prompt';
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const st = await navigator.permissions.query({ name: 'microphone' });
        perm = st && st.state ? st.state : 'prompt';
      }
    } catch (e) {
      /* ignore */
    }
    if (perm !== 'granted') return;
    let stream = null;
    let ctx = null;
    try {
      stream = await openBrowserMicStream();
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
      if (ctx.state === 'suspended') await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = [];
      const buf = new Uint8Array(analyser.fftSize);
      await new Promise((resolve) => {
        let ticks = 0;
        const iv = setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const x = (buf[i] - 128) / 128;
            sum += x * x;
          }
          samples.push(Math.sqrt(sum / buf.length));
          ticks += 1;
          if (ticks >= 10) {
            clearInterval(iv);
            resolve();
          }
        }, 120);
      });
      applyNoiseCalibrationFromSamples(samples);
    } catch (e) {
      console.warn('maybeEarlyCalibrateMicNoise:', e);
    } finally {
      if (stream) {
        stream.getTracks().forEach((tr) => {
          try {
            tr.stop();
          } catch (e) {
            /* ignore */
          }
        });
      }
      if (ctx) {
        try {
          await ctx.close();
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  /** Порог VAD для браузерного микрофона / демо — из ползунка «Чувствительность микрофона». */
  function resolveMicRmsThresholdForBrowserMic() {
    const tmin = state.micRmsThresholdMin;
    const tmax = state.micRmsThresholdMax;
    if (typeof browserMicSessionAutoThreshold === 'number' && Number.isFinite(browserMicSessionAutoThreshold)) {
      return Math.min(tmax, Math.max(tmin, browserMicSessionAutoThreshold));
    }
    if (typeof state.micRmsThreshold === 'number' && Number.isFinite(state.micRmsThreshold)) {
      return Math.min(tmax, Math.max(tmin, state.micRmsThreshold));
    }
    try {
      const ls = localStorage.getItem('voiceTranslator_micRmsThreshold');
      if (ls != null) {
        const p = parseFloat(ls);
        if (Number.isFinite(p)) return Math.min(tmax, Math.max(tmin, p));
      }
    } catch (e) {
      /* ignore */
    }
    const r = elements.micRmsThresholdRange;
    if (r) {
      const pct = parseFloat(r.value);
      if (Number.isFinite(pct)) {
        return thresholdFromSensitivityPct(pct, tmin, tmax);
      }
    }
    return defaultBrowserMicRmsThreshold();
  }

  function browserMicSpeechOnRmsThreshold() {
    if (isTrialMode() || state.browserMicMode) {
      return resolveMicRmsThresholdForBrowserMic();
    }
    if (isVoiceFlowDesktopClient() || state.recognitionMode === 'pro') return 0.004;
    return 0.008;
  }

  /** Демо: ниже порог только для старта фразы (не терять первое слово). */
  function browserMicSpeechOnsetRmsThreshold() {
    const on = browserMicSpeechOnRmsThreshold();
    if (!isTrialMode() || browserMicHadSpeechInChunk) return on;
    return on * 0.78;
  }

  /** Гистерезис: пока идёт фраза, не считаем короткие провалы громкости «тишиной». */
  function browserMicSpeechOffRmsThreshold() {
    const on = browserMicSpeechOnRmsThreshold();
    const ratioInPhrase = 0.7;
    const ratioIdle = 0.75;
    if (browserMicHadSpeechInChunk) return on * ratioInPhrase;
    return on * ratioIdle;
  }

  function browserMicChunkHardCapMs(maxMs) {
    return Math.max(maxMs + 5000, Math.round(maxMs * 1.35));
  }

  /** Демо: аварийный потолок длины одной фразы (не режем по времени, пока идёт речь). */
  function browserMicTrialAbsMaxPhraseMs() {
    return 120000;
  }

  function browserMicSpeechRmsThreshold() {
    return browserMicSpeechOnRmsThreshold();
  }

  function browserMicLevelLoopDetectsSpeech(rawRms) {
    const onThr = browserMicHadSpeechInChunk
      ? browserMicSpeechOnRmsThreshold()
      : browserMicSpeechOnsetRmsThreshold();
    const offThr = browserMicSpeechOffRmsThreshold();
    return rawRms > onThr || (browserMicHadSpeechInChunk && rawRms > offThr);
  }

  function browserMicPrerollMaxSamples() {
    const rate =
      browserMicAudioCtx && browserMicAudioCtx.sampleRate
        ? browserMicAudioCtx.sampleRate
        : 48000;
    const sec = isTrialMode() ? 2.8 : 0.65;
    return Math.floor(rate * sec);
  }

  function pushBrowserMicPrerollChunk(chunk) {
    browserMicPrerollBuffers.push(new Float32Array(chunk));
    let total = 0;
    for (const p of browserMicPrerollBuffers) total += p.length;
    const max = browserMicPrerollMaxSamples();
    while (total > max && browserMicPrerollBuffers.length > 1) {
      total -= browserMicPrerollBuffers.shift().length;
    }
  }

  function prependBrowserMicPrerollToCapture() {
    if (!browserMicPrerollBuffers.length) return;
    const pre = browserMicPrerollBuffers.splice(0);
    for (let i = pre.length - 1; i >= 0; i--) {
      browserMicPcmBuffers.unshift(pre[i]);
    }
  }

  function clearBrowserMicPreroll() {
    browserMicPrerollBuffers = [];
    browserMicSpeechOnsetAt = 0;
  }

  /** Оставить ~280 ms до первого звука в чанке (не терять первое слово). */
  function browserMicTrimLeadingWithLeadPad(merged, sampleRate) {
    if (!merged || !merged.length) return merged;
    const rate = sampleRate || BROWSER_MIC_TARGET_RATE;
    const padSamples = Math.floor(rate * (isTrialMode() ? 0.72 : 0.18));
    const win = Math.max(64, Math.floor(rate * (isTrialMode() ? 0.012 : 0.018)));
    const thr = browserMicSpeechOffRmsThreshold() * (isTrialMode() ? 0.22 : 0.55);
    let firstSpeech = -1;
    for (let i = 0; i <= merged.length - win; i += Math.floor(win / 2)) {
      let sum = 0;
      for (let j = 0; j < win; j++) {
        const v = merged[i + j];
        sum += v * v;
      }
      if (Math.sqrt(sum / win) > thr) {
        firstSpeech = i;
        break;
      }
    }
    if (firstSpeech < 0) return merged;
    const start = Math.max(0, firstSpeech - padSamples);
    return start > 0 ? merged.subarray(start) : merged;
  }

  function browserMicMinSpeechMsBeforeFlush() {
    return 240;
  }

  /** Конец фразы: после речи выдержана пауза из меню «Пауза между фразами». */
  function browserMicPhraseSilenceEnded(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    if (browserMicPostResumeUntil && Date.now() < browserMicPostResumeUntil) return false;
    if (!browserMicHadSpeechInChunk) return false;
    const speechDur = browserMicSpeechOnsetAt ? Date.now() - browserMicSpeechOnsetAt : 0;
    if (speechDur < browserMicMinSpeechMsBeforeFlush()) return false;
    if (o.requirePcmSamples) {
      const minSamples = Math.floor(BROWSER_MIC_TARGET_RATE * browserMicMinFlushSeconds());
      if (browserMicBufferedSampleCount() < minSamples) return false;
    }
    if (isTrialMode()) return browserMicTrialPhrasePauseComplete();
    return browserMicSilenceAccumMs >= browserMicSilenceFlushMs();
  }

  /** Демо: не резать длинную фразу, пока идёт речь (в т.ч. тихое чтение подсказки). */
  function browserMicUserStillSpeaking() {
    if (isTrialMode() && browserMicHadSpeechInChunk) {
      if (browserMicTrialPhrasePauseComplete()) return false;
      return browserMicLevelLoopDetectsSpeech(browserMicLastRms);
    }
    return browserMicLevelLoopDetectsSpeech(browserMicLastRms);
  }

  function browserMicSilenceFlushReady() {
    return browserMicPhraseSilenceEnded({ requirePcmSamples: true });
  }

  function browserMicMinFlushSeconds() {
    if (isVoiceFlowDesktopClient()) {
      return state.recognitionMode === 'pro' ? 0.4 : 0.48;
    }
    if (isTrialMode()) return 0.55;
    return state.recognitionMode === 'pro' ? 0.55 : 0.35;
  }

  function browserMicMinChunkSeconds() {
    return 0.35;
  }

  function pickBrowserMicRecorderMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const m of candidates) {
      if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return '';
  }

  function defaultPhraseSilenceSec() {
    return isTrialMode() ? 2.4 : 1.7;
  }

  /** Пауза между фразами из меню чата (ползунок / поле «Пауза между фразами»). */
  function getPhraseSilenceSecForMic() {
    const fromUi = readPhraseSilenceSecFromInputs();
    if (fromUi != null) return fromUi;
    if (typeof state.phraseSilenceSec === 'number' && Number.isFinite(state.phraseSilenceSec)) {
      return phraseSilenceClamp(state.phraseSilenceSec);
    }
    try {
      const ls = localStorage.getItem('voiceTranslator_phraseSilenceSec');
      if (ls != null) {
        const p = parseFloat(ls);
        if (Number.isFinite(p)) return phraseSilenceClamp(p);
      }
    } catch (e) {
      /* ignore */
    }
    return phraseSilenceClamp(defaultPhraseSilenceSec());
  }

  function persistPhraseSilenceSecLocal(sec) {
    const v = phraseSilenceClamp(sec);
    state.phraseSilenceSec = v;
    try {
      localStorage.setItem('voiceTranslator_phraseSilenceSec', String(v));
    } catch (e) {
      /* ignore */
    }
    return v;
  }

  function browserMicChunkMs() {
    const pause = getPhraseSilenceSecForMic();
    const hardSec = isTrialMode()
      ? Math.max(32, pause + 18)
      : Math.max(12, pause + 10);
    return Math.round(hardSec * 1000);
  }

  /** Длительность тишины (мс) = «Пауза между фразами» в меню чата (сек → мс). */
  function browserMicSilenceFlushMs() {
    return Math.round(getPhraseSilenceSecForMic() * 1000);
  }

  function browserMicBufferedSampleCount() {
    let n = 0;
    for (const p of browserMicPcmBuffers) n += p.length;
    return n;
  }

  function tryEarlyBrowserMicFlush() {
    if (!browserMicCaptureActive || !state.isRunning || !state.browserMicMode) return;
    if (!browserMicPcmBuffers.length) return;
    /* Pro в браузере: WebM/таймер — не резать фразу на микропаузах. */
    if (state.recognitionMode === 'pro' && !isVoiceFlowDesktopClient()) return;
    if (!isVoiceFlowDesktopClient() && state.recognitionMode === 'basic') return;
    const now = Date.now();
    const pauseMs = browserMicSilenceFlushMs();
    const flushCooldown = 1100;
    if (now - browserMicLastFlushAt < flushCooldown) return;
    const minSamples = Math.floor(BROWSER_MIC_TARGET_RATE * browserMicMinFlushSeconds());
    if (browserMicBufferedSampleCount() < minSamples) return;
    if (browserMicSilenceFlushReady()) {
      browserMicHadSpeechInChunk = false;
      browserMicSilenceAccumMs = 0;
      browserMicSpeechOnsetAt = 0;
      browserMicLastStrongSpeechAt = 0;
      clearBrowserMicPreroll();
      browserMicLastFlushAt = now;
      void flushBrowserMicPcmChunk();
    }
  }

  function encodeWavMonoFloat32(samples, sampleRate) {
    const numSamples = samples.length;
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (off, s) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return buffer;
  }

  async function resampleFloat32To16k(input, fromRate) {
    const rate = fromRate || 48000;
    if (Math.abs(rate - BROWSER_MIC_TARGET_RATE) < 50) return input;
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) return input;
    const duration = input.length / rate;
    const length16 = Math.max(1, Math.round(duration * BROWSER_MIC_TARGET_RATE));
    const offline = new Ctx(1, length16, BROWSER_MIC_TARGET_RATE);
    const buf = offline.createBuffer(1, input.length, rate);
    buf.copyToChannel(input, 0);
    const src = offline.createBufferSource();
    src.buffer = buf;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }

  function normalizeBrowserPcmForUpload(samples) {
    if (!samples || !samples.length) return samples;
    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / samples.length);
    if (rms < 1e-6 && peak < 1e-5) return samples;
    let gain = 1;
    const targetRms = isTrialMode() ? 0.16 : 0.11;
    const maxGain = isTrialMode() ? 28 : 20;
    if (rms > 1e-6 && rms < targetRms) gain = Math.min(maxGain, targetRms / rms);
    if (peak > 1e-6 && peak * gain < 0.78) gain = Math.max(gain, Math.min(maxGain, 0.92 / peak));
    if (gain <= 1.04) return samples;
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      out[i] = Math.max(-1, Math.min(1, samples[i] * gain));
    }
    return out;
  }

  async function flushBrowserMicPcmChunk() {
    if (isTrialMode() && trialTextSubmitLock) return;
    if (isTrialMode()) trialUnduckPartnerPlayback();
    if (!browserMicPcmBuffers.length) return;
    const parts = browserMicPcmBuffers.splice(0, browserMicPcmBuffers.length);
    let total = 0;
    for (const p of parts) total += p.length;
    if (total < Math.floor(BROWSER_MIC_TARGET_RATE * browserMicMinChunkSeconds())) return;
    const merged = new Float32Array(total);
    let off = 0;
    for (const p of parts) {
      merged.set(p, off);
      off += p.length;
    }
    try {
      await new Promise((r) => setTimeout(r, 0));
      const fromRate = browserMicAudioCtx ? browserMicAudioCtx.sampleRate : 48000;
      const trimmed = browserMicTrimLeadingWithLeadPad(merged, fromRate);
      const pcm16raw = await resampleFloat32To16k(trimmed, fromRate);
      const pcm16 = normalizeBrowserPcmForUpload(pcm16raw);
      const wav = encodeWavMonoFloat32(pcm16, BROWSER_MIC_TARGET_RATE);
      const blob = new Blob([wav], { type: 'audio/wav' });
      if (blob.size > 400) {
        browserMicLastFlushAt = Date.now();
        void enqueueBrowserMicUpload(blob);
      }
    } catch (e) {
      console.warn('flushBrowserMicPcmChunk:', e);
    }
  }

  function teardownBrowserMicScriptProcessor() {
    if (browserMicScriptProcessor && browserMicGainNode && browserMicAudioCtx) {
      try {
        browserMicGainNode.disconnect(browserMicScriptProcessor);
        browserMicScriptProcessor.disconnect();
        if (browserMicSilentGain) browserMicSilentGain.disconnect();
      } catch (e) { /* ignore */ }
    }
    browserMicScriptProcessor = null;
    browserMicSilentGain = null;
    browserMicPcmBuffers = [];
  }

  /** Basic + WebM: перекодируем в WAV 16 kHz для Vosk на сервере. */
  async function browserMicWebmBlobToWav(blob) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('AudioContext unavailable');
    const ctx = new Ctx();
    try {
      const raw = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      const ch0 = decoded.getChannelData(0);
      let samples = ch0;
      if (decoded.numberOfChannels > 1) {
        const n = decoded.length;
        const mixed = new Float32Array(n);
        for (let c = 0; c < decoded.numberOfChannels; c++) {
          const ch = decoded.getChannelData(c);
          for (let i = 0; i < n; i++) mixed[i] += ch[i];
        }
        for (let i = 0; i < n; i++) mixed[i] /= decoded.numberOfChannels;
        samples = mixed;
      }
      const pcm16 = await resampleFloat32To16k(samples, decoded.sampleRate);
      const normalized = normalizeBrowserPcmForUpload(pcm16);
      const wav = encodeWavMonoFloat32(normalized, BROWSER_MIC_TARGET_RATE);
      return new Blob([wav], { type: 'audio/wav' });
    } finally {
      try {
        await ctx.close();
      } catch (_) {
        /* ignore */
      }
    }
  }

  async function prepareBrowserMicUploadBlob(blob) {
    if (!blob || blob.size < 400) return blob;
    const type = String(blob.type || '').toLowerCase();
    const needsWav =
      (isTrialMode() && state.recognitionMode !== 'pro') ||
      (state.recognitionMode === 'basic' &&
        (type.includes('webm') || type.includes('ogg')));
    if (!needsWav) return blob;
    try {
      return await browserMicWebmBlobToWav(blob);
    } catch (e) {
      console.warn('prepareBrowserMicUploadBlob:', e);
      return blob;
    }
  }

  function browserMicCapturePossible() {
    return !!(
      window.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /** Chrome/Edge не показывают запрос микрофона на http:// (кроме localhost). */
  function redirectUiToHttpsIfNeeded() {
    if (isTrialMode()) return false;
    try {
      const host = String(location.hostname || '');
      if (
        location.protocol === 'http:' &&
        host &&
        host !== 'localhost' &&
        host !== '127.0.0.1'
      ) {
        const target =
          'https://' + location.host + location.pathname + location.search + location.hash;
        if (target !== location.href) {
          location.replace(target);
          return true;
        }
      }
    } catch (e) { /* ignore */ }
    return false;
  }
  let trialSpeechListening = false;

  function speakTrialUserUtteranceWithBrowserTts(text, onDone) {
    const done = typeof onDone === 'function' ? onDone : () => {};
    const utter = String(text || '').trim();
    if (!utter || typeof speechSynthesis === 'undefined') {
      done();
      return;
    }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(utter);
      const pl = trialPartnerSpeakLangCode() || (state.userSpeakLang || 'ru').toLowerCase().slice(0, 2);
      if (pl === 'en') u.lang = 'en-US';
      else if (pl === 'de') u.lang = 'de-DE';
      else if (pl === 'fr') u.lang = 'fr-FR';
      else if (pl === 'es') u.lang = 'es-ES';
      else u.lang = 'ru-RU';
      u.rate = 0.96;
      u.volume = Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
      const pv = String(state.selectedVoice || '').trim();
      const wv = trialPickSpeechSynthesisVoice(pv);
      if (wv) u.voice = wv;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        done();
      };
      u.onend = finish;
      u.onerror = (ev) => {
        console.warn('speakTrialUserUtteranceWithBrowserTts onerror', ev);
        finish();
      };
      try {
        speechSynthesis.resume();
      } catch (eResume) {
        /* ignore */
      }
      speechSynthesis.speak(u);
      setTimeout(() => {
        if (!finished && !speechSynthesis.speaking && !speechSynthesis.pending) {
          console.warn('speakTrialUserUtteranceWithBrowserTts: no playback started');
          finish();
        }
      }, 1200);
    } catch (e) {
      console.warn('speakTrialUserUtteranceWithBrowserTts', e);
      done();
    }
  }

  /**
   * Озвучка «как слышит собеседник»: text на языке партнёра; клон — через /api/preview-cloned-voice, иначе Web Speech.
   */
  async function speakTrialUserUtteranceAsync(text, onDone) {
    const done = typeof onDone === 'function' ? onDone : () => {};
    if (!isTrialMode()) {
      done();
      return;
    }
    unlockBrowserAudioForPlayback();
    let utter = String(text || '').trim();
    if (!utter) {
      done();
      return;
    }
    utter = await ensurePartnerLanguageText(utter);
    if (!utter) {
      done();
      return;
    }
    getActiveVoiceForPlayback();
    const voice = String(state.selectedVoice || '').trim();
    const useClone =
      voice.startsWith('cloned:') &&
      state.useClonedVoice &&
      (state.clonedVoices.length > 0 || state.trialCloneVoiceId);
    const ttsLang = trialCloneTtsLanguage() || trialPartnerSpeakLangCode();
    if (useClone) {
      try {
        unlockBrowserAudioForPlayback();
        await playVoiceLikePreview(utter, voice, { language: ttsLang });
        done();
        return;
      } catch (e) {
        console.warn('speakTrialUserUtterance cloned TTS:', e);
        log('Демо: не удалось озвучить клоном, пробуем Edge или системный голос.', 'system');
      }
    }
    if (voice && !voice.startsWith('cloned:')) {
      try {
        await playVoiceLikePreview(utter, voice, { language: trialPartnerSpeakLangCode() });
        done();
        return;
      } catch (e) {
        console.warn('speakTrialUserUtterance Edge preview:', e);
        log('Демо: Edge-озвучка недоступна, пробуем голос браузера.', 'system');
      }
    }
    await ensureSpeechVoicesLoaded();
    await new Promise((resolve) => {
      speakTrialUserUtteranceWithBrowserTts(utter, () => {
        done();
        resolve();
      });
    });
  }

  function speakTrialUserUtterance(text, onDone) {
    void speakTrialUserUtteranceAsync(text, onDone);
  }

  /** Озвучка реплики партнёра в демо (дождаться окончания WAV / Web Speech). */
  async function drainSpeechSynthesisQueue(maxMs) {
    if (typeof speechSynthesis === 'undefined') return;
    const limit = typeof maxMs === 'number' ? maxMs : 120000;
    const t0 = Date.now();
    while ((speechSynthesis.speaking || speechSynthesis.pending) && Date.now() - t0 < limit) {
      await new Promise((r) => setTimeout(r, 80));
    }
    try {
      speechSynthesis.cancel();
    } catch (e) {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  async function speakTrialPartnerResponseAsync(d, turnEpoch) {
    if (!d || !isTrialMode()) return;
    if (isStaleTrialTurnEpoch(turnEpoch)) return;
    const seq = d.partner_turn_seq != null ? parseInt(d.partner_turn_seq, 10) : 0;
    const partnerTxtKey = String(d.partner_text || '').trim();
    if (Number.isFinite(seq) && seq > 0 && seq <= trialLastSpokenPartnerSeq) {
      return;
    }
    if (partnerTxtKey && partnerTxtKey === trialLastSpokenPartnerText) {
      return;
    }
    trialSetMicStatus('partner_tts');
    await prepareAudioOutputForPlayback();
    if (isStaleTrialTurnEpoch(turnEpoch)) return;
    await drainSpeechSynthesisQueue(90000);
    if (isStaleTrialTurnEpoch(turnEpoch)) return;
    let spokeOk = false;
    if (d.audio_wav_base64) {
      try {
        await playTrialWavBase64(d.audio_wav_base64);
        if (!isStaleTrialTurnEpoch(turnEpoch)) spokeOk = true;
        if (spokeOk) {
          if (Number.isFinite(seq) && seq > 0) {
            trialLastSpokenPartnerSeq = Math.max(trialLastSpokenPartnerSeq, seq);
          }
          if (partnerTxtKey) trialLastSpokenPartnerText = partnerTxtKey;
        }
        return;
      } catch (e) {
        console.warn('speakTrialPartnerResponseAsync wav:', e);
        if (!String(d.partner_text || '').trim()) return;
        log('Демо: WAV не воспроизвёлся, пробуем голос браузера.', 'system');
      }
    }
    const txt = String(d.partner_text || '').trim();
    if (!txt) return;
    if (typeof speechSynthesis === 'undefined') {
      log('Озвучка: в этом браузере нет Web Speech API.', 'system');
      return;
    }
    await ensureSpeechVoicesLoaded();
    await new Promise((resolve) => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(txt);
        const pl = trialPartnerSpeakLangCode() || (state.userSpeakLang || 'ru').toLowerCase().slice(0, 2);
        if (pl === 'en') u.lang = 'en-US';
        else if (pl === 'de') u.lang = 'de-DE';
        else if (pl === 'fr') u.lang = 'fr-FR';
        else if (pl === 'es') u.lang = 'es-ES';
        else u.lang = 'ru-RU';
        u.rate = 0.96;
        const pv = resolveTrialPartnerEdgeVoice(state.trialPartnerEdgeVoice, pl) ||
          String(state.trialPartnerEdgeVoice || '').trim();
        state.trialPartnerEdgeVoice = pv || state.trialPartnerEdgeVoice;
        const voiceForTts = pv || trialDefaultEdgeVoiceForLang(pl);
        let wv = trialPickSpeechSynthesisVoice(voiceForTts);
        if (!wv && voiceForTts !== state.trialPartnerEdgeVoice) {
          wv = trialPickSpeechSynthesisVoice(state.trialPartnerEdgeVoice);
        }
        if (wv) u.voice = wv;
        u.volume = Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        u.onend = finish;
        u.onerror = (ev) => {
          console.warn('speakTrialPartnerResponseAsync onerror', ev);
          finish();
        };
        try {
          speechSynthesis.resume();
        } catch (eResume) {
          /* ignore */
        }
        speechSynthesis.speak(u);
        setTimeout(() => {
          if (!finished && !speechSynthesis.speaking && !speechSynthesis.pending) finish();
        }, 1200);
        console.log('🔊 Демо: Web Speech (Edge TTS на сервере недоступен)');
      } catch (e) {
        console.warn('speechSynthesis', e);
        resolve();
      }
    });
    if (!isStaleTrialTurnEpoch(turnEpoch)) {
      if (Number.isFinite(seq) && seq > 0) {
        trialLastSpokenPartnerSeq = Math.max(trialLastSpokenPartnerSeq, seq);
      }
      if (partnerTxtKey) trialLastSpokenPartnerText = partnerTxtKey;
    }
  }

  /** Старт озвучки партнёра без ожидания (bootstrap и т.п.). */
  function speakTrialPartnerResponse(d) {
    void speakTrialPartnerResponseAsync(d);
  }

  /** Первая реплика собеседника — только после «Начать», не при открытии /ui. */
  async function runTrialBootstrapIfNeeded() {
    if (!isTrialMode() || !state.trialSessionId || state.trialLimitReached) return;
    const pev = trialPartnerEdgeVoiceForApi();
    const langs = trialLangParamsForApi();
    const bootUrl =
      `${CONFIG.apiBaseUrl}/api/trial/bootstrap?session_id=${encodeURIComponent(state.trialSessionId)}` +
      (pev ? `&partner_edge_voice=${encodeURIComponent(pev)}` : '') +
      `&user_speak_lang=${encodeURIComponent(langs.user_speak_lang)}` +
      `&partner_speak_lang=${encodeURIComponent(langs.partner_speak_lang)}`;
    const br = await fetch(bootUrl, { method: 'POST', credentials: 'include' });
    const bd = await br.json().catch(() => ({}));
    if (!br.ok) {
      throw new Error('trial bootstrap ' + br.status);
    }
    if (bd.already_started) {
      await fetchChat();
      return;
    }
    unlockBrowserAudioForPlayback();
    await trialRunWithMicPausedForPlayback(() => speakTrialPartnerResponseAsync(bd));
    if (bd.show_upgrade) showTrialUpgradeModal(bd);
    await fetchChat();
    ensureTrialMicReadyAfterPlayback(40);
  }

  let vfAudioCtx = null;
  let vfAudioUnlocked = false;
  let vfMasterAudio = null;
  let vfTrialPlaybackAudio = null;
  let vfAudioOutputResetTimer = null;
  /** Завершить ожидание playBlobOnSharedTrialElement (abort / barge-in). */
  let vfTrialPlaybackSettle = null;
  /** Приглушение озвучки собеседника, пока пользователь говорит (barge-in duck). */
  const TRIAL_PARTNER_DUCK_RATIO = 0.17;
  let trialPartnerDuckActive = false;
  let trialPartnerSavedVolume = null;
  let trialPartnerSpeechPausedForDuck = false;

  function ensurePlaybackAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!vfAudioCtx || vfAudioCtx.state === 'closed') {
      vfAudioCtx = new Ctx();
      vfAudioUnlocked = false;
    }
    if (vfAudioCtx.state === 'suspended') {
      try {
        void vfAudioCtx.resume();
      } catch (e) {
        /* ignore */
      }
    }
    return vfAudioCtx;
  }

  function ensureTrialPlaybackElement() {
    if (!vfTrialPlaybackAudio) {
      vfTrialPlaybackAudio = new Audio();
      vfTrialPlaybackAudio.preload = 'auto';
    }
    return vfTrialPlaybackAudio;
  }

  /** Остановить текущую озвучку собеседника (новый ход / подсказка). */
  function trialAbortPartnerPlayback() {
    try {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    } catch (e) {
      /* ignore */
    }
    const audio = vfTrialPlaybackAudio;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch (e2) {
        /* ignore */
      }
    }
    if (vfTrialPlaybackSettle) {
      const settle = vfTrialPlaybackSettle;
      vfTrialPlaybackSettle = null;
      try {
        settle();
      } catch (e3) {
        /* ignore */
      }
    }
    trialPartnerDuckActive = false;
    trialPartnerSavedVolume = null;
    trialPartnerSpeechPausedForDuck = false;
  }

  function trialPartnerBaseVolume() {
    return Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
  }

  function trialDuckPartnerPlayback() {
    if (!isTrialMode()) return;
    const audio = vfTrialPlaybackAudio;
    try {
      if (audio && !audio.paused && !audio.ended && audio.currentTime > 0) {
        if (!trialPartnerDuckActive) {
          trialPartnerSavedVolume = audio.volume;
        }
        audio.volume = Math.max(0.03, trialPartnerBaseVolume() * TRIAL_PARTNER_DUCK_RATIO);
        trialPartnerDuckActive = true;
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (
        typeof speechSynthesis !== 'undefined' &&
        speechSynthesis.speaking &&
        !speechSynthesis.paused &&
        !trialPartnerSpeechPausedForDuck
      ) {
        speechSynthesis.pause();
        trialPartnerSpeechPausedForDuck = true;
        trialPartnerDuckActive = true;
      }
    } catch (e2) {
      /* ignore */
    }
  }

  function trialUnduckPartnerPlayback() {
    if (!trialPartnerDuckActive) return;
    const audio = vfTrialPlaybackAudio;
    try {
      if (audio && !audio.paused && !audio.ended) {
        const restore =
          trialPartnerSavedVolume != null ? trialPartnerSavedVolume : trialPartnerBaseVolume();
        audio.volume = Math.min(1, Math.max(0, restore));
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (trialPartnerSpeechPausedForDuck && typeof speechSynthesis !== 'undefined') {
        speechSynthesis.resume();
      }
    } catch (e2) {
      /* ignore */
    }
    trialPartnerDuckActive = false;
    trialPartnerSavedVolume = null;
    trialPartnerSpeechPausedForDuck = false;
  }

  function trialRefreshPartnerDuckFromMic() {
    if (!isTrialMode() || !trialPartnerDuckActive) return;
    if (trialMicPhraseEnding() || browserMicTrialPhrasePauseComplete()) {
      trialUnduckPartnerPlayback();
    }
  }

  function trialIsPartnerAudible() {
    try {
      if (typeof speechSynthesis !== 'undefined' && (speechSynthesis.speaking || speechSynthesis.pending)) {
        return true;
      }
    } catch (e) {
      /* ignore */
    }
    const audio = vfTrialPlaybackAudio;
    try {
      return !!(audio && !audio.paused && !audio.ended && audio.currentTime > 0);
    } catch (e2) {
      return false;
    }
  }

  /** Пользователь начал говорить — приглушаем озвучку собеседника (barge-in duck). */
  function trialBargeInOnUserSpeechStart() {
    if (!isTrialMode() || !state.isRunning || trialMicPausedForTts) return;
    if (trialIsPartnerAudible() || trialMicStatus === 'partner_tts') {
      trialDuckPartnerPlayback();
      trialRefreshMicStatus();
    }
  }

  function vfMediaElementSupportsSinkId(el) {
    return !!(el && typeof el.setSinkId === 'function');
  }

  /** Пустой sinkId = устройство по умолчанию ОС; иначе выбранный динамик из меню чата. */
  async function vfApplyAudioSink(el) {
    if (!vfMediaElementSupportsSinkId(el)) return;
    const sinkId = getAudioOutputDeviceId() || '';
    try {
      await el.setSinkId(sinkId);
    } catch (e) {
      if (sinkId) {
        try {
          await el.setSinkId('');
        } catch (e2) {
          console.warn('vfApplyAudioSink fallback', e2);
        }
      } else {
        console.warn('vfApplyAudioSink', e);
      }
    }
  }

  async function vfApplyDefaultAudioSink(el) {
    return vfApplyAudioSink(el);
  }

  function resetBrowserAudioOutputForDeviceChange() {
    vfAudioUnlocked = false;
    vfMasterAudio = null;
    vfTrialPlaybackAudio = null;
    safeCloseAudioContext(vfAudioCtx);
    vfAudioCtx = null;
  }

  function initBrowserAudioOutputListeners() {
    if (window.__vfAudioOutputListenersBound) return;
    window.__vfAudioOutputListenersBound = true;
    const onOutputChange = () => {
      if (vfAudioOutputResetTimer) clearTimeout(vfAudioOutputResetTimer);
      vfAudioOutputResetTimer = setTimeout(() => {
        void refreshAudioDeviceLists();
        resetBrowserAudioOutputForDeviceChange();
        unlockBrowserAudioForPlayback();
      }, 280);
    };
    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', onOutputChange);
    }
    window.addEventListener('focus', onOutputChange);
  }

  /** Синхронно в обработчике клика — иначе Chrome блокирует play() после await TTS. */
  function ensureMasterPlaybackAudio() {
    if (!vfMasterAudio) {
      vfMasterAudio = new Audio();
      vfMasterAudio.preload = 'auto';
    }
    return vfMasterAudio;
  }

  async function prepareAudioOutputForPlayback() {
    unlockBrowserAudioForPlayback();
    try {
      if (vfAudioCtx && vfAudioCtx.state === 'suspended') {
        await vfAudioCtx.resume();
      }
    } catch (e) {
      /* ignore */
    }
    const ma = ensureMasterPlaybackAudio();
    await vfApplyDefaultAudioSink(ma);
  }

  function unlockBrowserAudioForPlayback() {
    try {
      if (!ensurePlaybackAudioContext()) return false;
      if (!vfAudioUnlocked) {
        const buf = vfAudioCtx.createBuffer(1, 1, 22050);
        const src = vfAudioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(vfAudioCtx.destination);
        src.start(0);
        vfAudioUnlocked = true;
      }
      const unlockEl = new Audio();
      unlockEl.muted = false;
      unlockEl.volume = 0.02;
      void vfApplyDefaultAudioSink(unlockEl);
      unlockEl.src =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=';
      const p = unlockEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  async function playBlobOnSharedTrialElement(blob) {
    await prepareAudioOutputForPlayback();
    const baseVol = trialPartnerBaseVolume();
    const vol = trialPartnerDuckActive
      ? Math.max(0.03, baseVol * TRIAL_PARTNER_DUCK_RATIO)
      : baseVol;
    const url = URL.createObjectURL(blob);
    const audio = ensureTrialPlaybackElement();
    await vfApplyDefaultAudioSink(audio);
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      };
      const finish = (err) => {
        if (settled) return;
        settled = true;
        if (vfTrialPlaybackSettle === finish) vfTrialPlaybackSettle = null;
        cleanup();
        if (err) reject(err);
        else resolve();
      };
      vfTrialPlaybackSettle = finish;
      const startPlay = () => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = vol;
        void vfApplyDefaultAudioSink(audio);
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            setTimeout(() => {
              if (settled) return;
              const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
              if (dur > 0.35 && audio.paused && audio.currentTime < 0.02) {
                finish(new Error('trial_playback_stalled'));
              }
            }, 700);
          }).catch((e) => finish(e));
        }
      };
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('trial_shared_audio_error'));
      audio.src = url;
      audio.load();
      if (audio.readyState >= 3) startPlay();
      else audio.addEventListener('canplaythrough', startPlay, { once: true });
      setTimeout(() => {
        if (!settled && audio.paused) finish(new Error('trial_playback_timeout'));
      }, 22000);
    });
  }

  function trialRaceTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(label || 'trial_timeout')), ms);
      }),
    ]);
  }

  async function playTrialAudioFromBytes(arr, mime) {
    const vol = Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
    const type = mime || 'audio/wav';
    const blob = new Blob([arr], { type });
    try {
      await trialRaceTimeout(playBlobOnSharedTrialElement(blob), 28000, 'trial_html_audio_timeout');
      return;
    } catch (htmlErr) {
      console.warn('trial HTML audio play:', htmlErr);
    }
    if (type !== 'audio/mpeg' && vfAudioCtx && vfAudioUnlocked) {
      try {
        await trialRaceTimeout(playWavBytesWithWebAudio(arr, vol), 14000, 'trial_webaudio_timeout');
      } catch (e) {
        console.warn('trial WebAudio play:', e);
        throw e;
      }
    }
  }

  async function playBlobInMasterAudio(blob) {
    if (isTrialMode()) {
      const buf = await blob.arrayBuffer();
      await playTrialAudioFromBytes(new Uint8Array(buf), blob.type || 'audio/wav');
      return;
    }
    await prepareAudioOutputForPlayback();
    const vol = Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'auto';
    await vfApplyDefaultAudioSink(audio);
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = vol;
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      };
      const finish = (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (err) reject(err);
        else resolve();
      };
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('master_audio_error'));
      const startPlay = () => {
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.catch((e) => finish(e));
        }
      };
      audio.src = url;
      audio.load();
      if (audio.readyState >= 3) startPlay();
      else audio.addEventListener('canplaythrough', startPlay, { once: true });
      setTimeout(() => {
        if (!settled && audio.paused) {
          finish(new Error('master_audio_timeout'));
        }
      }, 20000);
    });
  }

  function wavBase64ToBytes(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function playWavBytesWithWebAudio(arr, vol) {
    const ctx = vfAudioCtx;
    if (!ctx) return Promise.reject(new Error('audio_context_missing'));
    return ctx.decodeAudioData(arr.buffer.slice(0)).then((audioBuf) => new Promise((resolve, reject) => {
      try {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = vol;
        src.buffer = audioBuf;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.onended = () => resolve();
        src.start(0);
      } catch (e) {
        reject(e);
      }
    }));
  }

  function playWavBytesWithHtmlAudio(arr, vol) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([arr], { type: 'audio/wav' }));
      const a = new Audio(url);
      a.volume = vol;
      void vfApplyDefaultAudioSink(a);
      a.onended = () => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        resolve();
      };
      a.onerror = () => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        reject(new Error('html_audio_error'));
      };
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(reject);
    });
  }

  async function playAudioBase64InBrowser(b64, format) {
    if (!b64) return;
    unlockBrowserAudioForPlayback();
    const vol = Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
    const mime = format === 'mpeg' ? 'audio/mpeg' : 'audio/wav';
    const arr = wavBase64ToBytes(b64);
    if (isTrialMode()) {
      await playTrialAudioFromBytes(arr, mime);
      return;
    }
    if (mime === 'audio/mpeg') {
      await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(new Blob([arr], { type: mime }));
        const a = new Audio(url);
        a.volume = vol;
        a.onended = () => { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } resolve(); };
        a.onerror = () => { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } reject(new Error('mpeg_play_error')); };
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(reject);
      });
      return;
    }
    if (vfAudioCtx && vfAudioUnlocked) {
      try {
        await playWavBytesWithWebAudio(arr, vol);
        return;
      } catch (e) {
        console.warn('WebAudio play:', e && e.message ? e.message : e);
      }
    }
    await playWavBytesWithHtmlAudio(arr, vol);
  }

  async function playWavBase64InBrowser(b64) {
    return playAudioBase64InBrowser(b64, 'wav');
  }

  function playTrialWavBase64(b64) {
    if (!isTrialMode()) return Promise.resolve();
    return playWavBase64InBrowser(b64);
  }

  async function applyVoiceMessageResult(res, msgId) {
    if (!res) return false;
    if (res.error) {
      log(t('logError') + String(res.error), 'error');
      if (msgId != null) await fetchChat();
      return false;
    }
    const mid = res.msg_id != null ? res.msg_id : msgId;
    const playB64 = res.audio_base64 || res.audio_wav_base64;
    const playFmt = res.audio_format || (res.audio_wav_base64 ? 'wav' : 'mpeg');
    if (res.status === 'client_play' && playB64) {
      try {
        await playAudioBase64InBrowser(playB64, playFmt);
        applyVoiceMessageDoneUi(mid);
        return true;
      } catch (playErr) {
        const v = getActiveVoiceForPlayback();
        const tr = getMessageSpeakText(mid, res.translated || '');
        if (tr && v && !v.startsWith('cloned:')) {
          try {
            await playVoiceLikePreview(tr, v);
            applyVoiceMessageDoneUi(mid);
            return true;
          } catch (retryErr) { /* fall through */ }
        }
        log(t('voicePlayBlockedHint'), 'error');
        await fetchChat();
        return false;
      }
    }
    if (res.status === 'played' || res.status === 'prepared') {
      if (state.serverAudioAvailable === false && res.status === 'played') {
        const v = getActiveVoiceForPlayback();
        const tr = getMessageSpeakText(mid, res.translated || '');
        if (tr && v && !v.startsWith('cloned:')) {
          try {
            await playVoiceLikePreview(tr, v);
            applyVoiceMessageDoneUi(mid);
            return true;
          } catch (e) { /* fall through */ }
        }
      }
      applyVoiceMessageDoneUi(mid);
      return res.status === 'played';
    }
    return false;
  }

  function applyVoiceMessageDoneUi(msgId) {
    updateMessageFromHistory({ msg_id: msgId });
  }

  function showTrialUpgradeModal(data) {
    if (document.getElementById('trialUpgradeModalOverlay')) return;
    const hint = data && (data.upgrade_hint || data.upgradeHint);
    const auth = data && data.authenticated;
    const blocking = !!(data && (data.show_upgrade || data.limit_reached));
    if (blocking) state.trialLimitReached = true;
    const wrap = document.createElement('div');
    wrap.id = 'trialUpgradeModalOverlay';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:20000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1e293b;border:1px solid #475569;border-radius:14px;padding:1.25rem;max-width:420px;width:100%;color:#e2e8f0;';
    const regHref = (data && data.upgrade_register_url) || '/login?register=1';
    const dashHref = (data && data.upgrade_dashboard_url) || '/dashboard';
    const priceHref = (data && data.upgrade_pricing_url) || '/pricing';
    const closeBtnHtml = blocking
      ? ''
      : '<button type="button" id="trialUpCloseL" style="flex:1;min-width:120px;padding:0.55rem;border-radius:8px;background:#0f172a;border:1px solid #475569;color:#e2e8f0;font-weight:600;cursor:pointer;font-size:0.85rem;">Закрыть</button>';
    box.innerHTML = `<p style="margin:0 0 1rem;line-height:1.5;font-size:0.92rem;color:#cbd5e1;">${String(hint || '').replace(/</g, '&lt;')}</p><div style="display:flex;flex-wrap:wrap;gap:0.5rem;"><a id="trialUpRegL" href="${regHref}" style="flex:1;min-width:120px;text-align:center;padding:0.55rem;border-radius:8px;background:#6366f1;color:#fff;font-weight:600;text-decoration:none;font-size:0.85rem;">Регистрация</a><a href="${dashHref}" style="flex:1;min-width:120px;text-align:center;padding:0.55rem;border-radius:8px;background:#334155;color:#e2e8f0;font-weight:600;text-decoration:none;font-size:0.85rem;">Личный кабинет</a><a href="${priceHref}" style="flex:1;min-width:120px;text-align:center;padding:0.55rem;border-radius:8px;background:#334155;color:#e2e8f0;font-weight:600;text-decoration:none;font-size:0.85rem;">Тарифы</a>${closeBtnHtml}</div>`;
    if (auth) {
      const r = box.querySelector('#trialUpRegL');
      if (r) r.style.display = 'none';
    }
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    if (!blocking) {
      box.querySelector('#trialUpCloseL')?.addEventListener('click', () => wrap.remove());
      wrap.addEventListener('click', (ev) => {
        if (ev.target === wrap) wrap.remove();
      });
    }
  }

  /** Отсекает японский/китайский и т.п. при выбранном русском (и наоборот). */
  function trialLatinTokenOkForRu(word) {
    const w = String(word || '').replace(/[^\w]/g, '').toLowerCase();
    return ['ok', 'okay', 'yes', 'no', 'stop', 'hi', 'hello', 'bye', 'thanks', 'please', 'да', 'нет'].includes(w);
  }

  function trialLatinOnlyOkForRu(text) {
    const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 0 && parts.every((p) => trialLatinTokenOkForRu(p));
  }

  function trialUserSttTextLooksValid(text) {
    const tx = String(text || '').trim();
    if (!tx) return false;
    const lang = (state.userSpeakLang || 'ru').toLowerCase().slice(0, 2);
    const cjk = (tx.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g) || []).length;
    const cyr = (tx.match(/[\u0400-\u04FF\u0450-\u045F]/g) || []).length;
    const lat = (tx.match(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length;
    const total = cjk + cyr + lat;
    if (total === 0) return true;
    if (lang === 'ru') {
      if (cjk && !cyr) return false;
      if (cjk >= Math.max(2, Math.floor(total * 0.22))) return false;
      if (lat > 0 && !cyr && !trialLatinOnlyOkForRu(tx)) return false;
    } else if (['en', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'nl', 'tr'].includes(lang)) {
      if (cjk >= Math.max(2, Math.floor(total * 0.2))) return false;
      if (cyr > Math.floor(total * 0.42)) return false;
    }
    return true;
  }

  function trialClearListenResumeTimer() {
    if (trialListenResumeTimer) {
      clearTimeout(trialListenResumeTimer);
      trialListenResumeTimer = null;
    }
  }

  function trialResumeListeningAfterTurn(delayMs) {
    if (isTrialMode()) {
      if (trialPhraseInFlight) return;
      ensureTrialMicReadyAfterPlayback(typeof delayMs === 'number' ? delayMs : 80);
      return;
    }
    trialClearListenResumeTimer();
    if (!state.isRunning || state.trialLimitReached) return;
    const delay = typeof delayMs === 'number' ? delayMs : 320;
    trialListenResumeTimer = setTimeout(() => {
      trialListenResumeTimer = null;
      if (!state.isRunning || state.trialLimitReached) return;
      if (browserMicCaptureActive) return;
      trialStartBrowserRecognition();
    }, delay);
  }

  async function trialReleaseDeferredPartnerToChat(turnSeq) {
    if (!isTrialMode() || !state.trialSessionId) return false;
    const seq = typeof turnSeq === 'number' ? turnSeq : parseInt(turnSeq, 10);
    try {
      const r = await fetch(`${CONFIG.apiBaseUrl}/api/trial/release-partner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ session_id: state.trialSessionId }),
      });
      const rel = await r.json().catch(() => ({}));
      if (!r.ok) {
        log('Демо: не удалось показать ответ собеседника (' + r.status + ')', 'error');
        return false;
      }
      const relSeq = rel.partner_turn_seq != null ? parseInt(rel.partner_turn_seq, 10) : seq;
      if (Number.isFinite(relSeq) && relSeq > 0) {
        trialReleasedPartnerSeq = Math.max(trialReleasedPartnerSeq, relSeq);
      } else if (Number.isFinite(seq) && seq > 0) {
        trialReleasedPartnerSeq = Math.max(trialReleasedPartnerSeq, seq);
      }
      await fetchChat();
      return !rel.already_released && !rel.deduped;
    } catch (e) {
      console.warn('trialReleaseDeferredPartnerToChat:', e);
      return false;
    }
  }

  function trialTurnHasPartnerReply(d) {
    if (!d) return false;
    return (
      !!String(d.partner_text || '').trim() ||
      String(d.audio_wav_base64 || '').length > 80
    );
  }

  async function trialReleasePendingPartnerTurn() {
    const p = trialPendingPartnerTurn;
    if (!p || !isTrialMode() || !state.trialSessionId) return;
    try {
      const r = await fetch(`${CONFIG.apiBaseUrl}/api/trial/release-partner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ session_id: state.trialSessionId }),
      });
      const rel = await r.json().catch(() => ({}));
      if (!r.ok) {
        log('Демо: не удалось показать ответ собеседника (' + r.status + ')', 'error');
        return;
      }
      if (!rel.already_released) {
        const speakPayload = { ...p, ...rel };
        await trialRunWithMicPausedForPlayback(() => speakTrialPartnerResponseAsync(speakPayload));
      }
      trialPendingPartnerTurn = null;
      await fetchChat();
    } catch (e) {
      log(t('logError') + (e && e.message ? e.message : e), 'error');
    } finally {
      trialResumeListeningAfterTurn(380);
    }
  }

  function markLatestTrialUserMessageDone(voiceOk) {
    const users = elements.userMessages?.querySelectorAll('.msg-bubble.user');
    const latestUser = users && users.length ? users[users.length - 1] : null;
    if (!latestUser) return;
    const mid = parseInt(latestUser.dataset.msgId, 10);
    if (!mid) return;
    if (voiceOk) {
      updateMsgStatus(mid, t('msgStatusDone'), '#22c55e');
    } else {
      updateMsgStatus(mid, t('msgStatusWaiting'), '#eab308');
    }
  }

  /** Озвучка перевода пользователя (как слышит собеседник): WAV → WebAudio → Web Speech. */
  async function playTrialUserReplyAudio(d, fallbackPartnerText) {
    if (isTrialMode()) trialSetMicStatus('user_tts');
    await prepareAudioOutputForPlayback();
    const userB64 = String((d && d.user_audio_wav_base64) || '').trim();
    const partnerTxt = String(
      (d && d.user_tts_partner_lang) || fallbackPartnerText || ''
    ).trim();
    if (userB64.length > 80) {
      try {
        await playTrialWavBase64(userB64);
        return true;
      } catch (wavErr) {
        console.warn('playTrialUserReplyAudio wav:', wavErr);
      }
      try {
        const arr = wavBase64ToBytes(userB64);
        await trialRaceTimeout(
          playWavBytesWithWebAudio(arr, getUserTtsVolumePlayback()),
          18000,
          'trial_user_webaudio_timeout'
        );
        return true;
      } catch (waErr) {
        console.warn('playTrialUserReplyAudio webaudio:', waErr);
      }
    }
    if (partnerTxt) {
      await ensureSpeechVoicesLoaded();
      await speakTrialUserUtteranceAsync(partnerTxt);
      return true;
    }
    return false;
  }

  function bumpTrialMicTurnEpoch() {
    trialMicTurnEpoch += 1;
    trialAbortPartnerPlayback();
    browserMicUploadQueue.length = 0;
    trialClearMicUploadRetry();
    return trialMicTurnEpoch;
  }

  function beginTrialTurnApply(turnEpoch) {
    if (turnEpoch != null) trialActiveApplyEpoch = turnEpoch;
  }

  function endTrialTurnApply(turnEpoch) {
    if (turnEpoch != null && trialActiveApplyEpoch === turnEpoch) trialActiveApplyEpoch = 0;
  }

  function isStaleTrialTurnEpoch(turnEpoch) {
    if (turnEpoch == null) return false;
    if (turnEpoch === trialActiveApplyEpoch) return false;
    return turnEpoch !== trialMicTurnEpoch;
  }

  function trialPartnerBubbleCount() {
    const nodes = elements.partnerMessages?.querySelectorAll('.msg-bubble.partner');
    return nodes ? nodes.length : 0;
  }

  function trialTurnNeedsPartnerRelease(d) {
    if (!d || !trialTurnHasPartnerReply(d)) return false;
    const partnerCount = trialPartnerBubbleCount();
    const pc = d.partner_count != null ? parseInt(d.partner_count, 10) : NaN;
    if (Number.isFinite(pc) && pc > 0) return partnerCount < pc;
    const seq = d.partner_turn_seq != null ? parseInt(d.partner_turn_seq, 10) : 0;
    return Number.isFinite(seq) && seq > 0 && seq > partnerCount;
  }

  /** Гарантированно показать и озвучить ответ собеседника (идемпотентно). */
  async function trialRecoverPartnerTurn(d, turnEpoch, hasPartnerAudio) {
    if (!d || !trialTurnHasPartnerReply(d)) return;
    if (trialTurnNeedsPartnerRelease(d)) {
      await trialReleaseDeferredPartnerToChat(d.partner_turn_seq);
    } else {
      await fetchChat();
    }
    if (!hasPartnerAudio) return;
    const seq = d.partner_turn_seq != null ? parseInt(d.partner_turn_seq, 10) : 0;
    const spoken = Number.isFinite(seq) && seq > 0 && seq <= trialLastSpokenPartnerSeq;
    if (!spoken) {
      await speakTrialPartnerResponseAsync(d, turnEpoch);
    }
  }

  async function applyTrialTurnPayload(d, utter, turnEpoch) {
    if (!d) return;
    if (isStaleTrialTurnEpoch(turnEpoch)) {
      console.info('[TalkPilot] Skip stale trial turn (superseded by newer phrase)');
      return;
    }
    beginTrialTurnApply(turnEpoch);
    let hasPartnerReply = false;
    let hasPartnerAudio = false;
    let playUserTranslation = false;
    try {
    logTrialSttServiceToConsole(d);
    unlockBrowserAudioForPlayback();
    let ttsPartnerLang = String(d.user_tts_partner_lang || utter).trim() || utter;
    if (!String(d.user_tts_partner_lang || '').trim()) {
      ttsPartnerLang = await ensurePartnerLanguageText(ttsPartnerLang);
    }
    if (isStaleTrialTurnEpoch(turnEpoch)) return;
    playUserTranslation = !!state.autoPlay;
    hasPartnerReply = trialTurnHasPartnerReply(d);
    hasPartnerAudio =
      !!(d.audio_wav_base64 && String(d.audio_wav_base64).length > 80) ||
      !!String(d.partner_text || '').trim();
    await fetchChat();
    if (isStaleTrialTurnEpoch(turnEpoch)) return;
    if (playUserTranslation) {
      try {
        let userPlayed = false;
        await trialRaceTimeout(
          trialRunWithMicPausedForPlayback(async () => {
            if (isStaleTrialTurnEpoch(turnEpoch)) return;
            userPlayed = await playTrialUserReplyAudio(d, ttsPartnerLang);
            await drainSpeechSynthesisIfActive(4000);
            if (hasPartnerReply && trialTurnNeedsPartnerRelease(d)) {
              await trialReleaseDeferredPartnerToChat(d.partner_turn_seq);
              await fetchChat();
            }
          }),
          75000,
          'trial_user_autoplay_timeout'
        );
        if (!isStaleTrialTurnEpoch(turnEpoch) && hasPartnerAudio) {
          void trialRaceTimeout(
            speakTrialPartnerResponseAsync(d, turnEpoch),
            50000,
            'trial_partner_speak_timeout'
          ).catch((speakErr) => {
            console.warn('trial partner speak (background):', speakErr);
          });
        }
        if (isStaleTrialTurnEpoch(turnEpoch)) return;
        await fetchChat();
        markLatestTrialUserMessageDone(userPlayed);
        if (!userPlayed) {
          log(t('trialUserVoicePlayHint'), 'system');
        }
        trialPendingPartnerTurn = null;
      } catch (e) {
        console.warn('applyTrialTurnPayload autoplay:', e);
        const msg =
          e && e.message === 'trial_user_autoplay_timeout'
            ? 'Демо: озвучка вашей фразы прервана по таймауту — нажмите Play у фразы или говорите снова.'
            : e && e.message === 'trial_autoplay_timeout'
              ? 'Демо: озвучка прервана по таймауту — нажмите Play у фразы или говорите снова.'
              : t('voicePlayFailed') + (e && e.message ? e.message : e);
        log(msg, 'error');
        if (hasPartnerReply) trialPendingPartnerTurn = d;
        await fetchChat();
      }
      ensureTrialMicReadyAfterPlayback(60);
    } else {
      trialPendingPartnerTurn = hasPartnerReply ? d : null;
      await fetchChat();
      log('Нажмите Play у своей фразы — после озвучки появится ответ собеседника.', 'system');
      ensureTrialMicReadyAfterPlayback(60);
    }
    if (d.show_upgrade) showTrialUpgradeModal(d);
    } finally {
      if (hasPartnerReply && playUserTranslation && trialTurnNeedsPartnerRelease(d)) {
        try {
          await trialReleaseDeferredPartnerToChat(d.partner_turn_seq);
          await fetchChat();
        } catch (recErr) {
          console.warn('trialReleaseDeferredPartnerToChat (finally):', recErr);
        }
      }
      endTrialTurnApply(turnEpoch);
    }
  }

  async function trialSubmitUserText(rawText) {
    const utter = String(rawText || '').trim();
    if (!utter || !isTrialMode() || state.trialLimitReached) return;
    unlockBrowserAudioForPlayback();
    if (trialPendingPartnerTurn) {
      log('Сначала озвучьте свою фразу (Play) — затем появится ответ собеседника.', 'system');
      return;
    }
    if (trialAutoplayBusy || trialActiveApplyEpoch) {
      log('Демо: дождитесь окончания озвучки текущей фразы.', 'system');
      return;
    }
    trialPauseMicForUserTextSubmit();
    const turnEpoch = bumpTrialMicTurnEpoch();
    trialPhraseInFlight = true;
    trialSetMicStatus('upload');
    armTrialProcessingWatchdog(125000);
    updateStatus();
    trialClearListenResumeTimer();
    trialStopBrowserRecognition(false);
    try {
      const pev = trialPartnerEdgeVoiceForApi();
      const { resp: r, d } = await trialFetchJson(
        `${CONFIG.apiBaseUrl}/api/trial/turn`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            session_id: state.trialSessionId,
            user_text: utter,
            partner_edge_voice: pev || null,
            ...trialLangParamsForApi(),
          }),
        },
        90000
      );
      if (!r.ok) {
        const detail = d && d.detail != null ? String(d.detail) : '';
        log(detail || 'Демо: ошибка отправки ' + r.status, 'error');
        ensureTrialMicReadyAfterPlayback(80);
        return;
      }
      trialAutoplayBusy = true;
      updateStatus();
      try {
        await applyTrialTurnPayload(d, utter, turnEpoch);
      } finally {
        trialAutoplayBusy = false;
        updateStatus();
      }
    } catch (e) {
      const errMsg =
        e && e.message === 'trial_request_timeout'
          ? 'Демо: сервер не ответил вовремя. Попробуйте ещё раз.'
          : t('logError') + (e && e.message ? e.message : e);
      log(errMsg, 'error');
      ensureTrialMicReadyAfterPlayback(80);
    } finally {
      clearTrialProcessingWatchdog();
      trialPhraseInFlight = false;
      trialAutoplayBusy = false;
      trialTextSubmitLock = false;
      trialIgnoreMicRecorderStopUpload = false;
      trialClearMicStatus();
      updateStatus();
    }
  }

  async function uploadTrialMicChunk(blob) {
    if (!isTrialMode() || !state.isRunning || state.trialLimitReached) return;
    if (trialTextSubmitLock) return;
    if (trialBlocksMicUpload() || trialPendingPartnerTurn) {
      if (blob && blob.size >= 400) {
        browserMicUploadQueue.push(blob);
        trialScheduleMicUploadRetry();
      }
      if (trialMicPlaybackBlocksListen() || trialMicWarmingUp()) {
        const now = Date.now();
        if (now - browserMicLastSttHintAt > 3500) {
          browserMicLastSttHintAt = now;
          log(t('trialWaitPartnerPlayback'), 'system');
        }
        updateStatus();
      }
      return;
    }
    if (!blob || blob.size < 400) return;
    if (trialPhraseInFlight && browserMicUploading) {
      browserMicUploadQueue.push(blob);
      return;
    }
    const uploadEpoch = bumpTrialMicTurnEpoch();
    if (!trialPhraseInFlight) {
      trialPhraseInFlight = true;
      armTrialProcessingWatchdog(state.recognitionMode === 'pro' ? 95000 : 70000);
    }
    trialSetMicStatus('encode');
    updateStatus();
    log(t('trialUploadingSpeech'), 'system');
    try {
      const uploadBlob = await prepareBrowserMicUploadBlob(blob);
      const data = await blobToBase64(uploadBlob);
      if (isStaleTrialTurnEpoch(uploadEpoch)) {
        console.info('[TalkPilot] Skip stale mic upload (superseded before POST)');
        return;
      }
    trialSetMicStatus('upload');
    updateStatus();
    const pev = trialPartnerEdgeVoiceForApi();
      const { resp, d } = await trialFetchJson(
        `${CONFIG.apiBaseUrl}/api/trial/audio-turn`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            session_id: state.trialSessionId,
            data,
            mime: uploadBlob.type || blob.type || 'audio/wav',
            partner_edge_voice: pev || null,
            ...trialLangParamsForApi(),
          }),
        },
        state.recognitionMode === 'pro' ? 120000 : 75000
      );
      if (!resp.ok) {
        const detail = d && d.detail != null ? String(d.detail) : '';
        if (resp.status === 409 || detail.includes('озвучьте')) {
          log('Сначала озвучьте свою фразу (Play) — затем говорите снова.', 'system');
        } else {
          log(detail || 'Демо: ошибка распознавания ' + resp.status, 'error');
        }
        return;
      }
      if (d.ok === false && (d.reason === 'stt_empty' || d.reason === 'stt_script_mismatch')) {
        const now = Date.now();
        if (now - browserMicLastSttHintAt > 4500) {
          browserMicLastSttHintAt = now;
          const ul = (state.userSpeakLang || 'ru').toLowerCase().slice(0, 2);
          log(
            d.reason === 'stt_script_mismatch'
              ? 'Распознан другой язык — проверьте «Ваш язык» в настройках и говорите чётче на ' +
                  (ul === 'ru' ? 'русском' : ul === 'en' ? 'английском' : ul) +
                  '.'
              : 'Речь не распознана — говорите громче, ближе к микрофону. Проверьте устройство «Микрофон» в меню чата.',
            'system'
          );
        }
        return;
      }
      if (isStaleTrialTurnEpoch(uploadEpoch)) {
        console.info('[TalkPilot] Skip stale mic turn response');
        if (trialTurnHasPartnerReply(d)) {
          const hasPa =
            !!(d.audio_wav_base64 && String(d.audio_wav_base64).length > 80) ||
            !!String(d.partner_text || '').trim();
          try {
            await trialRecoverPartnerTurn(d, uploadEpoch, hasPa);
          } catch (staleRecErr) {
            console.warn('trialRecoverPartnerTurn (stale):', staleRecErr);
          }
        }
        return;
      }
      const utter = String(d.user_tts_partner_lang || '').trim();
      trialAutoplayBusy = true;
      updateStatus();
      try {
        await applyTrialTurnPayload(d, utter || '…', uploadEpoch);
      } finally {
        trialAutoplayBusy = false;
      }
    } catch (e) {
      console.warn('uploadTrialMicChunk:', e);
      const errMsg =
        e && e.message === 'trial_request_timeout'
          ? 'Демо: сервер долго обрабатывает речь (Pro/AITunnel). Попробуйте короче фразу или режим Basic.'
          : t('logError') + (e && e.message ? e.message : e);
      log(errMsg, 'error');
    } finally {
      clearTrialProcessingWatchdog();
      trialPhraseInFlight = false;
      trialAutoplayBusy = false;
      trialClearMicStatus();
      updateStatus();
    }
  }

  /** @param {boolean} [destroy] — true: сбросить объект (Стоп); false: пауза между репликами */
  function trialStopBrowserRecognition(destroy) {
    const hard = destroy !== false;
    trialSpeechListening = false;
    updateStatus();
    trialClearListenResumeTimer();
    if (!trialSpeechRecog) return;
    try {
      if (hard) {
        trialSpeechRecog.onresult = null;
        trialSpeechRecog.onerror = null;
        trialSpeechRecog.onend = null;
      }
      trialSpeechRecog.stop();
    } catch (e) { /* ignore */ }
    if (hard) {
      trialSpeechRecog = null;
      trialPhraseInFlight = false;
      stopTrialMicLevelMeter();
      updateMicMeterIdle();
    }
  }

  function stopBrowserMicRecognition(clearBrowserMicMode) {
    trialStopBrowserRecognition();
    stopBrowserMicCapture();
    if (clearBrowserMicMode) state.browserMicMode = false;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || '');
        const i = s.indexOf(',');
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = () => reject(new Error('read_blob_failed'));
      r.readAsDataURL(blob);
    });
  }

  function stopBrowserMicLevelLoop() {
    if (browserMicLevelTimer) {
      clearInterval(browserMicLevelTimer);
      browserMicLevelTimer = null;
    }
    browserMicAnalyser = null;
    browserMicGainNode = null;
    browserMicDestNode = null;
    teardownBrowserMicScriptProcessor();
    browserMicLastRms = 0;
    browserMicDisplayRms = 0;
    browserMicChunkPeakRms = 0;
    if (browserMicAudioCtx) {
      const ctx = browserMicAudioCtx;
      browserMicAudioCtx = null;
      if (ctx !== vfAudioCtx) safeCloseAudioContext(ctx);
    }
  }

  function stopBrowserMicStreamTracks() {
    const stopTr = (stream) => {
      if (!stream) return;
      stream.getTracks().forEach((tr) => {
        try { tr.stop(); } catch (e) { /* ignore */ }
      });
    };
    stopTr(browserMicStream);
    stopTr(browserMicRawStream);
    browserMicStream = null;
    browserMicRawStream = null;
  }

  function stopTrialMicLevelMeter() {
    if (trialMicLevelTimer) {
      clearInterval(trialMicLevelTimer);
      trialMicLevelTimer = null;
    }
    trialMicAnalyser = null;
    trialMicLastRms = 0;
    if (trialMicStream) {
      trialMicStream.getTracks().forEach((tr) => {
        try {
          tr.stop();
        } catch (_) {
          /* ignore */
        }
      });
      trialMicStream = null;
    }
    if (trialMicAudioCtx) {
      const ctx = trialMicAudioCtx;
      trialMicAudioCtx = null;
      safeCloseAudioContext(ctx);
    }
  }

  async function startTrialMicLevelMeter() {
    if (!isTrialMode() || !elements.micMeterFill) return;
    if (trialMicLevelTimer && trialMicAnalyser) return;
    stopTrialMicLevelMeter();
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return;
    }
    try {
      trialMicStream = await navigator.mediaDevices.getUserMedia({
        audio: browserMicAudioConstraints(),
      });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      trialMicAudioCtx = new Ctx();
      if (trialMicAudioCtx.state === 'suspended') {
        await trialMicAudioCtx.resume();
      }
      const src = trialMicAudioCtx.createMediaStreamSource(trialMicStream);
      trialMicAnalyser = trialMicAudioCtx.createAnalyser();
      trialMicAnalyser.fftSize = 256;
      src.connect(trialMicAnalyser);
      const buf = new Uint8Array(trialMicAnalyser.fftSize);
      trialMicLevelTimer = setInterval(() => {
        if (!trialMicAnalyser || !elements.micMeterFill) return;
        trialMicAnalyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          sum += x * x;
        }
        trialMicLastRms = Math.sqrt(sum / buf.length);
        updateTrialMicMeterUI();
      }, 120);
    } catch (e) {
      console.warn('startTrialMicLevelMeter:', e);
      stopTrialMicLevelMeter();
    }
  }

  function updateTrialMicMeterUI() {
    if (!elements.micMeterFill || !isTrialMode()) return;
    const active = !!(state.isRunning && trialMicAnalyser);
    const pct = active
      ? Math.min(100, Math.max(4, Math.round(trialMicLastRms * 480)))
      : 0;
    elements.micMeterFill.style.width = pct + '%';
    elements.micMeterFill.classList.remove('level-clip', 'level-quiet');
    if (active && trialMicLastRms < 0.005) {
      elements.micMeterFill.classList.add('level-quiet');
    }
    if (elements.micMeterHint) {
      if (!active) {
        elements.micMeterHint.textContent = '';
        elements.micMeterHint.className = 'mic-meter-hint';
        return;
      }
      if (trialMicLastRms < 0.005) {
        elements.micMeterHint.textContent = t('micHintQuiet');
        elements.micMeterHint.className = 'mic-meter-hint level-quiet';
      } else {
        elements.micMeterHint.textContent = t('micHintBrowser');
        elements.micMeterHint.className = 'mic-meter-hint';
      }
    }
  }

  function startBrowserMicLevelLoop() {
    if (browserMicLevelTimer) {
      clearInterval(browserMicLevelTimer);
      browserMicLevelTimer = null;
    }
    if (!browserMicAnalyser || !elements.micMeterFill) return;
    const buf = new Uint8Array(browserMicAnalyser.fftSize);
    browserMicLevelTimer = setInterval(() => {
      if (!browserMicAnalyser || !elements.micMeterFill) return;
      browserMicAnalyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      const rawRms = Math.sqrt(sum / buf.length);
      browserMicLastRms = rawRms;
      if (rawRms > browserMicChunkPeakRms) {
        browserMicChunkPeakRms = rawRms;
      }
      const meterAttack = 0.38;
      const meterRelease = 0.14;
      if (rawRms > browserMicDisplayRms) {
        browserMicDisplayRms += (rawRms - browserMicDisplayRms) * meterAttack;
      } else {
        browserMicDisplayRms += (rawRms - browserMicDisplayRms) * meterRelease;
      }
      if (isTrialMode() && browserMicCaptureActive && state.isRunning && !browserMicHadSpeechInChunk) {
        const t0 = browserMicCaptureStartedAt || Date.now();
        if (Date.now() - t0 > 9000 && Date.now() - trialMicHeardHintAt > 9000) {
          trialMicHeardHintAt = Date.now();
          log(t('trialMicSpeakLouder'), 'system');
        }
      }
      if (browserMicCaptureActive) {
        if (browserMicNoiseCalibrating) {
          browserMicNoiseCalibPushSample(rawRms);
        } else {
          const detects = browserMicLevelLoopDetectsSpeech(rawRms);
          const phraseStart = isTrialMode()
            ? rawRms > browserMicSpeechOnsetRmsThreshold()
            : rawRms > browserMicSpeechOnRmsThreshold();
          if (detects) {
            browserMicMarkStrongSpeech(rawRms);
            if (!browserMicHadSpeechInChunk && phraseStart) {
              browserMicHadSpeechInChunk = true;
              browserMicSpeechOnsetAt = Date.now();
              if (browserMicUsePcmUpload) prependBrowserMicPrerollToCapture();
              if (isTrialMode()) {
                trialRefreshMicStatus();
                trialBargeInOnUserSpeechStart();
              }
            }
            if (browserMicHadSpeechInChunk) browserMicSilenceAccumMs = 0;
          } else if (browserMicHadSpeechInChunk) {
            browserMicSilenceAccumMs += 120;
            if (isTrialMode()) {
              trialRefreshPartnerDuckFromMic();
              trialRefreshMicStatus();
            }
          }
        }
      }
      tryEarlyBrowserMicFlush();
      const meterRms = browserMicDisplayRms;
      const pct = Math.min(100, Math.round(meterRms * 480));
      elements.micMeterFill.style.width = pct + '%';
      elements.micMeterFill.classList.remove('level-clip', 'level-quiet');
      if (elements.micMeterHint) {
        if (meterRms < 0.005) {
          elements.micMeterFill.classList.add('level-quiet');
          elements.micMeterHint.textContent = t('micHintQuiet');
          elements.micMeterHint.className = 'mic-meter-hint level-quiet';
        } else {
          elements.micMeterHint.textContent = t('micHintBrowser');
          elements.micMeterHint.className = 'mic-meter-hint';
        }
      }
    }, 120);
  }

  function stopDesktopBasicSpeechRecognition() {
    desktopBasicSpeechListening = false;
    if (desktopBasicSpeechRecog) {
      try {
        desktopBasicSpeechRecog.onresult = null;
        desktopBasicSpeechRecog.onerror = null;
        desktopBasicSpeechRecog.onend = null;
        desktopBasicSpeechRecog.stop();
      } catch (e) {
        /* ignore */
      }
      desktopBasicSpeechRecog = null;
    }
  }

  function desktopBasicSpeechLang() {
    const langMap = {
      ru: 'ru-RU',
      en: 'en-US',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
      it: 'it-IT',
      pt: 'pt-BR',
      uk: 'uk-UA',
      pl: 'pl-PL',
      tr: 'tr-TR',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };
    const ul = String(state.userSpeakLang || state.userLanguage || 'ru')
      .toLowerCase()
      .slice(0, 2);
    return langMap[ul] || 'ru-RU';
  }

  async function startDesktopBasicMicMeter() {
    if (!browserMicCapturePossible()) return;
    if (browserMicRawStream && browserMicAnalyser) return;
    try {
      browserMicRawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      browserMicStream = browserMicRawStream;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      browserMicAudioCtx = new Ctx();
      if (browserMicAudioCtx.state === 'suspended') {
        await browserMicAudioCtx.resume();
      }
      const src = browserMicAudioCtx.createMediaStreamSource(browserMicRawStream);
      browserMicAnalyser = browserMicAudioCtx.createAnalyser();
      browserMicAnalyser.fftSize = 2048;
      src.connect(browserMicAnalyser);
      startBrowserMicLevelLoop();
    } catch (e) {
      console.warn('startDesktopBasicMicMeter:', e);
    }
  }

  function startDesktopBasicSpeechRecognition() {
    if (desktopBasicSpeechListening) return;
    if (!state.isRunning || !state.browserMicMode) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      log(t('browserMicError'), 'error');
      return;
    }
    desktopBasicSpeechRecog = new SR();
    desktopBasicSpeechRecog.lang = desktopBasicSpeechLang();
    desktopBasicSpeechRecog.interimResults = false;
    desktopBasicSpeechRecog.continuous = true;
    desktopBasicSpeechListening = true;
    desktopBasicSpeechRecog.onresult = (ev) => {
      if (!state.isRunning || !state.browserMicMode) return;
      const results = ev.results;
      if (!results || !results.length) return;
      for (let i = ev.resultIndex; i < results.length; i++) {
        if (!results[i].isFinal) continue;
        const transcript = (results[i][0] && results[i][0].transcript) || '';
        const phrase = String(transcript).trim();
        if (phrase.length < 2) continue;
        const now = Date.now();
        if (phrase === desktopBasicLastSubmittedPhrase && now - desktopBasicLastSubmittedAt < 2500) {
          continue;
        }
        desktopBasicLastSubmittedPhrase = phrase;
        desktopBasicLastSubmittedAt = now;
        void submitUserPhraseFromBrowser(phrase);
      }
    };
    desktopBasicSpeechRecog.onerror = (err) => {
      console.warn('desktop basic speech:', err);
      stopDesktopBasicSpeechRecognition();
      log(t('browserMicError'), 'system');
      if (state.browserMicMode && state.isRunning) {
        setTimeout(() => {
          if (state.browserMicMode && state.isRunning) {
            startDesktopBasicSpeechRecognition();
          }
        }, 800);
      }
    };
    desktopBasicSpeechRecog.onend = () => {
      desktopBasicSpeechListening = false;
      if (state.browserMicMode && state.isRunning) {
        setTimeout(() => startDesktopBasicSpeechRecognition(), 350);
      }
    };
    try {
      desktopBasicSpeechRecog.start();
    } catch (e) {
      stopDesktopBasicSpeechRecognition();
      console.warn('desktop basic speech start:', e);
      log(t('browserMicError'), 'error');
    }
  }

  async function startDesktopBasicWebSpeechCapture() {
    stopDesktopBasicSpeechRecognition();
    teardownBrowserMicScriptProcessor();
    if (browserMicRecorder && browserMicRecorder.state !== 'inactive') {
      try {
        browserMicRecorder.stop();
      } catch (e) {
        /* ignore */
      }
    }
    browserMicRecorder = null;
    if (browserMicChunkTimer) {
      clearTimeout(browserMicChunkTimer);
      clearInterval(browserMicChunkTimer);
      browserMicChunkTimer = null;
    }
    stopBrowserMicStreamTracks();
    browserMicCaptureActive = true;
    browserMicUsePcmUpload = false;
    await startDesktopBasicMicMeter();
    startDesktopBasicSpeechRecognition();
    let basicMicMsg = '🎤 Basic (desktop): system speech recognition. Speak into your PC mic, then pause.';
    try {
      const tr = t('desktopBasicWebSpeech');
      if (tr && tr !== 'desktopBasicWebSpeech') basicMicMsg = tr;
    } catch (_) {
      /* ignore */
    }
    log(basicMicMsg, 'success');
  }

  function stopBrowserMicCapture() {
    stopDesktopBasicSpeechRecognition();
    browserMicCaptureActive = false;
    cancelBrowserMicNoiseCalibration();
    browserMicSessionAutoThreshold = null;
    browserMicUploadQueue.length = 0;
    clearBrowserMicPreroll();
    stopBrowserMicLevelLoop();
    if (browserMicChunkTimer) {
      clearTimeout(browserMicChunkTimer);
      browserMicChunkTimer = null;
    }
    if (browserMicChunkTimer) {
      clearInterval(browserMicChunkTimer);
      browserMicChunkTimer = null;
    }
    if (browserMicRecorder && browserMicRecorder.state !== 'inactive') {
      try { browserMicRecorder.stop(); } catch (e) { /* ignore */ }
    }
    browserMicRecorder = null;
    void flushBrowserMicPcmChunk();
    stopBrowserMicStreamTracks();
  }

  function scheduleBrowserMicChunk() {
    if (!browserMicCaptureActive || !browserMicStream || !state.isRunning || !state.browserMicMode) return;
    if (browserMicUsePcmUpload && browserMicScriptProcessor) {
      if (browserMicChunkTimer) clearInterval(browserMicChunkTimer);
      browserMicLastFlushAt = Date.now();
      browserMicHadSpeechInChunk = false;
      browserMicSilenceAccumMs = 0;
      clearBrowserMicPreroll();
      const maxMs = browserMicChunkMs();
      browserMicChunkTimer = setInterval(() => {
        if (!browserMicCaptureActive || !state.isRunning || !state.browserMicMode) return;
        tryEarlyBrowserMicFlush();
        if (browserMicPhraseSilenceEnded({ requirePcmSamples: true })) {
          browserMicHadSpeechInChunk = false;
          browserMicSilenceAccumMs = 0;
          browserMicSpeechOnsetAt = 0;
          browserMicLastStrongSpeechAt = 0;
          clearBrowserMicPreroll();
          browserMicLastFlushAt = Date.now();
          void flushBrowserMicPcmChunk();
          return;
        }
        if (browserMicHadSpeechInChunk) {
          const elapsed = Date.now() - browserMicLastFlushAt;
          if (isTrialMode()) {
            const absMax = browserMicTrialAbsMaxPhraseMs();
            if (elapsed < absMax) return;
          } else {
            const hardCapMs = browserMicChunkHardCapMs(maxMs);
            if (elapsed < maxMs) return;
            if (browserMicUserStillSpeaking() && elapsed < hardCapMs) return;
          }
          browserMicHadSpeechInChunk = false;
          browserMicSilenceAccumMs = 0;
          browserMicSpeechOnsetAt = 0;
          browserMicLastStrongSpeechAt = 0;
          clearBrowserMicPreroll();
          browserMicLastFlushAt = Date.now();
          void flushBrowserMicPcmChunk();
        }
      }, 120);
      return;
    }
    const mime = pickBrowserMicRecorderMimeType() || 'audio/webm';
    browserMicChunkPeakRms = 0;
    const chunks = [];
    const recOpts = mime && MediaRecorder.isTypeSupported(mime) ? { mimeType: mime } : undefined;
    const rec = recOpts ? new MediaRecorder(browserMicStream, recOpts) : new MediaRecorder(browserMicStream);
    browserMicRecorder = rec;
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) chunks.push(ev.data);
    };
    rec.onstop = () => {
      browserMicRecorder = null;
      const blob = new Blob(chunks, { type: mime || 'audio/webm' });
      const scheduleNext = () => {
        if (browserMicCaptureActive && state.isRunning && state.browserMicMode) {
          scheduleBrowserMicChunk();
        }
      };
      if (isTrialMode() && trialIgnoreMicRecorderStopUpload) {
        trialIgnoreMicRecorderStopUpload = false;
        scheduleNext();
        return;
      }
      if (blob.size > 400) {
        if (isTrialMode()) trialUnduckPartnerPlayback();
        void enqueueBrowserMicUpload(blob).finally(scheduleNext);
      } else {
        scheduleNext();
      }
    };
    rec.onerror = () => log(t('browserMicError'), 'system');
    try {
      const sliceMs = preferBrowserMicMediaRecorder() ? 250 : undefined;
      if (sliceMs) rec.start(sliceMs);
      else rec.start();
      const maxMs = browserMicChunkMs();
      const hardCapMs = browserMicChunkHardCapMs(maxMs);
      const chunkStartedAt = Date.now();
      browserMicHadSpeechInChunk = false;
      browserMicSilenceAccumMs = 0;
      browserMicSpeechOnsetAt = 0;
      browserMicLastStrongSpeechAt = 0;
      if (browserMicChunkTimer) clearInterval(browserMicChunkTimer);
      browserMicChunkTimer = setInterval(() => {
        if (!browserMicCaptureActive || !state.isRunning || !state.browserMicMode) return;
        if (rec.state !== 'recording') return;
        const elapsed = Date.now() - chunkStartedAt;
        if (browserMicPhraseSilenceEnded()) {
          clearInterval(browserMicChunkTimer);
          browserMicChunkTimer = null;
          if (isTrialMode()) trialSetMicStatus('encode');
          try {
            rec.stop();
          } catch (e) {
            /* ignore */
          }
          return;
        }
        if (isTrialMode()) {
          const absMax = browserMicTrialAbsMaxPhraseMs();
          if (elapsed < absMax) return;
        } else {
          if (elapsed < hardCapMs && browserMicUserStillSpeaking()) return;
          if (elapsed < maxMs) return;
        }
        clearInterval(browserMicChunkTimer);
        browserMicChunkTimer = null;
        if (isTrialMode()) trialSetMicStatus('encode');
        try {
          rec.stop();
        } catch (e) {
          /* ignore */
        }
      }, 120);
    } catch (e) {
      console.warn('scheduleBrowserMicChunk MediaRecorder:', e);
      log(t('browserMicError'), 'error');
    }
  }

  function enqueueBrowserMicUpload(blob) {
    if (!blob || blob.size < 400) return Promise.resolve();
    if (isTrialMode() && trialTextSubmitLock) return Promise.resolve();
    browserMicUploadQueue.push(blob);
    return drainBrowserMicUploadQueue();
  }

  async function drainBrowserMicUploadQueue() {
    if (browserMicUploading) return;
    if (!state.isRunning || (!state.browserMicMode && !isTrialMode())) {
      browserMicUploadQueue.length = 0;
      return;
    }
    const blob = browserMicUploadQueue.shift();
    if (!blob) return;
    browserMicUploading = true;
    try {
      await uploadBrowserMicChunk(blob);
    } finally {
      browserMicUploading = false;
      if (browserMicUploadQueue.length) await drainBrowserMicUploadQueue();
    }
  }

  async function fetchServerRunningFlag() {
    try {
      let url = `${CONFIG.apiBaseUrl}/api/status`;
      const uid = state.userId;
      if (uid && !String(uid).startsWith('anonymous')) {
        url += (url.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(String(uid))}`;
      }
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) return false;
      const d = await resp.json();
      return !!d.running;
    } catch (e) {
      return false;
    }
  }

  async function ensureServerSessionRunning() {
    if (!state.isRunning || isTrialMode() || state.userRequestedStop) return false;
    if (state._sessionRecoverInFlight) return false;
    state._sessionRecoverInFlight = true;
    try {
      if (await fetchServerRunningFlag()) return true;
      log(t('browserMicSessionRecovering'), 'system');
      await apiRequest('/api/control', {
        method: 'POST',
        body: JSON.stringify(
          Object.assign({ action: 'start', clear_chat: false }, modalCloneControlPayload())
        ),
      });
      state.browserMicMode = true;
      state.serverAudioAvailable = false;
      startBrowserMicRecognition();
      return await fetchServerRunningFlag();
    } catch (e) {
      console.warn('ensureServerSessionRunning:', e);
      return false;
    } finally {
      state._sessionRecoverInFlight = false;
    }
  }

  async function uploadBrowserMicChunk(blob, retryAfterRecover) {
    if (!state.isRunning) return;
    if (isTrialMode()) {
      return uploadTrialMicChunk(blob);
    }
    if (!state.browserMicMode) return;
    if (!blob || blob.size < 400) return;
    try {
      const uploadBlob = await prepareBrowserMicUploadBlob(blob);
      const data = await blobToBase64(uploadBlob);
      let url = `${CONFIG.apiBaseUrl}/api/submit-user-audio`;
      const uid = state.userId;
      if (uid && !String(uid).startsWith('anonymous')) {
        url += (url.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(String(uid))}`;
      }
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { ...jsonAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mime: uploadBlob.type || blob.type || 'audio/webm' }),
      });
      let body = null;
      try {
        body = await resp.json();
      } catch (parseErr) {
        /* ignore */
      }
      if (!resp.ok) {
        const detail = body && body.detail != null ? String(body.detail) : `API ${resp.status}`;
        console.warn('submit-user-audio:', detail);
        return;
      }
      if (body && body.ok) {
        await fetchChat();
        return;
      }
      if (body && body.ok === false) {
        const r = body.reason || '';
        if (r === 'session_not_running') {
          if (!retryAfterRecover && (await ensureServerSessionRunning())) {
            return uploadBrowserMicChunk(blob, true);
          }
          log(t('browserMicSessionStopped'), 'error');
          return;
        }
        if (r === 'stt_busy' && blob && !retryAfterRecover) {
          browserMicUploadQueue.unshift(blob);
          setTimeout(() => { void drainBrowserMicUploadQueue(); }, 1200);
          return;
        }
        if (r === 'stt_empty' || r === 'phrase_not_recognized') {
          const now = Date.now();
          if (now - browserMicLastSttHintAt > 4500) {
            browserMicLastSttHintAt = now;
            log(t('browserMicPhraseNotRecognized'), 'system');
          }
        } else if (r === 'decode_failed') {
          log(t('browserMicDecodeFailed'), 'system');
        }
      }
    } catch (e) {
      console.warn('submit-user-audio:', e && e.message ? e.message : e);
    }
  }

  async function startBrowserMicCapture() {
    if (!state.isRunning) return;
    if (!isTrialMode() && !state.browserMicMode) return;
    if (isTrialMode()) state.browserMicMode = true;
    if (browserMicCaptureActive) return;
    stopBrowserMicCapture();
    if (!browserMicCapturePossible()) {
      if (redirectUiToHttpsIfNeeded()) return;
      log(t('browserMicNoAccess'), 'error');
      return;
    }
    try {
      browserMicRawStream = await openBrowserMicStream();
      browserMicStream = browserMicRawStream;
      vfAudioDevicesPrimed = true;
      void refreshAudioDeviceLists();
      const useMediaRecorder = preferBrowserMicMediaRecorder();
      if (useMediaRecorder) {
        browserMicUsePcmUpload = false;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          browserMicAudioCtx = new Ctx();
          if (browserMicAudioCtx.state === 'suspended') {
            await browserMicAudioCtx.resume();
          }
          const src = browserMicAudioCtx.createMediaStreamSource(browserMicRawStream);
          browserMicAnalyser = browserMicAudioCtx.createAnalyser();
          browserMicAnalyser.fftSize = 2048;
          if (useMediaRecorder) {
            src.connect(browserMicAnalyser);
          } else {
            browserMicGainNode = browserMicAudioCtx.createGain();
            browserMicGainNode.gain.value = browserMicCaptureGainValue();
            src.connect(browserMicGainNode);
            browserMicGainNode.connect(browserMicAnalyser);
            browserMicUsePcmUpload = true;
            try {
              browserMicScriptProcessor = browserMicAudioCtx.createScriptProcessor(4096, 1, 1);
              browserMicScriptProcessor.onaudioprocess = (ev) => {
                if (!browserMicCaptureActive) return;
                const ch = ev.inputBuffer.getChannelData(0);
                const copy = new Float32Array(ch);
                const rms = browserMicChunkRms(copy);
                if (browserMicNoiseCalibrating) {
                  browserMicNoiseCalibPushSample(rms);
                  pushBrowserMicPrerollChunk(copy);
                  return;
                }
                if (isTrialMode()) {
                  const detects = browserMicLevelLoopDetectsSpeech(rms);
                  const phraseStart = rms > browserMicSpeechOnsetRmsThreshold();
                  if (detects) {
                    browserMicMarkStrongSpeech(rms);
                    if (!browserMicHadSpeechInChunk && phraseStart) {
                      browserMicHadSpeechInChunk = true;
                      browserMicSpeechOnsetAt = Date.now();
                      prependBrowserMicPrerollToCapture();
                      trialBargeInOnUserSpeechStart();
                      const now = Date.now();
                      if (now - trialMicHeardHintAt > 6000) {
                        trialMicHeardHintAt = now;
                        log(t('trialMicHeard'), 'system');
                      }
                    }
                    if (browserMicHadSpeechInChunk) {
                      browserMicPcmBuffers.push(copy);
                      browserMicSilenceAccumMs = 0;
                    } else {
                      pushBrowserMicPrerollChunk(copy);
                    }
                  } else if (browserMicHadSpeechInChunk) {
                    browserMicPcmBuffers.push(copy);
                    if (browserMicAudioCtx) {
                      browserMicSilenceAccumMs +=
                        (copy.length / browserMicAudioCtx.sampleRate) * 1000;
                    }
                  } else {
                    pushBrowserMicPrerollChunk(copy);
                  }
                  return;
                }
                if (browserMicLevelLoopDetectsSpeech(rms)) {
                  if (!browserMicHadSpeechInChunk) {
                    browserMicHadSpeechInChunk = true;
                    browserMicSpeechOnsetAt = Date.now();
                    prependBrowserMicPrerollToCapture();
                  }
                  browserMicPcmBuffers.push(copy);
                  browserMicSilenceAccumMs = 0;
                } else {
                  pushBrowserMicPrerollChunk(copy);
                  if (browserMicHadSpeechInChunk && browserMicAudioCtx) {
                    browserMicSilenceAccumMs +=
                      (copy.length / browserMicAudioCtx.sampleRate) * 1000;
                  }
                }
              };
              browserMicSilentGain = browserMicAudioCtx.createGain();
              browserMicSilentGain.gain.value = 0;
              browserMicGainNode.connect(browserMicScriptProcessor);
              browserMicScriptProcessor.connect(browserMicSilentGain);
              if (!browserMicDestNode) {
                browserMicDestNode = browserMicAudioCtx.createMediaStreamDestination();
              }
              browserMicSilentGain.connect(browserMicDestNode);
            } catch (spErr) {
              console.warn('browser mic PCM:', spErr);
              browserMicUsePcmUpload = false;
            }
          }
          startBrowserMicLevelLoop();
          if (isTrialMode()) browserMicArmPostResumeGrace(200);
        }
      } catch (meterErr) {
        console.warn('browser mic meter:', meterErr && meterErr.message ? meterErr.message : meterErr);
        if (!useMediaRecorder) browserMicUsePcmUpload = false;
      }
      if (useMediaRecorder && typeof MediaRecorder === 'undefined') {
        log(t('browserMicError'), 'error');
        browserMicCaptureActive = false;
        stopBrowserMicStreamTracks();
        return;
      }
      browserMicCaptureActive = true;
      browserMicCaptureStartedAt = Date.now();
      startBrowserMicNoiseCalibration();
      scheduleBrowserMicChunk();
      const recHint = useMediaRecorder
        ? t('browserMicRecording')
        : browserMicUsePcmUpload
          ? t('browserMicRecordingPcm')
          : t('browserMicRecording');
      log(recHint, 'success');
    } catch (e) {
      const errName = e && e.name ? String(e.name) : '';
      console.warn('startBrowserMicCapture:', e);
      log(t('browserMicNoAccess'), 'error');
      if (isTrialMode() || (isVoiceFlowDesktopClient() && errName === 'NotAllowedError')) {
        openStartErrorModal({
          titleKey: 'micErrorModalTitle',
          hintText: isTrialMode() ? t('trialMicBlockedBrowser') : t('browserMicNoAccess'),
        });
      }
      browserMicCaptureActive = false;
      if (isTrialMode()) {
        state.isRunning = false;
        updateStatus();
      }
    }
  }

  async function submitAiSuggestionAsUserPhrase(rawText) {
    const utter = String(rawText || '').trim();
    if (!utter) return false;
    if (!state.isRunning) {
      log(t('browserMicSessionStopped'), 'system');
      return false;
    }
    if (trialSuggestionPickLock) return false;
    if (isTrialMode()) {
      if (
        state.trialLimitReached ||
        trialPhraseInFlight ||
        trialAutoplayBusy ||
        trialActiveApplyEpoch ||
        trialTextSubmitLock ||
        state.isProcessing
      ) {
        return false;
      }
      if (trialPendingPartnerTurn) {
        log('Сначала озвучьте свою фразу (Play) — затем можно вставить подсказку.', 'system');
        return false;
      }
    }
    if (typeModal) hideTypeModal();
    trialSuggestionPickLock = true;
    try {
      await submitUserPhraseFromBrowser(utter);
      return true;
    } catch (e) {
      log(t('logError') + (e && e.message ? e.message : e), 'error');
      return false;
    } finally {
      trialSuggestionPickLock = false;
    }
  }

  async function submitUserPhraseFromBrowser(rawText) {
    const utter = String(rawText || '').trim();
    if (!utter || !state.isRunning) return;
    if (isTrialMode()) {
      if (!trialUserSttTextLooksValid(utter)) {
        trialPhraseInFlight = false;
        updateStatus();
        log('Браузер распознал другой язык — проверьте «Ваш язык» в настройках.', 'system');
        trialResumeListeningAfterTurn(320);
        return;
      }
      unlockBrowserAudioForPlayback();
      await trialSubmitUserText(utter);
      return;
    }
    try {
      await apiRequest('/api/submit-user-phrase', {
        method: 'POST',
        body: JSON.stringify({ text: utter }),
      });
      await fetchChat();
    } catch (e) {
      log(t('logError') + (e && e.message ? e.message : e), 'error');
    }
  }

  function startBrowserMicRecognition() {
    if (isTrialMode()) {
      return;
    }
    if (!state.isRunning || !state.browserMicMode) return;
    if (shouldUseDesktopWebSpeech()) {
      void startDesktopBasicWebSpeechCapture();
      return;
    }
    void startBrowserMicCapture();
  }

  function trialStartBrowserRecognition() {
    if (trialSpeechListening || trialPhraseInFlight || trialPendingPartnerTurn) return;
    if (isTrialMode()) {
      if (!state.isRunning || state.trialLimitReached) return;
    } else {
      if (!state.browserMicMode || !state.isRunning) return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      log('В браузере недоступно распознавание речи (SpeechRecognition). Введите текст в поле сообщения.', 'error');
      return;
    }
    const langMap = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };
    const ul = (state.userSpeakLang || 'ru').toLowerCase().slice(0, 2);
    const lang = langMap[ul] || 'ru-RU';

    const attachHandlers = (rec) => {
      rec.onresult = (ev) => {
        if (trialPhraseInFlight || trialPendingPartnerTurn) return;
        let transcript = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) {
            transcript = (ev.results[i][0] && ev.results[i][0].transcript) || '';
          }
        }
        if (!transcript && ev.results && ev.results.length) {
          const last = ev.results[ev.results.length - 1];
          if (last && last.isFinal) {
            transcript = (last[0] && last[0].transcript) || '';
          }
        }
        const phrase = String(transcript).trim();
        if (!phrase) return;
        if (!trialUserSttTextLooksValid(phrase)) {
          const now = Date.now();
          if (now - browserMicLastSttHintAt > 4500) {
            browserMicLastSttHintAt = now;
            log('Браузер распознал другой язык — проверьте «Ваш язык» в настройках.', 'system');
          }
          trialResumeListeningAfterTurn(320);
          return;
        }
        trialClearListenResumeTimer();
        trialStopBrowserRecognition(false);
        void submitUserPhraseFromBrowser(phrase);
      };
      rec.onerror = (ev) => {
        const code = ev && ev.error ? String(ev.error) : '';
        trialSpeechListening = false;
        updateStatus();
        if (trialPhraseInFlight || code === 'aborted') return;
        if (code === 'no-speech') {
          trialResumeListeningAfterTurn(280);
          return;
        }
        log(isTrialMode() ? 'Демо: ошибка распознавания речи в браузере.' : t('browserMicError'), 'system');
        trialStopBrowserRecognition(true);
        if (state.isRunning && !state.trialLimitReached) {
          trialResumeListeningAfterTurn(500);
        } else if (state.browserMicMode && state.isRunning) {
          setTimeout(() => startBrowserMicRecognition(), 400);
        }
      };
      rec.onend = () => {
        trialSpeechListening = false;
        updateStatus();
        if (trialPhraseInFlight || !state.isRunning || state.trialLimitReached) return;
        if (isTrialMode()) {
          trialResumeListeningAfterTurn(120);
        }
      };
    };

    if (trialSpeechRecog) {
      try {
        trialSpeechRecog.lang = lang;
        attachHandlers(trialSpeechRecog);
        trialSpeechListening = true;
        updateStatus();
        trialSpeechRecog.start();
        return;
      } catch (e) {
        trialStopBrowserRecognition(true);
      }
    }

    trialSpeechRecog = new SR();
    trialSpeechRecog.lang = lang;
    trialSpeechRecog.interimResults = true;
    trialSpeechRecog.continuous = true;
    attachHandlers(trialSpeechRecog);
    trialSpeechListening = true;
    updateStatus();
    try {
      trialSpeechRecog.start();
      log(t('trialMicListeningLog'), 'success');
    } catch (e) {
      trialStopBrowserRecognition(true);
      state.isRunning = false;
      updateStatus();
      log(t('logError') + (e && e.message ? e.message : e), 'error');
    }
  }

  function combineAiTopic(title, desc) {
    const t0 = String(title || '').trim();
    const d0 = String(desc || '').trim();
    if (!t0 && !d0) return '';
    if (!d0) return t0;
    if (!t0) return d0;
    return t0 + '\n\n' + d0;
  }
  function splitAiTopic(combined) {
    const s = String(combined || '').trim();
    if (!s || s === 'general conversation') return { title: '', desc: '' };
    const ix = s.indexOf('\n\n');
    if (ix === -1) return { title: s, desc: '' };
    return { title: s.slice(0, ix).trim(), desc: s.slice(ix + 2).trim() };
  }

  const $ = id => document.getElementById(id);
  const elements = {};
  let typeModal = null, currentTypeMsgId = null, currentSuggestions = [], syncTargetInput = null;
  const msgElements = {};
  let micMeterInterval = null;
  /** Дебаунс POST basic, когда poll /status отдаёт Pro, а тариф Basic-only */
  let recognitionQuietBasicTimer = null;
  const TRAINING_DEMO_MSG_ID = -9001;
  const TRAINING_DEMO_PARTNER_MSG_ID = -9002;
  const trainingTour = {
    active: false,
    stepIndex: 0,
    steps: [],
    tooltip: null,
    highlighted: null,
    wasChatSettingsCollapsed: false,
    autoExpandedChatSettings: false,
    preserveDemoInChat: false,
    preservePartnerDemoInChat: false,
    typeModalOpenedForTraining: false,
    aiPanelForced: false,
    micSensitivityForcedOpen: false,
    spotlightMicUnion: false,
    demoMessageEl: null,
    spotlightEl: null,
    spotlightTarget: null,
    spotlightPad: 10,
    keydownBound: false,
    tooltipClickBound: false,
  };

  const CHAT_SETTINGS_TRAINING_SELECTORS = new Set([
    '.mode-toggle-group',
    '.auto-play-settings-group',
    '.ai-topic-group',
    '.voice-toolbar-cluster',
    '.lang-pair-card',
    '#audioDevicesCard',
    '.chat-phrase-pause-bar',
    '.ai-context-menu-card',
    '#a11yMenuCard',
  ]);

  function initDOM() {
    elements.startBtn = $('startBtn');
    elements.conferenceToggle = $('conferenceToggle'); elements.aiToggle = $('aiToggle');
    elements.desktopStealthRow = $('desktopStealthRow');
    elements.desktopStealthToggle = $('desktopStealthToggle');
    elements.desktopAiRegionRow = $('desktopAiRegionRow');
    elements.desktopAiRegionToggle = $('desktopAiRegionToggle');
    elements.aiTopicSettingsBtn = $('aiTopicSettingsBtn');
    elements.aiTopicModal = $('aiTopicModal');
    elements.aiTopicModalBackdrop = $('aiTopicModalBackdrop');
    elements.aiTopicModalTitleInput = $('aiTopicModalTitleInput');
    elements.aiTopicModalDescInput = $('aiTopicModalDescInput');
    elements.aiTopicInlineTitle = $('aiTopicInlineTitle');
    elements.aiTopicInlineDesc = $('aiTopicInlineDesc');
    elements.statusDiv = $('status');
    elements.logDiv = $('logDiv');     elements.userMessages = $('user-messages');
    elements.partnerMessages = $('partner-messages');
    elements.userColumnEmpty = $('user-column-empty');
    elements.partnerColumnEmpty = $('partner-column-empty');
    elements.chatContainer = null;
    elements.chatPreloader = $('chat-preloader');
    elements.chatPreloaderText = $('chat-preloader-text');
    elements.phraseSilenceInput = $('phraseSilenceInput');
    elements.phraseSilenceRange = $('phraseSilenceRange');
    elements.phraseSilenceStepUp = $('phraseSilenceStepUp');
    elements.phraseSilenceStepDown = $('phraseSilenceStepDown');
    elements.phraseSilenceBar = $('chat-phrase-pause-bar');
    elements.micRmsThresholdRange = $('micRmsThresholdRange');
    elements.micRmsThresholdValue = $('micRmsThresholdValue');
    elements.micSensitivityTriggerBtn = $('micSensitivityTriggerBtn');
    elements.micSensitivityPopover = $('micSensitivityPopover');
    elements.userTtsVolumeRange = $('userTtsVolumeRange');
    elements.userTtsVolumeValue = $('userTtsVolumeValue');
    
    // 🔥 НОВОЕ: Переключатель режима распознавания
    elements.modeBasicBtn = $('mode-basic');
    elements.modeProBtn = $('mode-pro');
    elements.aiTopicGroup = $('aiTopicGroup');
    elements.proUpgradeModal = $('proUpgradeModal');
    elements.proUpgradeModalBackdrop = $('proUpgradeModalBackdrop');
    elements.proUpgradeModalClose = $('proUpgradeModalClose');
    elements.aiAssistantUpgradeModal = $('aiAssistantUpgradeModal');
    elements.aiAssistantUpgradeModalBackdrop = $('aiAssistantUpgradeModalBackdrop');
    elements.aiAssistantUpgradeModalClose = $('aiAssistantUpgradeModalClose');
    elements.voiceToolbarCluster = $('voiceToolbarCluster');
    elements.voiceCloneUpgradeModal = $('voiceCloneUpgradeModal');
    elements.voiceCloneUpgradeModalBackdrop = $('voiceCloneUpgradeModalBackdrop');
    elements.voiceCloneUpgradeModalClose = $('voiceCloneUpgradeModalClose');
    elements.micErrorModal = $('micErrorModal');
    elements.micErrorModalBackdrop = $('micErrorModalBackdrop');
    elements.micErrorModalClose = $('micErrorModalClose');
    elements.micErrorModalHeading = $('micErrorModalHeading');
    elements.micErrorModalHint = $('micErrorModalHint');
    elements.subscriptionRequiredModal = $('subscriptionRequiredModal');
    elements.subscriptionRequiredModalBackdrop = $('subscriptionRequiredModalBackdrop');
    elements.subscriptionRequiredModalClose = $('subscriptionRequiredModalClose');
    elements.subscriptionRequiredModalHint = $('subscriptionRequiredModalHint');
    elements.subscriptionRequiredModalPricingLink = $('subscriptionRequiredModalPricingLink');
    elements.subscriptionRequiredModalDashboardLink = $('subscriptionRequiredModalDashboardLink');
    elements.voiceCloneSettingsLink = $('voiceCloneSettingsLink');
    
    // 🔥 НОВОЕ: Чекбокс автовоспроизведения
    elements.autoPlayToggle = $('autoPlayToggle');
    elements.autoPlayHint = $('autoPlayHint');
    
    elements.aiSuggestionsPanel = $('ai-suggestions-panel');
    elements.mainWorkspace = $('main-workspace');
    elements.chatSessionSettingsWrap = $('chatSessionSettingsWrap');
    elements.chatSettingsToggleBtn = $('chatSettingsToggleBtn');
    elements.chatSettingsCollapseBtn = $('chatSettingsCollapseBtn');
    elements.chatSettingsCollapseBar = $('chatSettingsCollapseBar');
    elements.chatTrainingBtn = $('chatTrainingBtn');
    elements.headerPlanPill = $('headerPlanPill');
    elements.headerPlanName = $('headerPlanName');
    elements.headerPlanMinutes = $('headerPlanMinutes');
    elements.aiSuggestionsLayoutToggle = $('aiSuggestionsLayoutToggle');
    elements.partnerPhraseDisplay = $('partner-phrase-display');
    elements.aiSuggestionsList = $('ai-suggestions-list');
    elements.aiSuggestionsLoading = $('ai-suggestions-loading');
    elements.closeAiSuggestions = $('closeAiSuggestions');
    elements.resizerChatAi = $('resizerChatAi');
    elements.userSpeakLang = $('userSpeakLang');
    elements.partnerSpeakLang = $('partnerSpeakLang');
    elements.translationPauseWrap = $('translationPauseWrap');
    elements.translationPauseToggle = $('translationPauseToggle');
    elements.micMeterFill = $('micMeterFill');
    elements.micMeterHint = $('micMeterHint');
    elements.themeSelect = $('themeSelect');
    elements.a11yFontSelect = $('a11yFontSelect');
    elements.a11yContrastSelect = $('a11yContrastSelect');
    elements.a11yFontRange = $('a11yFontRange');
    elements.a11yContrastRange = $('a11yContrastRange');
    elements.a11yFontValue = $('a11yFontValue');
    elements.a11yContrastValue = $('a11yContrastValue');
    elements.audioDevicesCard = $('audioDevicesCard');
    elements.audioInputDevice = $('audioInputDevice');
    elements.audioOutputDevice = $('audioOutputDevice');

    if (typeof window.vfFillConversationLangSelect === 'function') {
      try {
        window.vfFillConversationLangSelect(
          elements.userSpeakLang,
          state.userSpeakLang || 'ru'
        );
        window.vfFillConversationLangSelect(
          elements.partnerSpeakLang,
          state.partnerSpeakLang || 'en'
        );
      } catch (eFill) {
        console.warn('conversation lang options', eFill);
      }
    }
  }

  function buildTrainingSteps() {
    const steps = [
      { selector: '#startBtn', text: t('trainingStepHeaderStart') },
      { selector: '#headerPlanPill', text: t('trainingStepHeaderPlan') },
      { selector: '.theme-switcher', text: t('trainingStepHeaderTheme') },
      { selector: '.language-switcher--header', text: t('trainingStepHeaderLang') },
      { selector: '.header-menu-trigger', text: t('trainingStepHeaderMenu'), openChatSettings: true, openChatSettingsAfterHighlight: true },
      { selector: '#chatTrainingBtn', text: t('trainingStepHeaderTraining') },
      { selector: '.mode-toggle-group', text: t('trainingStepRecognition') },
      { selector: '.auto-play-settings-group', text: t('trainingStepAutoplay') },
      { selector: '.ai-topic-group', text: t('trainingStepAiMode') },
      { selector: '.voice-toolbar-cluster', text: t('trainingStepVoice') },
      { selector: '.lang-pair-card', text: t('trainingStepLanguages') },
      { selector: '#audioDevicesCard', text: t('trainingStepAudioDevices') },
      { selector: '#a11yMenuCard', text: t('trainingStepAppearance') },
      { selector: '.chat-phrase-pause-bar', text: t('trainingStepPause') },
      { selector: '.ai-context-menu-card', text: t('trainingStepTopic') },
      ...getDialogTrainingSteps(),
    ];
    return steps.filter((step) => {
      if (step.dialogGroup) return true;
      if (isTrialMode() && step.selector === '#headerPlanPill') return false;
      return !!document.querySelector(step.selector);
    });
  }

  function getDialogTrainingSteps() {
    const steps = [
      { selector: '.chat-columns-row', text: t('trainingStepChat'), dialogGroup: true, highlightTarget: '.chat-columns-row' },
      { selector: '#vfTrainingDemoBubble', text: t('trainingStepChatMessage'), dialogGroup: true, insertTrainingDemo: true, highlightTarget: '#vfTrainingDemoBubble' },
      { selector: '#vfTrainingDemoBubble .msg-delete', text: t('trainingStepChatDelete'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#vfTrainingDemoBubble .msg-delete' },
      { selector: '#vfTrainingDemoBubble .msg-play-btn', text: t('trainingStepChatPlay'), dialogGroup: true, requiresTrainingDemo: true, ensureDemoPlay: true, highlightTarget: '#vfTrainingDemoBubble .msg-play-btn' },
      { selector: '#vfTrainingDemoBubble .msg-status', text: t('trainingStepChatStatus'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#vfTrainingDemoBubble .msg-meta' },
      { selector: '#type-modal', text: t('trainingStepChatTabOpen'), dialogGroup: true, openTrainingTypeModal: true, highlightTarget: '#type-modal' },
      { selector: '#type-modal #suggestions-container', text: t('trainingStepChatModalAi'), dialogGroup: true, openTrainingTypeModal: true, showTrainingModalSuggestions: true, highlightTarget: '#type-modal #suggestions-container' },
      { selector: '#ai-suggestions-panel', text: t('trainingStepChatAiPanel'), dialogGroup: true, showTrainingAiPanel: true, highlightTarget: '#ai-suggestions-panel' },
      { selector: '#footerSpeakHint', text: t('trainingStepFooterHints'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#footerSpeakHint' },
      { selector: '#status', text: t('trainingStepFooterStatus'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#status' },
      { selector: '#micMeterWrap', text: t('trainingStepFooterMicLevel'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#micMeterWrap' },
      { selector: '#micSensitivityTriggerBtn', text: t('trainingStepFooterMicBtn'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#micSensitivityTriggerBtn' },
      { selector: '#micSensitivityPopover', text: t('trainingStepFooterMicPanel'), dialogGroup: true, requiresTrainingDemo: true, openMicSensitivityPopover: true, highlightTarget: '#micSensitivityPopover' },
      { selector: '#footerSpeakHint', text: t('trainingStepChatTabFooter'), dialogGroup: true, requiresTrainingDemo: true, highlightTarget: '#footerSpeakHint' },
    ];
    return steps;
  }

  function getTrainingDemoSuggestions() {
    return [t('trainingDemoSuggestion1'), t('trainingDemoSuggestion2'), t('trainingDemoSuggestion3')];
  }

  function getTrainingModalDemoSuggestions() {
    return [
      t('trainingModalSuggestion1'),
      t('trainingModalSuggestion2'),
      t('trainingModalSuggestion3'),
      t('trainingModalSuggestion4'),
      t('trainingModalSuggestion5'),
    ];
  }

  function fillTrainingModalSuggestions() {
    const container = typeModal?.querySelector('#suggestions-container');
    if (!container) return;
    const sourceText =
      getMessageBubbleText(document.getElementById('vfTrainingDemoBubble')) ||
      t('trainingDemoMessageText');
    const normOpts = { allowLatinInRu: true, sourceText, skipLangFilter: true };
    const core = String(sourceText || '').trim().replace(/[.?!]+$/u, '');
    const phonetic = buildPhoneticSttVariants(sourceText, 8, normOpts);
    const consonant = buildConsonantVariants(core, 8, normOpts);
    const strict = buildStrictSameWordsVariants(sourceText, 5, normOpts);
    const demoFallback = getTrainingModalDemoSuggestions();
    let suggestions = normalizeSuggestionVariants(
      phonetic.concat(consonant).concat(strict).concat(demoFallback),
      5,
      normOpts
    );
    if (!suggestions.length) {
      suggestions = demoFallback
        .map((s) => String(s || '').trim())
        .filter((s) => s.length >= 4)
        .slice(0, 5);
    }
    currentSuggestions = suggestions;
    renderSuggestions(container, suggestions, normOpts);
  }

  function resolveTrainingStepTarget(step) {
    if (!step) return null;
    const modal = document.getElementById('type-modal');
    if (step.selector === '#type-modal' || step.highlightTarget === '#type-modal') {
      return modal;
    }
    if (step.showTrainingModalSuggestions || String(step.selector || '').includes('suggestions-container')) {
      if (modal) return modal.querySelector('#suggestions-container') || modal;
      return null;
    }
    if (step.selector === '#ai-suggestions-panel') {
      return document.getElementById('ai-suggestions-panel');
    }
    if (step.selector === '#micSensitivityPopover') {
      return document.getElementById('micSensitivityPopover');
    }
    return document.querySelector(step.selector);
  }

  function openTrainingMicSensitivityPopover() {
    const pop = elements.micSensitivityPopover;
    const btn = elements.micSensitivityTriggerBtn;
    if (!pop || !btn) return;
    trainingTour.micSensitivityForcedOpen = true;
    pop.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeTrainingMicSensitivityPopover() {
    if (!trainingTour.micSensitivityForcedOpen) return;
    trainingTour.micSensitivityForcedOpen = false;
    const pop = elements.micSensitivityPopover;
    const btn = elements.micSensitivityTriggerBtn;
    if (pop) pop.setAttribute('hidden', '');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function ensureTrainingTypeModalForDemo() {
    if (typeModal && trainingTour.typeModalOpenedForTraining) return;
    openTrainingTypeModalForDemo();
  }

  function trainingGoPrev() {
    if (!trainingTour.active || trainingTour.stepIndex <= 0) return;
    trainingTour.stepIndex -= 1;
    void renderTrainingStep();
  }

  function trainingGoNext() {
    if (!trainingTour.active) return;
    trainingTour.stepIndex += 1;
    if (trainingTour.stepIndex >= trainingTour.steps.length) stopTrainingTour();
    else void renderTrainingStep();
  }

  function onTrainingTourKeydown(e) {
    if (!trainingTour.active) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.key === 'ArrowRight') trainingGoNext();
    else trainingGoPrev();
  }

  function clearTrainingSpotlight() {
    if (trainingTour.spotlightEl) {
      trainingTour.spotlightEl.remove();
      trainingTour.spotlightEl = null;
    }
  }

  function updateTrainingSpotlight(el, opts = {}) {
    clearTrainingSpotlight();
    if (!el) return;
    const pad = opts.pad != null ? opts.pad : 10;
    const border = 3;
    const outerPad = pad + border;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const spot = document.createElement('div');
    spot.id = 'trainingSpotlight';
    spot.style.left = `${Math.max(4, rect.left - outerPad)}px`;
    spot.style.top = `${Math.max(4, rect.top - outerPad)}px`;
    spot.style.width = `${rect.width + outerPad * 2}px`;
    spot.style.height = `${rect.height + outerPad * 2}px`;
    document.body.appendChild(spot);
    trainingTour.spotlightEl = spot;
  }

  function unionElementRects(elements) {
    const rects = (elements || [])
      .map((el) => (el && typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null))
      .filter((r) => r && r.width > 0 && r.height > 0);
    if (!rects.length) return null;
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return { left, top, width: right - left, height: bottom - top };
  }

  function updateTrainingSpotlightUnion(els, opts = {}) {
    const rect = unionElementRects(els);
    if (!rect) return;
    clearTrainingSpotlight();
    const pad = opts.pad != null ? opts.pad : 10;
    const border = 3;
    const outerPad = pad + border;
    const spot = document.createElement('div');
    spot.id = 'trainingSpotlight';
    spot.style.left = `${Math.max(4, rect.left - outerPad)}px`;
    spot.style.top = `${Math.max(4, rect.top - outerPad)}px`;
    spot.style.width = `${rect.width + outerPad * 2}px`;
    spot.style.height = `${rect.height + outerPad * 2}px`;
    document.body.appendChild(spot);
    trainingTour.spotlightEl = spot;
  }

  function refreshTrainingSpotlightLayout() {
    if (!trainingTour.active || !trainingTour.spotlightTarget) return;
    if (trainingTour.spotlightMicUnion && elements.micSensitivityPopover && elements.micSensitivityTriggerBtn) {
      updateTrainingSpotlightUnion(
        [elements.micSensitivityPopover, elements.micSensitivityTriggerBtn],
        { pad: trainingTour.spotlightPad }
      );
    } else {
      updateTrainingSpotlight(trainingTour.spotlightTarget, { pad: trainingTour.spotlightPad });
    }
    scheduleTrainingTooltipPlacement(trainingTour.spotlightTarget);
  }

  function clearTrainingHighlight() {
    if (trainingTour.highlighted) {
      trainingTour.highlighted.classList.remove(
        'training-focus',
        'training-highlight--workspace',
        'vf-training-demo-appear'
      );
    }
    document.getElementById('type-modal')?.classList.remove('training-focus');
    trainingTour.highlighted = null;
    clearTrainingSpotlight();
  }

  function restoreTrainingAiPanel() {
    if (!trainingTour.aiPanelForced) return;
    trainingTour.aiPanelForced = false;
    const list = elements.aiSuggestionsList;
    const loading = elements.aiSuggestionsLoading;
    if (list) list.innerHTML = '';
    if (loading) loading.style.display = 'none';
    syncAiSuggestionsPanelVisibility();
  }

  function cleanupTrainingDialogArtifacts() {
    if (trainingTour.modalSuggestionsTimer) {
      clearTimeout(trainingTour.modalSuggestionsTimer);
      trainingTour.modalSuggestionsTimer = null;
    }
    if (trainingTour.aiPanelSuggestionsTimer) {
      clearTimeout(trainingTour.aiPanelSuggestionsTimer);
      trainingTour.aiPanelSuggestionsTimer = null;
    }
    if (trainingTour.typeModalOpenedForTraining) {
      hideTypeModal();
      trainingTour.typeModalOpenedForTraining = false;
    }
    restoreTrainingAiPanel();
    closeTrainingMicSensitivityPopover();
    removeTrainingDemoMessage();
    removeTrainingDemoPartnerMessage();
  }

  function ensureTrainingTooltip() {
    if (trainingTour.tooltip && document.body.contains(trainingTour.tooltip)) return trainingTour.tooltip;
    const tooltip = document.createElement('div');
    tooltip.id = 'chatTrainingTooltip';
    document.body.appendChild(tooltip);
    trainingTour.tooltip = tooltip;
    return tooltip;
  }

  const TRAINING_SPOTLIGHT_GLOW_PX = 27; // box-shadow halo + 3px border outside spotlight box
  const TRAINING_TOOLTIP_GAP_PX = 22;

  function getTrainingSpotlightFrameRect(fallbackTarget) {
    const pad = trainingTour.spotlightPad != null ? trainingTour.spotlightPad : 10;
    const glow = TRAINING_SPOTLIGHT_GLOW_PX;
    if (trainingTour.spotlightEl && trainingTour.spotlightEl.isConnected) {
      const spot = trainingTour.spotlightEl.getBoundingClientRect();
      return {
        top: spot.top - glow,
        left: spot.left - glow,
        width: spot.width + glow * 2,
        height: spot.height + glow * 2,
        bottom: spot.bottom + glow,
        right: spot.right + glow,
      };
    }
    if (fallbackTarget) {
      const rect = fallbackTarget.getBoundingClientRect();
      const outer = pad + glow;
      return {
        top: rect.top - outer,
        left: rect.left - outer,
        width: rect.width + outer * 2,
        height: rect.height + outer * 2,
        bottom: rect.bottom + outer,
        right: rect.right + outer,
      };
    }
    return null;
  }

  function placeTrainingTooltip(target) {
    if (!trainingTour.tooltip) return;
    const frameRect = getTrainingSpotlightFrameRect(target);
    if (!frameRect) return;
    const tooltip = trainingTour.tooltip;
    const gap = TRAINING_TOOLTIP_GAP_PX;
    const edge = 12;
    const maxLeft = Math.max(edge, window.innerWidth - tooltip.offsetWidth - edge);
    const left = Math.min(Math.max(edge, frameRect.left), maxLeft);
    const spaceBelow = window.innerHeight - edge - (frameRect.bottom + gap);
    const spaceAbove = frameRect.top - gap - edge;
    let top;
    if (tooltip.offsetHeight <= spaceBelow) {
      top = frameRect.bottom + gap;
    } else if (tooltip.offsetHeight <= spaceAbove) {
      top = frameRect.top - gap - tooltip.offsetHeight;
    } else {
      top = frameRect.bottom + gap;
      top = Math.min(top, window.innerHeight - tooltip.offsetHeight - edge);
      top = Math.max(edge, top);
    }
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.dataset.placement = top >= frameRect.bottom ? 'below' : 'above';
  }

  function scheduleTrainingTooltipPlacement(target) {
    placeTrainingTooltip(target);
    requestAnimationFrame(() => {
      placeTrainingTooltip(target);
      requestAnimationFrame(() => placeTrainingTooltip(target));
    });
  }

  function stopTrainingTour() {
    trainingTour.active = false;
    document.body.classList.remove('training-tour-active');
    trainingTour.tooltipClickBound = false;
    clearTrainingHighlight();
    cleanupTrainingDialogArtifacts();
    if (trainingTour.tooltip && trainingTour.tooltip.parentNode) {
      trainingTour.tooltip.parentNode.removeChild(trainingTour.tooltip);
    }
    trainingTour.tooltip = null;
    trainingTour.spotlightTarget = null;
    trainingTour.spotlightMicUnion = false;
    if (trainingTour.autoExpandedChatSettings && trainingTour.wasChatSettingsCollapsed) {
      setChatSettingsPanelExpanded(false, { animate: true });
    }
    trainingTour.autoExpandedChatSettings = false;
    trainingTour.wasChatSettingsCollapsed = false;
  }

  function trainingStepNeedsChatSettings(step) {
    return !!(step && CHAT_SETTINGS_TRAINING_SELECTORS.has(step.selector));
  }

  function chatSettingsPanelTransition(wrap, expanded) {
    return new Promise((resolve) => {
      if (!wrap) {
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        wrap.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (e) => {
        if (e.target !== wrap) return;
        finish();
      };
      wrap.addEventListener('transitionend', onEnd);
      setTimeout(finish, 420);
      setChatSettingsPanelExpanded(expanded, { animate: true });
    });
  }

  function expandChatSettingsForTraining() {
    const wrap = elements.chatSessionSettingsWrap;
    if (!wrap || !wrap.classList.contains('is-collapsed')) {
      return Promise.resolve();
    }
    trainingTour.autoExpandedChatSettings = true;
    return chatSettingsPanelTransition(wrap, true);
  }

  function collapseChatSettingsForTraining() {
    const wrap = elements.chatSessionSettingsWrap;
    if (!wrap || wrap.classList.contains('is-collapsed')) {
      return Promise.resolve();
    }
    return chatSettingsPanelTransition(wrap, false);
  }

  async function prepareTrainingDialogStep(step) {
    if (!step?.dialogGroup) return;
    await collapseChatSettingsForTraining();
    if (step.selector === '.chat-columns-row') {
      removeTrainingDemoMessage();
      return;
    }
    if (step.insertTrainingDemo || step.requiresTrainingDemo || step.openTrainingTypeModal || step.showTrainingAiPanel) {
      insertTrainingDemoMessage();
    }
    if (step.ensureDemoPlay) {
      ensureTrainingDemoPlayButton(
        trainingTour.demoMessageEl || document.getElementById('vfTrainingDemoBubble')
      );
    }
    if (!step.showTrainingAiPanel) {
      removeTrainingDemoPartnerMessage();
    }
    if (step.openMicSensitivityPopover) {
      openTrainingMicSensitivityPopover();
    } else {
      closeTrainingMicSensitivityPopover();
    }
    if (step.showTrainingAiPanel) {
      if (trainingTour.typeModalOpenedForTraining) {
        hideTypeModal();
        trainingTour.typeModalOpenedForTraining = false;
      }
      showTrainingAiPanelDemo();
      return;
    }
    if (step.openTrainingTypeModal || step.showTrainingModalSuggestions) {
      ensureTrainingTypeModalForDemo();
      if (step.showTrainingModalSuggestions) {
        showTrainingModalSuggestionsDemo();
      }
      return;
    }
    if (trainingTour.typeModalOpenedForTraining) {
      hideTypeModal();
      trainingTour.typeModalOpenedForTraining = false;
    }
    restoreTrainingAiPanel();
  }

  async function renderTrainingStep() {
    if (!trainingTour.active) return;
    const step = trainingTour.steps[trainingTour.stepIndex];
    if (!step) { stopTrainingTour(); return; }

    if (step.dialogGroup) {
      await prepareTrainingDialogStep(step);
    } else {
      cleanupTrainingDialogArtifacts();
      const deferMenuExpand = !!(step.openChatSettings && step.openChatSettingsAfterHighlight);
      if (deferMenuExpand) {
        await collapseChatSettingsForTraining();
      } else if (step.openChatSettings || trainingStepNeedsChatSettings(step)) {
        await expandChatSettingsForTraining();
      }
    }

    let target = resolveTrainingStepTarget(step);
    if (!target && (step.openTrainingTypeModal || step.showTrainingModalSuggestions)) {
      ensureTrainingTypeModalForDemo();
      if (step.showTrainingModalSuggestions) showTrainingModalSuggestionsDemo();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      target = resolveTrainingStepTarget(step) || document.getElementById('type-modal');
    }
    if (!target && step.showTrainingAiPanel) {
      showTrainingAiPanelDemo();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      target = document.getElementById('ai-suggestions-panel');
    }
    if (!target && step.openMicSensitivityPopover) {
      openTrainingMicSensitivityPopover();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      target = document.getElementById('micSensitivityPopover');
    }
    const highlightSel = step.highlightTarget || step.selector;
    let highlightEl = resolveTrainingStepTarget({ ...step, selector: highlightSel, highlightTarget: highlightSel });
    if (!highlightEl) highlightEl = target;
    if (!target) {
      console.warn('[training] target not found, keeping step:', step.selector);
      target = elements.mainWorkspace || document.querySelector('.chat-container') || document.body;
      highlightEl = target;
    }
    let spotlightEl = highlightEl;
    const trainingModal = document.getElementById('type-modal');
    if (trainingModal && (step.openTrainingTypeModal || step.showTrainingModalSuggestions)) {
      trainingModal.classList.add('training-focus');
    }
    if (step.showTrainingModalSuggestions) {
      const suggestionsBlock = trainingModal?.querySelector('#suggestions-container');
      if (suggestionsBlock) {
        spotlightEl = suggestionsBlock;
        highlightEl = suggestionsBlock;
      }
    } else if (step.openTrainingTypeModal && trainingModal) {
      spotlightEl = trainingModal;
      highlightEl = trainingModal;
    }
    let spotlightMicUnion = false;
    if (step.openMicSensitivityPopover) {
      const micWrap = document.querySelector('.mic-sensitivity-footer-wrap');
      const micPop = elements.micSensitivityPopover;
      const micBtn = elements.micSensitivityTriggerBtn;
      if (micWrap && micPop) {
        highlightEl = micWrap;
        spotlightEl = micPop;
        spotlightMicUnion = !!(micBtn && !micPop.hasAttribute('hidden'));
      }
    }
    clearTrainingHighlight();
    trainingTour.spotlightMicUnion = spotlightMicUnion;
    trainingTour.highlighted = highlightEl;
    highlightEl.classList.add('training-focus');
    if (step.selector === '.chat-columns-row') {
      highlightEl.classList.add('training-highlight--workspace');
    }
    if (step.insertTrainingDemo) {
      highlightEl.classList.add('vf-training-demo-appear');
    }
    const footerSpotlightSelectors = new Set([
      '#footerSpeakHint',
      '#status',
      '#micMeterWrap',
      '#micSensitivityTriggerBtn',
      '#micSensitivityPopover',
    ]);
    const demoBubbleSpotlightSelectors = new Set([
      '#vfTrainingDemoBubble',
      '#vfTrainingDemoBubble .msg-delete',
      '#vfTrainingDemoBubble .msg-play-btn',
      '#vfTrainingDemoBubble .msg-status',
      '#vfTrainingDemoBubble .msg-meta',
    ]);
    let spotlightPad = 10;
    if (footerSpotlightSelectors.has(step.selector)) {
      spotlightPad = 6;
    } else if (
      demoBubbleSpotlightSelectors.has(step.selector) ||
      demoBubbleSpotlightSelectors.has(step.highlightTarget)
    ) {
      spotlightPad = 10;
    }
    trainingTour.spotlightPad = spotlightPad;
    trainingTour.spotlightTarget = spotlightEl;
    if (spotlightMicUnion && elements.micSensitivityPopover && elements.micSensitivityTriggerBtn) {
      updateTrainingSpotlightUnion(
        [elements.micSensitivityPopover, elements.micSensitivityTriggerBtn],
        { pad: spotlightPad }
      );
    } else {
      updateTrainingSpotlight(spotlightEl, { pad: spotlightPad });
    }
    if (!step.openMicSensitivityPopover) {
      spotlightEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (spotlightMicUnion && elements.micSensitivityPopover && elements.micSensitivityTriggerBtn) {
      updateTrainingSpotlightUnion(
        [elements.micSensitivityPopover, elements.micSensitivityTriggerBtn],
        { pad: spotlightPad }
      );
    } else {
      updateTrainingSpotlight(spotlightEl, { pad: spotlightPad });
    }
    if (step.insertTrainingDemo && highlightEl) {
      const onDemoAnimEnd = () => {
        highlightEl.removeEventListener('animationend', onDemoAnimEnd);
        refreshTrainingSpotlightLayout();
      };
      highlightEl.addEventListener('animationend', onDemoAnimEnd);
      setTimeout(refreshTrainingSpotlightLayout, 480);
    }

    const tooltip = ensureTrainingTooltip();
    const current = trainingTour.stepIndex + 1;
    const total = trainingTour.steps.length;
    const prevDisabled = trainingTour.stepIndex === 0 ? 'disabled' : '';
    const nextLabel = trainingTour.stepIndex === total - 1 ? t('trainingFinish') : t('trainingNext');
    tooltip.innerHTML = `
      <div><strong>${t('trainingTitle')} ${current}/${total}</strong></div>
      <div>${step.text}</div>
      <div class="training-tooltip-actions">
        <button type="button" data-action="close">${t('trainingClose')}</button>
        <button type="button" data-action="prev" ${prevDisabled}>${t('trainingPrev')}</button>
        <button type="button" data-action="next" class="primary">${nextLabel}</button>
      </div>
    `;
    if (!trainingTour.tooltipClickBound) {
      tooltip.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        if (action === 'close') stopTrainingTour();
        else if (action === 'prev') trainingGoPrev();
        else if (action === 'next') trainingGoNext();
      });
      trainingTour.tooltipClickBound = true;
    }
    scheduleTrainingTooltipPlacement(spotlightEl);

    if (step.openChatSettings && step.openChatSettingsAfterHighlight) {
      await new Promise((resolve) => setTimeout(resolve, 550));
      await expandChatSettingsForTraining();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (spotlightMicUnion && elements.micSensitivityPopover && elements.micSensitivityTriggerBtn) {
        updateTrainingSpotlightUnion(
          [elements.micSensitivityPopover, elements.micSensitivityTriggerBtn],
          { pad: spotlightPad }
        );
      } else {
        updateTrainingSpotlight(spotlightEl, { pad: spotlightPad });
      }
      scheduleTrainingTooltipPlacement(spotlightEl);
    }
  }

  function startTrainingTour() {
    trainingTour.steps = buildTrainingSteps();
    if (!trainingTour.steps.length) return;
    trainingTour.wasChatSettingsCollapsed = !!(
      elements.chatSessionSettingsWrap &&
      elements.chatSessionSettingsWrap.classList.contains('is-collapsed')
    );
    trainingTour.autoExpandedChatSettings = false;
    trainingTour.active = true;
    document.body.classList.add('training-tour-active');
    if (!trainingTour.keydownBound) {
      document.addEventListener('keydown', onTrainingTourKeydown, true);
      trainingTour.keydownBound = true;
    }
    trainingTour.stepIndex = 0;
    void renderTrainingStep();
  }

  const A11Y_FONT_SCALE_MIN = 85;
  const A11Y_FONT_SCALE_MAX = 140;
  const A11Y_FONT_PRESETS = [100, 115, 130];

  function applyA11yDom() {
    let fsPct = parseInt(localStorage.getItem('voiceTranslator_fontScale'), 10);
    if (!Number.isFinite(fsPct)) fsPct = 100;
    fsPct = Math.min(A11Y_FONT_SCALE_MAX, Math.max(A11Y_FONT_SCALE_MIN, fsPct));
    try {
      localStorage.setItem('voiceTranslator_fontScale', String(fsPct));
    } catch (e) { /* ignore */ }

    document.documentElement.removeAttribute('data-fs');
    document.documentElement.style.setProperty('--a11y-font-scale-pct', String(fsPct));

    const nearestFontPreset = A11Y_FONT_PRESETS.reduce((best, p) =>
      (Math.abs(p - fsPct) < Math.abs(best - fsPct) ? p : best),
      A11Y_FONT_PRESETS[0],
    );
    if (elements.a11yFontSelect) elements.a11yFontSelect.value = String(nearestFontPreset);

    let contrastLevel = parseInt(localStorage.getItem('voiceTranslator_contrastLevel'), 10);
    if (!Number.isFinite(contrastLevel)) {
      const legacy = localStorage.getItem('voiceTranslator_contrast');
      contrastLevel = legacy === 'high' ? 100 : 0;
      try {
        localStorage.setItem('voiceTranslator_contrastLevel', String(contrastLevel));
        if (legacy === 'high' || legacy === 'default') localStorage.removeItem('voiceTranslator_contrast');
      } catch (e) { /* ignore */ }
    }
    contrastLevel = Math.min(100, Math.max(0, contrastLevel));
    document.documentElement.style.setProperty('--a11y-contrast-strength', String(contrastLevel / 100));

    const contrastPreset = contrastLevel <= 33 ? '0' : contrastLevel >= 67 ? '100' : '50';
    if (elements.a11yContrastSelect) elements.a11yContrastSelect.value = contrastPreset;

    if (elements.a11yFontRange) elements.a11yFontRange.value = String(fsPct);
    if (elements.a11yFontValue) elements.a11yFontValue.textContent = `${fsPct}%`;
    if (elements.a11yContrastRange) elements.a11yContrastRange.value = String(contrastLevel);
    if (elements.a11yContrastValue) elements.a11yContrastValue.textContent = `${contrastLevel}%`;
  }
  window.applyA11yDom = applyA11yDom;
  window.syncFooterPlayHint = syncFooterPlayHint;
  window.syncAllMsgPlayButtons = syncAllMsgPlayButtons;

  function applyThemeDom() {
    const raw = localStorage.getItem('voiceTranslator_theme') || 'default';
    const allowed = ['default', 'dark-violet', 'light', 'light-soft'];
    const theme = allowed.includes(raw) ? raw : 'default';
    if (theme === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    if (elements.themeSelect) elements.themeSelect.value = theme;
  }

  function updateMicMeterIdle() {
    if (!elements.micMeterFill) return;
    elements.micMeterFill.style.width = '0%';
    elements.micMeterFill.classList.remove('level-clip', 'level-quiet');
    if (elements.micMeterHint) {
      elements.micMeterHint.textContent = '';
      elements.micMeterHint.className = 'mic-meter-hint';
    }
  }

  function updateMicMeterUI(d) {
    if (!elements.micMeterFill) return;
    if (state.browserMicMode) {
      const livePct = browserMicCaptureActive
        ? Math.min(100, Math.max(4, Math.round(browserMicLastRms * 560)))
        : 0;
      elements.micMeterFill.style.width = livePct + '%';
      elements.micMeterFill.classList.remove('level-clip', 'level-quiet');
      if (browserMicCaptureActive && browserMicLastRms < 0.005) {
        elements.micMeterFill.classList.add('level-quiet');
      }
      if (elements.micMeterHint) {
        if (trialMicPausedForTts) {
          elements.micMeterHint.textContent = t('micHintTrialPlayback');
          elements.micMeterHint.className = 'mic-meter-hint';
        } else if (browserMicCaptureActive) {
          elements.micMeterHint.textContent =
            browserMicLastRms < 0.005 ? t('micHintQuiet') : t('micHintBrowser');
          elements.micMeterHint.className =
            browserMicLastRms < 0.005 ? 'mic-meter-hint level-quiet' : 'mic-meter-hint';
        } else {
          elements.micMeterHint.textContent = t('micHintBrowserWaiting');
          elements.micMeterHint.className = 'mic-meter-hint';
        }
      }
      return;
    }
    const rms = typeof d.mic_rms === 'number' ? d.mic_rms : 0;
    const hint = d.mic_level_hint || 'idle';
    let pct = Math.min(100, Math.round(Math.sqrt(Math.max(0, rms)) * 140));
    if (hint === 'quiet') pct = Math.min(pct, 18);
    if (hint === 'clip') pct = Math.max(pct, 88);
    elements.micMeterFill.style.width = pct + '%';
    elements.micMeterFill.classList.remove('level-clip', 'level-quiet');
    if (hint === 'clip') elements.micMeterFill.classList.add('level-clip');
    else if (hint === 'quiet') elements.micMeterFill.classList.add('level-quiet');
    if (elements.micMeterHint) {
      elements.micMeterHint.classList.remove('level-clip', 'level-quiet');
      if (hint === 'clip') {
        elements.micMeterHint.classList.add('level-clip');
        elements.micMeterHint.textContent = t('micHintClip');
      } else if (hint === 'quiet') {
        elements.micMeterHint.classList.add('level-quiet');
        elements.micMeterHint.textContent = t('micHintQuiet');
      } else if (hint === 'ok') {
        elements.micMeterHint.textContent = t('micHintOk');
      } else {
        elements.micMeterHint.textContent = '';
      }
    }
  }

  let micMeterPollingWanted = false;
  function setMicMeterPolling(active) {
    const want = !!active;
    if (want === micMeterPollingWanted) return;
    micMeterPollingWanted = want;
    if (micMeterInterval) {
      clearInterval(micMeterInterval);
      micMeterInterval = null;
    }
    if (!want) {
      updateMicMeterIdle();
      return;
    }
    void pollMicMeterLight();
    micMeterInterval = setInterval(() => { void pollMicMeterLight(); }, 320);
  }

  async function pollMicMeterLight() {
    if (!state.isRunning) return;
    if (isTrialMode() || state.browserMicMode) {
      updateMicMeterUI({});
      return;
    }
    try {
      const resp = await fetch(`${CONFIG.apiBaseUrl}/api/status`);
      if (!resp.ok) return;
      const d = await resp.json();
      updateMicMeterUI(d);
      if (typeof d.translation_paused === 'boolean' && elements.translationPauseToggle) {
        if (elements.translationPauseToggle.checked !== d.translation_paused) {
          state._syncTranslationPauseUi = true;
          elements.translationPauseToggle.checked = d.translation_paused;
          state.translationPaused = d.translation_paused;
          state._syncTranslationPauseUi = false;
        }
      }
    } catch (e) { /* ignore */ }
  }

  function applyStoredColumnLayout() {
    const userCol = $('user-column');
    const partnerCol = $('partner-column');
    const main = elements.mainWorkspace;
    if (!userCol || !partnerCol) return;
    let ratio = parseFloat(localStorage.getItem('voiceTranslator_chatUserRatio') || '', 10);
    if (!Number.isFinite(ratio)) ratio = 0.5;
    ratio = Math.min(0.88, Math.max(0.12, ratio));
    const u = Math.round(ratio * 1000);
    const p = Math.round((1 - ratio) * 1000);
    userCol.style.flex = `${u} 1 0`;
    partnerCol.style.flex = `${p} 1 0`;
    if (main) {
      const w = parseInt(localStorage.getItem('voiceTranslator_aiPanelWidthPx') || '', 10);
      if (Number.isFinite(w) && w >= 200) {
        main.style.setProperty('--ai-panel-width', `${Math.min(680, Math.max(200, w))}px`);
      }
    }
  }

  function isAiSuggestionsMobileStack() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches;
  }

  function effectiveAiSuggestionsColumn() {
    return state.aiSuggestionsLayout === 'column' && !isAiSuggestionsMobileStack();
  }

  function applyAiSuggestionsLayout() {
    const column = effectiveAiSuggestionsColumn();
    if (elements.mainWorkspace) {
      elements.mainWorkspace.classList.toggle('suggestions-as-column', column);
    }
    const btn = elements.aiSuggestionsLayoutToggle;
    if (btn) {
      btn.title = column ? 'Панель внизу экрана' : 'Панель справа (третья колонка)';
      btn.setAttribute('aria-pressed', column ? 'true' : 'false');
      const toCol = btn.querySelector('.ai-layout-ico--to-column');
      const toBot = btn.querySelector('.ai-layout-ico--to-bottom');
      if (toCol) toCol.style.display = column ? 'none' : 'block';
      if (toBot) toBot.style.display = column ? 'block' : 'none';
    }
    applyStoredColumnLayout();
  }

  /** Панель «Подсказки ответов» только при включённом AI */
  const aiSheetState = {
    heightPx: null,
    lastExpandedPx: null,
    dragging: false,
    dragMoved: false,
    pointerId: null,
    startY: 0,
    startHeight: 0,
    initialized: false,
  };

  function getAiSheetPeekHeight() {
    return 56;
  }

  function getAiSheetMaxHeight() {
    return Math.max(160, Math.round(window.innerHeight * 0.76));
  }

  function getAiSheetMidHeight() {
    return Math.round(getAiSheetMaxHeight() * 0.42);
  }

  function readAiSheetHeight() {
    try {
      const v = parseInt(localStorage.getItem('voiceTranslator_aiSheetHeightPx') || '', 10);
      if (Number.isFinite(v) && v >= getAiSheetPeekHeight()) {
        return Math.min(v, getAiSheetMaxHeight());
      }
    } catch (e) {
      /* ignore */
    }
    return getAiSheetMidHeight();
  }

  function persistAiSheetHeight(px) {
    try {
      localStorage.setItem('voiceTranslator_aiSheetHeightPx', String(Math.round(px)));
    } catch (e) {
      /* ignore */
    }
  }

  function snapAiSheetHeight(px) {
    const snaps = [getAiSheetPeekHeight(), getAiSheetMidHeight(), getAiSheetMaxHeight()];
    let best = snaps[0];
    let bestDist = Math.abs(px - best);
    for (let i = 1; i < snaps.length; i++) {
      const dist = Math.abs(px - snaps[i]);
      if (dist < bestDist) {
        best = snaps[i];
        bestDist = dist;
      }
    }
    return best;
  }

  function applyAiSheetHeight(px, opts) {
    const panel = elements.aiSuggestionsPanel;
    if (!panel) return;
    const peek = getAiSheetPeekHeight();
    const max = getAiSheetMaxHeight();
    const h = Math.max(peek, Math.min(max, Math.round(px)));
    panel.style.setProperty('--ai-sheet-height', `${h}px`);
    panel.style.height = `${h}px`;
    const collapsed = h <= peek + 2;
    panel.classList.toggle('ai-sheet-collapsed', collapsed);
    document.body.classList.toggle('ai-suggestions-sheet-collapsed', collapsed);
    if (!collapsed) aiSheetState.lastExpandedPx = h;
    aiSheetState.heightPx = h;
    if (!opts || !opts.skipPersist) persistAiSheetHeight(h);
  }

  function syncAiSuggestionsMobileSheet() {
    const mobile = isAiSuggestionsMobileStack();
    const panel = elements.aiSuggestionsPanel;
    const active = mobile && state.aiEnabled && panel && !panel.hasAttribute('hidden');
    document.body.classList.toggle('ai-sheet-mode', !!active);
    if (!active) {
      if (panel) {
        panel.style.removeProperty('height');
        panel.style.removeProperty('--ai-sheet-height');
        panel.classList.remove('ai-sheet-collapsed');
      }
      document.body.classList.remove('ai-suggestions-sheet-collapsed', 'ai-sheet-dragging');
      return;
    }
    applyAiSheetHeight(
      aiSheetState.heightPx != null ? aiSheetState.heightPx : readAiSheetHeight(),
      { skipPersist: aiSheetState.dragging }
    );
  }

  function canStartAiSheetDrag(target) {
    if (!document.body.classList.contains('ai-sheet-mode')) return false;
    if (!(target instanceof Element)) return false;
    if (target.closest('.ai-suggestions-sheet-handle')) return true;
    const header = target.closest('.ai-suggestions-header');
    return !!(header && !target.closest('button'));
  }

  function onAiSheetPointerDown(e) {
    if (!canStartAiSheetDrag(e.target)) return;
    const panel = elements.aiSuggestionsPanel;
    if (!panel || aiSheetState.dragging) return;
    aiSheetState.dragging = true;
    aiSheetState.dragMoved = false;
    aiSheetState.pointerId = e.pointerId;
    aiSheetState.startY = e.clientY;
    aiSheetState.startHeight = panel.offsetHeight || readAiSheetHeight();
    document.body.classList.add('ai-sheet-dragging');
    const captureEl = e.currentTarget;
    try {
      if (captureEl && typeof captureEl.setPointerCapture === 'function') {
        captureEl.setPointerCapture(e.pointerId);
      }
    } catch (_) {
      /* ignore */
    }
    e.preventDefault();
  }

  function onAiSheetPointerMove(e) {
    if (!aiSheetState.dragging || e.pointerId !== aiSheetState.pointerId) return;
    const dy = aiSheetState.startY - e.clientY;
    if (Math.abs(dy) > 6) aiSheetState.dragMoved = true;
    applyAiSheetHeight(aiSheetState.startHeight + dy, { skipPersist: true });
  }

  function finishAiSheetDrag(e) {
    if (!aiSheetState.dragging || e.pointerId !== aiSheetState.pointerId) return;
    aiSheetState.dragging = false;
    aiSheetState.pointerId = null;
    document.body.classList.remove('ai-sheet-dragging');
    const panel = elements.aiSuggestionsPanel;
    const h = panel ? panel.offsetHeight : getAiSheetMidHeight();
    applyAiSheetHeight(snapAiSheetHeight(h));
  }

  function onAiSheetHandleTap(e) {
    if (!document.body.classList.contains('ai-sheet-mode')) return;
    if (aiSheetState.dragMoved) {
      aiSheetState.dragMoved = false;
      return;
    }
    const panel = elements.aiSuggestionsPanel;
    if (!panel) return;
    if (panel.classList.contains('ai-sheet-collapsed')) {
      applyAiSheetHeight(aiSheetState.lastExpandedPx || getAiSheetMidHeight());
    } else {
      applyAiSheetHeight(getAiSheetPeekHeight());
    }
  }

  function initAiSuggestionsMobileSheet() {
    if (aiSheetState.initialized) return;
    const panel = elements.aiSuggestionsPanel;
    const handle = document.getElementById('aiSuggestionsSheetHandle');
    const header = panel ? panel.querySelector('.ai-suggestions-header') : null;
    if (!panel || !handle) return;
    aiSheetState.initialized = true;
    [handle, header].filter(Boolean).forEach((el) => {
      el.addEventListener('pointerdown', onAiSheetPointerDown);
      el.addEventListener('pointermove', onAiSheetPointerMove);
      el.addEventListener('pointerup', finishAiSheetDrag);
      el.addEventListener('pointercancel', finishAiSheetDrag);
    });
    handle.addEventListener('click', onAiSheetHandleTap);
    window.addEventListener('resize', () => {
      syncAiSuggestionsMobileSheet();
      if (!document.body.classList.contains('ai-sheet-mode')) return;
      applyAiSheetHeight(aiSheetState.heightPx != null ? aiSheetState.heightPx : readAiSheetHeight());
    });
  }

  function syncAiSuggestionsPanelVisibility() {
    const panel = elements.aiSuggestionsPanel;
    const main = elements.mainWorkspace;
    const resAi = elements.resizerChatAi;
    if (!panel || !main) return;

    if (!state.aiEnabled) {
      panel.setAttribute('hidden', '');
      panel.setAttribute('aria-hidden', 'true');
      main.classList.remove('suggestions-as-column');
      if (resAi) {
        resAi.style.display = 'none';
        resAi.setAttribute('aria-hidden', 'true');
      }
      syncAiSuggestionsMobileSheet();
      return;
    }

    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    applyAiSuggestionsLayout();
    if (resAi) {
      const column = effectiveAiSuggestionsColumn();
      resAi.style.display = column ? '' : 'none';
      resAi.setAttribute('aria-hidden', column ? 'false' : 'true');
    }
    syncAiSuggestionsMobileSheet();
  }

  let columnResizersInitialized = false;
  let phraseSilencePostTimer = null;
  let micRmsThresholdPostTimer = null;
  let userTtsVolumePostTimer = null;
  /** Цепочка автo-озвучки: иначе два POST /api/voice подряд конкурируют за выход */
  let autoPlayVoiceChain = Promise.resolve();

  function readAutoPlayPreference() {
    try {
      return localStorage.getItem('voiceTranslator_autoPlay') !== 'false';
    } catch (e) {
      return true;
    }
  }

  /** В демо: выбор в меню чата (localStorage) важнее снимка trial-setup. */
  function readTrialAutoPlayPreference() {
    if (!isTrialMode()) return readAutoPlayPreference();
    try {
      if (localStorage.getItem('voiceTranslator_autoPlay') != null) {
        return localStorage.getItem('voiceTranslator_autoPlay') !== 'false';
      }
    } catch (e) {
      /* ignore */
    }
    if (typeof state.autoPlay === 'boolean') return state.autoPlay;
    const ts = state.trialSettings || {};
    if (typeof ts.autoPlay === 'boolean') return ts.autoPlay;
    return true;
  }

  function persistTrialSessionAutoPlay(enabled) {
    if (!isTrialMode() || !state.trialSessionId) return Promise.resolve();
    state.trialSettings = state.trialSettings || {};
    state.trialSettings.autoPlay = !!enabled;
    return fetch(`${CONFIG.apiBaseUrl}/api/trial/session-langs`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        session_id: state.trialSessionId,
        auto_play: !!enabled,
      }),
    }).catch((e) => {
      console.warn('persistTrialSessionAutoPlay:', e);
    });
  }

  function syncAutoPlayStateFromPreference() {
    state.autoPlay = isTrialMode() ? readTrialAutoPlayPreference() : readAutoPlayPreference();
  }

  function cancelPendingAutoPlayVoice() {
    autoPlayVoiceChain = Promise.resolve();
    Object.keys(msgElements).forEach(function (id) {
      const el = msgElements[id];
      if (el && el.dataset) delete el.dataset.vfAutoPlayQueued;
    });
  }

  function isUserMessageBubble(el) {
    return el && !el.classList.contains('partner');
  }

  function syncFooterPlayHint() {
    const hint = document.querySelector('[data-i18n="footerHint"]');
    if (!hint) return;
    const key = state.autoPlay ? 'footerHint' : 'footerHintManualPlay';
    hint.setAttribute('data-i18n', key);
    hint.textContent = t(key);
  }

  function syncMsgPlayButton(el) {
    if (!isUserMessageBubble(el)) return;
    const status = el.dataset.vfMsgStatus || '';
    const awaiting = status === 'recognized' || el.classList.contains('msg-awaiting-voice');
    const playing = status === 'playing';
    const show = !state.autoPlay && (awaiting || playing);
    let btn = el.querySelector('.msg-play-btn');
    if (!show) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'msg-play-btn';
      btn.setAttribute('data-i18n-title', 'msgPlayAria');
      btn.setAttribute('data-i18n-aria-label', 'msgPlayAria');
      const label = document.createElement('span');
      label.className = 'msg-play-btn-label';
      label.setAttribute('data-i18n', 'msgPlayBtn');
      label.textContent = t('msgPlayBtn');
      btn.appendChild(label);
      const meta = el.querySelector('.msg-meta');
      if (meta) meta.insertBefore(btn, meta.firstChild);
    }
    const label = btn.querySelector('.msg-play-btn-label');
    if (label) label.textContent = t('msgPlayBtn');
    btn.title = t('msgPlayAria');
    btn.setAttribute('aria-label', t('msgPlayAria'));
    btn.disabled = playing || state.isProcessing;
    btn.classList.toggle('is-busy', playing || state.isProcessing);
  }

  function syncAllMsgPlayButtons() {
    Object.keys(msgElements).forEach((id) => {
      syncMsgPlayButton(msgElements[id]);
    });
  }

  function triggerMessagePlay(bubble) {
    if (!bubble || state.isProcessing) return;
    unlockBrowserAudioForPlayback();
    const msgId = parseInt(bubble.dataset.msgId, 10);
    if (!msgId || Number.isNaN(msgId)) return;
    const input = bubble.querySelector('.msg-input');
    const text = input ? input.value : (bubble.querySelector('.msg-text')?.textContent || '');
    void voiceSpecificMessage(msgId, text);
  }
  function initColumnResizers() {
    if (columnResizersInitialized) return;
    const RES = 6;
    const chat = document.querySelector('.chat-container');
    const userCol = $('user-column');
    const partnerCol = $('partner-column');
    const r1 = $('resizerUserPartner');
    const r2 = $('resizerChatAi');
    const main = elements.mainWorkspace;
    const aiPanel = elements.aiSuggestionsPanel;
    if (!chat || !userCol || !partnerCol || !r1 || !main) return;
    columnResizersInitialized = true;

    let drag = null;

    function endDrag() {
      if (!drag) return;
      document.body.classList.remove('column-resize-active');
      r1.classList.remove('is-dragging');
      if (r2) r2.classList.remove('is-dragging');
      if (drag.type === 'user-partner') {
        const uw = userCol.getBoundingClientRect().width;
        const pw = partnerCol.getBoundingClientRect().width;
        const sum = uw + pw;
        if (sum > 10) {
          const ratio = Math.min(0.88, Math.max(0.12, uw / sum));
          localStorage.setItem('voiceTranslator_chatUserRatio', String(ratio));
        }
      } else if (drag.type === 'chat-ai' && aiPanel) {
        const w = Math.round(aiPanel.getBoundingClientRect().width);
        localStorage.setItem('voiceTranslator_aiPanelWidthPx', String(Math.min(680, Math.max(200, w))));
      }
      drag = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDrag);
    }

    function onMove(e) {
      if (!drag) return;
      if (drag.type === 'user-partner') {
        let newUser = drag.startUserW + (e.clientX - drag.startX);
        newUser = Math.max(drag.minCol, Math.min(drag.chatW - drag.minCol, newUser));
        const ratio = newUser / drag.chatW;
        const u = Math.round(ratio * 1000);
        const p = Math.round((1 - ratio) * 1000);
        userCol.style.flex = `${u} 1 0`;
        partnerCol.style.flex = `${p} 1 0`;
      } else if (drag.type === 'chat-ai' && aiPanel) {
        let newAi = Math.round(drag.startAiW - (e.clientX - drag.startX));
        newAi = Math.max(200, Math.min(680, newAi));
        main.style.setProperty('--ai-panel-width', `${newAi}px`);
      }
    }

    r1.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = chat.getBoundingClientRect();
      const uRect = userCol.getBoundingClientRect();
      const chatW = rect.width - RES;
      if (chatW < 80) return;
      drag = {
        type: 'user-partner',
        startX: e.clientX,
        startUserW: uRect.width,
        chatW,
        minCol: 120
      };
      document.body.classList.add('column-resize-active');
      r1.classList.add('is-dragging');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', endDrag);
    });

    if (r2 && aiPanel) {
      r2.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (!main.classList.contains('suggestions-as-column')) return;
        e.preventDefault();
        drag = {
          type: 'chat-ai',
          startX: e.clientX,
          startAiW: aiPanel.getBoundingClientRect().width
        };
        document.body.classList.add('column-resize-active');
        r2.classList.add('is-dragging');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', endDrag);
      });
    }
  }

  function log(msg, type = 'system') {
    if (!elements.logDiv) return console.log(`[${type}] ${msg}`);
    const entry = document.createElement('div'); entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    elements.logDiv.appendChild(entry); elements.logDiv.scrollTop = elements.logDiv.scrollHeight;
  }

  function updateStatus() {
    if (elements.statusDiv) {
      let statusLabel = state.isRunning ? t('statusRunning') : t('statusStopped');
      const trialLabel = resolveTrialStatusLabel();
      if (trialLabel) {
        statusLabel = trialLabel;
        trialLastMicStatusPhase = trialMicStatusPhase();
      }
      elements.statusDiv.textContent = statusLabel;
      elements.statusDiv.className = `status ${state.isRunning ? 'running' : 'stopped'}`;
    }
    if (elements.startBtn) {
      const startBlocked =
        state.modalWarmupInProgress || (!state.isRunning && !canStartTranslation());
      elements.startBtn.disabled = startBlocked;
      elements.startBtn.style.opacity = startBlocked ? '0.45' : '1';
      elements.startBtn.style.cursor = state.modalWarmupInProgress
        ? 'wait'
        : startBlocked
          ? 'not-allowed'
          : 'pointer';
      elements.startBtn.title = state.modalWarmupInProgress
        ? t('modalWarmupStart')
        : startBlocked
          ? t('startBlockedNoTariff')
          : '';
      elements.startBtn.classList.toggle('btn-start', !state.isRunning);
      elements.startBtn.classList.toggle('btn-stop', state.isRunning);
      elements.startBtn.textContent = state.isRunning ? t('stopBtn') : t('startBtn');
      elements.startBtn.setAttribute(
        'aria-label',
        state.isRunning ? t('stopBtnAria') : t('startBtnAria')
      );
    }
    syncTrialChatPolling();
    if (elements.translationPauseWrap) {
      const showPause = !!state.isRunning && !isTrialMode();
      elements.translationPauseWrap.style.display = showPause ? '' : 'none';
      elements.translationPauseWrap.setAttribute('aria-hidden', showPause ? 'false' : 'true');
    }
    if (elements.translationPauseToggle) {
      elements.translationPauseToggle.disabled = !state.isRunning;
      if (!state.isRunning) {
        state._syncTranslationPauseUi = true;
        elements.translationPauseToggle.checked = false;
        state.translationPaused = false;
        state._syncTranslationPauseUi = false;
      }
    }
    setMicMeterPolling(state.isRunning);
  }

  async function toggleRecognitionMode(mode) {
    if (!['basic', 'pro'].includes(mode)) return;
    if (mode === 'pro' && isProRecognitionLocked()) {
      openProUpgradeModal();
      return;
    }
    state.recognitionMode = mode;
    localStorage.setItem('voiceTranslator_recognitionMode', mode);
    if (elements.modeBasicBtn && elements.modeProBtn) {
      elements.modeBasicBtn.classList.toggle('active', mode === 'basic');
      elements.modeProBtn.classList.toggle('active', mode === 'pro');
    }
    syncProRecognitionGateUi();
    const desktopBasicCompat =
      mode === 'basic' && isVoiceFlowDesktopClient() && !isTrialMode();
    const modeLabel = desktopBasicCompat
      ? 'Basic (desktop compatibility)'
      : mode === 'basic'
        ? 'Basic (Vosk)'
        : 'Pro (OpenAI/AITunnel)';
    log(`🔄 Режим распознавания: ${modeLabel}`, 'system');
    if (isTrialMode()) {
      state.trialSettings = state.trialSettings || {};
      state.trialSettings.recognitionMode = mode;
      if (state.trialSessionId) {
        void fetch(`${CONFIG.apiBaseUrl}/api/trial/session-langs`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            session_id: state.trialSessionId,
            recognition_mode: mode,
          }),
        }).catch((e) => console.warn('persistTrialRecognitionMode:', e));
      }
      return;
    }
    try {
      const serverMode = desktopBasicCompat ? 'pro' : mode;
      await apiRequest('/api/recognition-mode', {
        method: 'POST',
        body: JSON.stringify({ mode: serverMode })
      });
      if (state.isRunning && isVoiceFlowDesktopClient()) {
        ensureDesktopUsesBrowserMicrophone();
      }
      if (state.isRunning && state.browserMicMode && browserMicCaptureActive) {
        stopBrowserMicCapture();
        startBrowserMicRecognition();
      }
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить режим на сервере:', e);
      if (mode === 'pro' && String(e && e.message).includes('403')) {
        await fetchSubscriptionRecognitionGate();
        if (isProRecognitionLocked()) {
          state.recognitionMode = 'basic';
          localStorage.setItem('voiceTranslator_recognitionMode', 'basic');
          if (elements.modeBasicBtn && elements.modeProBtn) {
            elements.modeBasicBtn.classList.toggle('active', true);
            elements.modeProBtn.classList.toggle('active', false);
          }
          syncProRecognitionGateUi();
          openProUpgradeModal();
        }
      }
    }
  }

  function updateUI() {
    updateStatus();
    if (elements.conferenceToggle) elements.conferenceToggle.checked = state.conferenceMode;
    if (elements.aiToggle) elements.aiToggle.checked = state.aiEnabled;
    const hasCustom = !!(state.aiTopic && String(state.aiTopic).trim() && String(state.aiTopic).trim() !== 'general conversation');
    if (elements.aiTopicSettingsBtn) {
      elements.aiTopicSettingsBtn.disabled = false;
      elements.aiTopicSettingsBtn.classList.toggle('has-custom', hasCustom);
    }
    if (elements.aiTopicInlineTitle || elements.aiTopicInlineDesc) {
      const parts = splitAiTopic(state.aiTopic || '');
      if (elements.aiTopicInlineTitle && document.activeElement !== elements.aiTopicInlineTitle) {
        elements.aiTopicInlineTitle.value = parts.title || '';
      }
      if (elements.aiTopicInlineDesc && document.activeElement !== elements.aiTopicInlineDesc) {
        elements.aiTopicInlineDesc.value = parts.desc || '';
      }
    }
    const voiceSelectEl = document.getElementById('voiceSelect');
    if (voiceSelectEl && document.activeElement !== voiceSelectEl) {
      const want =
        state.useClonedVoice && state.clonedVoices.length > 0
          ? state.selectedClonedVoice
          : state.selectedStandardVoice;
      const options = Array.from(voiceSelectEl.options).map((o) => o.value);
      if (want && options.includes(want)) voiceSelectEl.value = want;
    }
    if (elements.modeBasicBtn && elements.modeProBtn) {
      elements.modeBasicBtn.classList.toggle('active', state.recognitionMode === 'basic');
      elements.modeProBtn.classList.toggle('active', state.recognitionMode === 'pro');
    }
    syncProRecognitionGateUi();
    if (elements.autoPlayToggle) {
      elements.autoPlayToggle.checked = state.autoPlay;
    }
    if (elements.autoPlayHint) {
      elements.autoPlayHint.style.display = state.autoPlay ? 'inline' : 'none';
    }
    syncFooterPlayHint();
    syncAllMsgPlayButtons();
    applyTrialDemoChrome();
    if (elements.userSpeakLang && elements.userSpeakLang.value !== state.userSpeakLang) {
      elements.userSpeakLang.value = state.userSpeakLang;
    }
    if (elements.partnerSpeakLang && elements.partnerSpeakLang.value !== state.partnerSpeakLang) {
      elements.partnerSpeakLang.value = state.partnerSpeakLang;
    }
    
    console.log('🔄 Полный UI обновлён', { 
      isRunning: state.isRunning, 
      conferenceMode: state.conferenceMode, 
      aiEnabled: state.aiEnabled, 
      aiTopic: state.aiTopic,
      recognitionMode: state.recognitionMode,
      autoPlay: state.autoPlay
    });
    syncAiSuggestionsPanelVisibility();
  }

  function isVoiceFlowDesktopClient() {
    try {
      if (typeof window !== 'undefined' && window.voiceflowDesktop) return true;
      if (/VoiceTranslatorDesktop/i.test(navigator.userAgent || '')) return true;
      if (document.documentElement.classList.contains('vf-desktop-app')) return true;
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  /** Десктоп + удалённый сервер: микрофон только с ПК пользователя (не с VPS). */
  async function queryTrialMicPermission() {
    try {
      if (!navigator.permissions || typeof navigator.permissions.query !== 'function') {
        return null;
      }
      const st = await navigator.permissions.query({ name: 'microphone' });
      return st && st.state ? String(st.state) : null;
    } catch (_) {
      return null;
    }
  }

  async function preflightTrialMicrophoneAccess() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return false;
    }
    const perm = await queryTrialMicPermission();
    if (perm === 'denied') return false;
    try {
      const probe = await openBrowserMicStream();
      probe.getTracks().forEach((tr) => {
        try {
          tr.stop();
        } catch (_) {
          /* ignore */
        }
      });
      vfAudioDevicesPrimed = true;
      return true;
    } catch (e) {
      console.warn('preflightTrialMicrophoneAccess:', e);
      return false;
    }
  }

  async function preflightDesktopMicrophoneAccess() {
    if (!isVoiceFlowDesktopClient() || !browserMicCapturePossible()) return false;
    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      probe.getTracks().forEach((tr) => {
        try {
          tr.stop();
        } catch (_) {
          /* ignore */
        }
      });
      vfAudioDevicesPrimed = true;
      return true;
    } catch (e) {
      console.warn('preflightDesktopMicrophoneAccess:', e);
      return false;
    }
  }

  function ensureDesktopUsesBrowserMicrophone() {
    if (!isVoiceFlowDesktopClient() || !state.isRunning || isTrialMode()) return;
    state.browserMicMode = true;
    state.serverAudioAvailable = false;
    if (elements.statusDiv) {
      elements.statusDiv.title = t('startMicBrowserMode');
    }
    if (!browserMicCapturePossible()) {
      if (redirectUiToHttpsIfNeeded()) return;
      log(t('browserMicNoAccess'), 'error');
      return;
    }
    if (!browserMicCaptureActive) {
      log(t('startMicBrowserMode'), 'system');
      if (state.recognitionMode === 'pro') {
        log(t('proBrowserMicHint'), 'system');
      }
      log(t('vpsMicExplain'), 'system');
      if (state.conferenceMode) {
        log(t('browserMicConferenceAutoOff'), 'system');
        void toggleConferenceMode(false);
      }
      startBrowserMicRecognition();
    }
  }

  function jsonAuthHeaders(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (isVoiceFlowDesktopClient()) {
      h['X-VoiceFlow-Client'] = 'desktop';
    }
    const uid = state.userId;
    if (uid && !String(uid).startsWith('anonymous_')) {
      h['X-User-ID'] = String(uid);
    } else if (
      uid &&
      String(uid).startsWith('anonymous_') &&
      (isTrialMode() || state.useClonedVoice || state.trialCloneVoiceId)
    ) {
      // Гость демо: без cookie нужен X-User-ID, иначе preview-cloned → 401
      h['X-User-ID'] = String(uid);
    }
    return h;
  }

  function formatMinutesShort(mins) {
    const m = Math.max(0, Math.floor(Number(mins) || 0));
    return `${m} min`;
  }

  function headerPlanLoginRedirectUrl() {
    try {
      return '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    } catch (e) {
      return '/login?redirect=' + encodeURIComponent('/ui');
    }
  }

  /** Origin сайта (кабинет /dashboard на том же хосте, что и API). */
  function siteOriginForCabinet() {
    try {
      const b = String(CONFIG.apiBaseUrl || '').trim();
      if (b) {
        return new URL(b, window.location.href).origin;
      }
    } catch (_) {
      /* fall through */
    }
    return window.location.origin;
  }

  /** Личный кабинет (главная страница кабинета в веб-версии). */
  function dashboardCabinetUrl() {
    return new URL('/dashboard', siteOriginForCabinet()).href;
  }

  /** Личный кабинет, вкладка «Тариф и баланс» (hash subscription). */
  function dashboardTariffUrl() {
    return new URL('/dashboard#subscription', siteOriginForCabinet()).href;
  }

  function isDesktopCabinetHref(href) {
    try {
      const p = new URL(href, window.location.href).pathname.replace(/\/$/, '') || '/';
      return p === '/pricing' || p === '/dashboard' || p === '/checkout';
    } catch (_) {
      return false;
    }
  }

  /** Десктоп: кабинет / тарифы / checkout в отдельном окне приложения. */
  function openDesktopCabinetUrl(url) {
    const vd = window.voiceflowDesktop;
    if (!vd) return false;
    let full;
    try {
      full = new URL(String(url || ''), window.location.href).href;
    } catch (_) {
      return false;
    }
    if (typeof vd.openCabinet === 'function') {
      void vd.openCabinet(full);
      return true;
    }
    if (typeof vd.openExternal === 'function') {
      void vd.openExternal(full);
      return true;
    }
    return false;
  }

  function closeAllUpgradeModals() {
    closeSubscriptionRequiredModal();
    closeProUpgradeModal();
    closeAiAssistantUpgradeModal();
    closeVoiceCloneUpgradeModal();
  }

  /** «Выбрать тариф» / «Подписка в кабинете» и др. — отдельное окно, не навигация в чате. */
  function initDesktopCabinetModalLinks() {
    const vd = window.voiceflowDesktop;
    if (!vd) return;
    if (initDesktopCabinetModalLinks._bound) return;
    initDesktopCabinetModalLinks._bound = true;
    document.addEventListener(
      'click',
      (e) => {
        const a = e.target.closest('a.pro-upgrade-modal-link');
        if (!a) return;
        const raw = a.getAttribute('href');
        if (!raw || !isDesktopCabinetHref(raw)) return;
        e.preventDefault();
        e.stopPropagation();
        openDesktopCabinetUrl(raw);
        closeAllUpgradeModals();
      },
      true
    );
  }

  function openDashboardTariffInBrowser() {
    const url = dashboardTariffUrl();
    if (!openDesktopCabinetUrl(url)) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (_) {
        window.location.href = url;
      }
    }
  }

  function renderHeaderPlanUsage() {
    const nameEl = document.getElementById('headerPlanName');
    const minEl = document.getElementById('headerPlanMinutes');
    const pill = document.getElementById('headerPlanPill');
    if (!nameEl || !minEl) return;

    if (pill) {
      pill.onclick = null;
      pill.style.cursor = '';
      pill.removeAttribute('title');
      pill.removeAttribute('role');
    }

    if (isTrialMode()) {
      if (pill) {
        pill.hidden = true;
        pill.setAttribute('aria-hidden', 'true');
      }
      const slot = document.querySelector('.header-status-slot');
      if (slot) {
        slot.hidden = true;
        slot.setAttribute('aria-hidden', 'true');
      }
      return;
    }
    if (pill) {
      pill.hidden = false;
      pill.removeAttribute('aria-hidden');
    }
    const planSlotShow = document.querySelector('.header-status-slot');
    if (planSlotShow) {
      planSlotShow.hidden = false;
      planSlotShow.removeAttribute('aria-hidden');
    }

    if (state._headerPlanAuth === false) {
      nameEl.textContent = t('headerPlanNeedLogin');
      minEl.textContent = t('headerPlanNeedLoginSub');
      minEl.classList.remove('is-low', 'is-zero');
      if (pill) {
        pill.style.cursor = 'pointer';
        pill.setAttribute('role', 'button');
        pill.title = t('headerPlanNeedLogin');
        pill.onclick = () => {
          window.location.href = headerPlanLoginRedirectUrl();
        };
      }
      return;
    }

    if (state._headerPlanAuth === null) {
      nameEl.textContent = t('headerPlanLoading');
      minEl.textContent = t('headerPlanLoading');
      minEl.classList.remove('is-low', 'is-zero');
      return;
    }

    const plan = state.subscriptionActive
      ? (String(state.subscriptionDisplayName || state.subscriptionPlanId || '').trim() || '—')
      : t('headerPlanNoTariff');
    nameEl.textContent = plan;

    var accountHint = '';
    if (state.sessionEmail) {
      accountHint = state.sessionEmail;
      if (state.sessionUserId) accountHint += ' · id ' + state.sessionUserId;
    }
    if (pill && accountHint) {
      pill.title = accountHint + ' — ' + t('headerPlanOpenDashboardTariff');
    }
    syncDesktopAccountLabel();

    const remaining = Math.max(0, Number(state.minutesRemaining) || 0);
    minEl.textContent = `${t('headerPlanRemainPrefix')} ${formatMinutesShort(remaining)}`;
    minEl.classList.toggle('is-low', remaining > 0 && remaining <= 10);
    minEl.classList.toggle('is-zero', remaining <= 0);
    if (pill) {
      pill.style.cursor = 'pointer';
      pill.setAttribute('role', 'button');
      pill.title = t('headerPlanOpenDashboardTariff');
      pill.onclick = () => openDashboardTariffInBrowser();
    }
  }

  async function loadSubscriptionUsage() {
    if (isTrialMode()) {
      state._headerPlanAuth = null;
      return;
    }
    try {
      try {
        const meResp = await fetch(`${CONFIG.apiBaseUrl}/api/auth/me`, { credentials: 'include' });
        if (meResp.ok) {
          const me = await meResp.json();
          state.sessionEmail = me && me.email ? String(me.email) : '';
          state.sessionUserId = me && me.id != null ? String(me.id) : '';
          if (state.sessionUserId && state.sessionUserId !== String(state.userId || '')) {
            if (!state.isRunning) {
              console.warn(
                '🔐 Синхронизация аккаунта: userId',
                state.userId,
                '→',
                state.sessionUserId,
                state.sessionEmail || ''
              );
              state.userId = state.sessionUserId;
              try {
                localStorage.setItem('voiceTranslator_userId', state.sessionUserId);
              } catch (syncErr) {
                /* ignore */
              }
            } else {
              console.warn(
                '🔐 userId не меняем во время записи:',
                state.userId,
                'cookie:',
                state.sessionUserId
              );
            }
          }
        }
      } catch (meErr) {
        console.warn('⚠️ /api/auth/me:', meErr.message || meErr);
      }

      const url = `${CONFIG.apiBaseUrl}/api/subscriptions/current`;
      const resp = await fetch(url, { credentials: 'include', headers: jsonAuthHeaders() });
      if (resp.status === 401) {
        state._headerPlanAuth = false;
        state.sessionEmail = '';
        state.sessionUserId = '';
        renderHeaderPlanUsage();
        return;
      }
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const d = await resp.json();
      state._headerPlanAuth = true;
      const usage = d && d.usage ? d.usage : {};
      const sub = d && d.subscription ? d.subscription : {};
      state.subscriptionActive = d.active === true;
      state.subscriptionPlanId = String(d.plan_id || 'none');
      state.subscriptionDisplayName = state.subscriptionActive
        ? String(sub.displayName || state.subscriptionPlanId || '')
        : '';
      state.minutesUsed =
        typeof usage.minutesUsed === 'number' && isFinite(usage.minutesUsed) ? usage.minutesUsed : 0;
      state.minutesLimit =
        typeof usage.minutesLimit === 'number' && isFinite(usage.minutesLimit)
          ? usage.minutesLimit
          : 0;
      const remaining = Math.max(0, state.minutesLimit - state.minutesUsed);
      if (!state.runtimeCountdownActive) {
        state.minutesRemaining = remaining;
        state.runtimeCountdownSec = Math.round(remaining * 60);
      }
      renderHeaderPlanUsage();
      updateStatus();
      maybeShowSubscriptionRequiredModal();
    } catch (e) {
      console.warn('⚠️ loadSubscriptionUsage:', e.message);
      state._headerPlanAuth = null;
      renderHeaderPlanUsage();
      updateStatus();
    }
  }

  function stopRuntimeCountdown() {
    state.runtimeCountdownActive = false;
    if (runtimeCountdownTimer) {
      clearInterval(runtimeCountdownTimer);
      runtimeCountdownTimer = null;
    }
  }

  function startRuntimeCountdownIfNeeded(syncFromServerRemaining) {
    if (isTrialMode()) return;
    if (state.runtimeCountdownActive) return;
    state.runtimeCountdownActive = true;
    const serverSec = Math.round(Math.max(0, (Number(state.minutesRemaining) || 0)) * 60);
    if (state.runtimeCountdownSec == null) {
      state.runtimeCountdownSec = serverSec;
    } else if (syncFromServerRemaining) {
      state.runtimeCountdownSec = Math.min(state.runtimeCountdownSec, serverSec);
    }
    if (runtimeCountdownTimer) clearInterval(runtimeCountdownTimer);
    runtimeCountdownTimer = setInterval(() => {
      if (!state.isRunning) return;
      if (state.runtimeCountdownSec == null) state.runtimeCountdownSec = 0;
      state.runtimeCountdownSec = Math.max(0, state.runtimeCountdownSec - 1);
      state.minutesRemaining = Math.max(0, state.runtimeCountdownSec / 60);
      renderHeaderPlanUsage();
    }, 1000);
  }

  async function apiRequest(endpoint, options = {}) {
    let url = `${CONFIG.apiBaseUrl}${endpoint}`;
    const uid = state.userId;
    if (uid && !String(uid).startsWith('anonymous')) {
      const joiner = url.includes('?') ? '&' : '?';
      if (!/[?&]user_id=/.test(url)) {
        url += `${joiner}user_id=${encodeURIComponent(String(uid))}`;
      }
    }
    const headers = { ...jsonAuthHeaders(), ...options.headers };
    const resp = await fetch(url, { ...options, headers, credentials: 'include' });
    if (!resp.ok) {
      let detail = `API ${resp.status}`;
      try {
        const errBody = await resp.json();
        if (errBody && errBody.detail != null) {
          detail = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
        } else if (errBody && errBody.error != null) {
          detail = typeof errBody.error === 'string' ? errBody.error : JSON.stringify(errBody.error);
        }
      } catch (parseErr) {
        /* ignore */
      }
      const err = new Error(detail);
      err.status = resp.status;
      if (resp.status === 504) {
        err.code = 'gateway_timeout';
      } else if (resp.status === 503 && /timeout|таймаут/i.test(detail)) {
        err.code = 'gateway_timeout';
      } else {
        err.code = detail;
      }
      throw err;
    }
    return await resp.json();
  }

  const MODAL_WARMUP_POLL_MS = 2000;
  const MODAL_WARMUP_MAX_MS = 180000;

  function buildStatusUrl() {
    let url = `${CONFIG.apiBaseUrl}/api/status`;
    const uid = state.userId;
    if (uid && !String(uid).startsWith('anonymous')) {
      const joiner = url.includes('?') ? '&' : '?';
      if (!/[?&]user_id=/.test(url)) {
        url += `${joiner}user_id=${encodeURIComponent(String(uid))}`;
      }
    }
    return url;
  }

  async function fetchServerStatus() {
    const resp = await fetch(buildStatusUrl(), { credentials: 'include' });
    if (!resp.ok) {
      throw new Error(`status HTTP ${resp.status}`);
    }
    return await resp.json();
  }

  async function waitForModalCloneReady() {
    const deadline = Date.now() + MODAL_WARMUP_MAX_MS;
    while (Date.now() < deadline) {
      const d = await fetchServerStatus();
      if (d.modal_clone_warmup_error) {
        const err = new Error(String(d.modal_clone_warmup_error));
        err.code = 'modal_clone_warmup_failed';
        throw err;
      }
      if (d.modal_clone_ready) {
        log(t('modalWarmupReady'), 'success');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, MODAL_WARMUP_POLL_MS));
    }
    const err = new Error('modal_warmup_timeout');
    err.code = 'modal_clone_warmup_failed';
    throw err;
  }

  async function sendControl(action) {
    try {
      log(t('logInit').replace('🚀 ', '') + ` ${action}...`, 'system');
      const payload = Object.assign(
        { action },
        action === 'start' || action === 'stop' ? modalCloneControlPayload() : {}
      );
      if (action === 'start') payload.clear_chat = true;
      const response = await apiRequest('/api/control', { method: 'POST', body: JSON.stringify(payload) });
      console.log('🎮 Ответ от /api/control:', response);
      if (!response || typeof response.status !== 'string') {
        log(t('logError') + 'invalid /api/control response', 'error');
        state.isRunning = false;
        updateStatus();
        return null;
      }
      if (response.status === 'started') {
        state.isRunning = true;
        state._lastSessionStartAt = Date.now();
        /* Минуты не перезагружаем с сервера — иначе счётчик прыгает на 1198 (см. user_activity_events). */
        startRuntimeCountdownIfNeeded(false);
        syncRuntimeChatPolling();
        updateStatus();
        if (response.modal_session) {
          log(t('modalWarmupReady'), 'success');
        }
        if (response.modal_warming) {
          log(t('modalWarmupStart'), 'system');
        }
        if (response.modal_warning) {
          log(t('modalWarmupFailed') + ' ' + response.modal_warning, 'system');
        }
        if (isVoiceFlowDesktopClient()) {
          ensureDesktopUsesBrowserMicrophone();
        } else if (response.mic_available === false || response.warning === 'mic_unavailable') {
          state.browserMicMode = true;
          state.serverAudioAvailable = false;
          log(t('startMicBrowserMode'), 'system');
          log(t('vpsMicExplain'), 'system');
          if (elements.statusDiv) {
            elements.statusDiv.title = t('startMicBrowserMode');
          }
          updateMicMeterUI({});
          if (!browserMicCapturePossible() && redirectUiToHttpsIfNeeded()) {
            log(t('browserMicNeedsHttps'), 'system');
          } else {
            if (state.recognitionMode === 'pro') {
              log(t('proBrowserMicHint'), 'system');
            }
            if (state.conferenceMode) {
              log(t('browserMicConferenceAutoOff'), 'system');
              await toggleConferenceMode(false);
            }
            startBrowserMicRecognition();
          }
        } else {
          state.browserMicMode = false;
          log('🎤 Запись запущена', 'success');
        }
      } else       if (response.status === 'stopped') {
        state.isRunning = false;
        stopRuntimeCountdown();
        syncRuntimeChatPolling();
        await loadSubscriptionUsage();
        updateStatus();
        log('⏹️ Запись остановлена', 'system');
      } else {
        const msg = response.message || response.status || 'unknown';
        log(t('logError') + msg, 'error');
        console.error('🎮 /api/control unexpected status:', response);
        state.isRunning = false;
        updateStatus();
      }
      pollStatus();
      return response;
    } catch (e) {
      console.error('🎮 /api/control failed:', e);
      if (e && e.code === 'subscription_required') {
        openSubscriptionRequiredModal('no_plan');
      } else if (e && e.code === 'minutes_exhausted') {
        openSubscriptionRequiredModal('no_minutes');
      } else if (
        e &&
        (e.code === 'translator_pool_full' || String(e.message || '').includes('translator_pool_full'))
      ) {
        const poolMsg = t('translatorPoolFullError');
        log(poolMsg, 'error');
        openStartErrorModal({ titleKey: 'micErrorModalTitle', hintText: poolMsg });
      } else if (e && (e.code === 'chat_session_busy_other_user' || String(e.message || '').includes('chat_session_busy'))) {
        const busyMsg = t('chatSessionBusyError');
        log(busyMsg, 'error');
        openStartErrorModal({ titleKey: 'micErrorModalTitle', hintText: busyMsg });
      } else if (
        e &&
        (e.status === 504 ||
          e.code === 'gateway_timeout' ||
          e.code === 'audio_start_timeout' ||
          /timeout|таймаут|upstream/i.test(String(e.message || e.code || '')))
      ) {
        const t504 = t('startTimeoutError');
        log(t504, 'error');
        openStartErrorModal({ titleKey: 'startTimeoutModalTitle', hintText: t504 });
      } else if (e && e.code === 'modal_clone_warmup_failed') {
        const warmFail = t('modalWarmupFailed');
        log(warmFail, 'error');
        openStartErrorModal({ hintText: warmFail });
      } else if (
        e &&
        (e.code === 'mic_unavailable' ||
          /InputStream|PaError|MME error|микрофон/i.test(String(e.message || '')))
      ) {
        const micMsg = t('startMicError');
        log(micMsg, 'error');
        if (elements.statusDiv) {
          elements.statusDiv.textContent = micMsg;
          elements.statusDiv.className = 'status stopped';
          elements.statusDiv.title = micMsg;
        }
        openStartErrorModal({ hintText: micMsg });
      } else {
        log(t('logError') + (e && e.message ? e.message : String(e)), 'error');
      }
      state.isRunning = false;
      hideModalWarmupPreloader();
      updateStatus();
      void loadSubscriptionUsage();
      return null;
    }
  }

  async function startListening() {
    state.userRequestedStop = false;
    if (isTrialMode()) {
      if (state.isRunning || state.trialLimitReached) return;
      micRmsThresholdUserTouched = false;
      browserMicSessionAutoThreshold = null;
      loadMicRmsThresholdPreference();
      if (state.modalWarmupInProgress) {
        log(t('modalWarmupStart'), 'system');
        return;
      }
      const micOk = await preflightTrialMicrophoneAccess();
      if (!micOk) {
        log(t('trialMicNoAccess'), 'error');
        openStartErrorModal({
          titleKey: 'micErrorModalTitle',
          hintText: t('trialMicBlockedBrowser'),
        });
        return;
      }
      await refreshAudioDeviceLists();
      if (trialHasSplitAudioDevices()) {
        log(t('audioDevicesSplitLog'), 'system');
      }
      trialReleasedPartnerSeq = 0;
      trialPendingPartnerTurn = null;
      trialMicTurnEpoch = 0;
      trialActiveApplyEpoch = 0;
      trialLastSpokenPartnerSeq = 0;
      trialLastSpokenPartnerText = '';
      state.isRunning = true;
      state.browserMicMode = true;
      updateStatus();
      unlockBrowserAudioForPlayback();
      try {
        log(t('trialBootstrapWaitMic'), 'system');
        await runTrialBootstrapIfNeeded();
      } catch (eb) {
        console.warn('trial bootstrap', eb);
        log('Демо: не удалось начать диалог. Попробуйте ещё раз.', 'error');
        state.isRunning = false;
        state.browserMicMode = false;
        updateStatus();
        return;
      }
      await startBrowserMicCapture();
      if (!browserMicCaptureActive) {
        state.isRunning = false;
        state.browserMicMode = false;
        updateStatus();
        return;
      }
      updateStatus();
      log(t('trialMicListeningLog'), 'success');
      return;
    }
    state._userSessionActive = true;
    micRmsThresholdUserTouched = false;
    browserMicSessionAutoThreshold = null;
    if (!canStartTranslation()) {
      const reason = state.subscriptionActive !== true ? 'no_plan' : 'no_minutes';
      openSubscriptionRequiredModal(reason);
      updateStatus();
      return;
    }
    if (state.modalWarmupInProgress) return;
    if (isVoiceFlowDesktopClient()) {
      const micOk = await preflightDesktopMicrophoneAccess();
      if (!micOk) {
        log(t('browserMicNoAccess'), 'error');
        openStartErrorModal({
          titleKey: 'micErrorModalTitle',
          hintText: t('browserMicNoAccess'),
        });
        return;
      }
      vfAudioDevicesPrimed = true;
      await refreshAudioDeviceLists();
    }
    const modalPayload = modalCloneControlPayload();
    const needModalWarmupPreloader = !!(modalPayload && modalPayload.clone_via_modal);
    if (needModalWarmupPreloader) {
      showModalWarmupPreloader();
    }
    try {
      if (isVoiceFlowDesktopClient()) {
        const serverMode = state.recognitionMode === 'basic' ? 'pro' : state.recognitionMode;
        await apiRequest('/api/recognition-mode', {
          method: 'POST',
          body: JSON.stringify({ mode: serverMode }),
        });
      }
      const response = await sendControl('start');
      if (
        response &&
        response.status === 'started' &&
        response.modal_warming &&
        !response.modal_session
      ) {
        try {
          await waitForModalCloneReady();
        } catch (warmErr) {
          if (warmErr && warmErr.code === 'modal_clone_warmup_failed') {
            const warmFail = t('modalWarmupFailed');
            const detail =
              warmErr.message && warmErr.message !== 'modal_warmup_timeout'
                ? ` ${warmErr.message}`
                : '';
            log(warmFail + detail, 'error');
            openStartErrorModal({ hintText: warmFail });
            state.isRunning = false;
            updateStatus();
            try {
              await apiRequest('/api/control', {
                method: 'POST',
                body: JSON.stringify(
                  Object.assign(
                    { action: 'stop', persist_conversation: true },
                    modalCloneControlPayload()
                  )
                ),
              });
            } catch (stopErr) {
              console.warn('stop after modal warmup failed:', stopErr);
            }
          } else {
            throw warmErr;
          }
        }
      }
    } finally {
      if (needModalWarmupPreloader) {
        hideModalWarmupPreloader();
      }
    }
  }
  async function stopListening() {
    if (isTrialMode()) {
      hideTypeModal();
      clearTrialProcessingWatchdog();
      trialPhraseInFlight = false;
      trialAutoplayBusy = false;
      trialTextSubmitLock = false;
      trialSuggestionPickLock = false;
      trialMicTurnEpoch = 0;
      trialActiveApplyEpoch = 0;
      trialLastSpokenPartnerSeq = 0;
      trialLastSpokenPartnerText = '';
      trialAbortPartnerPlayback();
      trialClearMicStatus();
      trialClearMicUploadRetry();
      trialResetMicStatusPhase();
      browserMicUploading = false;
      browserMicUploadQueue.length = 0;
      trialStopBrowserRecognition(true);
      stopBrowserMicCapture();
      stopTrialMicLevelMeter();
      state.browserMicMode = false;
      updateMicMeterIdle();
      state.isRunning = false;
      updateStatus();
      log('⏹️ Демо: остановлено', 'system');
      return;
    }
    if (state._stopControlInFlight) return;
    state._stopControlInFlight = true;
    state.userRequestedStop = true;
    hideTypeModal();
    stopBrowserMicRecognition(true);
    state.isRunning = false;
    syncRuntimeChatPolling();
    updateStatus();
    try {
      log(t('logInit').replace('🚀 ', '') + ' stop...', 'system');
      const response = await apiRequest('/api/control', {
        method: 'POST',
        body: JSON.stringify(
          Object.assign({ action: 'stop', persist_conversation: true }, modalCloneControlPayload())
        ),
      });
      console.log('🎮 Ответ от /api/control:', response);
      if (response.status === 'stopped') {
        stopRuntimeCountdown();
        syncRuntimeChatPolling();
        await loadSubscriptionUsage();
        log('⏹️ Запись остановлена', 'system');
      } else {
        // Пользователь уже остановил UI — не возвращаем isRunning=true (это запускало авто-Start).
        stopRuntimeCountdown();
        syncRuntimeChatPolling();
        log(
          '⏹️ Остановка запрошена' +
            (response && response.status ? ` (${response.status})` : '') +
            ' — сессия на клиенте остановлена.',
          'system'
        );
      }
      pollStatus();
    } catch (e) {
      log(t('logError') + e.message, 'error');
      // Не поднимаем isRunning: иначе pollStatus/ensureServerSessionRunning снова жмут Start.
      stopRuntimeCountdown();
      syncRuntimeChatPolling();
      updateStatus();
    } finally {
      state._stopControlInFlight = false;
    }
  }
  function getActiveVoiceForPlayback() {
    if (!isVoiceCloneLocked() && state.useClonedVoice && state.clonedVoices.length > 0) {
      let cloned = String(state.selectedClonedVoice || '').trim();
      if (!cloned || !cloned.startsWith('cloned:')) {
        cloned = `cloned:${state.clonedVoices[0].id}`;
        state.selectedClonedVoice = cloned;
        try { localStorage.setItem('voiceTranslator_clonedVoice', cloned); } catch (e) { /* ignore */ }
      }
      state.selectedVoice = cloned;
      try { localStorage.setItem('voiceTranslator_voice', state.selectedVoice); } catch (e) { /* ignore */ }
      return cloned;
    }
    let standard = String(state.selectedStandardVoice || '').trim();
    if (!standard || standard.startsWith('cloned:')) {
      standard = state.standardVoices[0] || 'en-US-JennyNeural';
      state.selectedStandardVoice = standard;
      try { localStorage.setItem('voiceTranslator_standardVoice', standard); } catch (e) { /* ignore */ }
    }
    state.selectedVoice = standard;
    try { localStorage.setItem('voiceTranslator_voice', state.selectedVoice); } catch (e) { /* ignore */ }
    return standard;
  }

  function cloneViaModalForApi() {
    if (isVoiceCloneLocked()) return {};
    const v = getActiveVoiceForPlayback();
    if (v && v.startsWith('cloned:') && state.useClonedVoice) {
      return { clone_via_modal: true };
    }
    return {};
  }

  function voiceApiPayload(extra = {}) {
    return Object.assign({}, extra, cloneViaModalForApi(), {
      user_tts_volume: getUserTtsVolumePlayback()
    });
  }

  /** Параметры для /api/control при «Начать»/«Стоп» с клоном на Modal. */
  function modalCloneControlPayload() {
    if (isVoiceCloneLocked() || !state.useClonedVoice || !state.clonedVoices.length) return {};
    if (!state.cloneViaModal) return {};
    const v = getActiveVoiceForPlayback();
    if (!v || !v.startsWith('cloned:')) return {};
    return {
      use_cloned_voice: true,
      clone_via_modal: true,
      voice: v,
    };
  }

  function updateCloneViaModalUi() {
    const wrap = document.getElementById('cloneViaModalWrap');
    const cb = document.getElementById('cloneViaModal');
    if (!cb || !wrap) return;
    state.cloneViaModal = true;
    const can = !!(state.useClonedVoice && state.clonedVoices.length > 0);
    cb.disabled = !can;
    if (!can) {
      cb.checked = false;
    } else {
      cb.checked = true;
    }
    wrap.style.opacity = can ? '0.95' : '0.45';
    wrap.title = can ? t('cloneViaModalTitle') : t('cloneViaModalDisabledHint');
  }

  function updateVoiceSelects() {
    const voiceSelect = document.getElementById('voiceSelect');
    const useClonedCheckbox = document.getElementById('useClonedVoice');
    const row = document.getElementById('voiceSelectRow');
    if (!voiceSelect) return;

    const cloneLocked = isVoiceCloneLocked();
    if (cloneLocked && state.useClonedVoice) {
      state.useClonedVoice = false;
      try { localStorage.setItem('voiceTranslator_useCloned', 'false'); } catch (e) { /* ignore */ }
    }

    voiceSelect.innerHTML = '';

    const cloneMode = !cloneLocked && !!(state.useClonedVoice && state.clonedVoices.length > 0);

    if (cloneMode) {
      state.clonedVoices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = `cloned:${v.id}`;
        opt.textContent = v.name;
        opt.dataset.cloned = 'true';
        voiceSelect.appendChild(opt);
      });
      const available = state.clonedVoices.map((v) => `cloned:${v.id}`);
      if (!available.includes(state.selectedClonedVoice)) {
        state.selectedClonedVoice = available[0];
      }
      voiceSelect.value = state.selectedClonedVoice;
      voiceSelect.disabled = false;
      if (useClonedCheckbox) {
        useClonedCheckbox.disabled = false;
        useClonedCheckbox.checked = true;
      }
      try { localStorage.setItem('voiceTranslator_clonedVoice', state.selectedClonedVoice); } catch (e) { /* ignore */ }
    } else {
      const voicesToUse = state.standardVoices.length > 0
        ? state.standardVoices
        : ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-US-AriaNeural', 'ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural'];
      voicesToUse.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        voiceSelect.appendChild(opt);
      });
      if (!voicesToUse.includes(state.selectedStandardVoice)) {
        state.selectedStandardVoice = voicesToUse[0];
      }
      voiceSelect.value = state.selectedStandardVoice;
      voiceSelect.disabled = false;
      try { localStorage.setItem('voiceTranslator_standardVoice', state.selectedStandardVoice); } catch (e) { /* ignore */ }

      if (cloneLocked) {
        state.selectedClonedVoice = '';
        if (state.useClonedVoice) state.useClonedVoice = false;
        if (useClonedCheckbox) {
          useClonedCheckbox.disabled = false;
          useClonedCheckbox.checked = false;
        }
        try { localStorage.setItem('voiceTranslator_useCloned', 'false'); } catch (e) { /* ignore */ }
      } else if (state.clonedVoices.length > 0) {
        if (useClonedCheckbox) {
          useClonedCheckbox.disabled = false;
          useClonedCheckbox.checked = !!state.useClonedVoice;
        }
      } else {
        state.selectedClonedVoice = '';
        if (state.useClonedVoice) state.useClonedVoice = false;
        if (useClonedCheckbox) {
          useClonedCheckbox.checked = false;
          useClonedCheckbox.disabled = true;
        }
        try { localStorage.removeItem('voiceTranslator_clonedVoice'); } catch (e) { /* ignore */ }
        try { localStorage.setItem('voiceTranslator_useCloned', 'false'); } catch (e) { /* ignore */ }
      }
    }

    if (row) {
      row.classList.toggle('voice-cloned-block', cloneMode);
      row.classList.toggle('is-active', cloneMode);
    }

    const activeVoice = getActiveVoiceForPlayback();
    try { syncVoiceCloneGateUi(); } catch (e) { /* ignore */ }
    console.log('🔊 updateVoiceSelects:', {
      selectedVoice: activeVoice,
      standard: state.selectedStandardVoice,
      cloned: state.selectedClonedVoice,
      useClonedVoice: state.useClonedVoice,
      clonedVoicesCount: state.clonedVoices.length
    });
  }

  function trialUsesModalClone() {
    return !!(
      isTrialMode() &&
      state.trialCloneVoiceId &&
      state.useClonedVoice &&
      state.cloneViaModal
    );
  }

  async function fetchTrialModalCloneStatus() {
    if (!state.trialSessionId) {
      return { skipped: true, modal_clone_ready: false, modal_clone_warming: false };
    }
    const resp = await fetch(
      `${CONFIG.apiBaseUrl}/api/trial/warm-clone/status?session_id=${encodeURIComponent(state.trialSessionId)}`,
      { credentials: 'include', headers: { Accept: 'application/json' } }
    );
    if (!resp.ok) {
      throw new Error(`trial_warm_status_${resp.status}`);
    }
    return await resp.json().catch(() => ({}));
  }

  async function waitForTrialModalCloneReady() {
    const deadline = Date.now() + MODAL_WARMUP_MAX_MS;
    while (Date.now() < deadline) {
      const d = await fetchTrialModalCloneStatus();
      if (d.modal_clone_warmup_error) {
        const err = new Error(String(d.modal_clone_warmup_error));
        err.code = 'modal_clone_warmup_failed';
        throw err;
      }
      if (d.skipped || d.modal_clone_ready) {
        if (!d.skipped) log(t('modalWarmupReady'), 'success');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, MODAL_WARMUP_POLL_MS));
    }
    const err = new Error('modal_warmup_timeout');
    err.code = 'modal_clone_warmup_failed';
    throw err;
  }

  async function warmTrialModalCloneOnOpen() {
    if (!trialUsesModalClone() || !state.trialSessionId) return;
    const st = await fetchTrialModalCloneStatus();
    if (st.skipped || st.modal_clone_ready) return;
    const start = await fetch(
      `${CONFIG.apiBaseUrl}/api/trial/warm-clone?session_id=${encodeURIComponent(state.trialSessionId)}`,
      { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } }
    );
    if (!start.ok) {
      throw new Error(`trial_warm_start_${start.status}`);
    }
    await waitForTrialModalCloneReady();
  }

  function stopTrialModalCloneSession() {
    if (!trialUsesModalClone() || !state.trialSessionId) return;
    const url =
      `${CONFIG.apiBaseUrl}/api/trial/warm-clone/stop?session_id=${encodeURIComponent(state.trialSessionId)}`;
    try {
      fetch(url, { method: 'POST', credentials: 'include', keepalive: true });
    } catch (e) { /* ignore */ }
  }

  function applyTrialCloneVoiceFromSession() {
    if (!isTrialMode() || !state.trialCloneVoiceId || !state.useClonedVoice) return;
    const cloneId = String(state.trialCloneVoiceId).trim();
    if (!cloneId) return;
    const clonedVal = `cloned:${cloneId}`;
    state.useClonedVoice = true;
    state.selectedClonedVoice = clonedVal;
    state.selectedVoice = clonedVal;
    state.cloneViaModal = true;
    const has = state.clonedVoices.some((v) => String(v?.id || '') === cloneId);
    if (!has) {
      state.clonedVoices = [{ id: cloneId, name: 'Демо голос' }, ...state.clonedVoices];
    }
    try {
      localStorage.setItem('voiceTranslator_useCloned', 'true');
      localStorage.setItem('voiceTranslator_clonedVoice', clonedVal);
      localStorage.setItem('voiceTranslator_voice', clonedVal);
      localStorage.setItem('voiceTranslator_cloneViaModal', 'true');
    } catch (e) { /* ignore */ }
  }

  function applyVoiceListFallback() {
    if (!state.standardVoices.length) {
      state.standardVoices = [
        'en-US-JennyNeural', 'en-US-GuyNeural', 'en-US-AriaNeural',
        'ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural',
      ];
    }
    if (isTrialMode() && state.trialCloneVoiceId) applyTrialCloneVoiceFromSession();
    updateVoiceSelects();
    updateCloneViaModalUi();
    getActiveVoiceForPlayback();
  }

  async function loadVoices() {
    const voicesTimeoutMs = 12000;
    try {
      const data = await Promise.race([
        apiRequest('/api/voices'),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('voices_timeout')), voicesTimeoutMs);
        }),
      ]);
      state.clonedVoices = data.cloned_voices || []; state.standardVoices = data.voices || [];
      if (isTrialMode() && state.trialCloneVoiceId) {
        const cloneId = String(state.trialCloneVoiceId);
        state.clonedVoices = state.clonedVoices.filter(v => String(v?.id || '') === cloneId);
        if (!state.clonedVoices.length) {
          state.clonedVoices = [{ id: cloneId, name: 'Демо голос' }];
        }
        applyTrialCloneVoiceFromSession();
      }
      updateVoiceSelects();
      updateCloneViaModalUi();
      getActiveVoiceForPlayback();
      console.log('📊 Загружено голосов:', { стандартные: state.standardVoices.length, клонированные: state.clonedVoices.length, user_id: state.userId, selectedVoice: state.selectedVoice });
    } catch (e) {
      console.error('Load voices error:', e);
      applyVoiceListFallback();
    }
  }

  function getMessageSpeakText(msgId, fallbackText) {
    const el = msgElements[String(msgId)];
    if (el) {
      const sub = el.querySelector('.msg-translated-sub');
      const tr = sub && String(sub.textContent || '').trim();
      if (tr) return tr;
    }
    return String(fallbackText || '').trim();
  }

  /** В демо: текст для озвучки собеседнику — перевод на язык партнёра, не исходная реплика. */
  function trialUserSpeakLangCode() {
    const ts = state.trialSettings || {};
    return String(ts.userSpeakLang || state.userSpeakLang || 'ru')
      .toLowerCase()
      .slice(0, 2);
  }

  function trialPartnerSpeakLangCode() {
    const ts = state.trialSettings || {};
    return String(ts.partnerSpeakLang || state.partnerSpeakLang || 'en')
      .toLowerCase()
      .slice(0, 2);
  }

  function syncTrialSettingsLangs(userLang, partnerLang) {
    if (!isTrialMode()) return;
    state.trialSettings = state.trialSettings || {};
    if (userLang) state.trialSettings.userSpeakLang = String(userLang).toLowerCase().slice(0, 2);
    if (partnerLang) state.trialSettings.partnerSpeakLang = String(partnerLang).toLowerCase().slice(0, 2);
    if (typeof state.trialSettings.autoPlay !== 'boolean') {
      state.trialSettings.autoPlay = readTrialAutoPlayPreference();
    }
  }

  function textNeedsPartnerLanguageTranslation(text, partnerLang) {
    const pl = String(partnerLang || 'en').toLowerCase().slice(0, 2);
    const utter = String(text || '').trim();
    if (!utter) return false;
    const hasCyr = /[А-Яа-яЁё]/.test(utter);
    const hasLat = /[A-Za-z]/.test(utter);
    if (pl === 'ru' || pl === 'uk' || pl === 'kk' || pl === 'ky' || pl === 'tg' || pl === 'uz') {
      return hasLat && !hasCyr;
    }
    return hasCyr;
  }

  async function fetchTrialPartnerTtsText(text) {
    const utter = String(text || '').trim();
    if (!utter || !state.trialSessionId) return utter;
    try {
      const r = await fetch(`${CONFIG.apiBaseUrl}/api/trial/partner-tts-text`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ session_id: state.trialSessionId, text: utter }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.text) return String(d.text).trim() || utter;
    } catch (e) {
      console.warn('fetchTrialPartnerTtsText', e);
    }
    return utter;
  }

  async function ensurePartnerLanguageText(text) {
    const pl = trialPartnerSpeakLangCode();
    const ul = trialUserSpeakLangCode();
    const utter = String(text || '').trim();
    if (!utter || pl === ul) return utter;
    if (!textNeedsPartnerLanguageTranslation(utter, pl)) return utter;
    return fetchTrialPartnerTtsText(utter);
  }

  function getTrialUserPartnerSpeakText(msgId, fallbackText) {
    const ul = trialUserSpeakLangCode();
    const pl = trialPartnerSpeakLangCode();
    const fb = String(fallbackText || '').trim();
    if (pl === ul) return fb;
    const el = msgId != null ? msgElements[String(msgId)] : null;
    const fromData = el && String(el.dataset.partnerTtsText || '').trim();
    if (fromData) return fromData;
    const tr = getMessageSpeakText(msgId, '');
    if (tr) return tr;
    return fb;
  }

  async function resolveTrialPartnerSpeakTextAsync(msgId, fallbackText) {
    let text = getTrialUserPartnerSpeakText(msgId, fallbackText);
    text = await ensurePartnerLanguageText(text);
    const el = msgId != null ? msgElements[String(msgId)] : null;
    if (el && text) el.dataset.partnerTtsText = text;
    return text;
  }

  function trialCloneTtsLanguage() {
    const ul = trialUserSpeakLangCode();
    const pl = trialPartnerSpeakLangCode();
    return pl !== ul ? pl : '';
  }

  /** Edge-голос: сначала MP3 в браузере, затем «озвучено» на сервере. */
  async function voiceStandardEdgeInBrowser(msgId, text, voice) {
    unlockBrowserAudioForPlayback();
    let speakText = getMessageSpeakText(msgId, text);
    const orig = String(text || '').trim();
    if (!speakText || speakText === orig) {
      const prep = await apiRequest('/api/voice', {
        method: 'POST',
        body: JSON.stringify(voiceApiPayload({ msg_id: msgId, text, voice, mark_only: true })),
      });
      if (prep && prep.translated) speakText = String(prep.translated).trim();
    }
    if (!speakText) throw new Error('empty_speak_text');
    try {
      await playVoiceLikePreview(speakText, voice);
    } catch (playErr) {
      log(t('voicePlayFailed') + (playErr && playErr.message ? playErr.message : playErr), 'error');
      throw playErr;
    }
    await apiRequest('/api/voice', {
      method: 'POST',
      body: JSON.stringify(voiceApiPayload({ msg_id: msgId, voice, finalize_only: true })),
    });
    applyVoiceMessageDoneUi(msgId);
  }

  /** Тот же путь, что предпрослушивание 🔊 — надёжно в браузере на VPS. */
  async function playVoiceLikePreview(text, voice, opts) {
    const v = String(voice || '').trim();
    const utter = String(text || '').trim();
    if (!v || !utter) throw new Error('empty_voice_or_text');
    unlockBrowserAudioForPlayback();
    const endpoint = v.startsWith('cloned:') ? '/api/preview-cloned-voice' : '/api/preview-voice';
    const previewBody = { voice: v, text: utter };
    if (opts && opts.language) previewBody.language = String(opts.language).toLowerCase().slice(0, 2);
    if (v.startsWith('cloned:') && state.cloneViaModal) previewBody.clone_via_modal = true;
    const resp = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: { ...jsonAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(previewBody),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`preview_tts_${resp.status}${errText ? ': ' + errText.slice(0, 80) : ''}`);
    }
    const blob = await resp.blob();
    if (!blob || blob.size < 120) {
      const errText = await blob.text().catch(() => '');
      throw new Error(`preview_tts_empty${errText ? ': ' + errText.slice(0, 80) : ''}`);
    }
    try {
      await playBlobInMasterAudio(blob);
    } catch (e) {
      const vol = Math.min(1, Math.max(0, getUserTtsVolumePlayback()));
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = vol;
      await new Promise((resolve, reject) => {
        audio.onended = () => {
          try { URL.revokeObjectURL(url); } catch (e2) { /* ignore */ }
          resolve();
        };
        audio.onerror = () => {
          try { URL.revokeObjectURL(url); } catch (e2) { /* ignore */ }
          reject(new Error('audio_play_error'));
        };
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(reject);
      });
    }
  }

  async function previewVoice(voice, btn) {
    const v = String(voice || '').trim();
    if (!v || !btn) return;
    if (v.startsWith('cloned:') && isVoiceCloneLocked()) {
      openVoiceCloneUpgradeModal();
      return;
    }
    const originalText = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
    try {
      const endpoint = v.startsWith('cloned:') ? '/api/preview-cloned-voice' : '/api/preview-voice';
      const previewBody = { voice: v };
      if (v.startsWith('cloned:') && state.cloneViaModal) previewBody.clone_via_modal = true;
      const hdrs = jsonAuthHeaders();
      console.log('🔊 Preview voice:', v, 'X-User-ID:', hdrs['X-User-ID'] || '(cookie only)');
      const resp = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, { method: 'POST', headers: hdrs, credentials: 'include', body: JSON.stringify(previewBody) });
      if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const audio = new Audio(url); audio.onended = () => URL.revokeObjectURL(url); audio.play(); log(t('logPlaying') + v, 'success'); } 
      else if (resp.status === 403 && v.startsWith('cloned:')) {
        await fetchSubscriptionRecognitionGate();
        syncProRecognitionGateUi();
        updateVoiceSelects();
        if (isVoiceCloneLocked()) openVoiceCloneUpgradeModal();
      } else { const errorText = await resp.text(); console.error('❌ Preview error:', resp.status, errorText); alert('Ошибка предпрослушивания: ' + resp.status); }
    } catch (e) { console.error('❌ Preview exception:', e); alert(`Ошибка: ${e.message}`); } 
    finally { btn.textContent = '🔊'; btn.disabled = false; }
  }

  async function toggleAI(nextEnabled = null) {
    const prev = state.aiEnabled;
    const next = typeof nextEnabled === 'boolean' ? nextEnabled : !prev;

    if (next && isAiAssistantLocked()) {
      openAiAssistantUpgradeModal();
      state.aiEnabled = false;
      if (elements.aiToggle) elements.aiToggle.checked = false;
      syncAiSuggestionsPanelVisibility();
      updateUI();
      return;
    }

    state.aiEnabled = next;
    let raw = (state.aiTopic && String(state.aiTopic).trim()) || '';
    if (!raw) {
      try {
        const ls = localStorage.getItem('voiceTranslator_aiTopic');
        if (ls && ls.trim()) { raw = ls.trim(); state.aiTopic = raw; }
      } catch (e) { /* ignore */ }
    }
    if (!raw && state.profileAiConversationDescription) {
      const p = state.profileAiConversationDescription.trim();
      if (p) {
        state.aiTopic = p;
        raw = state.aiTopic.trim();
      }
    }
    const topicForApi = raw || 'general conversation';
    if (state.aiEnabled) {
      if (!isTrialMode()) {
        try {
          await apiRequest('/api/ai-config', { method: 'POST', body: JSON.stringify({ enabled: true, topic: topicForApi }) });
          state._lastAiToggleAt = Date.now();
          console.log('✅ AI включён, тема:', topicForApi);
        } catch (e) {
          console.error('❌ Ошибка настройки AI:', e);
          state.aiEnabled = false;
          if (elements.aiToggle) elements.aiToggle.checked = false;
          if (String(e && e.message).includes('403')) {
            await fetchSubscriptionRecognitionGate();
            syncProRecognitionGateUi();
            openAiAssistantUpgradeModal();
          }
          syncAiSuggestionsPanelVisibility();
          updateUI();
          return;
        }
      }
    } else {
      if (!isTrialMode()) {
        try {
          await apiRequest('/api/ai-config', { method: 'POST', body: JSON.stringify({ enabled: false, topic: topicForApi }) });
          state._lastAiToggleAt = Date.now();
          console.log('✅ AI выключен');
        } catch (e) { console.error('❌ Ошибка выключения AI:', e); }
      }
      closeAiTopicModal();
    }
    updateUI();
  }

  function openAiTopicModal() {
    if (isAiAssistantLocked()) {
      openAiAssistantUpgradeModal();
      return;
    }
    if (!elements.aiTopicModal) return;
    const parts = splitAiTopic(state.aiTopic);
    if (elements.aiTopicModalTitleInput) elements.aiTopicModalTitleInput.value = parts.title;
    if (elements.aiTopicModalDescInput) elements.aiTopicModalDescInput.value = parts.desc;
    elements.aiTopicModal.classList.add('open');
    elements.aiTopicModal.setAttribute('aria-hidden', 'false');
    if (elements.aiTopicSettingsBtn) elements.aiTopicSettingsBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => elements.aiTopicModalTitleInput?.focus(), 50);
    if (typeof applyTranslations === 'function') applyTranslations();
  }

  function closeAiTopicModal() {
    if (!elements.aiTopicModal) return;
    elements.aiTopicModal.classList.remove('open');
    elements.aiTopicModal.setAttribute('aria-hidden', 'true');
    if (elements.aiTopicSettingsBtn) elements.aiTopicSettingsBtn.setAttribute('aria-expanded', 'false');
  }

  async function saveAiTopicFromModal() {
    const combined = combineAiTopic(elements.aiTopicModalTitleInput?.value, elements.aiTopicModalDescInput?.value);
    const topicForApi = combined.trim() || 'general conversation';
    state.aiTopic = combined.trim();
    try {
      if (state.aiTopic) localStorage.setItem('voiceTranslator_aiTopic', state.aiTopic);
      else localStorage.removeItem('voiceTranslator_aiTopic');
    } catch (e) { console.warn('localStorage ai topic:', e); }
    if (state.aiEnabled && !isTrialMode()) {
      try {
        await apiRequest('/api/ai-config', { method: 'POST', body: JSON.stringify({ enabled: true, topic: topicForApi }) });
        state._lastAiToggleAt = Date.now();
        console.log('✅ Тема AI сохранена:', topicForApi);
      } catch (err) { console.error('❌ Ошибка сохранения темы AI:', err); }
    }
    closeAiTopicModal();
    updateUI();
  }

  async function saveAiTopicInline() {
    const combined = combineAiTopic(elements.aiTopicInlineTitle?.value, elements.aiTopicInlineDesc?.value);
    const topicForApi = combined.trim() || 'general conversation';
    state.aiTopic = combined.trim();
    try {
      if (state.aiTopic) localStorage.setItem('voiceTranslator_aiTopic', state.aiTopic);
      else localStorage.removeItem('voiceTranslator_aiTopic');
    } catch (e) { console.warn('localStorage ai topic:', e); }
    if (!isTrialMode()) {
      try {
        await apiRequest('/api/ai-config', { method: 'POST', body: JSON.stringify({ enabled: !!state.aiEnabled, topic: topicForApi }) });
        state._lastAiToggleAt = Date.now();
        console.log('✅ Тема AI сохранена (inline):', topicForApi);
      } catch (err) { console.error('❌ Ошибка сохранения темы AI (inline):', err); }
    }
    updateUI();
  }

  function showChatModal() { loadVoices(); startChatPolling(); log(t('logChatOpen'), 'system'); }

  function phraseSilenceRoundToTenth(sec) {
    const s = parseFloat(sec);
    if (!Number.isFinite(s)) return NaN;
    return Math.round(s * 10) / 10;
  }

  function phraseSilenceClamp(sec) {
    const s = phraseSilenceRoundToTenth(sec);
    if (!Number.isFinite(s)) return state.phraseSilenceMin;
    const lo = state.phraseSilenceMin;
    const hi = state.phraseSilenceMax;
    return Math.min(hi, Math.max(lo, s));
  }

  function phraseSilenceInputFocused() {
    return document.activeElement === elements.phraseSilenceInput;
  }

  function applyPhraseSilenceInputFromSec(sec) {
    const input = elements.phraseSilenceInput;
    const range = elements.phraseSilenceRange;
    if (!input && !range) return;
    const normalized = phraseSilenceClamp(sec);
    if (input) input.value = normalized.toFixed(1);
    if (range) range.value = String(Math.round(normalized * 10));
  }

  function readPhraseSilenceSecFromInputs() {
    const raw = elements.phraseSilenceInput?.value;
    if (raw == null) return null;
    const parsed = parseFloat(String(raw).replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    return phraseSilenceClamp(parsed);
  }

  function updatePhraseSilenceUI(sec) {
    if (!elements.phraseSilenceInput) return;
    if (!phraseSilenceInputFocused()) {
      applyPhraseSilenceInputFromSec(sec);
    }
  }

  function onPhraseSilenceInput() {
    const input = elements.phraseSilenceInput;
    if (!input) return;
    const filtered = String(input.value).replace(',', '.').replace(/[^0-9.]/g, '');
    input.value = filtered;
    schedulePhraseSilencePost();
  }

  function onPhraseSilenceRangeInput() {
    const range = elements.phraseSilenceRange;
    if (!range) return;
    const v = phraseSilenceClamp((parseInt(range.value, 10) || 8) / 10);
    applyPhraseSilenceInputFromSec(v);
    schedulePhraseSilencePost();
  }

  function stepNativeRangeInput(rangeEl, direction) {
    if (!rangeEl || !direction) return;
    const min = parseFloat(rangeEl.getAttribute('min'));
    const max = parseFloat(rangeEl.getAttribute('max'));
    const lo = Number.isFinite(min) ? min : 0;
    const hi = Number.isFinite(max) ? max : 100;
    let step = parseFloat(rangeEl.getAttribute('step'));
    if (!Number.isFinite(step) || step <= 0) step = 1;
    let v = parseFloat(rangeEl.value);
    if (!Number.isFinite(v)) v = lo;
    const stepStr = String(step);
    const dot = stepStr.indexOf('.');
    const decimals = dot === -1 ? 0 : stepStr.length - dot - 1;
    let next = v + direction * step;
    if (decimals > 0) {
      const f = 10 ** decimals;
      next = Math.round(next * f) / f;
    } else {
      next = Math.round(next);
    }
    next = Math.min(hi, Math.max(lo, next));
    rangeEl.value = String(next);
    rangeEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function bumpNativeRange(rangeEl, direction, fireChange) {
    stepNativeRangeInput(rangeEl, direction);
    if (fireChange && rangeEl) rangeEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function finalizePhraseSilenceInputs() {
    const sec = readPhraseSilenceSecFromInputs();
    if (sec != null) {
      persistPhraseSilenceSecLocal(sec);
      applyPhraseSilenceInputFromSec(sec);
      if (phraseSilencePostTimer) {
        clearTimeout(phraseSilencePostTimer);
        phraseSilencePostTimer = null;
      }
      void postPhraseSilence(sec);
    } else if (typeof state.phraseSilenceSec === 'number' && Number.isFinite(state.phraseSilenceSec)) {
      applyPhraseSilenceInputFromSec(state.phraseSilenceSec);
    } else {
      applyPhraseSilenceInputFromSec((state.phraseSilenceMin + state.phraseSilenceMax) / 2);
    }
  }

  function bumpPhraseSilence(deltaTenth) {
    const cur = readPhraseSilenceSecFromInputs()
      ?? (typeof state.phraseSilenceSec === 'number' && Number.isFinite(state.phraseSilenceSec) ? state.phraseSilenceSec : null)
      ?? phraseSilenceClamp(defaultPhraseSilenceSec());
    const next = phraseSilenceClamp(phraseSilenceRoundToTenth(cur + deltaTenth * 0.1));
    applyPhraseSilenceInputFromSec(next);
    if (phraseSilencePostTimer) {
      clearTimeout(phraseSilencePostTimer);
      phraseSilencePostTimer = null;
    }
    void postPhraseSilence(next);
  }

  async function postPhraseSilence(sec) {
    const v = parseFloat(sec);
    if (!Number.isFinite(v)) return;
    const local = persistPhraseSilenceSecLocal(v);
    updatePhraseSilenceUI(local);
    if (isTrialMode()) return;
    try {
      const out = await apiRequest('/api/phrase-silence', { method: 'POST', body: JSON.stringify({ seconds: local }) });
      if (typeof out.phrase_silence_sec === 'number') {
        persistPhraseSilenceSecLocal(out.phrase_silence_sec);
        updatePhraseSilenceUI(out.phrase_silence_sec);
      }
    } catch (e) {
      log(t('logError') + e.message, 'error');
    }
  }

  function schedulePhraseSilencePost() {
    if (!elements.phraseSilenceInput) return;
    const sec = readPhraseSilenceSecFromInputs();
    if (sec == null) {
      if (phraseSilencePostTimer) {
        clearTimeout(phraseSilencePostTimer);
        phraseSilencePostTimer = null;
      }
      return;
    }
    persistPhraseSilenceSecLocal(sec);
    applyPhraseSilenceInputFromSec(sec);
    const toPost = readPhraseSilenceSecFromInputs();
    if (toPost == null) return;
    if (phraseSilencePostTimer) clearTimeout(phraseSilencePostTimer);
    phraseSilencePostTimer = setTimeout(() => {
      phraseSilencePostTimer = null;
      void postPhraseSilence(toPost);
    }, 450);
  }

  function sensitivityPctFromThreshold(threshold, tmin, tmax) {
    const t = parseFloat(threshold);
    if (!Number.isFinite(t) || !Number.isFinite(tmin) || !Number.isFinite(tmax) || tmax <= tmin) return 50;
    const clamped = Math.min(tmax, Math.max(tmin, t));
    return Math.round(((tmax - clamped) / (tmax - tmin)) * 100);
  }

  function thresholdFromSensitivityPct(pct, tmin, tmax) {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    return tmax - ((tmax - tmin) * p) / 100;
  }

  function updateMicSensitivityValueLabel(pct) {
    const span = elements.micRmsThresholdValue;
    if (span) span.textContent = `${Math.round(Math.min(100, Math.max(0, pct)))}%`;
  }

  function updateMicSensitivityUIFromServer(threshold) {
    const r = elements.micRmsThresholdRange;
    if (!r) return;
    const tmin = state.micRmsThresholdMin;
    const tmax = state.micRmsThresholdMax;
    const pct = sensitivityPctFromThreshold(threshold, tmin, tmax);
    if (document.activeElement !== r) r.value = String(pct);
    r.setAttribute('aria-valuenow', String(pct));
    updateMicSensitivityValueLabel(pct);
  }

  function loadMicRmsThresholdPreference() {
    const tmin = state.micRmsThresholdMin;
    const tmax = state.micRmsThresholdMax;
    try {
      const lsMic = localStorage.getItem('voiceTranslator_micRmsThreshold');
      if (lsMic != null) {
        const mt = parseFloat(lsMic);
        if (Number.isFinite(mt)) {
          state.micRmsThreshold = Math.min(tmax, Math.max(tmin, mt));
          updateMicSensitivityUIFromServer(state.micRmsThreshold);
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }
    const defMic = defaultBrowserMicRmsThreshold();
    state.micRmsThreshold = defMic;
    updateMicSensitivityUIFromServer(defMic);
  }

  function applyMicRmsThresholdLocal(threshold, opts) {
    const tmin = state.micRmsThresholdMin;
    const tmax = state.micRmsThresholdMax;
    const v = parseFloat(threshold);
    if (!Number.isFinite(v)) return;
    const clamped = Math.min(tmax, Math.max(tmin, v));
    if (!opts || opts.userInitiated !== false) {
      browserMicSessionAutoThreshold = null;
      micRmsThresholdUserTouched = true;
    }
    state.micRmsThreshold = clamped;
    try {
      localStorage.setItem('voiceTranslator_micRmsThreshold', String(clamped));
    } catch (e) {
      /* ignore */
    }
  }

  async function postMicRmsThreshold(threshold) {
    applyMicRmsThresholdLocal(threshold);
    if (isTrialMode()) {
      updateMicSensitivityUIFromServer(state.micRmsThreshold);
      return;
    }
    const v = state.micRmsThreshold;
    if (!Number.isFinite(v)) return;
    try {
      const out = await apiRequest('/api/mic-rms-threshold', { method: 'POST', body: JSON.stringify({ threshold: v }) });
      if (typeof out.mic_rms_threshold === 'number') {
        applyMicRmsThresholdLocal(out.mic_rms_threshold);
        updateMicSensitivityUIFromServer(out.mic_rms_threshold);
      }
    } catch (e) {
      log(t('logError') + e.message, 'error');
    }
  }

  function scheduleMicRmsThresholdPost() {
    const r = elements.micRmsThresholdRange;
    if (!r) return;
    const pct = parseFloat(r.value);
    updateMicSensitivityValueLabel(pct);
    const th = thresholdFromSensitivityPct(pct, state.micRmsThresholdMin, state.micRmsThresholdMax);
    applyMicRmsThresholdLocal(th);
    if (micRmsThresholdPostTimer) clearTimeout(micRmsThresholdPostTimer);
    micRmsThresholdPostTimer = setTimeout(() => {
      micRmsThresholdPostTimer = null;
      void postMicRmsThreshold(th);
    }, isTrialMode() ? 0 : 450);
  }

  function volumeFromRangePct(pct) {
    const vmax = Math.round((state.userTtsVolumeMax || 3) * 100);
    const vmin = Math.round((state.userTtsVolumeMin || 0.25) * 100);
    const p = Math.min(vmax, Math.max(vmin, parseFloat(pct) || 100));
    return p / 100;
  }

  function rangePctFromVolume(vol, vmin, vmax) {
    const v = Math.min(vmax, Math.max(vmin, parseFloat(vol) || 1));
    return Math.round(v * 100);
  }

  function updateUserTtsVolumeValueLabel(pct) {
    const span = elements.userTtsVolumeValue;
    const vmax = Math.round((state.userTtsVolumeMax || 3) * 100);
    const vmin = Math.round((state.userTtsVolumeMin || 0.25) * 100);
    if (span) span.textContent = `${Math.round(Math.min(vmax, Math.max(vmin, pct)))}%`;
  }

  function updateUserTtsVolumeUIFromServer(volume) {
    const r = elements.userTtsVolumeRange;
    if (!r) return;
    const pct = rangePctFromVolume(volume, state.userTtsVolumeMin, state.userTtsVolumeMax);
    if (document.activeElement !== r) r.value = String(pct);
    r.setAttribute('aria-valuenow', String(pct));
    updateUserTtsVolumeValueLabel(pct);
  }

  function getUserTtsVolumePlayback() {
    if (typeof state.userTtsVolume === 'number' && Number.isFinite(state.userTtsVolume)) {
      return Math.min(state.userTtsVolumeMax, Math.max(state.userTtsVolumeMin, state.userTtsVolume));
    }
    const r = elements.userTtsVolumeRange;
    if (r) return volumeFromRangePct(r.value);
    return 1;
  }

  async function postUserTtsVolume(volume) {
    const v = parseFloat(volume);
    if (!Number.isFinite(v)) return;
    state.userTtsVolume = v;
    try { localStorage.setItem('voiceTranslator_userTtsVolume', String(v)); } catch (e) { /* ignore */ }
    if (isTrialMode()) {
      updateUserTtsVolumeUIFromServer(v);
      return;
    }
    try {
      const out = await apiRequest('/api/user-tts-volume', { method: 'POST', body: JSON.stringify({ volume: v }) });
      if (typeof out.user_tts_volume === 'number') {
        state.userTtsVolume = out.user_tts_volume;
        try { localStorage.setItem('voiceTranslator_userTtsVolume', String(out.user_tts_volume)); } catch (e) { /* ignore */ }
        updateUserTtsVolumeUIFromServer(out.user_tts_volume);
      }
    } catch (e) {
      log(t('logError') + e.message, 'error');
    }
  }

  function scheduleUserTtsVolumePost() {
    const r = elements.userTtsVolumeRange;
    if (!r) return;
    const pct = parseFloat(r.value);
    updateUserTtsVolumeValueLabel(pct);
    const vol = volumeFromRangePct(pct);
    if (userTtsVolumePostTimer) clearTimeout(userTtsVolumePostTimer);
    userTtsVolumePostTimer = setTimeout(() => {
      userTtsVolumePostTimer = null;
      void postUserTtsVolume(vol);
    }, 450);
  }

  /** Демо-чат: меню настроек по умолчанию свёрнуто (пользователь открывает сам через «Меню»). */
  function revealChatSettingsMenuAfterTrialLoad() {
    if (!isTrialMode()) return Promise.resolve();
    setChatSettingsPanelExpanded(false, { animate: false });
    return Promise.resolve();
  }

  function setChatSettingsPanelExpanded(expanded, opts = {}) {
    const wrap = elements.chatSessionSettingsWrap;
    const btn = elements.chatSettingsToggleBtn;
    const collapseBtn = elements.chatSettingsCollapseBtn;
    const collapseBar = elements.chatSettingsCollapseBar;
    if (!wrap || !btn) return;
    const animate = opts.animate === true;
    if (animate) {
      wrap.classList.add('chat-settings--animate');
      const clearAnimate = () => wrap.classList.remove('chat-settings--animate');
      wrap.addEventListener('transitionend', function onEnd(e) {
        if (e.target !== wrap) return;
        wrap.removeEventListener('transitionend', onEnd);
        clearAnimate();
      });
      setTimeout(clearAnimate, 450);
    }
    wrap.classList.toggle('is-collapsed', !expanded);
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    wrap.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    if (collapseBar) {
      collapseBar.hidden = !expanded;
      collapseBar.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }
  }

  function setChatPreloaderVisible(visible, opts = {}) {
    const el = elements.chatPreloader;
    if (!el) return;
    el.classList.toggle('is-hidden', !visible);
    el.classList.toggle('chat-preloader--modal-warmup', !!opts.modalWarmup);
    if (!visible) el.classList.remove('is-error');
    else if (opts.error) el.classList.add('is-error');
    else el.classList.remove('is-error');
    el.setAttribute('aria-busy', visible ? 'true' : 'false');
  }

  function showModalWarmupPreloader() {
    state.modalWarmupInProgress = true;
    if (elements.chatPreloaderText) {
      elements.chatPreloaderText.textContent = t('modalWarmupStart');
    }
    setChatPreloaderVisible(true, { modalWarmup: true });
    updateStatus();
  }

  function hideModalWarmupPreloader() {
    if (!state.modalWarmupInProgress) return;
    state.modalWarmupInProgress = false;
    setChatPreloaderVisible(false);
    if (elements.chatPreloaderText) {
      elements.chatPreloaderText.textContent = t('chatPreloaderText');
    }
    updateStatus();
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ac.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Ожидание /api/health с индикатором поверх области чата (медленный старт бэкенда). */
  async function waitForBackendHealth(maxAttempts = 12, delayMs = 900) {
    const pre = elements.chatPreloader;
    const txt = elements.chatPreloaderText;
    if (pre) {
      pre.classList.remove('is-hidden', 'is-error');
      pre.setAttribute('aria-busy', 'true');
    }
    if (txt) txt.textContent = typeof t === 'function' ? t('chatPreloaderText') : '…';
    for (let r = 1; r <= maxAttempts; r++) {
      try {
        const resp = await fetchWithTimeout(`${CONFIG.apiBaseUrl}/api/health`, { cache: 'no-store' }, 8000);
        if (resp.ok) {
          log(t('logConnected'), 'success');
          setChatPreloaderVisible(false);
          return true;
        }
      } catch (_) { /* сеть / сервер ещё не поднялся */ }
      if (txt) txt.textContent = typeof t === 'function' ? t('chatPreloaderAttempt', { current: r, max: maxAttempts }) : `${r}/${maxAttempts}`;
      log(`⏳ ${r}/${maxAttempts}`, 'system');
      await new Promise(res => setTimeout(res, delayMs));
    }
    if (txt) {
      txt.textContent = typeof t === 'function' ? t('chatPreloaderOffline') : 'Offline';
      pre?.classList.add('is-error');
    }
    await new Promise(res => setTimeout(res, 2200));
    setChatPreloaderVisible(false);
    return false;
  }
  function hideChatModal() { stopChatPolling(); hideTypeModal(); }

  async function toggleConferenceMode(enabled) {
    if (isTrialMode()) {
      log('В демо режим конференции недоступен.', 'system');
      state.conferenceMode = false;
      if (elements.conferenceToggle) elements.conferenceToggle.checked = false;
      return;
    }
    try {
      log(enabled ? t('logConferenceOn') : t('logConferenceOff'), 'system');
      const res = await apiRequest('/api/conference-mode', { method: 'POST', body: JSON.stringify({ enabled }) });
      state.conferenceMode = !!res.conference_mode;
      state.vbCableReady = !!res.vb_cable_ready;
      if (enabled && !state.vbCableReady) {
        log(t('logConferenceNoCable'), 'error');
      } else if (enabled && res.vb_cable_device) {
        log(t('logConferenceCableOk', { device: res.vb_cable_device }), 'system');
      }
    } catch (e) { log(t('logError') + e.message, 'error'); if (elements.conferenceToggle) elements.conferenceToggle.checked = !enabled; }
  }

  async function setConversationLanguages(userLang, partnerLang) {
    const nextUser = (userLang || 'ru').toLowerCase();
    const nextPartner = (partnerLang || 'en').toLowerCase();
    state.userSpeakLang = nextUser;
    state.partnerSpeakLang = nextPartner;
    localStorage.setItem('voiceTranslator_userSpeakLang', nextUser);
    localStorage.setItem('voiceTranslator_partnerSpeakLang', nextPartner);
    if (isTrialMode()) {
      syncTrialSettingsLangs(nextUser, nextPartner);
      syncTrialPartnerVoiceToPartnerLang(nextPartner);
      if (state.trialSessionId) {
        void fetch(`${CONFIG.apiBaseUrl}/api/trial/session-langs`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: state.trialSessionId,
            user_speak_lang: nextUser,
            partner_speak_lang: nextPartner,
          }),
        }).catch(() => {});
      }
    }
    updateUI();
    if (!isTrialMode()) {
      try {
        await apiRequest('/api/conversation-languages', {
          method: 'POST',
          body: JSON.stringify({ user_lang: nextUser, partner_lang: nextPartner })
        });
        console.log('🌐 Conversation languages saved:', { you: nextUser, partner: nextPartner });
      } catch (e) {
        console.warn('⚠️ Не удалось сохранить языки диалога на сервере:', e);
      }
    }
  }

  function handleChatClick(e) {
    const playBtn = e.target.closest('.msg-play-btn');
    if (playBtn) {
      e.stopPropagation();
      const bubble = playBtn.closest('.msg-bubble');
      if (bubble) triggerMessagePlay(bubble);
      return;
    }
    const deleteBtn = e.target.closest('.msg-delete');
    if (!deleteBtn) return;
    e.stopPropagation();
    const bubble = deleteBtn.closest('.msg-bubble');
    if (!bubble) return;
    const mid = Number(bubble.dataset.msgId);
    if (!Number.isFinite(mid)) return;
    handleDelete(mid);
  }

  document.addEventListener('keydown', function(e) {
    if (trainingTour.active && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      return;
    }
    if (e.key === 'Escape' && elements.micSensitivityPopover && elements.micSensitivityTriggerBtn) {
      if (trainingTour.active && trainingTour.micSensitivityForcedOpen) return;
      if (!elements.micSensitivityPopover.hasAttribute('hidden')) {
        elements.micSensitivityPopover.setAttribute('hidden', '');
        elements.micSensitivityTriggerBtn.setAttribute('aria-expanded', 'false');
        return;
      }
    }
    if (state.isProcessing) return;
    if (typeModal) {
      if (trainingTour.active && trainingTour.typeModalOpenedForTraining) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      handleTypeModalKeydown(e);
      return;
    }
    const aiTm = document.getElementById('aiTopicModal');
    if (aiTm && aiTm.classList.contains('open') && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeAiTopicModal();
      return;
    }
    const proUp = document.getElementById('proUpgradeModal');
    if (proUp && proUp.classList.contains('open') && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeProUpgradeModal();
      return;
    }
    const aiUp = document.getElementById('aiAssistantUpgradeModal');
    if (aiUp && aiUp.classList.contains('open') && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeAiAssistantUpgradeModal();
      return;
    }
    const voiceCloneUp = document.getElementById('voiceCloneUpgradeModal');
    if (voiceCloneUp && voiceCloneUp.classList.contains('open') && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeVoiceCloneUpgradeModal();
      return;
    }
    const micErr = document.getElementById('micErrorModal');
    if (micErr && micErr.classList.contains('open') && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeStartErrorModal();
      return;
    }
    const activeTag = document.activeElement?.tagName;
    const activeType = document.activeElement?.type;
    const isTextInput = (activeTag === 'INPUT' && activeType === 'text') || activeTag === 'TEXTAREA';
    if (isTextInput) {
      if (e.key === 'Enter') {
        const input = document.activeElement?.closest('.msg-input');
        if (input) {
          if (input.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const bubble = input.closest('.msg-bubble');
          voiceSpecificMessage(parseInt(bubble.dataset.msgId, 10), input.value);
        }
        return;
      }
      if (e.key === 'Tab') {
        const input = document.activeElement?.closest('.msg-input');
        if (input) {
          e.preventDefault();
          e.stopPropagation();
          if (trainingTour.active) {
            ensureTrainingTypeModalForDemo();
          } else {
            openTypeModal();
          }
        }
        return;
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (trainingTour.active) {
        ensureTrainingTypeModalForDemo();
      } else {
        openTypeModal();
      }
      return false;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      /* При включённом авто Enter не должен дублировать озвучку (случайное нажатие). */
      if (!state.autoPlay) voiceNextInQueue();
      return false;
    }
  }, true);

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => { const base64 = reader.result.split(',')[1] || reader.result; resolve(base64); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function getMessageBubbleText(bubble) {
    if (!bubble) return '';
    const input = bubble.querySelector('.msg-input');
    if (input) return String(input.value || '').trim();
    const textEl = bubble.querySelector('.msg-text');
    if (textEl) return String(textEl.textContent || '').trim();
    return '';
  }

  function openTypeModal(opts = {}) {
    const isTrainingModal = opts.training === true;
    if (typeModal) return;
    let bubble = null;
    if (isTrainingModal) {
      bubble = document.getElementById('vfTrainingDemoBubble');
    }
    const ae = document.activeElement;
    if (!bubble && ae && ae.classList && ae.classList.contains('msg-input')) {
      bubble = ae.closest('.msg-bubble');
    }
    if (!bubble) bubble = findNextUnvoicedInDOM();
    if (!bubble) { log(t('modalNoMessages'), 'system'); return; }
    currentTypeMsgId = parseInt(bubble.dataset.msgId);
    const originalText = getMessageBubbleText(bubble);
    let audioBase64 = null;
    try {
      const audioB64 = bubble.dataset.audioBase64;
      if (audioB64 && audioB64.length < 150000) {
        audioBase64 = audioB64;
        console.log('🎤 Audio base64 loaded from dataset:', audioBase64.length, 'chars');
      } else if (audioB64) {
        console.warn('⚠️ Audio слишком большой:', audioB64.length, 'chars, не передаём');
      }
    } catch (e) { console.warn('⚠️ Could not load audio from dataset:', e); }
    let audioMetadata = null;
    try {
      const metaStr = bubble.dataset.audioMeta;
      if (metaStr) { audioMetadata = JSON.parse(metaStr); console.log('🎤 Audio metadata loaded:', audioMetadata); }
    } catch (e) { console.warn('⚠️ Could not parse audio meta', e); }
    state.selectedType = 'statement';
    syncTargetInput = bubble.querySelector('textarea.msg-input');
    typeModal = document.createElement('div');
    typeModal.id = 'type-modal';
    typeModal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:600px;background:#1e293b;border:2px solid #475569;border-radius:16px;padding:1.5rem;z-index:9999;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:1rem;';
    typeModal.innerHTML = `<button id="close-type-modal-btn" style="position:absolute;top:1rem;right:1rem;background:transparent;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">✖</button><h2 style="margin:0;font-size:1.3rem;color:white;">${t('modalTitle')}</h2><input id="type-input" type="text" value="${originalText.replace(/"/g, '&quot;')}" style="width:100%;padding:0.8rem;font-size:1.1rem;background:#0f172a;border:1px solid #334155;border-radius:8px;color:white;outline:none;" /><div id="suggestions-container" style="display:flex;flex-direction:column;gap:0.5rem;min-height:20px;"></div><div style="display:flex;gap:0.8rem;margin:0.5rem 0;"><button id="btn-type-q" style="flex:1;padding:0.8rem;font-size:1rem;border:2px solid #334155;border-radius:8px;background:#0f172a;color:white;cursor:pointer;">${t('modalQuestion')}</button><button id="btn-type-s" style="flex:1;padding:0.8rem;font-size:1rem;border:2px solid #334155;border-radius:8px;background:#0f172a;color:white;cursor:pointer;">${t('modalStatement')}</button></div><p style="margin:0;font-size:0.85rem;color:#94a3b8;text-align:center;">${t('modalHint')}</p>`;
    document.body.appendChild(typeModal);
    typeModal.focus();
    const closeBtn = typeModal.querySelector('#close-type-modal-btn');
    if (closeBtn) { closeBtn.onclick = hideTypeModal; closeBtn.onmouseover = () => closeBtn.style.color = '#fff'; closeBtn.onmouseout = () => closeBtn.style.color = '#94a3b8'; }
    const inputEl = typeModal.querySelector('#type-input');
    inputEl.focus(); inputEl.select();
    inputEl.addEventListener('input', (e) => { if (syncTargetInput) syncTargetInput.value = e.target.value; });
    typeModal.querySelector('#btn-type-q').onclick = () => { applyTypeToInput('question'); hideTypeModalAndVoice(); };
    typeModal.querySelector('#btn-type-s').onclick = () => { applyTypeToInput('statement'); hideTypeModalAndVoice(); };
    const suggestionsContainer = typeModal.querySelector('#suggestions-container');
    if (isTrainingModal) {
      fillTrainingModalSuggestions();
    } else if (state.aiEnabled) {
      loadSuggestions(currentTypeMsgId, originalText, audioBase64, audioMetadata);
    } else if (suggestionsContainer) {
      suggestionsContainer.innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('modalEnableAI')}</div>`;
    }
  }

  async function loadSuggestions(msgId, text, audioBase64 = null, audioMetadata = null) {
    const container = typeModal?.querySelector('#suggestions-container');
    if (!container) return;
    if (typeModal?.classList.contains('vf-training-type-modal')) return;
    if (isAiAssistantLocked()) {
      container.innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('aiAssistantUpgradeModalHint')}</div>`;
      return;
    }
    container.innerHTML = `<div style="color:#64748b;text-align:center;">${t('modalLoading')}</div>`;
    try {
      if (isTrialMode() && state.trialSessionId) {
        const payload = { session_id: state.trialSessionId, text };
        const resp = await fetch(`${CONFIG.apiBaseUrl}/api/trial/stt-suggestions`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const out = await resp.json().catch(() => ({}));
        const list = Array.isArray(out.suggestions) ? out.suggestions : [];
        const normOpts = { allowLatinInRu: true, sourceText: text };
        const fromAlt = extractAudioAlternativePhrases(audioMetadata, 5);
        const phonetic = buildPhoneticSttVariants(text, 8, normOpts);
        const core = String(text || '').trim().replace(/[.?!]+$/u, '');
        const fromApi = resp.ok && list.length ? coerceTemplateSuggestionsToConsonant(list, text, 5) : [];
        currentSuggestions = normalizeSuggestionVariants(
          phonetic.concat(fromApi).concat(fromAlt),
          5,
          normOpts
        );
        if (currentSuggestions.length < 5 && core) {
          const extra = buildPhoneticSttVariants(text, 5, normOpts).concat(
            buildConsonantVariants(core, 3)
          );
          currentSuggestions = normalizeSuggestionVariants(
            currentSuggestions.concat(extra),
            5,
            normOpts
          );
        }
        if (!currentSuggestions.length) {
          container.innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('modalNoSuggestions')}</div>`;
          return;
        }
        renderSuggestions(container, currentSuggestions);
        return;
      }
      const trimmedText = String(text || '').trim();
      const detectedType = /[?？]\s*$/.test(trimmedText) ? 'question' : 'statement';
      const payload = { text, msg_id: msgId, msg_type: detectedType, topic: state.aiTopic };
      if (audioBase64) {
        payload.audio_data = { format: 'wav', sample_rate: 16000, channels: 1, data: audioBase64 };
        console.log('🎤 Отправляем аудио в AI:', { size: audioBase64.length, format: 'wav/16kHz/mono' });
      } else {
        console.warn('⚠️ Нет аудио для отправки в AI (audioBase64 is null or too large)');
      }
      if (audioMetadata) {
        payload.audio_metadata = { alternatives: audioMetadata.alternatives || [], confidence: audioMetadata.confidence || null, duration: audioMetadata.duration || null };
      }
      const resp = await apiRequest('/api/suggestions', { method: 'POST', body: JSON.stringify(payload) });
      if (resp.suggestions?.length) {
        const normOptsMain = { allowLatinInRu: true, sourceText: text };
        const phoneticMain = buildPhoneticSttVariants(text, 8, normOptsMain);
        currentSuggestions = coerceTemplateSuggestionsToConsonant(resp.suggestions, text, 5);
        const fromAlt = extractAudioAlternativePhrases(audioMetadata, 5);
        const core = String(text || '').trim().replace(/[.?!]+$/u, '');
        currentSuggestions = normalizeSuggestionVariants(
          phoneticMain.concat(currentSuggestions).concat(fromAlt),
          5,
          normOptsMain
        );
        if (currentSuggestions.length < 5 && core) {
          currentSuggestions = normalizeSuggestionVariants(
            currentSuggestions.concat(buildConsonantVariants(core, 5)),
            5,
            normOptsMain
          );
        }
        if (currentSuggestions.length) renderSuggestions(container, currentSuggestions);
        else { container.innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('modalNoSuggestions')}</div>`; }
      } 
      else { container.innerHTML = `<div style="color:#94a3b8;text-align:center;">${t('modalNoSuggestions')}</div>`; }
    } catch (err) { 
      console.error('❌ Suggestions error:', err);
      container.innerHTML = `<div style="color:#ef4444;text-align:center;">${t('modalError')}</div>`; 
    }
  }

  function renderSuggestions(container, suggestions, opts) {
    container.innerHTML = '';
    const maxCount = opts && opts.maxCount != null ? opts.maxCount : 5;
    normalizeSuggestionVariants(suggestions, maxCount, opts).forEach((text, index) => {
      const keyNum = index + 3;
      const div = document.createElement('div');
      div.className = 'type-modal-suggestion';
      div.style.cssText = `display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:6px;cursor:pointer;`;
      div.innerHTML = `<span style="background:#334155;color:#94a3b8;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:bold;">${keyNum}</span><span style="color:#e2e8f0;font-size:0.95rem;">${text}</span>`;
      div.onclick = () => { selectSuggestion(text, div); };
      container.appendChild(div);
    });
  }

  function applySuggestionToCurrentPhrase(text) {
    const utter = String(text || '').trim();
    if (!utter) return false;
    const modalInput = typeModal?.querySelector('#type-input');
    if (modalInput) {
      modalInput.value = utter;
      if (syncTargetInput) {
        syncTargetInput.value = utter;
        syncTargetInput.dispatchEvent(new Event('input'));
      }
      modalInput.focus();
      return true;
    }
    const bubble = findNextUnvoicedUserInDOM();
    if (bubble) {
      const input = bubble.querySelector('.msg-input');
      if (input) {
        input.value = utter;
        input.focus();
        return true;
      }
    }
    return false;
  }

  function selectSuggestion(text, element) {
    if (!applySuggestionToCurrentPhrase(text)) return;
    const input = typeModal?.querySelector('#type-input');
    if (input) input.select();
    if (element) {
      element.style.background = '#1e3a8a';
      element.style.borderColor = '#3b82f6';
      setTimeout(() => {
        element.style.background = '#0f172a';
        element.style.borderColor = '#334155';
      }, 500);
    }
  }

  function hideTypeModalAndVoice() { const text = typeModal?.querySelector('#type-input').value; hideTypeModal(); voiceSpecificMessage(currentTypeMsgId, text); }
  function applyTypeToInput(type) {
    const input = document.getElementById('type-input');
    if (!input) return;
    let val = input.value.trimEnd().replace(/[.!?]+$/, '');
    input.value = val + (type === 'question' ? '?' : '.');
    if (syncTargetInput) {
      syncTargetInput.value = input.value;
      syncTargetInput.dispatchEvent(new Event('input'));
    }
    input.focus();
  }
  function hideTypeModal() { if (typeModal) { typeModal.remove(); typeModal = null; currentSuggestions = []; currentTypeMsgId = null; syncTargetInput = null; } }
  function handleTypeModalKeydown(e) { if (e.key === 'Escape') { hideTypeModal(); return; } if (e.key === '1') { e.preventDefault(); applyTypeToInput('question'); return; } if (e.key === '2') { e.preventDefault(); applyTypeToInput('statement'); return; } const keyNum = parseInt(e.key); if (keyNum >= 3 && keyNum <= 7) { e.preventDefault(); const idx = keyNum - 3; if (currentSuggestions[idx]) { const container = typeModal?.querySelector('#suggestions-container'); selectSuggestion(currentSuggestions[idx], container?.children[idx]); } return; } if (e.key === 'Enter' && !state.isProcessing) { e.preventDefault(); const text = typeModal?.querySelector('#type-input')?.value; hideTypeModal(); if (text) voiceSpecificMessage(currentTypeMsgId, text); } }
  
  function findNextUnvoicedInDOM() { 
    if (!elements.userMessages || !elements.partnerMessages) return null; 
    const allBubbles = [...elements.userMessages.querySelectorAll('.msg-bubble'), ...elements.partnerMessages.querySelectorAll('.msg-bubble')]; 
    for (let b of allBubbles) { 
      if (b.classList.contains('msg-awaiting-voice')) return b; 
    } 
    return null; 
  }

  function findNextUnvoicedUserInDOM() {
    if (!elements.userMessages) return null;
    for (const b of elements.userMessages.querySelectorAll('.msg-bubble')) {
      if (b.classList.contains('msg-awaiting-voice')) return b;
    }
    return null;
  }

  function applyTrialDemoChrome() {
    const on = isTrialMode();
    try {
      document.documentElement.classList.toggle('vf-trial-demo', on);
    } catch (e) { /* ignore */ }
    const planSlot = document.querySelector('.header-status-slot');
    const planPill = document.getElementById('headerPlanPill');
    const leftTools = document.querySelector('.footer-left-tools');
    [planSlot, planPill, leftTools].forEach((el) => {
      if (!el) return;
      if (on) {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.style.display = 'none';
      } else {
        el.hidden = false;
        el.removeAttribute('aria-hidden');
        el.style.display = '';
      }
    });
    if (on) {
      state.conferenceMode = false;
      if (elements.conferenceToggle) elements.conferenceToggle.checked = false;
      if (isAiSuggestionsMobileStack()) {
        queueMicrotask(() => setChatSettingsPanelExpanded(false, { animate: false }));
      }
    }
  }

  async function voiceSpecificMessage(msgId, text) { 
    if (!text?.trim() || state.isProcessing) return;
    if (isTrialMode()) {
      const toSpeak = await resolveTrialPartnerSpeakTextAsync(msgId, text);
      state.isProcessing = true;
      updateMsgStatus(msgId, t('msgStatusVoicing'), '#facc15');
      try {
        await trialRunWithMicPausedForPlayback(async () => {
          await speakTrialUserUtteranceAsync(toSpeak);
          if (trialPendingPartnerTurn) {
            await trialReleasePendingPartnerTurn();
          }
        });
        updateMsgStatus(msgId, t('msgStatusDone'), '#22c55e');
      } catch (e) {
        log(t('logError') + (e && e.message ? e.message : e), 'error');
      } finally {
        state.isProcessing = false;
        syncAllMsgPlayButtons();
      }
      return;
    }
    unlockBrowserAudioForPlayback();
    state.isProcessing = true; 
    updateMsgStatus(msgId, t('msgStatusVoicing'), '#facc15'); 
    try { 
      const activeVoice = getActiveVoiceForPlayback();
      if (!activeVoice.startsWith('cloned:')) {
        await voiceStandardEdgeInBrowser(msgId, text, activeVoice);
        await fetchChat();
        log(t('logVoiced') + msgId, 'success');
        return;
      }
      const res = await apiRequest('/api/voice', { method: 'POST', body: JSON.stringify(voiceApiPayload({ msg_id: msgId, text, voice: activeVoice })) }); 
      if (await applyVoiceMessageResult(res, msgId)) {
        log(t('logVoiced') + msgId, 'success');
      }
    } catch (err) {
      log(t('logError') + err.message, 'error');
      console.error('❌ voiceSpecificMessage error:', err);
      if (String(err && err.message).includes('403')) {
        await fetchSubscriptionRecognitionGate();
        syncProRecognitionGateUi();
        updateVoiceSelects();
        if (isVoiceCloneLocked()) openVoiceCloneUpgradeModal();
      }
    } 
    finally {
      state.isProcessing = false;
      syncAllMsgPlayButtons();
    } 
  }

  async function voiceNextInQueue() { 
    if (state.isProcessing) return;
    if (isTrialMode()) {
      unlockBrowserAudioForPlayback();
      const bubble = findNextUnvoicedUserInDOM();
      if (!bubble) {
        log(t('logNoPhrases'), 'system');
        return;
      }
      const msgId = parseInt(bubble.dataset.msgId, 10);
      const input = bubble.querySelector('.msg-input');
      const text = input ? input.value : (bubble.querySelector('.msg-text')?.textContent || '');
      await voiceSpecificMessage(msgId, text);
      return;
    }
    unlockBrowserAudioForPlayback();
    state.isProcessing = true; 
    try { 
      const activeVoice = getActiveVoiceForPlayback();
      const bubble = findNextUnvoicedInDOM();
      if (bubble && !activeVoice.startsWith('cloned:')) {
        const mid = parseInt(bubble.dataset.msgId, 10);
        const raw = bubble.querySelector('.msg-input')?.value || bubble.querySelector('.msg-text')?.textContent || '';
        await voiceStandardEdgeInBrowser(mid, raw, activeVoice);
        await fetchChat();
        log(t('logNext'), 'success');
        return;
      }
      const res = await apiRequest('/api/voice', { method: 'POST', body: JSON.stringify(voiceApiPayload({ voice: activeVoice })) }); 
      if (res.status === 'no_unvoiced_messages') log(t('logNoPhrases'), 'system');
      else if (await applyVoiceMessageResult(res, res.msg_id)) log(t('logNext'), 'success'); 
    } catch (e) {
      log(t('logError') + e.message, 'error');
      console.error('❌ voiceNextInQueue error:', e);
      if (String(e && e.message).includes('403')) {
        await fetchSubscriptionRecognitionGate();
        syncProRecognitionGateUi();
        updateVoiceSelects();
        if (isVoiceCloneLocked()) openVoiceCloneUpgradeModal();
      }
    } 
    finally { state.isProcessing = false; } 
  }

  async function handleDelete(msgId) {
    const mid = Number(msgId);
    if (!Number.isFinite(mid)) return;
    if (isTrialMode()) {
      log('В демо удаление сообщений отключено.', 'system');
      return;
    }
    try {
      await apiRequest('/api/delete_message', { method: 'POST', body: JSON.stringify({ msg_id: mid }) });
      const idStr = String(mid);
      if (msgElements[idStr]) {
        msgElements[idStr].remove();
        delete msgElements[idStr];
      }
      log(t('logDeleted') + msgId, 'system');
    } catch (e) {
      log(t('logError') + e.message, 'error');
    }
  }
  function updateMsgStatus(msgId, text, color) {
    const el = msgElements[msgId];
    if (!el) return;
    const st = el.querySelector('.msg-status');
    if (!st) return;
    const isPartner = el.classList.contains('partner');
    const waitingT = t('msgStatusWaiting');
    if (text === waitingT && isPartner) {
      st.textContent = '';
      st.style.display = 'none';
      return;
    }
    st.style.display = '';
    st.textContent = text;
    st.style.color = color;
    if (text === waitingT) {
      el.dataset.vfMsgStatus = 'recognized';
      el.classList.add('msg-awaiting-voice');
    } else if (text === t('msgStatusVoicing')) {
      el.dataset.vfMsgStatus = 'playing';
      el.classList.remove('msg-awaiting-voice');
    } else if (text === t('msgStatusDone')) {
      el.dataset.vfMsgStatus = 'done';
      el.classList.remove('msg-awaiting-voice');
    }
    syncMsgPlayButton(el);
  }
  function updateMessageFromHistory(res) {
    const el = msgElements[res.msg_id];
    if (!el) return;
    el.classList.remove('msg-awaiting-voice');
    const input = el.querySelector('.msg-input');
    const statusEl = el.querySelector('.msg-status');
    const delBtn = el.querySelector('.msg-delete');
    if (input) {
      const s = document.createElement('span');
      s.style.color = 'white';
      s.textContent = input.value;
      input.replaceWith(s);
    }
    if (delBtn) delBtn.remove();
    if (statusEl) {
      statusEl.style.display = '';
      statusEl.textContent = t('msgStatusDone');
      statusEl.style.color = '#22c55e';
    }
    el.dataset.vfMsgStatus = 'done';
    syncMsgPlayButton(el);
  }
  function scrollToTop(column) { if (column) column.scrollTo({ top: 0, behavior: 'smooth' }); }

  const AI_ERR_MAX_LEN = 2500;

  function showAiSuggestionsError(suggestionsList, title, detail) {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ai-suggestions-error';
    const h = document.createElement('div');
    h.className = 'ai-suggestions-error-title';
    h.textContent = title;
    const pre = document.createElement('pre');
    pre.className = 'ai-suggestions-error-detail';
    const text = (detail == null ? '' : String(detail)).slice(0, AI_ERR_MAX_LEN);
    pre.textContent = text || '(нет текста ошибки)';
    wrap.appendChild(h);
    wrap.appendChild(pre);
    suggestionsList.appendChild(wrap);
  }

  /** Извлекает массив строк подсказок из ответа модели (JSON-массив, объект, текст с мусором). */
  function parseSuggestionsFromModelContent(content) {
    if (!content || typeof content !== 'string') return [];
    const stripped = content.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();

    function coerceToStrings(parsed) {
      if (!parsed) return [];
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object') {
              const v = item.text ?? item.suggestion ?? item.content ?? item.message ?? item.reply;
              if (typeof v === 'string') return v.trim();
            }
            return '';
          })
          .filter(Boolean);
      }
      if (typeof parsed === 'object') {
        for (const k of ['suggestions', 'items', 'responses', 'answers', 'data', 'hints']) {
          if (Array.isArray(parsed[k])) return coerceToStrings(parsed[k]);
        }
      }
      return [];
    }

    function tryParse(str) {
      try {
        return coerceToStrings(JSON.parse(str));
      } catch {
        return [];
      }
    }

    let out = tryParse(stripped);
    if (out.length) return out;

    const start = stripped.indexOf('[');
    if (start >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let pos = start; pos < stripped.length; pos++) {
        const c = stripped[pos];
        if (esc) {
          esc = false;
          continue;
        }
        if (inStr) {
          if (c === '\\') esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') {
          inStr = true;
          continue;
        }
        if (c === '[') depth++;
        else if (c === ']') {
          depth--;
          if (depth === 0) {
            out = tryParse(stripped.slice(start, pos + 1));
            if (out.length) return out;
            break;
          }
        }
      }
    }

    return stripped
      .split('\n')
      .map(l => l.trim().replace(/^[-*•\d.]+\s*/, '').replace(/^["']|["']$/g, ''))
      .filter(l => l.length > 5);
  }

  function normalizeSuggestionText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[.,!?;:()[\]{}"'`~@#$%^&*_+=<>\\/|-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function suggestionTooSimilar(a, b) {
    const ca = normalizeSuggestionText(a);
    const cb = normalizeSuggestionText(b);
    if (!ca || !cb) return true;
    if (ca === cb) return true;
    if ((ca.startsWith(cb) || cb.startsWith(ca)) && Math.abs(ca.length - cb.length) < 14) return true;
    if (ca.slice(0, 24) === cb.slice(0, 24) && Math.abs(ca.length - cb.length) < 16) return true;
    const ta = new Set(ca.split(' ').filter(Boolean));
    const tb = new Set(cb.split(' ').filter(Boolean));
    if (!ta.size || !tb.size) return true;
    let inter = 0;
    ta.forEach((w) => { if (tb.has(w)) inter += 1; });
    const union = ta.size + tb.size - inter;
    const jaccard = union > 0 ? inter / union : 1;
    return jaccard >= 0.82;
  }

  function normalizeSuggestionVariants(list, maxCount = 5, opts) {
    const uiLang = String(state.userSpeakLang || '').toLowerCase().slice(0, 2);
    const allowLatinInRu = !!(opts && opts.allowLatinInRu);
    const sourceText = opts && opts.sourceText != null ? String(opts.sourceText) : '';
    const keepByLang = (text) => {
      if (opts && opts.skipLangFilter) return true;
      const s = String(text || '').trim();
      if (!s) return false;
      if (uiLang !== 'ru') return true;
      const hasCyr = /[А-Яа-яЁё]/.test(s);
      const hasLatin = /[A-Za-z]/.test(s);
      if (allowLatinInRu) return hasCyr;
      return hasCyr && !hasLatin;
    };
    const src = Array.isArray(list) ? list : [];
    const out = [];
    for (const item of src) {
      const s = String(item || '').trim();
      if (s.length < 4) continue;
      if (!keepByLang(s)) continue;
      if (sourceText && suggestionTooSimilar(s, sourceText)) continue;
      if (out.some((x) => suggestionTooSimilar(x, s))) continue;
      out.push(s);
      if (out.length >= maxCount) break;
    }
    return out;
  }

  function extractTemplateCoreSuggestion(s) {
    const raw = String(s || '').trim();
    if (!raw) return '';
    const m =
      raw.match(/[«"]([^«»"]+)[»"]/u) ||
      raw.match(/(?:имелось в виду|вы хотели сказать)\s*:?\s*(.+)$/iu);
    return m && m[1] ? String(m[1]).trim().replace(/[.?!]+$/u, '') : '';
  }

  const PHONETIC_STT_WORD_ALTS = {
    яблочный: ['я отлично', 'отлично', 'я отличная', 'всё отлично'],
    яблочная: ['я отлично', 'отлично', 'я отличная'],
    яблочное: ['я отлично', 'отлично'],
    яблочные: ['я отлично', 'отлично'],
    яблоко: ['я отлично', 'отлично'],
    яблока: ['я отлично'],
    отличный: ['отлично', 'я отлично'],
    отличная: ['отлично', 'я отлично'],
    бизнес: ['бизнесом', 'бизнеса'],
    бизнесом: ['бизнес', 'бизнеса'],
    бизнеса: ['бизнес', 'бизнесом'],
    сколько: ['как', 'что'],
    что: ['как', 'чё'],
    чё: ['что', 'как'],
    тут: ['ты'],
    ты: ['тут'],
  };

  const PHONETIC_STT_PHRASE_RULES = [
    {
      re: /^привет[,.!?\s]+(?:я\s+)?(?:отличн|яблочн)\w*(?:\s+как\s+ты)?/iu,
      variants: [
        'Привет! Я отлично, как ты',
        'Привет, я отлично, как ты',
        'Привет, отлично, как ты',
        'Привет, у меня всё отлично, как ты',
        'Привет! Как ты',
      ],
    },
    {
      re: /привет\s+яблочн\w*\s+как\s+ты/iu,
      variants: [
        'Привет, я отлично, как ты',
        'Привет! Я отлично, как ты',
        'Привет, отлично, как ты',
        'Привет, у меня всё отлично, как ты',
      ],
    },
    {
      re: /как\s+дела\s+с\s+(\S+)/iu,
      build(m) {
        const w = m[1];
        return [
          `Как дела с ${w}?`,
          `Как идут дела с ${w}?`,
          `Как у нас дела с ${w}?`,
        ];
      },
    },
  ];

  function buildPhoneticSttVariants(text, maxCount = 5, normOpts) {
    const src = String(text || '').trim().replace(/[.?!]+$/u, '');
    if (!src) return [];
    const variants = [];
    const push = (s) => {
      const t = String(s || '').trim();
      if (!t || suggestionTooSimilar(t, src)) return;
      variants.push(/[?？]$/.test(t) ? t : `${t}?`);
    };

    for (const rule of PHONETIC_STT_PHRASE_RULES) {
      const m = src.match(rule.re);
      if (!m) continue;
      const list = rule.build ? rule.build(m) : rule.variants;
      (list || []).forEach(push);
    }

    const words = src.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += 1) {
      const key = words[i].toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
      const alts = PHONETIC_STT_WORD_ALTS[key];
      if (!alts) continue;
      for (const alt of alts) {
        const altParts = alt.split(/\s+/);
        push(words.slice(0, i).concat(altParts).concat(words.slice(i + 1)).join(' '));
      }
    }

    if (/^привет\b/iu.test(src) && /\bкак\s+ты\b/iu.test(src)) {
      let mid = src.replace(/^привет[,.!?\s]+/iu, '').replace(/\s+как\s+ты.*$/iu, '').trim();
      if (/яблочн/iu.test(mid) || mid.length < 4) {
        push('Привет, я отлично, как ты');
        push('Привет, отлично, как ты');
        push('Привет, у меня всё отлично, как ты');
      }
    }

    if (/^привет\b/iu.test(src) && /\b(?:отличн|яблочн)\w*\b/iu.test(src) && !/\bкак\s+ты\b/iu.test(src)) {
      push('Привет! Я отлично, как ты');
      push('Привет, я отлично, как ты');
      push('Привет, отлично, как ты');
      push('Привет, у меня всё отлично, как ты');
    }

    return normalizeSuggestionVariants(variants, maxCount, { ...normOpts, sourceText: src });
  }

  function buildConsonantVariants(core, maxCount = 5, normOpts) {
    const c = String(core || '').trim().replace(/[.?!]+$/u, '').replace(/\s+/g, ' ');
    if (!c) return [];
    const variants = [];
    const push = (s) => { if (s) variants.push(s); };
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

    push(`${c}?`);

    const parts = c.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const tail = parts.slice(1).join(', ');
      push(`${first}, ${tail}?`);
      push(`${cap(tail)}, ${first.toLowerCase()}?`);
      push(`${first}. ${cap(tail)}?`);
      push(`${first} — ${tail}?`);
      push(`${tail}, ${first.toLowerCase()}?`);
    } else {
      const words = c.split(/\s+/).filter(Boolean);
      if (words.length >= 4) {
        push(`${words.slice(1).join(' ')} ${words[0].toLowerCase()}?`);
        push(`${words[0]} ${words.slice(2).join(' ')} ${words[1].toLowerCase()}?`);
        push(`${words.slice(0, -1).join(' ')}, ${words[words.length - 1].toLowerCase()}?`);
        push(`${words[words.length - 1]} ${words.slice(0, -1).join(' ').toLowerCase()}?`);
      }
    }

    return normalizeSuggestionVariants(variants, maxCount, normOpts);
  }

  function extractAudioAlternativePhrases(audioMetadata, maxCount = 5) {
    if (!audioMetadata || !Array.isArray(audioMetadata.alternatives)) return [];
    const out = [];
    for (const a of audioMetadata.alternatives) {
      const s = String(a || '').trim();
      if (s.length < 4) continue;
      out.push(/[?]$/.test(s) ? s : `${s}?`);
      if (out.length >= maxCount) break;
    }
    return normalizeSuggestionVariants(out, maxCount);
  }

  function buildStrictSameWordsVariants(text, maxCount = 5, normOpts) {
    const src = String(text || '').trim().replace(/[.?!]+$/u, '');
    if (!src) return [];
    const words = src.split(/\s+/).filter(Boolean);
    const variants = [];
    const push = (s) => { if (s) variants.push(/[?]$/.test(s) ? s : `${s}?`); };
    push(src);
    if (words.length === 2) {
      push(`${words[1]} ${words[0]}`);
      push(words[0]);
      push(words[1]);
    } else if (words.length === 3) {
      const [w1, w2, w3] = words;
      push(`${w1} ${w3} ${w2}`);
      push(`${w2} ${w1} ${w3}`);
      push(`${w2} ${w3}`);
      push(`${w3} ${w2}`);
      push(`${w3} ${w1} ${w2}`);
      push(`${w1} ${w2}`);
      push(`${w1} ${w3}`);
    } else if (words.length >= 4) {
      push(words.slice(1).concat(words[0]).join(' '));
      push(words.slice().reverse().join(' '));
      push(words.slice(0, -1).join(' '));
      push(words.slice(1).join(' '));
    }
    if (words.length >= 1) {
      const first = words[0].toLowerCase();
      const firstMap = {
        'сколько': ['что', 'чё'],
        'что': ['чё', 'сколько'],
        'как': ['чё'],
        'ты': ['тут'],
        'тут': ['ты'],
      };
      const repl = firstMap[first] || [];
      for (const r of repl) push([r].concat(words.slice(1)).join(' '));
    }
    return normalizeSuggestionVariants(variants, maxCount, normOpts);
  }

  function coerceTemplateSuggestionsToConsonant(list, sourceText, maxCount = 5) {
    const normalized = normalizeSuggestionVariants(list, Math.max(10, maxCount));
    if (!normalized.length) return [];
    const templateHits = normalized.filter((s) => /имелось в виду|вы хотели сказать/iu.test(String(s)));
    const sourceCore = String(sourceText || '').trim().replace(/[.?!]+$/u, '');
    const coreFromTemplate = extractTemplateCoreSuggestion(templateHits[0] || '');
    const core = coreFromTemplate || sourceCore;
    if (!templateHits.length || !core) return normalizeSuggestionVariants(normalized, maxCount);
    const cleaned = normalized.filter((s) => !/имелось в виду|вы хотели сказать/iu.test(String(s)));
    const rebuilt = buildConsonantVariants(core, maxCount);
    return normalizeSuggestionVariants(rebuilt.concat(cleaned), maxCount);
  }

  function partnerPhraseFromMessage(msg) {
    if (!msg) return '';
    const orig = String(msg.original || '').trim();
    const tr = String(msg.translated || '').trim();
    return orig || tr;
  }

  /** Контекст для подсказок: классификация по оригиналу + переводу, API получает оба. */
  function partnerHintContextFromMessage(msg) {
    const orig = String(msg?.original || '').trim();
    const tr = String(msg?.translated || '').trim();
    const display = orig || tr;
    const classifyBlob = [tr, orig].filter(Boolean).join('\n');
    let apiPhrase = display;
    if (orig && tr && tr !== orig) {
      apiPhrase = `Реплика собеседника: «${orig}»\nПеревод / смысл: «${tr}»`;
    }
    return { display, classifyBlob, apiPhrase, original: orig, translation: tr };
  }

  function findLatestPartnerMessage(messages) {
    let best = null;
    let bestTs = -1;
    (messages || []).forEach((m) => {
      if (!m || m.speaker !== 'partner') return;
      const ts = Number(m.timestamp) || 0;
      if (!best || ts >= bestTs) {
        bestTs = ts;
        best = m;
      }
    });
    return best;
  }

  const PARTNER_GREETING_HINT_RE = /(?:^|[\s!?,.])(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up|nice to meet|привет|здравствуй|добрый день|доброе утро|добрый вечер|рад знакомству|как дела|как у вас|как настроение|bonjour|bonsoir|salut|salud|comment vas|comment allez|ça va|ca va|mont a ra|deoc'h|hallo|guten tag|guten morgen|wie geht|hola|buenos días|buenas tardes|como est[aá]s|ciao|buongiorno|come stai|olá|bom dia|como vai)(?:$|[\s!?,.])/i;

  const PARTNER_WELLNESS_QUESTION_RE = /\b(how are you|how's it going|how do you do|comment vas|comment allez|wie geht|come stai|como est|mont a ra|как дела|как у вас|как настроение|ca va|ça va)\b/i;

  const PARTNER_INTRO_REQUEST_RE = /about yourself|about you|tell (?:us |me )?(?:a little |briefly )?about|introduce yourself|who are you|walk me through your (?:background|experience)|share your background|расскаж\w*(?:те|ь)?\s+(?:мне\s+|нам\s+|пожалуйста\s+)?(?:немного\s+|кратко\s+)?о\s+себе|представ\w*(?:ьтесь|ьте|ление)|коротко\s+о\s+себе|parlez[- ]?(?:moi\s+)?de vous|présentez[- ]?vous|erzählen\s+Sie\s+(?:etwas\s+)?über\s+sich|stellen\s+Sie\s+sich\s+vor|cuéntenos\s+sobre\s+usted|自己紹介|介绍一下|自我介绍/i;

  const GENERIC_TRIAL_HINT_RE = /хороший вопрос|разобрать по шагам|уточним детали|с нюансами|сформулирую мысль|понял\(а\) вас, спасибо|продолжим в том же духе|важный момент|вижу вашу мысль|обсудить это чуть подробнее|дела идут хорошо, есть прогресс/i;

  const GREETING_STYLE_HINT_RE = /как дела|как настроение|у меня всё хорошо|how are you|how's your day|nice to meet you, how/i;

  function classifyPartnerPhraseForHints(partnerPhrase) {
    const raw = String(partnerPhrase || '').trim();
    const p = raw.toLowerCase();
    if (!p) return 'general';
    if (PARTNER_INTRO_REQUEST_RE.test(p) || PARTNER_INTRO_REQUEST_RE.test(raw)) return 'intro';
    if (PARTNER_GREETING_HINT_RE.test(p) || PARTNER_GREETING_HINT_RE.test(` ${p} `)) return 'greeting';
    if (PARTNER_WELLNESS_QUESTION_RE.test(p)) return 'greeting';
    if (/business|бизнес|project|проект|negotiat|переговор|deal|сделк|our (work|project)|дела с/.test(p)) return 'business';
    const lines = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (lines.some((line) => PARTNER_WELLNESS_QUESTION_RE.test(line) || PARTNER_GREETING_HINT_RE.test(line))) {
      return 'greeting';
    }
    if (/[?？]\s*$/.test(p) && !PARTNER_WELLNESS_QUESTION_RE.test(p)) {
      if (/^(what|why|when|where|who|which|что|где|когда|почему|зачем)\b/i.test(p)) return 'question';
      if (!/^(how|как)\b/i.test(p)) return 'question';
    }
    if (/^(what|why|when|where|who|which|что|где|когда|почему|зачем)\b/i.test(p)) return 'question';
    if (/^(how|как)\b/i.test(p) && !PARTNER_WELLNESS_QUESTION_RE.test(p)) return 'question';
    return 'general';
  }

  function isGreetingPartnerPhrase(partnerPhrase) {
    return classifyPartnerPhraseForHints(partnerPhrase) === 'greeting';
  }

  function isBusinessPartnerPhrase(partnerPhrase) {
    return classifyPartnerPhraseForHints(partnerPhrase) === 'business';
  }

  function isQuestionPartnerPhrase(partnerPhrase) {
    return classifyPartnerPhraseForHints(partnerPhrase) === 'question';
  }

  function trialHintsLookGeneric(suggestions) {
    if (!Array.isArray(suggestions) || !suggestions.length) return true;
    return GENERIC_TRIAL_HINT_RE.test(suggestions.join(' '));
  }

  function trialHintsLookLikeGreetingMismatch(partnerPhrase, suggestions) {
    if (classifyPartnerPhraseForHints(partnerPhrase) !== 'intro') return false;
    if (!Array.isArray(suggestions) || !suggestions.length) return false;
    return GREETING_STYLE_HINT_RE.test(suggestions.join(' '));
  }

  function contextualDemoReplyFallbacks(partnerPhrase) {
    const blob = String(partnerPhrase || '').toLowerCase();
    const kind = classifyPartnerPhraseForHints(partnerPhrase);
    if (
      /\b(strength|strong side|сильн\w*\s+сторон|bring to the team|в команду|что вы принес)\b/i.test(
        blob
      )
    ) {
      return [
        'Сильная сторона — коммуникация: умею ясно доносить решения и согласовывать ожидания.',
        'Хорошо работаю в команде: беру ответственность за задачу и поддерживаю коллег.',
        'Принесу в команду системность — люблю наводить порядок в процессах.',
        'Умею быстро разбираться в новых темах и доводить задачи до результата.',
        'Сильный навык — аналитика: смотрю на данные, прежде чем предлагать решение.',
      ];
    }
    if (/\b(why do you want|why.*work with|почему.*работать.*у нас)\b/i.test(blob)) {
      return [
        'Хочу работать у вас из‑за продукта и культуры — вижу, куда могу принести пользу.',
        'Мне близка ваша миссия, и роль совпадает с тем, чем занимался последние годы.',
        'Интересны задачи и масштаб — хочу расти вместе с командой.',
        'Выбрал вас, потому что ценю подход к качеству и открытую обратную связь.',
        'Готов вкладываться: мотивация — сильная команда и понятные цели.',
      ];
    }
    if (/\b(important|priority|приоритет|важн|главн|right now|сейчас важн)\b/.test(blob)) {
      return [
        'Сейчас для меня важнее всего сроки и прозрачность по следующим шагам.',
        'На первом месте — качество результата, на втором — скорость согласований.',
        'Главное — удержать договорённости по проекту и не потерять темп.',
        'Приоритет — закрыть открытые вопросы по бизнесу и зафиксировать план.',
        'Важнее всего сейчас — понять ваши ожидания и согласовать критерии успеха.',
      ];
    }
    if (kind === 'intro') {
      return [
        'Добрый день! Кратко о себе: я …, последние годы занимаюсь …',
        'Спасибо за вопрос. По опыту — … лет в …, сейчас отвечаю за …',
        'Рад(а) познакомиться! Я работаю в …, сильные стороны — …',
        'С удовольствием: начну с роли — …, дальше ключевые проекты …',
        'Здравствуйте! В команде я …, недавно завершил(а) …',
      ];
    }
    if (kind === 'greeting') {
      return [
        'Привет! Рад(а) вас слышать, у меня всё хорошо, спасибо.',
        'Здравствуйте! Отлично, спасибо. А у вас как дела?',
        'Привет! Всё отлично, готов(а) продолжить разговор.',
        'Добрый день! Спасибо, у меня всё в порядке.',
        'Приветствую! Рад(а) знакомству, как настроение?',
      ];
    }
    if (kind === 'business') {
      return [
        'Дела идут хорошо, есть прогресс по ключевым задачам.',
        'В целом стабильно, сейчас фокусируемся на приоритетах.',
        'Пока по плану: растём и укрепляем процессы.',
        'Есть хорошая динамика, но хочу согласовать сроки на квартал.',
        'Бизнес движется уверенно, готов(а) обсудить детали.',
      ];
    }
    if (kind === 'question') {
      return [
        'Я бы выделил(а) два момента: сроки и ожидаемый результат.',
        'Для меня ключевое — прозрачная коммуникация и чёткие договорённости.',
        'Сейчас важнее закрыть открытые задачи и согласовать следующий шаг.',
        'Могу коротко описать, как вижу приоритеты по этому вопросу.',
        'Предлагаю начать с главного: что для вас критично в ближайшие недели?',
      ];
    }
    return [
      'Понял(а), спасибо — готов(а) ответить по существу.',
      'Хорошо, давайте продолжим с учётом того, что вы сказали.',
      'Согласен(на), предлагаю уточнить пару деталей.',
      'Да, вижу вашу мысль — могу развернуть ответ.',
      'Спасибо, могу добавить свою позицию по этому пункту.',
    ];
  }

  function queueAiSuggestionsForPartnerMessage(msg, delayMs) {
    if (!msg || !state.aiEnabled || isAiAssistantLocked()) return;
    const ctx = partnerHintContextFromMessage(msg);
    if (!ctx.display && !ctx.classifyBlob) return;
    const msgId = msg.id;
    const gen = ++state._aiSuggestionsGen;
    const wait = typeof delayMs === 'number' ? delayMs : 350;
    setTimeout(() => {
      if (gen !== state._aiSuggestionsGen) return;
      state.lastPartnerPhrase = ctx.display;
      state.lastPartnerMsgId = msgId;
      void generateAiSuggestions(ctx, gen);
    }, wait);
  }

  function syncAiSuggestionsToLatestPartner(messages) {
    const latest = findLatestPartnerMessage(messages);
    if (!latest) return;
    const ctx = partnerHintContextFromMessage(latest);
    const msgId = latest.id;
    if (!ctx.display && !ctx.classifyBlob) return;
    if (msgId === state.lastPartnerMsgId && ctx.display === state.lastPartnerPhrase) return;
    queueAiSuggestionsForPartnerMessage(latest, 200);
  }

  // 🔥 Функция: Генерация подсказок через AITunnel API (просто и надёжно)
  async function generateAiSuggestions(partnerPhraseOrCtx, requestGen) {
    if (!state.aiEnabled || isAiAssistantLocked()) return;
    const gen = typeof requestGen === 'number' ? requestGen : ++state._aiSuggestionsGen;
    if (gen !== state._aiSuggestionsGen) return;
    const hintCtx = typeof partnerPhraseOrCtx === 'object' && partnerPhraseOrCtx
      ? partnerPhraseOrCtx
      : {
          display: String(partnerPhraseOrCtx || '').trim(),
          classifyBlob: String(partnerPhraseOrCtx || '').trim(),
          apiPhrase: String(partnerPhraseOrCtx || '').trim(),
        };
    console.log('🤖 generateAiSuggestions:', hintCtx.display);

    const phraseDisplay = elements.partnerPhraseDisplay;
    const suggestionsList = elements.aiSuggestionsList;
    const loadingDiv = elements.aiSuggestionsLoading;
    
    if (!phraseDisplay || !suggestionsList) {
      console.error('❌ Не найдены элементы панели');
      return;
    }
    
    phraseDisplay.textContent = hintCtx.display || '';
    phraseDisplay.title = '';
    
    suggestionsList.innerHTML = '';
    loadingDiv.style.display = 'block';
    
    const classifyBlob = String(hintCtx.classifyBlob || hintCtx.display || '').trim();
    const apiPhrase = String(hintCtx.apiPhrase || classifyBlob).trim();
    const demoFallbackSuggestions = contextualDemoReplyFallbacks(classifyBlob);

    try {
      if (!classifyBlob) {
        loadingDiv.style.display = 'none';
        showAiSuggestionsError(suggestionsList, 'ℹ️ Подсказки недоступны', 'Нет реплики собеседника для генерации подсказок.');
        return;
      }
      if (isTrialMode() && state.trialSessionId) {
        let suggestions;
        const hintOrig = String(hintCtx.original || '').trim();
        const hintTr = String(hintCtx.translation || '').trim();
        const r = await fetch(`${CONFIG.apiBaseUrl}/api/trial/reply-hints`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            session_id: state.trialSessionId,
            partner_phrase: hintOrig || hintTr || apiPhrase,
            partner_translation: hintTr && hintTr !== hintOrig ? hintTr : '',
          })
        });
        const data = await r.json().catch(() => ({}));
        if (gen !== state._aiSuggestionsGen) return;
        suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
        suggestions = normalizeSuggestionVariants(suggestions, 5);
        const hintSource = String(data.source || '').trim();
        if (!r.ok || !suggestions.length) {
          suggestions = normalizeSuggestionVariants(demoFallbackSuggestions, 5);
          console.warn('trial reply-hints: API empty, local fallback', r.status);
        } else {
          console.info(
            `[TalkPilot демо] Подсказки ответов (${hintSource || 'ai'}):`,
            hintCtx.display.slice(0, 80)
          );
        }
        phraseDisplay.textContent = hintCtx.display;
        renderAiSuggestions(suggestions, suggestionsList);
        loadingDiv.style.display = 'none';
        return;
      }
      // 🔥 Проверяем кэш
      const cacheKey = `${classifyBlob}_${state.aiTopic}`;
      if (state.aiSuggestionsCache.has(cacheKey)) {
        if (gen !== state._aiSuggestionsGen) return;
        phraseDisplay.textContent = hintCtx.display;
        renderAiSuggestions(state.aiSuggestionsCache.get(cacheKey), suggestionsList);
        loadingDiv.style.display = 'none';
        return;
      }
      
      // 🔥 Формируем запрос (как backend для распознавания)
      const topic = state.aiTopic && state.aiTopic !== 'general conversation' 
        ? `Topic: "${state.aiTopic}". ` : '';
      
      const prompt = `${topic}Partner said: "${apiPhrase}". Give exactly 5 short reply options in Russian (1-2 sentences each) that directly answer this specific utterance. If it is a greeting or "how are you", reply with a warm greeting and how you are — never use filler like "good question, let me think". Options must differ in wording but stay on-topic. Output ONLY a JSON array of 5 strings, no markdown.`;

      // 🔥 Используем ту же модель что backend для распознавания
      const response = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AITUNNEL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',  // 🔥 Используем эту модель (работает в backend)
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 900
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (gen !== state._aiSuggestionsGen) return;
      const content = data.choices?.[0]?.message?.content?.trim();
      
      if (!content) throw new Error('Empty response');
      
      console.log('📦 Ответ:', content.substring(0, 120));
      
      let suggestions = parseSuggestionsFromModelContent(content);
      suggestions = normalizeSuggestionVariants(suggestions, 5);
      
      if (suggestions.length === 0) {
        const snippet = content.length > 500 ? content.slice(0, 500) + '…' : content;
        throw new Error(`Не удалось получить подсказки (пустой или неподходящий ответ).\n--- Ответ модели ---\n${snippet}`);
      }
      
      // 🔥 Кэш
      state.aiSuggestionsCache.set(cacheKey, suggestions);
      if (state.aiSuggestionsCache.size > 20) {
        state.aiSuggestionsCache.delete(state.aiSuggestionsCache.keys().next().value);
      }
      
      if (gen !== state._aiSuggestionsGen) return;
      phraseDisplay.textContent = hintCtx.display;
      renderAiSuggestions(suggestions, suggestionsList);
      loadingDiv.style.display = 'none';
      
    } catch (error) {
      if (gen !== state._aiSuggestionsGen) return;
      const msg = error?.message || String(error);
      console.error('❌ generateAiSuggestions:', error);
      loadingDiv.style.display = 'none';

      if (isTrialMode() && state.trialSessionId && classifyBlob) {
        phraseDisplay.textContent = hintCtx.display;
        renderAiSuggestions(normalizeSuggestionVariants(demoFallbackSuggestions, 5), suggestionsList);
        return;
      }

      if (msg.includes('429')) {
        showAiSuggestionsError(suggestionsList, '⚠️ Лимит запросов', 'Подождите около минуты и попробуйте снова.\n\n' + msg);
      } else if (msg.includes('401') || msg.includes('403')) {
        showAiSuggestionsError(suggestionsList, '⚠️ Ошибка авторизации', 'Проверьте AITUNNEL_API_KEY в настройках.\n\n' + msg);
      } else {
        showAiSuggestionsError(suggestionsList, '⚠️ Ошибка подсказок', msg);
      }
    }
  }

  function renderAiSuggestions(suggestions, container, opts) {
    if (!container || !suggestions || suggestions.length === 0) return;
    container.innerHTML = '';

    normalizeSuggestionVariants(suggestions, 5, opts).forEach((suggestion, index) => {
      const div = document.createElement('div');
      div.className = 'ai-suggestion-item';
      const num = document.createElement('span');
      num.className = 'ai-suggestion-num';
      num.textContent = String(index + 1);
      const textSpan = document.createElement('span');
      textSpan.className = 'ai-suggestion-text';
      textSpan.textContent = typeof suggestion === 'string' ? suggestion : String(suggestion);
      const hint = document.createElement('span');
      hint.className = 'ai-suggestion-pick-hint';
      hint.textContent = '↩️';
      div.appendChild(num);
      div.appendChild(textSpan);
      div.appendChild(hint);
      
      div.onclick = () => {
        const text = typeof suggestion === 'string' ? suggestion : String(suggestion);
        if (!text.trim()) return;
        if (trialSuggestionPickLock || trialPhraseInFlight || trialTextSubmitLock || state.isProcessing) return;
        void (async () => {
          const ok = await submitAiSuggestionAsUserPhrase(text);
          if (!ok) return;
          div.classList.add('ai-suggestion-item--picked');
          setTimeout(() => div.classList.remove('ai-suggestion-item--picked'), 700);
          log(`✅ ${text}`, 'success');
        })();
      };
      
      div.onmouseenter = () => { 
        div.style.background = '#1e293b'; 
        div.style.borderColor = '#3b82f6'; 
        div.style.transform = 'translateX(4px)'; 
      };
      div.onmouseleave = () => { 
        div.style.background = '#0f172a'; 
        div.style.borderColor = '#334155'; 
        div.style.transform = 'translateX(0)'; 
      };
      
      container.appendChild(div);
    });
  }

  function sttEngineFromMessage(msg) {
    if (!msg) return '—';
    const eng = String(msg.stt_engine || '').trim();
    if (eng && eng !== '—' && eng !== 'unknown') return eng;
    const svc = String(msg.stt_service || '').trim();
    if (svc) return trialSttServiceConsoleLabel(svc);
    if (msg.stt_pro_used_vosk) return 'Vosk';
    let meta = msg.audio_metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch (e) { meta = null; }
    }
    const src = String((meta && meta.source) || '').toLowerCase();
    if (src.includes('aitunnel')) return 'AITunnel';
    if (src.includes('vosk')) return 'Vosk';
    return src || '—';
  }

  function logMessageSttToConsole(msg, isNew) {
    if (!msg || msg.speaker !== 'user') return;
    const engine = sttEngineFromMessage(msg);
    const text = String(msg.original || '').trim();
    const conf =
      msg.audio_metadata && msg.audio_metadata.confidence != null
        ? msg.audio_metadata.confidence
        : null;
    const tag = isNew ? 'новое' : 'обновление';
    console.log(
      `📝 STT [${engine}] (${tag}) id=${msg.id}: "${text.slice(0, 120)}${text.length > 120 ? '…' : ''}"` +
        (conf != null ? ` · conf=${conf}` : '') +
        (msg.stt_pro_used_vosk ? ' · Pro→Vosk fallback' : '')
    );
  }

  function syncChatColumnEmptyStates() {
    const userHas = !!elements.userMessages?.querySelector('.msg-bubble');
    const partnerHas = !!elements.partnerMessages?.querySelector('.msg-bubble');
    if (elements.userColumnEmpty) elements.userColumnEmpty.hidden = userHas;
    if (elements.partnerColumnEmpty) elements.partnerColumnEmpty.hidden = partnerHas;
  }

  function renderChat(messages) {
    if (!elements.userMessages || !elements.partnerMessages) {
      console.error('❌ Элементы чата не найдены');
      return;
    }
    
    if (typeModal) {
      return;
    }
    
    const currentIds = new Set(Object.keys(msgElements)); 
    const incomingIds = new Set(messages.map(m => String(m.id))); 
    
    // 🔥 Удаляем старые сообщения
    const trainingDemoUserId = String(TRAINING_DEMO_MSG_ID);
    const trainingDemoPartnerId = String(TRAINING_DEMO_PARTNER_MSG_ID);
    currentIds.forEach(function(id) { 
      if (trainingTour.preserveDemoInChat && id === trainingDemoUserId) return;
      if (trainingTour.preservePartnerDemoInChat && id === trainingDemoPartnerId) return;
      if (!incomingIds.has(id)) { 
        console.log('🗑️ Удаляем сообщение:', id);
        msgElements[id]?.remove(); 
        delete msgElements[id]; 
      } 
    }); 
    
    let newUser = false, newPartner = false; 
    let newMessages = [];
    
    // 🔥 Рендерим сообщения и собираем НОВЫЕ сообщения партнёра
    for (let i = messages.length - 1; i >= 0; i--) { 
      const msg = messages[i]; 
      const idStr = String(msg.id); 
      let el = msgElements[idStr]; 
      
      if (!el) { 
        el = createMessageElement(msg); 
        msgElements[idStr] = el; 
        const col = msg.speaker === 'user' ? elements.userMessages : elements.partnerMessages; 
        col.prepend(el); 
        // Иначе autoPlay и обновление статуса не срабатывают — updateMessageStatus вызывался только для уже существующих узлов
        updateMessageStatus(el, msg.status);
        if (msg.speaker === 'user') {
          newUser = true;
          logMessageSttToConsole(msg, true);
        } else {
          newPartner = true;
          newMessages.push(msg);  // 🔥 Сохраняем новое сообщение партнёра
        } 
      } else {
        updateMessageStatus(el, msg.status);
        if (msg.speaker === 'partner' || msg.speaker === 'user') {
          const tr = msg.translated != null ? String(msg.translated).trim() : '';
          const origTrim = String(msg.original || '').trim();
          let sub = el.querySelector('.msg-translated-sub');
          if (tr && tr !== origTrim) {
            if (!sub) {
              const content = el.querySelector('.msg-content');
              if (content) {
                sub = document.createElement('div');
                sub.className = 'msg-translated-sub';
                content.appendChild(sub);
              }
            }
            if (sub) sub.textContent = tr;
            if (msg.speaker === 'user') el.dataset.partnerTtsText = tr;
          } else if (sub) sub.remove();
          if (msg.speaker === 'user' && (!tr || tr === origTrim)) {
            delete el.dataset.partnerTtsText;
          }
        }
      } 
    } 
    
    syncAiSuggestionsToLatestPartner(messages);
    
    // 🔥 Авто-скролл
    if (newUser && elements.userMessages.scrollTop < 100) {
      scrollToTop(elements.userMessages); 
    }
    if (newPartner && elements.partnerMessages.scrollTop < 100) {
      scrollToTop(elements.partnerMessages); 
    }
    retryStuckAutoPlayInChat();
    syncChatColumnEmptyStates();
  }

  function escChatHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    if (msg.audio_base64 && msg.audio_base64.length < 150000) {
      div.dataset.audioBase64 = msg.audio_base64;
    } else if (msg.audio_base64) {
      console.warn('⚠️ Audio слишком большой для dataset:', msg.audio_base64.length, 'chars');
    }
    if (msg.audio_metadata) {
      try { div.dataset.audioMeta = JSON.stringify(msg.audio_metadata); } 
      catch (e) { console.warn('⚠️ Could not stringify audio_meta', e); }
    }
    const partnerCursor = !isUser ? 'cursor:pointer;' : '';
    const trRaw = msg.translated != null ? String(msg.translated).trim() : '';
    const origTrim = String(msg.original || '').trim();
    if (isUser && trRaw && trRaw !== origTrim) {
      div.dataset.partnerTtsText = trRaw;
    }
    const transSubHtml =
      !isUser && trRaw && trRaw !== origTrim
        ? `<div class="msg-translated-sub">${escChatHtml(trRaw)}</div>`
        : isUser && trRaw && trRaw !== origTrim
          ? `<div class="msg-translated-sub">${escChatHtml(trRaw)}</div>`
          : '';
    const statusSpanHtml = isUser
      ? `<span class="msg-status" style="font-weight:500;color:#eab308;">${t('msgStatusWaiting')}</span>`
      : `<span class="msg-status" style="display:none;font-weight:500;"></span>`;
    const sttProVoskNoteHtml = msg.stt_pro_used_vosk
      ? `<div class="msg-stt-pro-vosk" role="note" style="font-size:0.72rem;line-height:1.35;color:#fbbf24;margin:0.25rem 0 0;width:100%;max-width:90%;padding:0.4rem 0.6rem;background:rgba(0,0,0,0.2);border-radius:10px;border:1px solid rgba(251,191,36,0.35);">${escChatHtml(t('msgSttProVoskFallback'))}</div>`
      : '';
    div.innerHTML = `<div class="msg-content" style="background:${color};padding:0.8rem 1rem;border-radius:16px;display:flex;flex-direction:column;gap:0.4rem;${partnerCursor}${isEditable ? 'border:2px solid #facc15;' : ''}"><div style="display:flex;align-items:flex-start;gap:0.5rem;${isUser ? '' : 'flex-direction:row-reverse'};">${isEditable ? `<textarea class="msg-input" rows="1" spellcheck="true" style="flex:1;min-width:0;width:100%;min-height:2.4rem;max-height:14rem;resize:none;overflow-y:auto;background:transparent;border:none;color:white;font-size:1rem;outline:none;text-align:${isUser ? 'left' : 'right'};line-height:1.35;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-family:inherit;"></textarea>` : `<span class="msg-text" style="color:white;font-size:1rem;text-align:${isUser ? 'left' : 'right'};white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;min-width:0;">${escChatHtml(msg.original)}</span>`}${isEditable ? `<button class="msg-delete" type="button" style="flex-shrink:0;background:transparent;border:none;color:#f87171;cursor:pointer;font-size:1.2rem;line-height:1;padding:0.1rem 0 0 0.15rem;">×</button>` : ''}</div>${transSubHtml}</div>${sttProVoskNoteHtml}<div class="msg-meta" style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#94a3b8;${isUser ? '' : 'flex-direction:row-reverse'}">${statusSpanHtml}<span>${new Date(msg.timestamp * 1000).toLocaleTimeString()}</span></div>`;
    if (isEditable) {
      const ta = div.querySelector('textarea.msg-input');
      if (ta) {
        ta.value = msg.original == null ? '' : String(msg.original);
        const resizeTa = () => {
          ta.style.height = 'auto';
          ta.style.height = Math.min(224, Math.max(40, ta.scrollHeight)) + 'px';
        };
        ta.addEventListener('input', resizeTa);
        requestAnimationFrame(resizeTa);
      }
    }
    /* vfMsgStatus задаёт updateMessageStatus — иначе becameRecognized=false и автоплей не стартует */
    syncMsgPlayButton(div);
    if (!isUser) {
      div.title = t('partnerClickForSuggestions') || 'Нажмите на реплику — подсказки ответов';
    }
    return div; 
  }

  function removeTrainingDemoMessage() {
    const idStr = String(TRAINING_DEMO_MSG_ID);
    trainingTour.preserveDemoInChat = false;
    trainingTour.demoMessageEl = null;
    const el = msgElements[idStr] || document.getElementById('vfTrainingDemoBubble');
    if (el) {
      el.remove();
      delete msgElements[idStr];
    }
    syncChatColumnEmptyStates();
  }

  function ensureTrainingDemoPlayButton(el) {
    if (!el || !isUserMessageBubble(el)) return;
    let btn = el.querySelector('.msg-play-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'msg-play-btn';
      btn.setAttribute('data-i18n-title', 'msgPlayAria');
      btn.setAttribute('data-i18n-aria-label', 'msgPlayAria');
      const label = document.createElement('span');
      label.className = 'msg-play-btn-label';
      label.setAttribute('data-i18n', 'msgPlayBtn');
      label.textContent = t('msgPlayBtn');
      btn.appendChild(label);
      const meta = el.querySelector('.msg-meta');
      if (meta) meta.insertBefore(btn, meta.firstChild);
    }
    btn.title = t('msgPlayAria');
    btn.setAttribute('aria-label', t('msgPlayAria'));
    btn.disabled = false;
    btn.classList.remove('is-busy');
  }

  function ensureTrainingDemoDeleteButton(el) {
    if (!el || el.querySelector('.msg-delete')) return;
    const row = el.querySelector('.msg-content > div');
    if (!row) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg-delete';
    btn.setAttribute('aria-hidden', 'true');
    btn.tabIndex = -1;
    btn.textContent = '×';
    btn.style.cssText =
      'flex-shrink:0;background:transparent;border:none;color:#f87171;font-size:1.2rem;line-height:1;padding:0.1rem 0 0 0.15rem;pointer-events:none;';
    row.appendChild(btn);
  }

  function removeTrainingDemoPartnerMessage() {
    const idStr = String(TRAINING_DEMO_PARTNER_MSG_ID);
    trainingTour.preservePartnerDemoInChat = false;
    trainingTour.demoPartnerMessageEl = null;
    const el = msgElements[idStr] || document.getElementById('vfTrainingDemoPartnerBubble');
    if (el) {
      el.remove();
      delete msgElements[idStr];
    }
    if (elements.partnerPhraseDisplay && trainingTour.aiPanelForced) {
      elements.partnerPhraseDisplay.textContent = '';
    }
    syncChatColumnEmptyStates();
  }

  function insertTrainingDemoPartnerMessage() {
    if (!elements.partnerMessages) return null;
    removeTrainingDemoPartnerMessage();
    const partnerText = t('trainingDemoPartnerMessageText');
    const msg = {
      id: TRAINING_DEMO_PARTNER_MSG_ID,
      speaker: 'partner',
      status: 'done',
      original: partnerText,
      translated: t('trainingDemoPartnerMessageTranslated'),
      timestamp: Math.floor(Date.now() / 1000),
    };
    const el = createMessageElement(msg);
    el.id = 'vfTrainingDemoPartnerBubble';
    el.classList.add('vf-training-demo-bubble', 'vf-training-demo-partner-bubble');
    el.dataset.msgId = String(TRAINING_DEMO_PARTNER_MSG_ID);
    const idStr = String(TRAINING_DEMO_PARTNER_MSG_ID);
    msgElements[idStr] = el;
    elements.partnerMessages.prepend(el);
    syncChatColumnEmptyStates();
    trainingTour.demoPartnerMessageEl = el;
    trainingTour.preservePartnerDemoInChat = true;
    if (elements.partnerPhraseDisplay) {
      elements.partnerPhraseDisplay.textContent = partnerText;
    }
    return el;
  }

  function insertTrainingDemoMessage() {
    if (!elements.userMessages) return null;
    removeTrainingDemoMessage();
    const msg = {
      id: TRAINING_DEMO_MSG_ID,
      speaker: 'user',
      status: 'done',
      original: t('trainingDemoMessageText'),
      timestamp: Math.floor(Date.now() / 1000),
    };
    const el = createMessageElement(msg);
    el.id = 'vfTrainingDemoBubble';
    el.classList.add('vf-training-demo-bubble');
    el.dataset.msgId = String(TRAINING_DEMO_MSG_ID);
    const idStr = String(TRAINING_DEMO_MSG_ID);
    msgElements[idStr] = el;
    elements.userMessages.prepend(el);
    syncChatColumnEmptyStates();
    updateMessageStatus(el, 'done');
    trainingTour.demoMessageEl = el;
    trainingTour.preserveDemoInChat = true;
    ensureTrainingDemoDeleteButton(el);
    ensureTrainingDemoPlayButton(el);
    return el;
  }

  function showTrainingModalSuggestionsDemo() {
    fillTrainingModalSuggestions();
  }

  function showTrainingAiPanelDemo() {
    const panel = elements.aiSuggestionsPanel;
    const list = elements.aiSuggestionsList;
    const loading = elements.aiSuggestionsLoading;
    if (!panel || !list) return;
    insertTrainingDemoPartnerMessage();
    trainingTour.aiPanelForced = true;
    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    if (elements.mainWorkspace) elements.mainWorkspace.classList.add('suggestions-as-column');
    if (elements.resizerChatAi) {
      elements.resizerChatAi.style.display = '';
      elements.resizerChatAi.setAttribute('aria-hidden', 'false');
    }
    if (loading) loading.style.display = 'none';
    const normOpts = { skipLangFilter: true };
    const suggestions = normalizeSuggestionVariants(getTrainingDemoSuggestions(), 5, normOpts);
    renderAiSuggestions(suggestions, list, normOpts);
  }

  function openTrainingTypeModalForDemo() {
    const bubble = document.getElementById('vfTrainingDemoBubble');
    if (!bubble) return;
    if (typeModal) return;
    openTypeModal({ training: true });
    trainingTour.typeModalOpenedForTraining = !!typeModal;
    if (typeModal) {
      typeModal.classList.add('vf-training-type-modal');
      fillTrainingModalSuggestions();
    }
  }

  function queueAutoPlayForBubble(el, shouldQueue) {
    /* В демо озвучка пользователя только в trialSubmitUserText (с учётом autoPlay). */
    if (isTrialMode()) return;
    if (!shouldQueue || !el || !state.autoPlay || !isUserMessageBubble(el)) return;
    if (el.dataset.vfMsgStatus !== 'recognized') return;
    if (el.dataset.vfAutoPlayQueued === '1') return;
    const msgId = parseInt(el.dataset.msgId, 10);
    if (!msgId || isNaN(msgId)) return;
    el.dataset.vfAutoPlayQueued = '1';
    autoPlayVoiceChain = autoPlayVoiceChain
      .then(async () => {
        await new Promise((r) => setTimeout(r, 280));
        if (!state.autoPlay) return;
        if (!isUserMessageBubble(el)) return;
        if (el.dataset.vfMsgStatus !== 'recognized') return;
        unlockBrowserAudioForPlayback();
        const activeVoice = getActiveVoiceForPlayback();
        const raw =
          el.querySelector('.msg-input')?.value ||
          el.querySelector('.msg-text')?.textContent ||
          '';
        if (!activeVoice.startsWith('cloned:')) {
          await voiceStandardEdgeInBrowser(msgId, raw, activeVoice);
          await fetchChat();
          return;
        }
        const resp = await apiRequest('/api/voice', {
          method: 'POST',
          body: JSON.stringify(voiceApiPayload({ msg_id: msgId, voice: activeVoice })),
        });
        await applyVoiceMessageResult(resp, msgId);
      })
      .catch((e) => {
        delete el.dataset.vfAutoPlayQueued;
        console.warn('⚠️ Auto-play failed:', e);
        log(t('voicePlayFailed') + (e && e.message ? e.message : e), 'error');
      });
  }

  function retryStuckAutoPlayInChat() {
    if (isTrialMode() || !state.autoPlay) return;
    Object.keys(msgElements).forEach((id) => {
      const el = msgElements[id];
      if (!el || !isUserMessageBubble(el)) return;
      if (el.dataset.vfMsgStatus === 'recognized' && el.dataset.vfAutoPlayQueued !== '1') {
        queueAutoPlayForBubble(el, true);
      }
    });
  }

  function updateMessageStatus(el, status) {
    const prevStatus = el.dataset.vfMsgStatus || '';
    el.dataset.vfMsgStatus = status;
    const stEl = el.querySelector('.msg-status');
    if (!stEl) return;
    const isPartner = el.classList.contains('partner');
    const map = { recognized: {t: t('msgStatusWaiting'), c:'#eab308'}, playing: {t: t('msgStatusVoicing'), c:'#3b82f6'}, done: {t: t('msgStatusDone'), c:'#22c55e'} };
    let s = map[status] || map.recognized;
    if (isTrialMode() && !el.classList.contains('partner') && status === 'done' && !state.autoPlay) {
      s = { t: t('msgStatusSent'), c: '#94a3b8' };
    }
    if (status === 'recognized') el.classList.add('msg-awaiting-voice');
    else el.classList.remove('msg-awaiting-voice');
    if (isPartner && status === 'recognized') {
      stEl.textContent = '';
      stEl.style.display = 'none';
    } else {
      stEl.style.display = '';
      if (stEl.textContent !== s.t) stEl.textContent = s.t;
      stEl.style.color = s.c;
    }
    const becameRecognized = status === 'recognized' && prevStatus !== 'recognized';
    if (status !== 'recognized') delete el.dataset.vfAutoPlayQueued;
    queueAutoPlayForBubble(el, becameRecognized);
    syncMsgPlayButton(el);
  }
  
  function startChatPolling() { if (state.chatPollTimer) return; fetchChat(); state.chatPollTimer = setInterval(fetchChat, CONFIG.pollInterval); }
  function stopChatPolling() { if (state.chatPollTimer) { clearInterval(state.chatPollTimer); state.chatPollTimer = null; } }
  /** Обновление чата, пока идёт запись (Pro/AITunnel в фоне — без этого фразы не появятся сразу). */
  function syncRuntimeChatPolling() {
    if (state.isRunning && !isTrialMode()) startChatPolling();
    else stopChatPolling();
  }
  
  async function fetchChat() { 
    try {
      if (isTrialMode()) {
        const resp = await fetch(
          `${CONFIG.apiBaseUrl}/api/trial/chat-ui?session_id=${encodeURIComponent(state.trialSessionId)}`,
          { credentials: 'include', cache: 'no-store' }
        );
        if (!resp.ok) return;
        const data = await resp.json();
        renderChat(data.messages || []);
        return;
      }
      let url = `${CONFIG.apiBaseUrl}/api/chat`;
      const uid = state.userId;
      if (uid && !String(uid).startsWith('anonymous')) {
        url += (url.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(String(uid))}`;
      }
      const resp = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        headers: jsonAuthHeaders(),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      renderChat(data.messages || []); 
    } catch (e) { console.warn('⚠️ fetchChat error:', e); } 
  }

  /** После F5 Python часто остаётся в running — не показываем «Работает» без явного «Начать». */
  async function resetStaleServerSessionOnLoad() {
    if (isTrialMode()) return;
    if (state._staleResetDone) return;
    state._staleResetDone = true;
    state.isRunning = false;
    updateStatus();
    if (state._userSessionActive) return;
    try {
      let url = `${CONFIG.apiBaseUrl}/api/status`;
      const uid = state.userId;
      if (uid && !String(uid).startsWith('anonymous')) {
        const joiner = url.includes('?') ? '&' : '?';
        url += `${joiner}user_id=${encodeURIComponent(String(uid))}`;
      }
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) return;
      const d = await resp.json();
      if (!d.running || d.chat_busy_other_user) return;
      if (state._userSessionActive) return;
      await apiRequest('/api/control', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop', persist_conversation: false }),
      });
      log(t('logStaleSessionStopped') || '⏹️ Предыдущая сессия остановлена', 'system');
    } catch (e) {
      console.warn('resetStaleServerSessionOnLoad:', e);
    } finally {
      if (!state._userSessionActive) {
        state.isRunning = false;
        state.browserMicMode = false;
        stopBrowserMicRecognition(true);
        updateStatus();
      }
    }
  }

  function sendStopOnPageUnload() {
    if (isTrialMode()) return;
    try {
      let url = `${CONFIG.apiBaseUrl}/api/control`;
      const uid = state.userId;
      if (uid && !String(uid).startsWith('anonymous')) {
        url += (url.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(String(uid))}`;
      }
      const body = JSON.stringify({ action: 'stop' });
      const headers = { 'Content-Type': 'application/json', ...jsonAuthHeaders() };
      if (typeof fetch === 'function') {
        fetch(url, { method: 'POST', credentials: 'include', headers, body, keepalive: true }).catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }

  async function pollStatus() { 
    if (isTrialMode()) return;
    try { 
      const resp = await fetch(buildStatusUrl(), { credentials: 'include' });
      if (resp.ok) {
        const d = await resp.json();
        if (d.chat_busy_other_user) {
          if (!state._otherSessionWarned) {
            state._otherSessionWarned = true;
            log(
              '⚠️ На этом компьютере уже идёт сессия другого аккаунта. Закройте второй переводчик или нажмите «Стоп» там, затем «Начать» здесь.',
              'error'
            );
          }
          if (state.isRunning) {
            state.isRunning = false;
            updateStatus();
          }
        } else {
          state._otherSessionWarned = false;
        }
        if (state.isRunning !== d.running) {
          if (state.userRequestedStop) {
            // Явный «Стоп» пользователя важнее серверного/авто-recover: не жмём Start снова.
            state.isRunning = false;
            if (d.running) {
              void apiRequest('/api/control', {
                method: 'POST',
                body: JSON.stringify(
                  Object.assign({ action: 'stop', persist_conversation: true }, modalCloneControlPayload())
                ),
              }).catch(() => {});
            }
            updateStatus();
          } else if (!d.running && state.isRunning && state.browserMicMode) {
            const sinceStart = state._lastSessionStartAt ? Date.now() - state._lastSessionStartAt : 99999;
            if (sinceStart > 12000) {
              void ensureServerSessionRunning();
            }
          } else {
            state.isRunning = d.running;
            updateStatus();
          }
        }
        state.conferenceMode = d.conference_mode;
        state.vbCableReady = !!d.vb_cable_ready;
        if (typeof d.server_audio_available === 'boolean') {
          state.serverAudioAvailable = d.server_audio_available;
          if (state.isRunning && !d.server_audio_available && !state.browserMicMode) {
            if (isVoiceFlowDesktopClient()) {
              ensureDesktopUsesBrowserMicrophone();
            } else {
              state.browserMicMode = true;
              log(t('startMicBrowserMode'), 'system');
              if (!redirectUiToHttpsIfNeeded()) startBrowserMicRecognition();
            }
          }
        }
        state.unmuteMode = d.unmute_mode || false;
        if (state.isRunning && state.browserMicMode && state.conferenceMode) {
          if (!state._browserMicConferenceOffInFlight) {
            state._browserMicConferenceOffInFlight = true;
            log(t('browserMicConferenceAutoOff'), 'system');
            toggleConferenceMode(false).finally(() => {
              state._browserMicConferenceOffInFlight = false;
            });
          }
        }
        if (state.conferenceMode && !state.vbCableReady) {
          if (!state._conferenceCableWarned) {
            state._conferenceCableWarned = true;
            log(t('logConferenceNoCable'), 'error');
          }
        } else {
          state._conferenceCableWarned = false;
        }
        if (typeof d.ai_enabled === 'boolean') {
          if (d.ai_enabled && isAiAssistantLocked()) {
            state.aiEnabled = false;
            if (elements.aiToggle) elements.aiToggle.checked = false;
            schedulePostAiConfigDisabledQuiet();
            syncProRecognitionGateUi();
          } else {
            const serverOff = !d.ai_enabled;
            const clientOn = state.aiEnabled;
            const raceWindowMs = 3500;
            if (serverOff && clientOn && state._lastAiToggleAt && (Date.now() - state._lastAiToggleAt) < raceWindowMs) {
              /* старый ответ GET /status до применения POST /api/ai-config */
            } else {
              state.aiEnabled = d.ai_enabled;
            }
          }
        }
        if (d.ai_topic && d.ai_topic !== 'general conversation' && d.ai_topic !== state.aiTopic) { state.aiTopic = d.ai_topic; }
        if (elements.conferenceToggle) elements.conferenceToggle.checked = state.conferenceMode;
        if (elements.aiToggle) elements.aiToggle.checked = state.aiEnabled; 
        /* тема AI в модальном окне; state.aiTopic синхронизируется с сервером */
        if (d.user_language) state.userSpeakLang = d.user_language;
        if (d.partner_language) state.partnerSpeakLang = d.partner_language;
        if (d.recognition_mode === 'basic' || d.recognition_mode === 'pro') {
          let srvMode = d.recognition_mode;
          if (srvMode === 'pro' && isProRecognitionLocked()) {
            srvMode = 'basic';
            schedulePostRecognitionModeBasicQuiet();
          }
          if (isVoiceFlowDesktopClient() && state.recognitionMode === 'basic' && srvMode === 'pro') {
            srvMode = 'basic';
          }
          if (state.recognitionMode !== srvMode) {
            state.recognitionMode = srvMode;
            try { localStorage.setItem('voiceTranslator_recognitionMode', srvMode); } catch (e) { /* ignore */ }
            if (elements.modeBasicBtn && elements.modeProBtn) {
              elements.modeBasicBtn.classList.toggle('active', srvMode === 'basic');
              elements.modeProBtn.classList.toggle('active', srvMode === 'pro');
            }
            syncProRecognitionGateUi();
          }
        }
        if (typeof d.translation_paused === 'boolean' && elements.translationPauseToggle) {
          if (elements.translationPauseToggle.checked !== d.translation_paused) {
            state._syncTranslationPauseUi = true;
            elements.translationPauseToggle.checked = d.translation_paused;
            state.translationPaused = d.translation_paused;
            state._syncTranslationPauseUi = false;
          }
        }
        if (typeof d.phrase_silence_min === 'number' && typeof d.phrase_silence_max === 'number') {
          state.phraseSilenceMin = d.phrase_silence_min;
          state.phraseSilenceMax = d.phrase_silence_max;
        }
        if (typeof d.phrase_silence_sec === 'number') {
          state.phraseSilenceSec = d.phrase_silence_sec;
          if (!phraseSilenceInputFocused()) {
            updatePhraseSilenceUI(d.phrase_silence_sec);
          }
        }
        if (typeof d.mic_rms_threshold_min === 'number' && typeof d.mic_rms_threshold_max === 'number' && d.mic_rms_threshold_max > d.mic_rms_threshold_min) {
          state.micRmsThresholdMin = d.mic_rms_threshold_min;
          state.micRmsThresholdMax = d.mic_rms_threshold_max;
        }
        if (typeof d.mic_rms_threshold === 'number') {
          state.micRmsThreshold = d.mic_rms_threshold;
          if (document.activeElement !== elements.micRmsThresholdRange) {
            updateMicSensitivityUIFromServer(d.mic_rms_threshold);
          } else {
            updateMicSensitivityValueLabel(parseFloat(elements.micRmsThresholdRange.value));
          }
        }
        if (typeof d.user_tts_volume_min === 'number' && typeof d.user_tts_volume_max === 'number') {
          state.userTtsVolumeMin = d.user_tts_volume_min;
          state.userTtsVolumeMax = d.user_tts_volume_max;
          const rVol = elements.userTtsVolumeRange;
          if (rVol) {
            rVol.min = String(Math.round(d.user_tts_volume_min * 100));
            rVol.max = String(Math.round(d.user_tts_volume_max * 100));
          }
        }
        if (typeof d.user_tts_volume === 'number') {
          state.userTtsVolume = d.user_tts_volume;
          if (document.activeElement !== elements.userTtsVolumeRange) {
            updateUserTtsVolumeUIFromServer(d.user_tts_volume);
          } else {
            updateUserTtsVolumeValueLabel(parseFloat(elements.userTtsVolumeRange.value));
          }
        }
        if (state.isRunning && typeof d.mic_rms === 'number') {
          updateMicMeterUI(d);
        }
        updateUI();
      } 
    } catch (e) { console.warn('⚠️ pollStatus error:', e); } 
  }

  function setupEventListeners() { 
    if (elements.startBtn) {
      elements.startBtn.onclick = () => {
        if (state.isRunning) stopListening();
        else {
          unlockBrowserAudioForPlayback();
          if (isVoiceFlowDesktopClient() || isTrialMode()) {
            void startListening();
          } else if (typeof ConferenceSetupGuide !== 'undefined') {
            ConferenceSetupGuide.open(() => startListening(), { userId: state.userId });
          } else {
            startListening();
          }
        }
      };
    }
    if (elements.chatTrainingBtn) {
      elements.chatTrainingBtn.addEventListener('click', () => {
        if (trainingTour.active) stopTrainingTour();
        else startTrainingTour();
      });
    }
    window.addEventListener('resize', () => {
      applyAiSuggestionsLayout();
      if (trainingTour.active && trainingTour.spotlightTarget) {
        updateTrainingSpotlight(trainingTour.spotlightTarget, { pad: trainingTour.spotlightPad });
        scheduleTrainingTooltipPlacement(trainingTour.spotlightTarget);
      }
    });
    window.addEventListener('scroll', () => {
      if (trainingTour.active && trainingTour.spotlightTarget) {
        updateTrainingSpotlight(trainingTour.spotlightTarget, { pad: trainingTour.spotlightPad });
        scheduleTrainingTooltipPlacement(trainingTour.spotlightTarget);
      }
    }, true);
    if (elements.phraseSilenceInput) {
      elements.phraseSilenceInput.addEventListener('input', onPhraseSilenceInput);
      elements.phraseSilenceInput.addEventListener('change', finalizePhraseSilenceInputs);
      elements.phraseSilenceInput.addEventListener('blur', finalizePhraseSilenceInputs);
    }
    if (elements.phraseSilenceRange) {
      elements.phraseSilenceRange.addEventListener('input', onPhraseSilenceRangeInput);
      elements.phraseSilenceRange.addEventListener('change', finalizePhraseSilenceInputs);
    }
    const phraseRgMinus = $('phraseSilenceRangeMinus');
    const phraseRgPlus = $('phraseSilenceRangePlus');
    if (phraseRgMinus && phraseRgPlus && elements.phraseSilenceRange) {
      phraseRgMinus.addEventListener('click', () => bumpNativeRange(elements.phraseSilenceRange, -1, true));
      phraseRgPlus.addEventListener('click', () => bumpNativeRange(elements.phraseSilenceRange, 1, true));
    }
    if (elements.phraseSilenceStepUp) {
      elements.phraseSilenceStepUp.addEventListener('click', () => bumpPhraseSilence(3));
    }
    if (elements.phraseSilenceStepDown) {
      elements.phraseSilenceStepDown.addEventListener('click', () => bumpPhraseSilence(-3));
    }
    if (elements.micRmsThresholdRange) {
      elements.micRmsThresholdRange.addEventListener('input', scheduleMicRmsThresholdPost);
      elements.micRmsThresholdRange.addEventListener('change', () => {
        if (micRmsThresholdPostTimer) {
          clearTimeout(micRmsThresholdPostTimer);
          micRmsThresholdPostTimer = null;
        }
        const pct = parseFloat(elements.micRmsThresholdRange.value);
        const th = thresholdFromSensitivityPct(pct, state.micRmsThresholdMin, state.micRmsThresholdMax);
        void postMicRmsThreshold(th);
      });
    }
    const micRgMinus = $('micRmsThresholdMinus');
    const micRgPlus = $('micRmsThresholdPlus');
    if (micRgMinus && micRgPlus && elements.micRmsThresholdRange) {
      micRgMinus.addEventListener('click', () => bumpNativeRange(elements.micRmsThresholdRange, -1, true));
      micRgPlus.addEventListener('click', () => bumpNativeRange(elements.micRmsThresholdRange, 1, true));
    }
    if (elements.userTtsVolumeRange) {
      elements.userTtsVolumeRange.addEventListener('input', scheduleUserTtsVolumePost);
      elements.userTtsVolumeRange.addEventListener('change', () => {
        if (userTtsVolumePostTimer) {
          clearTimeout(userTtsVolumePostTimer);
          userTtsVolumePostTimer = null;
        }
        void postUserTtsVolume(volumeFromRangePct(elements.userTtsVolumeRange.value));
      });
    }
    const volRgMinus = $('userTtsVolumeMinus');
    const volRgPlus = $('userTtsVolumePlus');
    if (volRgMinus && volRgPlus && elements.userTtsVolumeRange) {
      volRgMinus.addEventListener('click', () => bumpNativeRange(elements.userTtsVolumeRange, -5, true));
      volRgPlus.addEventListener('click', () => bumpNativeRange(elements.userTtsVolumeRange, 5, true));
    }
    const micSensTrigger = elements.micSensitivityTriggerBtn;
    const micSensPopover = elements.micSensitivityPopover;
    if (micSensTrigger && micSensPopover) {
      micSensTrigger.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const opening = micSensPopover.hasAttribute('hidden');
        if (opening) {
          micSensPopover.removeAttribute('hidden');
          micSensTrigger.setAttribute('aria-expanded', 'true');
        } else {
          micSensPopover.setAttribute('hidden', '');
          micSensTrigger.setAttribute('aria-expanded', 'false');
        }
      });
      micSensPopover.addEventListener('click', (ev) => { ev.stopPropagation(); });
      document.addEventListener('click', (ev) => {
        if (trainingTour.active && trainingTour.micSensitivityForcedOpen) return;
        if (micSensPopover.hasAttribute('hidden')) return;
        if (micSensTrigger.contains(ev.target) || micSensPopover.contains(ev.target)) return;
        micSensPopover.setAttribute('hidden', '');
        micSensTrigger.setAttribute('aria-expanded', 'false');
      });
    }
    function toggleChatSettingsPanelFromUi() {
      if (!elements.chatSessionSettingsWrap) return;
      const wasCollapsed = elements.chatSessionSettingsWrap.classList.contains('is-collapsed');
      const willBeExpanded = wasCollapsed;
      setChatSettingsPanelExpanded(willBeExpanded, { animate: true });
      if (willBeExpanded) void ensureAudioDeviceListsFromUserGesture();
      try {
        localStorage.setItem('voiceTranslator_chatSettingsExpanded', willBeExpanded ? '1' : '0');
      } catch (e) { /* ignore */ }
    }
    if (elements.chatSettingsToggleBtn && elements.chatSessionSettingsWrap) {
      elements.chatSettingsToggleBtn.addEventListener('click', toggleChatSettingsPanelFromUi);
    }
    if (elements.chatSettingsCollapseBtn && elements.chatSessionSettingsWrap) {
      elements.chatSettingsCollapseBtn.addEventListener('click', () => {
        setChatSettingsPanelExpanded(false, { animate: true });
        try {
          localStorage.setItem('voiceTranslator_chatSettingsExpanded', '0');
        } catch (e) { /* ignore */ }
      });
    }
    const langSelUi = document.getElementById('languageSelect');
    if (langSelUi) {
      langSelUi.addEventListener('change', () => {
        setTimeout(() => {
          const sec = state.phraseSilenceSec != null ? state.phraseSilenceSec : (readPhraseSilenceSecFromInputs() ?? phraseSilenceClamp(defaultPhraseSilenceSec()));
          if (Number.isFinite(sec)) updatePhraseSilenceUI(sec);
        }, 0);
      });
    }
    if (elements.conferenceToggle) elements.conferenceToggle.onchange = (e) => toggleConferenceMode(e.target.checked);
    if (elements.aiToggle) elements.aiToggle.onchange = (e) => toggleAI(e.target.checked);
    if (elements.userSpeakLang) elements.userSpeakLang.onchange = (e) => setConversationLanguages(e.target.value, state.partnerSpeakLang);
    if (elements.partnerSpeakLang) elements.partnerSpeakLang.onchange = (e) => setConversationLanguages(state.userSpeakLang, e.target.value);
    if (elements.modeBasicBtn) elements.modeBasicBtn.onclick = () => toggleRecognitionMode('basic');
    if (elements.modeProBtn) elements.modeProBtn.onclick = () => toggleRecognitionMode('pro');
    if (elements.autoPlayToggle) {
      syncAutoPlayStateFromPreference();
      elements.autoPlayToggle.checked = state.autoPlay;
      elements.autoPlayToggle.onchange = (e) => {
        state.autoPlay = e.target.checked;
        localStorage.setItem('voiceTranslator_autoPlay', state.autoPlay ? 'true' : 'false');
        if (isTrialMode()) {
          state.trialSettings = state.trialSettings || {};
          state.trialSettings.autoPlay = state.autoPlay;
          void persistTrialSessionAutoPlay(state.autoPlay);
        }
        if (isTrialMode()) cancelPendingAutoPlayVoice();
        if (!state.autoPlay) cancelPendingAutoPlayVoice();
        syncFooterPlayHint();
        syncAllMsgPlayButtons();
        log(state.autoPlay ? '✅ Автовоспроизведение включено' : '⏸️ Автовоспроизведение выключено', 'system');
        console.log('🔧 Auto-play toggled:', state.autoPlay);
        if (elements.autoPlayHint) elements.autoPlayHint.style.display = state.autoPlay ? 'inline' : 'none';
      };
    }
    if (elements.themeSelect) {
      elements.themeSelect.addEventListener('change', () => {
        const v = elements.themeSelect.value || 'default';
        localStorage.setItem('voiceTranslator_theme', v);
        applyThemeDom();
      });
    }
    if (elements.proUpgradeModalBackdrop) {
      elements.proUpgradeModalBackdrop.addEventListener('click', closeProUpgradeModal);
    }
    if (elements.proUpgradeModalClose) {
      elements.proUpgradeModalClose.addEventListener('click', closeProUpgradeModal);
    }
    if (elements.aiAssistantUpgradeModalBackdrop) {
      elements.aiAssistantUpgradeModalBackdrop.addEventListener('click', closeAiAssistantUpgradeModal);
    }
    if (elements.aiAssistantUpgradeModalClose) {
      elements.aiAssistantUpgradeModalClose.addEventListener('click', closeAiAssistantUpgradeModal);
    }
    if (elements.voiceCloneUpgradeModalBackdrop) {
      elements.voiceCloneUpgradeModalBackdrop.addEventListener('click', closeVoiceCloneUpgradeModal);
    }
    if (elements.voiceCloneUpgradeModalClose) {
      elements.voiceCloneUpgradeModalClose.addEventListener('click', closeVoiceCloneUpgradeModal);
    }
    if (elements.micErrorModalBackdrop) {
      elements.micErrorModalBackdrop.addEventListener('click', closeStartErrorModal);
    }
    if (elements.micErrorModalClose) {
      elements.micErrorModalClose.addEventListener('click', closeStartErrorModal);
    }
    if (elements.subscriptionRequiredModalBackdrop) {
      elements.subscriptionRequiredModalBackdrop.addEventListener('click', closeSubscriptionRequiredModal);
    }
    if (elements.subscriptionRequiredModalClose) {
      elements.subscriptionRequiredModalClose.addEventListener('click', closeSubscriptionRequiredModal);
    }
    if (elements.voiceCloneSettingsLink) {
      elements.voiceCloneSettingsLink.addEventListener('click', (e) => {
        if (isVoiceCloneLocked()) {
          e.preventDefault();
          openVoiceCloneUpgradeModal();
        }
      });
    }
    
    // 🔥 Кнопка ✖ теперь только очищает подсказки, НЕ скрывает панель
    if (elements.closeAiSuggestions) {
      elements.closeAiSuggestions.onclick = () => {
        if (elements.aiSuggestionsList) elements.aiSuggestionsList.innerHTML = '<div style="color:#64748b;text-align:center;padding:1rem;">Ожидание фразы...</div>';
        if (elements.partnerPhraseDisplay) elements.partnerPhraseDisplay.textContent = '';
        console.log('🧹 Подсказки очищены');
      };
    }
    if (elements.aiSuggestionsLayoutToggle) {
      elements.aiSuggestionsLayoutToggle.onclick = () => {
        if (isAiAssistantLocked()) {
          openAiAssistantUpgradeModal();
          return;
        }
        if (!state.aiEnabled) return;
        state.aiSuggestionsLayout = state.aiSuggestionsLayout === 'column' ? 'bottom' : 'column';
        localStorage.setItem('voiceTranslator_aiSuggestionsLayout', state.aiSuggestionsLayout);
        syncAiSuggestionsPanelVisibility();
      };
    }
    initColumnResizers();
    initAiSuggestionsMobileSheet();

    if (elements.userMessages) {
      elements.userMessages.addEventListener('click', handleChatClick);
    }
    if (elements.partnerMessages) {
      elements.partnerMessages.addEventListener('click', (e) => {
        const bubble = e.target.closest('.msg-bubble.partner');
        if (!bubble) return;
        const textEl = bubble.querySelector('.msg-text');
        const inputEl = bubble.querySelector('.msg-input');
        const phrase = (textEl?.textContent || inputEl?.value || '').trim();
        if (!phrase) return;
        const mid = parseInt(bubble.dataset.msgId, 10);
        if (!Number.isNaN(mid)) {
          state.lastPartnerMsgId = mid;
          state.lastPartnerPhrase = phrase;
        }
        generateAiSuggestions(phrase);
      });
    }
    syncAiSuggestionsPanelVisibility();
    syncChatColumnEmptyStates();
    
    setTimeout(() => {
      if (elements.modeBasicBtn && elements.modeProBtn) {
        elements.modeBasicBtn.classList.toggle('active', state.recognitionMode === 'basic');
        elements.modeProBtn.classList.toggle('active', state.recognitionMode === 'pro');
      }
      syncProRecognitionGateUi();
      if (elements.autoPlayToggle) elements.autoPlayToggle.checked = state.autoPlay;
      if (elements.autoPlayHint) elements.autoPlayHint.style.display = state.autoPlay ? 'inline' : 'none';
    }, 100);
    
    if (elements.aiTopicInlineTitle) {
      elements.aiTopicInlineTitle.addEventListener('change', () => { void saveAiTopicInline(); });
      elements.aiTopicInlineTitle.addEventListener('blur', () => { void saveAiTopicInline(); });
    }
    if (elements.aiTopicInlineDesc) {
      elements.aiTopicInlineDesc.addEventListener('change', () => { void saveAiTopicInline(); });
      elements.aiTopicInlineDesc.addEventListener('blur', () => { void saveAiTopicInline(); });
    }
    const voiceSelect = document.getElementById('voiceSelect');
    const useClonedCheckbox = document.getElementById('useClonedVoice');
    if (useClonedCheckbox) {
      useClonedCheckbox.onchange = (e) => {
        if (isVoiceCloneLocked()) {
          if (e.target.checked) {
            e.target.checked = false;
            state.useClonedVoice = false;
            openVoiceCloneUpgradeModal();
          }
          return;
        }
        const canUse = state.clonedVoices.length > 0;
        if (!canUse) {
          e.target.checked = false;
          state.useClonedVoice = false;
          return;
        }
        state.useClonedVoice = !!e.target.checked;
        try { localStorage.setItem('voiceTranslator_useCloned', state.useClonedVoice ? 'true' : 'false'); } catch (err) { /* ignore */ }
        updateVoiceSelects();
        log(state.useClonedVoice ? '🎙️ Используется клонированный голос' : '🔊 Используется стандартный голос', 'system');
      };
    }
    if (voiceSelect) {
      voiceSelect.onchange = (e) => {
        const value = String(e.target.value || '').trim();
        if (!value) return;
        if (state.useClonedVoice && state.clonedVoices.length > 0) {
          state.selectedClonedVoice = value;
          try { localStorage.setItem('voiceTranslator_clonedVoice', state.selectedClonedVoice); } catch (err) { /* ignore */ }
          log('🎙️ Выбран клонированный голос', 'system');
        } else {
          state.selectedStandardVoice = value;
          try { localStorage.setItem('voiceTranslator_standardVoice', state.selectedStandardVoice); } catch (err) { /* ignore */ }
          log('🔊 Выбран стандартный голос', 'system');
        }
        getActiveVoiceForPlayback();
      };
    }
    state.cloneViaModal = true;
    try { localStorage.setItem('voiceTranslator_cloneViaModal', 'true'); } catch (err) { /* ignore */ }
    updateCloneViaModalUi();
    window.refreshCloneViaModalUi = updateCloneViaModalUi;
    const previewVoiceBtn = document.getElementById('previewVoiceBtn');
    if (previewVoiceBtn) {
      previewVoiceBtn.onclick = () => {
        const vs = document.getElementById('voiceSelect');
        const val = vs ? String(vs.value || '').trim() : '';
        if (!val) return;
        previewVoice(val, previewVoiceBtn);
      };
    }
    if (elements.translationPauseToggle) {
      elements.translationPauseToggle.addEventListener('change', async (e) => {
        if (state._syncTranslationPauseUi) return;
        if (isTrialMode()) {
          state._syncTranslationPauseUi = true;
          e.target.checked = false;
          state._syncTranslationPauseUi = false;
          log('В демо пауза перевода не используется.', 'system');
          return;
        }
        if (!state.isRunning) {
          state._syncTranslationPauseUi = true;
          e.target.checked = false;
          state._syncTranslationPauseUi = false;
          return;
        }
        const paused = e.target.checked;
        try {
          await apiRequest('/api/translation-pause', { method: 'POST', body: JSON.stringify({ paused }) });
          state.translationPaused = paused;
          log(paused ? t('logTranslationPauseOn') : t('logTranslationPauseOff'), 'system');
        } catch (err) {
          state._syncTranslationPauseUi = true;
          e.target.checked = !paused;
          state._syncTranslationPauseUi = false;
          log(t('logError') + err.message, 'error');
        }
      });
    }
    if (elements.a11yFontSelect) {
      elements.a11yFontSelect.addEventListener('change', () => {
        const v = parseInt(elements.a11yFontSelect.value, 10);
        const pct = Number.isFinite(v)
          ? Math.min(A11Y_FONT_SCALE_MAX, Math.max(A11Y_FONT_SCALE_MIN, v))
          : 100;
        localStorage.setItem('voiceTranslator_fontScale', String(pct));
        applyA11yDom();
      });
    }
    if (elements.a11yFontRange) {
      elements.a11yFontRange.addEventListener('input', () => {
        const pct = Math.min(
          A11Y_FONT_SCALE_MAX,
          Math.max(A11Y_FONT_SCALE_MIN, parseInt(elements.a11yFontRange.value, 10) || 100),
        );
        localStorage.setItem('voiceTranslator_fontScale', String(pct));
        applyA11yDom();
      });
    }
    if (elements.a11yContrastSelect) {
      elements.a11yContrastSelect.addEventListener('change', () => {
        const v = parseInt(elements.a11yContrastSelect.value, 10);
        const level = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
        localStorage.setItem('voiceTranslator_contrastLevel', String(level));
        applyA11yDom();
      });
    }
    if (elements.a11yContrastRange) {
      elements.a11yContrastRange.addEventListener('input', () => {
        const level = Math.min(100, Math.max(0, parseInt(elements.a11yContrastRange.value, 10) || 0));
        localStorage.setItem('voiceTranslator_contrastLevel', String(level));
        applyA11yDom();
      });
    }
    const a11yFm = $('a11yFontRangeMinus');
    const a11yFp = $('a11yFontRangePlus');
    if (a11yFm && a11yFp && elements.a11yFontRange) {
      a11yFm.addEventListener('click', () => bumpNativeRange(elements.a11yFontRange, -1, false));
      a11yFp.addEventListener('click', () => bumpNativeRange(elements.a11yFontRange, 1, false));
    }
    const a11yCm = $('a11yContrastRangeMinus');
    const a11yCp = $('a11yContrastRangePlus');
    if (a11yCm && a11yCp && elements.a11yContrastRange) {
      a11yCm.addEventListener('click', () => bumpNativeRange(elements.a11yContrastRange, -1, false));
      a11yCp.addEventListener('click', () => bumpNativeRange(elements.a11yContrastRange, 1, false));
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || isTrialMode()) return;
      void loadSubscriptionUsage();
    });
  }

  /** Десктоп stealth: клики «сквозь» пустые области; над реальными контролами — обычные клики.
   *  Нельзя указывать крупные контейнеры (#user-messages, .chat-column, панели целиком) — иначе весь экран считается «интерактивным» и сквозь клики не работают. */
  const STEALTH_MOUSE_HIT_SEL = [
    'button', 'input', 'select', 'textarea',
    'a[href]', 'label', 'summary',
    '[role="button"]', '[role="switch"]', '[role="tab"]', '[role="slider"]',
    '[contenteditable="true"]',
    '.btn', '.mode-btn', '.auto-play-toggle', '.toggle-switch',
    '.chat-settings-toggle-btn', '.chat-settings-collapse-btn', '.header-menu-label', '.header-training-btn', '.header-plan-pill',
    '.column-resizer', '.range-step-btn', '.mic-sensitivity-icon-btn',
    '.msg-bubble', '.msg-input', '.msg-content', '.msg-meta',
    '.ai-suggestion-item',
    '.type-modal-suggestion',
    '.mic-sensitivity-popover',
    '.ai-topic-modal.open', '.ai-topic-modal-backdrop', '.ai-topic-modal-dialog',
    '.footer-toggle-row',
    '#chatTrainingTooltip', '.training-tooltip-actions',
    '#vfDesktopRegionInsight',
    '[data-vf-stealth-interactive]',
  ].join(',');

  function installDesktopStealthPointerPassthrough(vd) {
    if (!vd || typeof vd.setStealthMousePassthrough !== 'function') return () => {};
    let lastPassThrough = null;
    let rafId = 0;
    let pending = null;

    const flush = () => {
      rafId = 0;
      if (!document.documentElement.classList.contains('vf-desktop-stealth')) return;
      const p = pending;
      pending = null;
      if (!p) return;
      let el = null;
      try {
        el = document.elementFromPoint(p.x, p.y);
      } catch (e) { return; }
      const hit = el && typeof el.closest === 'function' && el.closest(STEALTH_MOUSE_HIT_SEL);
      const passThrough = !hit;
      if (passThrough === lastPassThrough) return;
      lastPassThrough = passThrough;
      void vd.setStealthMousePassthrough(passThrough);
    };

    const onPointerMove = (e) => {
      try {
        window.__vfLastPointer = { x: e.clientX, y: e.clientY };
      } catch (err) { /* ignore */ }
      if (!document.documentElement.classList.contains('vf-desktop-stealth')) return;
      pending = { x: e.clientX, y: e.clientY };
      if (!rafId) rafId = requestAnimationFrame(flush);
    };

    document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });

    queueMicrotask(() => {
      if (!document.documentElement.classList.contains('vf-desktop-stealth')) return;
      let lp = null;
      try {
        lp = window.__vfLastPointer;
      } catch (e) { /* ignore */ }
      if (!lp || typeof lp.x !== 'number' || typeof lp.y !== 'number') return;
      lastPassThrough = null;
      pending = { x: lp.x, y: lp.y };
      flush();
    });

    return () => {
      document.removeEventListener('pointermove', onPointerMove, { capture: true });
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      pending = null;
      lastPassThrough = null;
    };
  }

  function syncDesktopAccountLabel() {
    const vd = typeof window !== 'undefined' && window.voiceflowDesktop;
    if (!vd) return;
    const accountTriggerLabel = document.querySelector(
      '#desktopAccountTrigger span[data-i18n="desktopAccountMenuLabel"], #desktopAccountTrigger span'
    );
    if (!accountTriggerLabel) return;
    if (state.sessionEmail) {
      accountTriggerLabel.textContent = state.sessionEmail;
      accountTriggerLabel.removeAttribute('data-i18n');
    } else if (!accountTriggerLabel.getAttribute('data-i18n')) {
      accountTriggerLabel.textContent = t('desktopAccountMenuLabel');
      accountTriggerLabel.setAttribute('data-i18n', 'desktopAccountMenuLabel');
    }
  }

  function initDesktopWindowChrome() {
    const vd = typeof window !== 'undefined' && window.voiceflowDesktop;
    const wrap = document.getElementById('desktopWindowControls');
    const minBtn = document.getElementById('desktopWinMinBtn');
    const maxBtn = document.getElementById('desktopWinMaxBtn');
    const closeBtn = document.getElementById('desktopWinCloseBtn');
    if (
      !vd ||
      typeof vd.windowMinimize !== 'function' ||
      typeof vd.windowClose !== 'function' ||
      typeof vd.windowMaximizeToggle !== 'function' ||
      typeof vd.windowIsMaximized !== 'function' ||
      !wrap ||
      !minBtn ||
      !maxBtn ||
      !closeBtn
    ) {
      return;
    }
    document.documentElement.classList.add('vf-desktop-app');
    wrap.hidden = false;

    const accountWrap = document.getElementById('desktopAccountWrap');
    const cabinetLink = document.getElementById('desktopAccountCabinetLink');
    const logoutItem = document.getElementById('desktopAccountLogoutBtn');
    const accountTrigger = document.getElementById('desktopAccountTrigger');
    if (accountWrap && cabinetLink && logoutItem && typeof vd.logoutToLogin === 'function') {
      accountWrap.hidden = false;
      syncDesktopAccountLabel();
      const cabUrl = dashboardCabinetUrl();
      cabinetLink.href = cabUrl;
      cabinetLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!openDesktopCabinetUrl(cabUrl)) {
          try {
            window.open(cabUrl, '_blank', 'noopener,noreferrer');
          } catch (_) {
            window.location.href = cabUrl;
          }
        }
      });
      logoutItem.addEventListener('click', () => {
        void vd.logoutToLogin();
      });
      if (accountTrigger) {
        const dropdown = document.getElementById('desktopAccountDropdown');
        const setOpen = (open) => {
          accountWrap.classList.toggle('is-open', Boolean(open));
          accountTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        accountTrigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!accountWrap.classList.contains('is-open'));
        });
        accountWrap.addEventListener('mouseenter', () => setOpen(true));
        accountWrap.addEventListener('mouseleave', () => setOpen(false));
        accountWrap.addEventListener('focusin', () => setOpen(true));
        accountWrap.addEventListener('focusout', (ev) => {
          if (!dropdown || !accountWrap.contains(ev.relatedTarget)) setOpen(false);
        });
        if (!accountWrap.dataset.vfAccountDocClose) {
          accountWrap.dataset.vfAccountDocClose = '1';
          document.addEventListener('click', (ev) => {
            if (!accountWrap.classList.contains('is-open')) return;
            if (accountWrap.contains(ev.target)) return;
            setOpen(false);
          });
          document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && accountWrap.classList.contains('is-open')) setOpen(false);
          });
        }
      }
    }

    const extrasCard = document.getElementById('desktopExtrasCard');
    const extrasSlot = document.getElementById('desktopExtrasToggleSlot');
    const stealthRow = document.getElementById('desktopStealthRow');
    const aiRow = document.getElementById('desktopAiRegionRow');
    if (extrasCard && extrasSlot && stealthRow && aiRow) {
      if (stealthRow.parentElement !== extrasSlot) {
        extrasSlot.appendChild(stealthRow);
      }
      if (aiRow.parentElement !== extrasSlot) {
        extrasSlot.appendChild(aiRow);
      }
      extrasCard.hidden = false;
    }

    function syncMaxUi() {
      const m = maxBtn.classList.contains('is-maximized');
      maxBtn.title = m ? t('desktopWindowRestoreTitle') : t('desktopWindowMaxTitle');
      maxBtn.setAttribute('aria-label', m ? t('desktopWindowRestoreAria') : t('desktopWindowMaxAria'));
    }

    window.syncDesktopWindowMaxUi = syncMaxUi;

    async function pullMaxState() {
      try {
        const m = Boolean(await vd.windowIsMaximized());
        maxBtn.classList.toggle('is-maximized', m);
        syncMaxUi();
      } catch (_) {
        /* ignore */
      }
    }

    void pullMaxState();

    let unsubMax = null;
    try {
      if (typeof vd.onWindowMaximizedChanged === 'function') {
        unsubMax = vd.onWindowMaximizedChanged((m) => {
          maxBtn.classList.toggle('is-maximized', Boolean(m));
          syncMaxUi();
        });
      }
    } catch (_) {
      /* ignore */
    }

    maxBtn.addEventListener('click', async () => {
      try {
        const m = Boolean(await vd.windowMaximizeToggle());
        maxBtn.classList.toggle('is-maximized', m);
        syncMaxUi();
      } catch (_) {
        /* ignore */
      }
    });

    minBtn.addEventListener('click', () => {
      void vd.windowMinimize();
    });
    closeBtn.addEventListener('click', () => {
      void vd.windowClose();
    });

    window.addEventListener('beforeunload', () => {
      if (typeof unsubMax === 'function') unsubMax();
      if (window.syncDesktopWindowMaxUi === syncMaxUi) {
        window.syncDesktopWindowMaxUi = undefined;
      }
    });
  }

  function initDesktopStealthUI() {
    const vd = typeof window !== 'undefined' && window.voiceflowDesktop;
    const row = elements.desktopStealthRow;
    const toggle = elements.desktopStealthToggle;
    if (!vd || !row || !toggle) return;
    row.style.removeProperty('display');
    let removeStealthPointer = null;

    function syncDesktopStealthPointerPassthrough(enabled) {
      if (typeof removeStealthPointer === 'function') {
        removeStealthPointer();
        removeStealthPointer = null;
      }
      if (!enabled) return;
      removeStealthPointer = installDesktopStealthPointerPassthrough(vd);
    }

    void (async () => {
      try {
        const on = Boolean(await vd.getStealthState());
        toggle.checked = on;
        syncDesktopStealthPointerPassthrough(on);
      } catch (e) { /* ignore */ }
    })();
    let unsub = null;
    try {
      unsub = vd.onStealthState((enabled) => {
        toggle.checked = Boolean(enabled);
        syncDesktopStealthPointerPassthrough(enabled);
      });
    } catch (e) { /* ignore */ }
    toggle.addEventListener('change', (e) => {
      void vd.setStealthMode(e.target.checked).catch(() => {});
    });
    window.addEventListener('beforeunload', () => {
      if (typeof unsub === 'function') unsub();
      if (typeof removeStealthPointer === 'function') removeStealthPointer();
    });
  }

  async function handleDesktopRegionCapture(msg) {
    const pngBase64 = msg && msg.pngBase64;
    const screenRect = msg && msg.screenRect;
    if (!pngBase64 || !screenRect) return;
    showDesktopRegionInsightPanel(screenRect, t('desktopAiRegionAnalyzing'));
    let hints = '';
    try {
      const loc = (typeof window !== 'undefined' && window.currentLang) ? window.currentLang : 'ru';
      const vd = typeof window !== 'undefined' && window.voiceflowDesktop;
      const fetchServerInsight = async () => {
        const r = await fetch(`${CONFIG.apiBaseUrl}/api/desktop/region-insight`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-VoiceFlow-Client': 'desktop' },
          body: JSON.stringify({ image_png_base64: pngBase64, locale: loc }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const det = j.detail != null ? (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)) : (j.message || r.statusText);
          throw new Error(det || 'HTTP');
        }
        return String(j.hints || '').trim() || '—';
      };
      try {
        hints = await fetchServerInsight();
      } catch (serverErr) {
        if (vd && typeof vd.regionInsight === 'function') {
          const out = await vd.regionInsight(pngBase64, loc);
          if (out && out.ok) {
            hints = String(out.hints || '').trim() || '—';
          } else {
            throw new Error((out && out.error) ? out.error : (serverErr && serverErr.message) || 'regionInsight');
          }
        } else {
          throw serverErr;
        }
      }
    } catch (e) {
      hints = `${t('desktopAiRegionError')} ${e.message || e}`;
    }
    showDesktopRegionInsightPanel(screenRect, hints);
  }

  function showDesktopRegionInsightPanel(screenRect, bodyText) {
    let el = document.getElementById('vfDesktopRegionInsight');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vfDesktopRegionInsight';
      document.body.appendChild(el);
    }
    const sx = typeof window.screenX === 'number' ? window.screenX : 0;
    const sy = typeof window.screenY === 'number' ? window.screenY : 0;
    const rx = screenRect.x - sx;
    const ry = screenRect.y - sy;
    let left = rx + screenRect.width + 12;
    let top = ry;
    const panelW = 380;
    if (left + panelW > window.innerWidth) {
      left = Math.max(8, rx - panelW - 12);
    }
    if (top + 220 > window.innerHeight) {
      top = Math.max(8, window.innerHeight - 240);
    }
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'vf-desktop-region-insight-head';
    const title = document.createElement('span');
    title.textContent = t('desktopAiRegionPanelTitle');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'vfDesktopRegionInsightClose';
    closeBtn.textContent = t('desktopAiRegionClose');
    closeBtn.style.cssText = 'flex-shrink:0;border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:1rem;padding:0;';
    closeBtn.onclick = () => { el.remove(); };
    head.appendChild(title);
    head.appendChild(closeBtn);
    const pre = document.createElement('pre');
    pre.textContent = bodyText;
    el.appendChild(head);
    el.appendChild(pre);
  }

  function initDesktopAiRegionUI() {
    const vd = typeof window !== 'undefined' && window.voiceflowDesktop;
    const row = elements.desktopAiRegionRow;
    const toggle = elements.desktopAiRegionToggle;
    if (!vd || !row || !toggle) return;
    row.style.removeProperty('display');

    function syncControls(stealthOn) {
      toggle.disabled = !stealthOn;
    }

    void (async () => {
      try {
        const stealthOn = Boolean(await vd.getStealthState());
        let saved = false;
        try { saved = localStorage.getItem('voiceTranslator_desktopAiRegion') === '1'; } catch (e) { /* ignore */ }
        toggle.checked = saved;
        await vd.setAiRegionAnalysisEnabled(saved).catch(() => {});
        syncControls(stealthOn);
      } catch (e) {
        syncControls(false);
      }
    })();

    let unsubStealth = null;
    try {
      unsubStealth = vd.onStealthState((enabled) => {
        syncControls(enabled);
      });
    } catch (e) { /* ignore */ }

    let unsubCap = null;
    try {
      unsubCap = vd.onRegionCapture((msg) => {
        void handleDesktopRegionCapture(msg);
      });
    } catch (e) { /* ignore */ }

    toggle.addEventListener('change', async (e) => {
      const v = e.target.checked;
      try { localStorage.setItem('voiceTranslator_desktopAiRegion', v ? '1' : '0'); } catch (err) { /* ignore */ }
      await vd.setAiRegionAnalysisEnabled(v).catch(() => {});
      try {
        const st = Boolean(await vd.getStealthState());
        syncControls(st);
      } catch (err2) {
        syncControls(document.documentElement.classList.contains('vf-desktop-stealth'));
      }
    });

    window.addEventListener('beforeunload', () => {
      if (typeof unsubStealth === 'function') unsubStealth();
      if (typeof unsubCap === 'function') unsubCap();
    });
  }

  async function init() {
    if (init.__vfOnce) return;
    init.__vfOnce = true;
    if (redirectUiToHttpsIfNeeded()) return;
    initBrowserAudioOutputListeners();
    window.refreshHeaderPlanUsage = renderHeaderPlanUsage;
    window.refreshAudioDeviceLists = refreshAudioDeviceLists;
    state.trialSessionId = getTrialSessionIdFromUrl() || null;
    applyTrialDemoChrome();
    let backendOk = false;
    try {
    if (typeof window.vfWaitForI18n === 'function') await window.vfWaitForI18n();

    const vd = typeof window !== 'undefined' && window.voiceflowDesktop;
    if (vd && !isTrialMode()) {
      let desktopCabinetOk = false;
      try {
        const r = await fetch(`${CONFIG.apiBaseUrl}/api/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (r.ok) {
          const d = await r.json().catch(() => null);
          const rid = d && d.id != null ? String(d.id).trim() : '';
          const looksAnonymous =
            !rid ||
            rid.toLowerCase() === 'anonymous' ||
            rid.toLowerCase().startsWith('anonymous_');
          desktopCabinetOk = Boolean(d && !looksAnonymous);
        }
      } catch (e) {
        console.warn('desktop auth gate:', e && e.message ? e.message : e);
      }
      if (!desktopCabinetOk) {
        const back =
          (window.location.pathname || '/ui') +
          (window.location.search && String(window.location.search).length ? window.location.search : '');
        try {
          document.documentElement.classList.remove('site-lang-loading');
          document.documentElement.classList.add('site-lang-ready');
        } catch (_) { /* ignore */ }
        const loginPath = '/login?redirect=' + encodeURIComponent(back || '/ui');
        try {
          window.location.replace(new URL(loginPath, siteOriginForCabinet()).href);
        } catch (_) {
          window.location.href = loginPath;
        }
        return;
      }
    }

    initDOM();
    if (isTrialMode()) {
      setChatSettingsPanelExpanded(false, { animate: false });
    } else {
      try {
        const collapsed = localStorage.getItem('voiceTranslator_chatSettingsExpanded') === '0';
        setChatSettingsPanelExpanded(!collapsed, { animate: false });
      } catch (e) {
        setChatSettingsPanelExpanded(true, { animate: false });
      }
    }
    applyThemeDom();
    setupEventListeners();
    initAudioDeviceSelectors();
    probeBrowserStorageWritable();
    if (typeof state.userTtsVolume === 'number' && Number.isFinite(state.userTtsVolume)) {
      updateUserTtsVolumeUIFromServer(state.userTtsVolume);
    }
    log(t('logInit'), 'system');
    try {
      const savedTopic = localStorage.getItem('voiceTranslator_aiTopic');
      if (!isTrialMode() && savedTopic != null && savedTopic !== '') state.aiTopic = savedTopic;
    } catch (e) { console.warn('ai topic localStorage:', e); }
    if (typeof applyTranslations === 'function') applyTranslations();
    void refreshAudioDeviceLists();
    applyA11yDom();
    initDesktopWindowChrome();
    initDesktopCabinetModalLinks();
    initDesktopStealthUI();
    initDesktopAiRegionUI();
    backendOk = await waitForBackendHealth(12, 900);
    if (!backendOk) log(t('chatPreloaderOffline'), 'error');
    if (isTrialMode()) {
      try {
        const okS = await fetch(
          `${CONFIG.apiBaseUrl}/api/trial/session?session_id=${encodeURIComponent(state.trialSessionId)}`,
          { credentials: 'include' }
        );
        if (!okS.ok) {
          log('Демо-сессия не найдена. Откройте мастер с главной страницы.', 'error');
          window.location.href = '/trial-setup';
          return;
        }
        const tv = await okS.json();
        const ts = tv.settings || {};
        if (ts.recognitionMode === 'basic' || ts.recognitionMode === 'pro') {
          state.recognitionMode = ts.recognitionMode;
          try { localStorage.setItem('voiceTranslator_recognitionMode', state.recognitionMode); } catch (e) { /* ignore */ }
        }
        if (ts.userSpeakLang) state.userSpeakLang = String(ts.userSpeakLang);
        if (ts.partnerSpeakLang) state.partnerSpeakLang = String(ts.partnerSpeakLang);
        state.trialSettings = {
          userSpeakLang: state.userSpeakLang,
          partnerSpeakLang: state.partnerSpeakLang,
          autoPlay: typeof ts.autoPlay === 'boolean' ? ts.autoPlay : true,
          recognitionMode: state.recognitionMode,
        };
        let trialAutoFromLs = false;
        try {
          trialAutoFromLs = localStorage.getItem('voiceTranslator_autoPlay') != null;
        } catch (e) {
          /* ignore */
        }
        if (!trialAutoFromLs && typeof ts.autoPlay === 'boolean') {
          try {
            localStorage.setItem('voiceTranslator_autoPlay', ts.autoPlay ? 'true' : 'false');
          } catch (e) {
            /* ignore */
          }
        }
        syncAutoPlayStateFromPreference();
        state.trialSettings.autoPlay = state.autoPlay;
        if (elements.autoPlayToggle) elements.autoPlayToggle.checked = state.autoPlay;
        if (elements.autoPlayHint) elements.autoPlayHint.style.display = state.autoPlay ? 'inline' : 'none';
        void persistTrialSessionAutoPlay(state.autoPlay);
        try {
          localStorage.setItem('voiceTranslator_useCloned', state.useClonedVoice ? 'true' : 'false');
          localStorage.setItem('voiceTranslator_cloneViaModal', state.cloneViaModal ? 'true' : 'false');
        } catch (e) { /* ignore */ }
        state.trialPartnerEdgeVoice = resolveTrialPartnerEdgeVoice(
          ts.partnerEdgeVoice || 'en-IE-ConnorNeural',
          state.partnerSpeakLang
        );
        const uev = String(ts.userEdgeVoice || '').trim();
        if (uev && !uev.startsWith('cloned:')) {
          state.selectedStandardVoice = uev;
          state.selectedVoice = uev;
          try {
            localStorage.setItem('voiceTranslator_standardVoice', state.selectedStandardVoice);
            localStorage.setItem('voiceTranslator_voice', state.selectedVoice);
          } catch (e) { /* ignore */ }
        }
        const trialAiTopic = String(ts.aiTopic || '').trim() ||
          [String(ts.aiTopicTitle || '').trim(), String(ts.aiTopicContext || '').trim()].filter(Boolean).join('\n\n');
        state.trialCloneVoiceId = tv.clone_voice_id ? String(tv.clone_voice_id) : null;
        if (typeof ts.useClonedVoice === 'boolean') {
          state.useClonedVoice = ts.useClonedVoice;
        } else {
          state.useClonedVoice = !!state.trialCloneVoiceId;
        }
        if (typeof ts.cloneViaModal === 'boolean') {
          state.cloneViaModal = ts.cloneViaModal;
        } else {
          state.cloneViaModal = !!state.useClonedVoice;
        }
        applyTrialCloneVoiceFromSession();
        state.aiEnabled = true;
        state.aiTopic = trialAiTopic || String(tv.topic_title || 'Демо-диалог');
        state.conferenceMode = false;
        state.userId = await getUserId();
        console.log('🔐 Демо + user_id:', state.userId);
        let appliedTrialPause = false;
        try {
          const ls = localStorage.getItem('voiceTranslator_phraseSilenceSec');
          if (ls != null) {
            const p = parseFloat(ls);
            if (Number.isFinite(p)) {
              const v = persistPhraseSilenceSecLocal(phraseSilenceClamp(p));
              applyPhraseSilenceInputFromSec(v);
              appliedTrialPause = true;
            }
          }
        } catch (e) {
          /* ignore */
        }
        if (!appliedTrialPause) {
          const v = persistPhraseSilenceSecLocal(phraseSilenceClamp(defaultPhraseSilenceSec()));
          applyPhraseSilenceInputFromSec(v);
        }
        loadMicRmsThresholdPreference();
        log('🎭 Демо-диалог: тот же интерфейс, без серверной записи и без основного чата.', 'success');
        if (tv.show_upgrade) {
          showTrialUpgradeModal(tv);
        }
        const titleEl = document.querySelector('.header-top-row [data-i18n="appTitle"]');
        if (titleEl) {
          const base = (titleEl.textContent || '').replace(/\s*—\s*демо\s*$/i, '').trim();
          titleEl.textContent = base + ' — демо';
        }
      } catch (e) {
        console.warn(e);
        window.location.href = '/trial-setup';
        return;
      }
    } else {
      state.userId = await getUserId();
      console.log('🔐 Инициализирован user_id:', state.userId);
      await resetStaleServerSessionOnLoad();
      await loadProfileConversationPreset();
      loadMicRmsThresholdPreference();
      void maybeEarlyCalibrateMicNoise();
      syncAutoPlayStateFromPreference();
      await fetchSubscriptionRecognitionGate();
      state._headerPlanAuth = null;
      renderHeaderPlanUsage();
      await loadSubscriptionUsage();
      if (isProRecognitionLocked() && state.recognitionMode === 'pro') {
        await toggleRecognitionMode('basic');
      }
      if (isAiAssistantLocked() && state.aiEnabled) {
        await toggleAI(false);
      }
      if (backendOk && typeof state.userTtsVolume === 'number') {
        void postUserTtsVolume(state.userTtsVolume);
      }
    }
    updateUI();
    void setConversationLanguages(state.userSpeakLang, state.partnerSpeakLang).catch((langErr) => {
      console.warn('setConversationLanguages:', langErr);
    });
    updateStatus();
    syncAiSuggestionsPanelVisibility();
    console.log(`🔧 Recognition mode initialized: ${state.recognitionMode}`);
    applyVoiceListFallback();
    if (isTrialMode() && trialUsesModalClone()) {
      showModalWarmupPreloader();
      try {
        await warmTrialModalCloneOnOpen();
      } catch (warmErr) {
        const warmFail = t('modalWarmupFailed');
        const detail =
          warmErr && warmErr.message && warmErr.message !== 'modal_warmup_timeout'
            ? `: ${warmErr.message}`
            : '';
        log(warmFail + detail, 'error');
      } finally {
        hideModalWarmupPreloader();
      }
    }
    showChatModal();
    void loadVoices();
    applyTranslations(); applyA11yDom(); applyThemeDom(); renderHeaderPlanUsage();
    const langSelect = document.getElementById('languageSelect'); if (langSelect) langSelect.value = currentLang;
    if (isTrialMode()) {
      try {
        await fetchChat();
      } catch (eb) {
        console.warn('trial chat load', eb);
      }
      await revealChatSettingsMenuAfterTrialLoad();
    } else {
      pollStatus();
      setInterval(pollStatus, 90000);
    }
    log(t('logReady'), 'success');
    } catch (initErr) {
      console.error('TalkPilot init failed:', initErr);
      try {
        log((t('logError') || 'Error: ') + (initErr && initErr.message ? initErr.message : String(initErr)), 'error');
      } catch (_) {
        /* ignore */
      }
    } finally {
      if (!state.modalWarmupInProgress) setChatPreloaderVisible(false);
    }
  }

  window.voiceTranslatorLog = log;
  window.updateUI = updateUI;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    void init();
  }
  window.addEventListener('beforeunload', () => {
    sendStopOnPageUnload();
    stopTrialModalCloneSession();
    stopBrowserMicRecognition(true);
    stopChatPolling();
    if (micMeterInterval) {
      clearInterval(micMeterInterval);
      micMeterInterval = null;
    }
  });
  
})();