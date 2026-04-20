// frontend/translations.js

const TRANSLATIONS = {
  ru: {
    appTitle: '🎙️ Voice Translator',
    aiToggle: '🤖 AI',
    aiTopicPlaceholder: 'Тема...',
    voiceLabel: '🎤 Голос:',
    previewBtnTitle: 'Прослушать',
    resetBtn: '🔄 Сброс',
    startBtn: '▶️ Начать',
    stopBtn: '⏹️ Стоп',
    testBtn: '🔊 Тест',
    conferenceMode: '🔁 Режим конференции (VB-Cable)',
    statusStopped: '⏹️ Остановлен',
    statusRunning: '✅ Запущен',
    youColumn: '🔵 Вы',
    partnerColumn: '🟢 Собеседник',
    footerHint: '🎤 Говорите → Tab для редактирования → Enter для озвучки',
    languageLabel: '🌐',
    
    logInit: '🚀 Инициализация...',
    logConnected: '✅ Бэкенд подключён',
    logReady: '✅ Готов',
    logChatOpen: '✅ Чат открыт',
    logTest: '🔊 Тест...',
    logPlaying: '✅ Воспроизводится: ',
    logVoiced: '🔊 Озвучено #',
    logNext: '🔊 Озвучена следующая',
    logNoPhrases: '⚠️ Нет фраз',
    logDeleted: '🗑️ Удалено #',
    logReset: '🔄 Сброс',
    logConferenceOn: '🔁 Режим конференции: ВКЛ',
    logConferenceOff: '🔁 Режим конференции: ВЫКЛ',
    logError: '❌ ',
    
    modalTitle: '✏️ Редактирование и подсказки',
    modalQuestion: '1️⃣ Вопрос',
    modalStatement: '2️⃣ Утверждение',
    modalHint: '⌨️ 3-7: Подсказка | Enter: озвучить | Esc: отмена',
    modalNoMessages: '⚠️ Нет сообщений для редактирования',
    modalLoading: '🤖 Загрузка...',
    modalNoSuggestions: 'Нет вариантов',
    modalError: 'Ошибка',
    modalEnableAI: 'Включите 🤖 AI для подсказок',
    
    msgStatusWaiting: '🟡 Ожидает',
    msgStatusVoicing: '🔊 Озвучивается...',
    msgStatusDone: '✅ Озвучено'
  },
  
  en: {
    appTitle: '🎙️ Voice Translator',
    aiToggle: '🤖 AI',
    aiTopicPlaceholder: 'Topic...',
    voiceLabel: '🎤 Voice:',
    previewBtnTitle: 'Preview',
    resetBtn: '🔄 Reset',
    startBtn: '▶️ Start',
    stopBtn: '⏹️ Stop',
    testBtn: '🔊 Test',
    conferenceMode: '🔁 Conference Mode (VB-Cable)',
    statusStopped: '⏹️ Stopped',
    statusRunning: '✅ Running',
    youColumn: '🔵 You',
    partnerColumn: '🟢 Partner',
    footerHint: '🎤 Speak → Tab to edit → Enter to voice',
    languageLabel: '🌐',
    
    logInit: '🚀 Initializing...',
    logConnected: '✅ Backend connected',
    logReady: '✅ Ready',
    logChatOpen: '✅ Chat opened',
    logTest: '🔊 Test...',
    logPlaying: '✅ Playing: ',
    logVoiced: '🔊 Voiced #',
    logNext: '🔊 Next voiced',
    logNoPhrases: '⚠️ No phrases',
    logDeleted: '🗑️ Deleted #',
    logReset: '🔄 Reset',
    logConferenceOn: '🔁 Conference Mode: ON',
    logConferenceOff: '🔁 Conference Mode: OFF',
    logError: '❌ ',
    
    modalTitle: '✏️ Edit and Suggestions',
    modalQuestion: '1️⃣ Question',
    modalStatement: '2️⃣ Statement',
    modalHint: '⌨️ 3-7: Suggestion | Enter: voice | Esc: cancel',
    modalNoMessages: '⚠️ No messages to edit',
    modalLoading: '🤖 Loading...',
    modalNoSuggestions: 'No suggestions',
    modalError: 'Error',
    modalEnableAI: 'Enable 🤖 AI for suggestions',
    
    msgStatusWaiting: '🟡 Waiting',
    msgStatusVoicing: '🔊 Voicing...',
    msgStatusDone: '✅ Voiced'
  },
  
  de: {
    appTitle: '🎙️ Sprachübersetzer',
    aiToggle: '🤖 KI',
    aiTopicPlaceholder: 'Thema...',
    voiceLabel: '🎤 Stimme:',
    previewBtnTitle: 'Vorschau',
    resetBtn: '🔄 Zurücksetzen',
    startBtn: '▶️ Start',
    stopBtn: '⏹️ Stopp',
    testBtn: '🔊 Test',
    conferenceMode: '🔁 Konferenzmodus (VB-Cable)',
    statusStopped: '⏹️ Gestoppt',
    statusRunning: '✅ Läuft',
    youColumn: '🔵 Sie',
    partnerColumn: '🟢 Gesprächspartner',
    footerHint: '🎤 Sprechen → Tab zum Bearbeiten → Enter für Stimme',
    languageLabel: '🌐',
    
    logInit: '🚀 Initialisierung...',
    logConnected: '✅ Backend verbunden',
    logReady: '✅ Bereit',
    logChatOpen: '✅ Chat geöffnet',
    logTest: '🔊 Test...',
    logPlaying: '✅ Wiedergabe: ',
    logVoiced: '🔊 Gesprochen #',
    logNext: '🔊 Nächste gesprochen',
    logNoPhrases: '⚠️ Keine Phrasen',
    logDeleted: '🗑️ Gelöscht #',
    logReset: '🔄 Zurücksetzen',
    logConferenceOn: '🔁 Konferenzmodus: EIN',
    logConferenceOff: '🔁 Konferenzmodus: AUS',
    logError: '❌ ',
    
    modalTitle: '✏️ Bearbeiten und Vorschläge',
    modalQuestion: '1️⃣ Frage',
    modalStatement: '2️⃣ Aussage',
    modalHint: '⌨️ 3-7: Vorschlag | Enter: Stimme | Esc: abbrechen',
    modalNoMessages: '⚠️ Keine Nachrichten zu bearbeiten',
    modalLoading: '🤖 Laden...',
    modalNoSuggestions: 'Keine Vorschläge',
    modalError: 'Fehler',
    modalEnableAI: '🤖 KI für Vorschläge aktivieren',
    
    msgStatusWaiting: '🟡 Warten',
    msgStatusVoicing: '🔊 Sprechen...',
    msgStatusDone: '✅ Gesprochen'
  },
  
  es: {
    appTitle: '🎙️ Traductor de Voz',
    aiToggle: '🤖 IA',
    aiTopicPlaceholder: 'Tema...',
    voiceLabel: '🎤 Voz:',
    previewBtnTitle: 'Vista previa',
    resetBtn: '🔄 Reiniciar',
    startBtn: '▶️ Iniciar',
    stopBtn: '⏹️ Detener',
    testBtn: '🔊 Prueba',
    conferenceMode: '🔁 Modo conferencia (VB-Cable)',
    statusStopped: '⏹️ Detenido',
    statusRunning: '✅ Ejecutando',
    youColumn: '🔵 Tú',
    partnerColumn: '🟢 Interlocutor',
    footerHint: '🎤 Habla → Tab para editar → Enter para voz',
    languageLabel: '🌐',
    
    logInit: '🚀 Iniciando...',
    logConnected: '✅ Backend conectado',
    logReady: '✅ Listo',
    logChatOpen: '✅ Chat abierto',
    logTest: '🔊 Prueba...',
    logPlaying: '✅ Reproduciendo: ',
    logVoiced: '🔊 Voz #',
    logNext: '🔊 Siguiente voz',
    logNoPhrases: '⚠️ Sin frases',
    logDeleted: '🗑️ Eliminado #',
    logReset: '🔄 Reiniciar',
    logConferenceOn: '🔁 Modo conferencia: ON',
    logConferenceOff: '🔁 Modo conferencia: OFF',
    logError: '❌ ',
    
    modalTitle: '✏️ Editar y sugerencias',
    modalQuestion: '1️⃣ Pregunta',
    modalStatement: '2️⃣ Declaración',
    modalHint: '⌨️ 3-7: Sugerencia | Enter: voz | Esc: cancelar',
    modalNoMessages: '⚠️ No hay mensajes para editar',
    modalLoading: '🤖 Cargando...',
    modalNoSuggestions: 'Sin sugerencias',
    modalError: 'Error',
    modalEnableAI: 'Activar 🤖 IA para sugerencias',
    
    msgStatusWaiting: '🟡 Esperando',
    msgStatusVoicing: '🔊 Hablando...',
    msgStatusDone: '✅ Hablado'
  },
  
  fr: {
    appTitle: '🎙️ Traducteur Vocal',
    aiToggle: '🤖 IA',
    aiTopicPlaceholder: 'Sujet...',
    voiceLabel: '🎤 Voix:',
    previewBtnTitle: 'Aperçu',
    resetBtn: '🔄 Réinitialiser',
    startBtn: '▶️ Démarrer',
    stopBtn: '⏹️ Arrêter',
    testBtn: '🔊 Test',
    conferenceMode: '🔁 Mode conférence (VB-Cable)',
    statusStopped: '⏹️ Arrêté',
    statusRunning: '✅ En cours',
    youColumn: '🔵 Vous',
    partnerColumn: '🟢 Interlocuteur',
    footerHint: '🎤 Parlez → Tab pour éditer → Enter pour voix',
    languageLabel: '🌐',
    
    logInit: '🚀 Initialisation...',
    logConnected: '✅ Backend connecté',
    logReady: '✅ Prêt',
    logChatOpen: '✅ Chat ouvert',
    logTest: '🔊 Test...',
    logPlaying: '✅ Lecture: ',
    logVoiced: '🔊 Voix #',
    logNext: '🔊 Prochaine voix',
    logNoPhrases: '⚠️ Aucune phrase',
    logDeleted: '🗑️ Supprimé #',
    logReset: '🔄 Réinitialiser',
    logConferenceOn: '🔁 Mode conférence: ON',
    logConferenceOff: '🔁 Mode conférence: OFF',
    logError: '❌ ',
    
    modalTitle: '✏️ Éditer et suggestions',
    modalQuestion: '1️⃣ Question',
    modalStatement: '2️⃣ Déclaration',
    modalHint: '⌨️ 3-7: Suggestion | Enter: voix | Esc: annuler',
    modalNoMessages: '⚠️ Aucun message à éditer',
    modalLoading: '🤖 Chargement...',
    modalNoSuggestions: 'Aucune suggestion',
    modalError: 'Erreur',
    modalEnableAI: 'Activer 🤖 IA pour suggestions',
    
    msgStatusWaiting: '🟡 En attente',
    msgStatusVoicing: '🔊 Parole...',
    msgStatusDone: '✅ Parlé'
  }
};

let currentLang = localStorage.getItem('voiceTranslator_lang') || 'ru';

i18next.init({
  lng: currentLang,
  fallbackLng: 'ru',
  resources: {
    ru: { translation: TRANSLATIONS.ru },
    en: { translation: TRANSLATIONS.en },
    de: { translation: TRANSLATIONS.de },
    es: { translation: TRANSLATIONS.es },
    fr: { translation: TRANSLATIONS.fr }
  }
}, () => {
  applyTranslations();
});

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18next.t(key);
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = i18next.t(key);
  });
  
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = i18next.t(key);
  });
  
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    const isRunning = statusDiv.classList.contains('running');
    statusDiv.textContent = isRunning ? i18next.t('statusRunning') : i18next.t('statusStopped');
  }
  
  console.log(`🌐 Language: ${currentLang}`);
}

function changeLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('voiceTranslator_lang', lang);
    i18next.changeLanguage(lang, () => {
      applyTranslations();
    });
  }
}

function t(key) {
  return i18next.t(key);
}

window.t = t;
window.changeLanguage = changeLanguage;
window.applyTranslations = applyTranslations;
window.TRANSLATIONS = TRANSLATIONS;
window.currentLang = currentLang;