// frontend/translations.js

const TRANSLATIONS = {
  ru: {
    appTitle: 'TalkPilot',
    aiToggle: '🤖 AI',
    aiCardTitle: 'AI Ассистент',
    aiContextMenuTitle: 'Тема и контекст беседы',
    aiToggleRowLabel: 'AI подсказки ответов',
    aiHintLine: 'Нейросеть анализирует диалог и предлагает релевантные подсказки',
    aiToggleAriaLabel: 'AI подсказки ответов',
    aiAssistantToggleHintLocked: 'Доступно на тарифах Pro и Ultimate. Нажмите, чтобы узнать, как улучшить тариф.',
    aiAssistantUpgradeModalTitle: 'AI-ассистент недоступен',
    aiAssistantUpgradeModalHint: 'Подсказки AI и анализ диалога доступны на тарифах Pro и Ultimate. Улучшите тариф, чтобы включить их.',
    voiceCloneToggleHintLocked: 'Клонирование голоса для озвучки доступно с тарифа Ultimate и выше. Нажмите, чтобы узнать, как улучшить тариф.',
    voiceCloneUpgradeModalTitle: 'Клонирование голоса недоступно',
    voiceCloneUpgradeModalHint: 'Использование клонированных голосов для озвучки доступно на тарифе Ultimate, Team и Business (не входит в Pro). Улучшите тариф, чтобы включить эту возможность.',
    aiTopicPlaceholder: 'Тема...',
    voiceLabel: '🎤 Голос:',
    standardVoiceLabel: '🎤 Голос:',
    clonedVoiceLabel: '🎙️ Клон:',
    voiceCardTitle: 'Голос озвучки',
    useClonedVoiceLabel: 'Использовать клонированный голос',
    previewBtnTitle: 'Прослушать',
    resetBtn: '🔄 Сброс',
    startBtn: '▶️ Начать',
    stopBtn: '⏹️ Стоп',
    startBtnAria: 'Запустить перевод',
    stopBtnAria: 'Остановить перевод',
    testBtn: '🔊 Тест',
    conferenceMode: '🔁 Режим конференции (VB-Cable)',
    desktopScreenShareStealthLabel: '🖥️ Скрыть окно',
    desktopScreenShareStealthHint: 'Фон прозрачный, панели полупрозрачные; захват экрана часто не видит окно (зависит от ОС). Клики по пустым местам уходят в программу под окном; чтобы пользоваться переводчиком, наведите курсор на кнопку, чат или поле. Выключить: Ctrl+Shift+X или снять галочку.',
    desktopScreenShareStealthAria: 'Скрыть окно при демонстрации экрана (десктоп)',
    desktopAiRegionLabel: '🔲 Анализ области ИИ',
    desktopAiRegionHint: 'В режиме «прозрачного экрана»: коротко нажмите и отпустите левый Ctrl (без других клавиш — иначе не откроется, например при Ctrl+C). Появится затемнение: удерживая левый Ctrl, обведите область красной рамкой. Если не сработало — запасной вариант Ctrl+Shift+S. Ключ AITunnel в .env в корне проекта.',
    desktopAiRegionAria: 'Анализ выделенной области экрана с помощью ИИ (десктоп)',
    desktopWindowMinTitle: 'Свернуть',
    desktopWindowMinAria: 'Свернуть окно',
    desktopWindowCloseTitle: 'Закрыть',
    desktopWindowCloseAria: 'Закрыть приложение',
    desktopExtrasCardTitle: 'Окно и экран',
    desktopWindowMaxTitle: 'Развернуть',
    desktopWindowMaxAria: 'Развернуть окно',
    desktopWindowRestoreTitle: 'Восстановить',
    desktopWindowRestoreAria: 'Восстановить размер окна',
    desktopAccountMenuLabel: 'Аккаунт',
    desktopAccountMenuTitle: 'Аккаунт: личный кабинет и выход',
    desktopAccountCabinet: 'Личный кабинет',
    desktopAccountLogout: 'Выйти',
    desktopAiRegionPanelTitle: 'Подсказки ИИ',
    desktopAiRegionClose: 'Закрыть',
    desktopAiRegionAnalyzing: 'Анализ изображения…',
    desktopAiRegionError: 'Не удалось получить подсказки:',
    statusStopped: '⏹️ Остановлен',
    statusRunning: '✅ Запущен',
    statusTrialListening: '🎤 Слушаю…',
    statusTrialRecording: '🗣️ Записываю речь…',
    statusTrialPhrasePause: '⏸ Пауза…',
    statusTrialEncoding: '📦 Готовлю аудио…',
    statusTrialUploading: '📤 Отправляю на сервер…',
    statusTrialMicWarmup: '🎤 Микрофон включается…',
    statusTrialMicResume: '🎤 Возобновляю запись…',
    statusTrialProcessing: '⏳ Распознаю и перевожу…',
    statusTrialSpeaking: '🔊 Озвучиваю…',
    statusTrialSpeakingUser: '🔊 Озвучиваю вашу фразу…',
    statusTrialSpeakingPartner: '🔊 Собеседник говорит…',
    statusTrialWaitPlayback: '⏳ Жду окончания озвучки…',
    statusTrialPressPlay: '▶️ Нажмите Play у фразы',
    trialWaitPartnerPlayback: 'Подождите окончания озвучки — затем говорите.',
    trialMicListeningLog: '🎤 Говорите — микрофон включён (распознавание в браузере).',
    trialBootstrapWaitMic: 'Сначала приветствие собеседника, затем говорите в микрофон.',
    trialMicNoAccess: 'Нет доступа к микрофону. Разрешите доступ в настройках браузера (Chrome или Edge) и нажмите «Начать» снова.',
    trialMicBlockedBrowser: 'Микрофон заблокирован в браузере. Нажмите значок замка или перечёркнутого микрофона в адресной строке → «Разрешить» для микрофона → обновите страницу (F5) и снова «Начать». Используйте Chrome или Edge.',
    youColumn: '🔵 Вы',
    partnerColumn: '🟢 Собеседник',
    chatEmptyUserLine1: 'Нажмите «Начать» и говорите',
    chatEmptyUserLine2: 'Ваши фразы появятся здесь',
    chatEmptyPartnerLine1: 'Перевод собеседника появится здесь',
    chatEmptyPartnerLine2: 'Ответы будут озвучены',
    footerHint: '🎤 Говорите → Tab для редактирования → Enter для озвучки',
    footerHintManualPlay: '🎤 Говорите → Tab — правки → Enter или ▶ Play — озвучка',
    msgPlayBtn: 'Play',
    msgPlayAria: 'Озвучить сообщение',
    languageLabel: '🌐',
    languagePairTitle: 'Языковая пара',
    audioDevicesCardTitle: 'Микрофон и динамик',
    audioDevicesHint:
      'Два канала: выберите микрофон и динамик отдельно. Для Bluetooth — ввод: микрофон ПК, вывод: наушники.',
    audioDevicesPermissionHint:
      'Нажмите на список или «Начать» и разрешите доступ к микрофону — тогда появятся устройства.',
    audioInputDeviceLabel: '🎤 Микрофон (ввод)',
    audioOutputDeviceLabel: '🔊 Динамик (вывод)',
    audioDeviceDefault: 'По умолчанию (система)',
    audioDeviceUnlabeledInput: 'Микрофон',
    audioDeviceUnlabeledOutput: 'Динамик',
    audioDevicesSplitLog:
      '🔊 Раздельные устройства: микрофон и динамик независимы — озвучка без отключения захвата.',
    audioDeviceMicRestartFailed: 'Не удалось переключить микрофон. Проверьте устройство в меню чата.',
    audioDeviceMicFallback: 'Выбранный микрофон недоступен — используется устройство по умолчанию.',
    trialProcessingStuck:
      'Обработка зависла (сервер или озвучка). Нажмите «Стоп», освободите место на диске C:, обновите страницу (Ctrl+F5) и «Начать» снова.',
    trialMicHeard: '🎤 Слышу речь — продолжайте фразу, затем пауза 2 с.',
    trialMicSpeakLouder:
      'Микрофон тихий — говорите громче и ближе. Проверьте устройство «Микрофон» в меню чата.',
    trialUploadingSpeech: '⏳ Отправляю речь на распознавание…',
    browserStorageFull:
      'На диске C: мало места — Chrome не может сохранять данные. Освободите 1–2 ГБ и перезагрузите страницу.',
    trialUserVoicePlayHint:
      'Озвучка вашей фразы не стартовала — нажмите ▶ Play у сообщения. Проверьте «Динамик» в меню чата (Bluetooth-наушники).',
    micHintTrialPlayback: '🔊 Озвучка — микрофон на паузе',
    appearanceTitle: 'Оформление',
    fontSizeLabel: 'Размер шрифта',
    contrastLabel: 'Контрастность',
    contrastDefault: 'Обычный',
    contrastMedium: 'Средний',
    contrastHigh: 'Повышенный',
    themeDark: 'Темная',
    themeDarkViolet: 'Темная фиолетовая',
    themeLight: 'Светлая',
    themeLightSoft: 'Светлая мягкая',
    headerPlanLoading: '…',
    headerPlanNeedLogin: 'Войдите в аккаунт',
    headerPlanNeedLoginSub: 'тариф и минуты',
    headerPlanRemainPrefix: 'остаток:',
    headerPlanNoTariff: 'Нет активного тарифа',
    headerPlanOpenDashboardTariff: 'Открыть личный кабинет — тариф',
    startBlockedNoTariff: 'Нет оплаченного тарифа. Оформите подписку на странице «Тарифы».',
    startBlockedNoMinutes: 'Лимит минут исчерпан. Продлите или смените тариф в личном кабинете.',
    startMicError:
      '🎤 Не удалось открыть микрофон. Проверьте, что микрофон подключён и разрешён в Windows, закройте Zoom/Teams, выберите устройство по умолчанию в системе.',
    startMicRemoteServer:
      'Сессия запущена, но на этом сервере нет микрофона (VPS). Голосовой перевод с микрофоном работает только при локальном запуске Python на вашем ПК. Сайт на VPS: тариф, клоны, чат без live-mic.',
    startMicBrowserMode:
      '🎤 Микрофон браузера: говорите в микрофон ПК (Chrome/Edge). Режим VB-Cable на VPS не нужен — выключите «Conference Mode», если он включён.',
    browserMicError: 'Ошибка распознавания в браузере — разрешите микрофон для сайта.',
    browserMicRecording: '🎤 Микрофон браузера: идёт запись. Говорите в микрофон ПК.',
    browserMicRecordingPcm: '🎤 Микрофон браузера (WAV 16 kHz → Pro/AITunnel). Говорите в микрофон ПК.',
    desktopBasicWebSpeech:
      '🎤 Basic (десктоп): системное распознавание речи. Говорите в микрофон ПК, после фразы — пауза.',
    vpsMicExplain: 'На VPS нет серверного микрофона (в отличие от локального ПК). Запись идёт через браузер — говорите громко 5 сек.',
    browserMicSessionStopped: 'Сессия на сервере остановилась — нажмите «Начать» снова.',
    browserMicSessionRecovering: 'Восстанавливаем сессию записи…',
    voicePlayFailed: 'Озвучка не воспроизвелась: ',
    browserMicPhraseNotRecognized: 'Фраза не распознана — говорите громче и ближе к микрофону (3–5 сек).',
    browserMicDecodeFailed: 'Не удалось разобрать запись с микрофона — нажмите Стоп и Начать снова.',
    voicePlayBlockedHint: 'Звук не воспроизвёлся — нажмите Play у фразы ещё раз (лучше открыть https://…).',
    voicePlayServerNoSpeaker: 'На сервере нет динамиков — откройте сайт по https и нажмите Play у фразы.',
    proBrowserMicHint: 'Pro: AITunnel (на VPS медленнее, чем на ПК). Говорите фразу и делайте паузу ~1 сек — она уйдёт на распознавание.',
    browserMicConferenceAutoOff: 'Режим конференции (VB-Cable) отключён: на VPS запись идёт через микрофон браузера, не через кабель.',
    browserMicNoAccess: 'Нет доступа к микрофону — разрешите его для этого сайта в Chrome/Edge.',
    browserMicNeedsHttps: 'Переход на HTTPS — без него Chrome не даёт доступ к микрофону.',
    micHintBrowser: 'Микрофон браузера — запись',
    micHintBrowserWaiting: 'Микрофон: ожидание…',
    micHintQuiet: 'Тихо — говорите громче',
    micHintClip: 'Слишком громко',
    micHintOk: 'Уровень OK',
    startTimeoutError:
      'Сервер не успел ответить за 25 с. Запустите scripts/deploy-ui-start-fix.ps1 на ПК, затем Ctrl+F5. В списке голосов не должно быть «Загрузка…». Клонированный голос может быть выключен.',
    micErrorModalTitle: 'Не удалось запустить перевод',
    startTimeoutModalTitle: 'Сервер не ответил вовремя',
    chatSessionBusyError:
      'Микрофон занят другой сессией на этом сервере. Остановите другой клиент (веб или desktop) и попробуйте снова.',
    translatorPoolFullError:
      'Все линии перевода заняты (много пользователей онлайн). Нажмите «Начать» через 1–2 минуты или завершите другую вкладку с «Стоп».',
    modalWarmupStart: 'Разогрев модели клона на Modal…\nПервый запуск может занять 1–3 минуты.',
    modalWarmupReady: 'Модель клона на Modal готова',
    modalWarmupFailed:
      'Не удалось разогреть модель клона на Modal. Проверьте MODAL_CLONING_API_BASE и выполните modal deploy. Повторите «Начать».',
    subscriptionRequiredModalTitle: 'Нужен тариф для перевода',
    subscriptionRequiredModalHint:
      'У вас нет активной подписки. Выберите тариф и оплатите его, чтобы запускать перевод в чате.',
    subscriptionRequiredModalHintNoMinutes:
      'Лимит минут по текущему тарифу исчерпан. Продлите подписку или выберите другой тариф.',
    subscriptionRequiredModalPlans: 'Выбрать тариф',
    trainingBtn: '🎓 Обучение',
    trainingTitle: 'Обучение',
    trainingClose: 'Закрыть',
    trainingPrev: 'Назад',
    trainingNext: 'Далее',
    trainingFinish: 'Готово',
    trainingStepHeaderBrand: 'Логотип и название TalkPilot — главный экран переводчика.',
    trainingStepHeaderStart: 'Кнопка «Начать» запускает и останавливает перевод. При первом запуске откроется подсказка по настройке звука для конференций.',
    trainingStepHeaderPlan: 'Здесь отображаются ваш тариф и оставшиеся минуты перевода. Нажмите, чтобы открыть личный кабинет.',
    trainingStepHeaderTheme: 'Выбор темы оформления: тёмная, фиолетовая или светлая — как вам удобнее читать интерфейс.',
    trainingStepHeaderLang: 'Язык интерфейса переводчика: подписи кнопок, подсказки и меню настроек.',
    trainingStepHeaderMenu: 'Кнопка «Меню» открывает панель настроек снизу — распознавание, голос, языки и AI. Сейчас она раскроется.',
    trainingStepHeaderTraining: 'Кнопка «Обучение» в любой момент запускает этот тур по интерфейсу с начала.',
    trainingStepRecognition: 'Здесь выбирается режим распознавания: Basic для скорости, Pro для более точного распознавания.',
    trainingStepAutoplay: 'Блок озвучивания включает автоматическое воспроизведение ваших распознанных фраз.',
    trainingStepVoice: 'В этом блоке выбирается обычный или клонированный голос для озвучки и запускается предпрослушивание.',
    trainingStepLanguages: 'Настройте, на каком языке говорите вы и ваш собеседник, чтобы перевод шел в правильном направлении.',
    trainingStepAudioDevices: 'Выберите микрофон для записи речи и динамик для озвучки перевода. Для Bluetooth укажите микрофон ПК и наушники отдельно.',
    trainingStepPause: 'Пауза между фразами задает задержку перед отправкой распознанного текста в перевод.',
    trainingStepAiMode: 'Переключатель AI включает подсказки ответов прямо в панели справа.',
    trainingStepTopic: 'Тема и контекст беседы помогают AI точнее подбирать формулировки и подсказки.',
    trainingStepAppearance: 'Здесь можно менять размер шрифта и контраст интерфейса для комфортной работы.',
    trainingStepChat: 'Рабочая область диалога: слева ваши реплики, справа — собеседник, ещё правее подсказки AI.',
    trainingDemoMessageText: 'Здравствуйте, рад знакомству!',
    trainingDemoPartnerMessageText: 'Привет! Как дела?',
    trainingDemoPartnerMessageTranslated: 'Привет! Как у вас дела сегодня?',
    partnerClickForSuggestions: 'Нажмите на реплику собеседника — появятся подсказки ответов',
    trainingStepChatMessage: 'После распознавания ваша фраза появляется в колонке «Вы» — как в примере ниже.',
    trainingStepChatDelete: 'Крестик × удаляет фразу, если распознавание ошиблось.',
    trainingStepChatPlay: 'Кнопка Play вручную озвучивает фразу (когда автовоспроизведение выключено).',
    trainingStepChatStatus: 'Статус: ожидает озвучки, идёт озвучка или уже озвучено.',
    trainingStepChatTabOpen: 'Клавиша Tab открывает это окно: исправьте фразу, выберите «Вопрос» или «Утверждение».',
    trainingStepChatModalAi: 'Здесь AI предлагает варианты ответа. Нажмите цифру 3–7 на клавиатуре — выбранный текст появится в поле и в чате.',
    trainingStepChatAiPanel: 'Справа — «Подсказки ответов»: AI предлагает варианты ответа на реплику собеседника.',
    trainingStepFooterConference: 'Режим конференции: перевод уходит в виртуальный кабель (VB-Cable / BlackHole) для Zoom, Teams и других созвонов. При первом включении откроется подсказка по настройке.',
    trainingStepFooterHints: 'Центральная строка: «Говорите» — микрофон слушает; подсказки Tab и Enter — для правки фразы и озвучки.',
    trainingStepFooterStatus: 'Индикатор статуса: «Остановлен» — перевод не запущен; при работе покажет распознавание или озвучку.',
    trainingStepFooterMicLevel: '«Уровень» — шкала громкости сигнала с микрофона. Проверьте, что микрофон слышен перед разговором.',
    trainingStepFooterMicBtn: 'Кнопка 🎚 открывает настройки чувствительности микрофона и громкости вашей озвучки.',
    trainingStepFooterMicPanel: 'Здесь настраиваются чувствительность микрофона (порог срабатывания) и громкость озвучки ваших фраз.',
    trainingStepChatTabFooter: 'Напоминание: Tab — открыть редактирование фразы, Enter — озвучить.',
    trainingAiLoading: 'Загрузка подсказок…',
    trainingDemoSuggestion1: 'Да, согласен с вами.',
    trainingDemoSuggestion2: 'Можете уточнить, пожалуйста?',
    trainingDemoSuggestion3: 'Спасибо, это полезно.',
    trainingModalSuggestion1: 'Здравствуйте, приятно познакомиться!',
    trainingModalSuggestion2: 'Рад вас видеть, как дела?',
    trainingModalSuggestion3: 'Добрый день, как ваши успехи?',
    trainingModalSuggestion4: 'Приветствую, чем могу помочь?',
    trainingModalSuggestion5: 'Здравствуйте, как проходит ваша работа?',
    translationPauseLabel: '⏸️ Пауза перевода',
    chatMenuLabel: 'Меню',
    chatSettingsToggleTitle: 'Открыть/закрыть меню настроек чата',
    chatSettingsCollapseTitle: 'Свернуть меню',
    chatSettingsCollapseAria: 'Свернуть меню настроек',
    recognitionModeHint: 'Выберите режим распознавания',
    recognitionModeDiffHint: 'Basic — быстрее и экономнее, Pro — точнее распознавание и лучше качество в сложной речи.',
    autoPlayCardTitle: 'Озвучивание',
    autoPlaySectionHint: 'Автоматическое озвучивание моей фразы',
    autoPlayLabel: '🔊 Авто',
    autoPlayHintLine: 'После распознавания фраза будет озвучена на языке собеседника',
    aiTopicSettingsTitle: 'Тема и контекст для AI',
    cloneViaModalLabel: 'Modal',
    a11yFontLabel: '🔤',
    a11yContrastLabel: '◐',
    phrasePauseHint: 'Настройка паузы между фразами',
    phrasePauseLabel: 'Пауза между фразами',
    phrasePauseUnit: 'с',
    phrasePauseAdjustable: 'Регулируется',
    chatPreloaderText: 'Подключение к серверу…',
    columnResizerUserPartner: 'Изменить ширину колонок Вы/Собеседник',
    columnResizerChatAi: 'Изменить ширину чата и AI-панели',
    aiSuggestionsTitle: 'Подсказки ответов',
    aiSuggestionsLoading: 'Генерация подсказок...',
    aiTopicModalTitle: 'Тема и контекст беседы',
    aiTopicModalHint: 'Укажите тему и по желанию подробное описание — это улучшает распознавание речи и подсказки ответов.',
    aiTopicFieldTitle: 'Краткая тема',
    aiTopicFieldTitlePh: 'Например: переговоры о поставке оборудования',
    aiTopicFieldDesc: 'Описание контекста',
    aiTopicFieldDescPh: 'Ключевые детали беседы, терминология, роль собеседников, желаемый тон и цели разговора.',
    aiTopicCancel: 'Отмена',
    aiTopicSave: 'Сохранить',
    modeBasicBtnTitle: 'Бесплатное распознавание через Vosk',
    modeProBtnTitle: 'Точное распознавание через OpenAI/AITunnel',
    modeProBtnTitleLocked: 'Доступно на тарифах Pro и Ultimate. Нажмите, чтобы узнать, как улучшить тариф.',
    proUpgradeModalTitle: 'Режим Pro недоступен',
    proUpgradeModalHint: 'Точное распознавание Pro доступно на тарифах Pro и Ultimate. Улучшите тариф, чтобы включить его.',
    proUpgradeModalPlans: 'Тарифы',
    proUpgradeModalDashboard: 'Подписка в кабинете',
    proUpgradeModalClose: 'Понятно',
    micLevelLabel: 'Уровень',
    micSensitivityHint: 'Открыть настройку чувствительности микрофона',
    micSensitivityLabel: 'Чувствительность микрофона',
    userTtsVolumeLabel: 'Громкость озвучки (ваши фразы)',
    rangeStepDownAria: 'Уменьшить',
    rangeStepUpAria: 'Увеличить',
    
    logInit: '🚀 Инициализация...',
    logConnected: '✅ Бэкенд подключён',
    logReady: '✅ Готов',
    logChatOpen: '✅ Чат открыт',
    logStaleSessionStopped: '⏹️ Сессия с прошлой страницы остановлена — нажмите «Начать»',
    logTest: '🔊 Тест...',
    logPlaying: '✅ Воспроизводится: ',
    logVoiced: '🔊 Озвучено #',
    logNext: '🔊 Озвучена следующая',
    logNoPhrases: '⚠️ Нет фраз',
    logDeleted: '🗑️ Удалено #',
    logReset: '🔄 Сброс',
    logConferenceOn: '🔁 Режим конференции: ВКЛ',
    logConferenceOff: '🔁 Режим конференции: ВЫКЛ',
    logConferenceNoCable: '⚠️ VB-Cable не найден. Установите VB-Audio Cable и в Zoom/Teams выберите микрофон «CABLE Output». Без кабеля перевод слышите только вы.',
    logConferenceCableOk: '🔁 Звук для собеседника → {device}',
    confSetupModalTitle: 'Звук для видеоконференции',
    confSetupModalHint: 'Выберите программу встречи — покажем пошаговую настройку VB-Cable, чтобы собеседник слышал перевод.',
    confSetupCableHint: 'Шаг 1: проверьте виртуальный аудиокабель и при необходимости установите его.',
    confSetupAppsHint: 'Шаг 2: выберите программу для видеоконференции.',
    confSetupAppsHintSkipped: 'Шаг 1: выберите программу для видеоконференции.',
    confSetupGuideHint: 'Шаг 3: настройте звук в выбранной программе.',
    confSetupGuideHintSkipped: 'Шаг 2: настройте звук в выбранной программе.',
    confSetupCableLead: 'Проверьте: установлен ли у вас виртуальный аудиокабель — без него собеседник не услышит перевод в Zoom, Teams и других сервисах.',
    confSetupCableWindowsLine: 'Windows — VB-Audio Virtual Cable (бесплатно)',
    confSetupCableMacLine: 'macOS — BlackHole (бесплатно) или Loopback (платно)',
    confSetupDownloadWin: 'Скачать VB-Cable для Windows',
    confSetupDownloadMac: 'Скачать BlackHole для macOS',
    confSetupCableNote: 'После установки при необходимости перезагрузите компьютер, затем нажмите «Далее».',
    confSetupCableOsWin: 'Рекомендуется для вашей системы: Windows.',
    confSetupCableOsMac: 'Рекомендуется для вашей системы: macOS.',
    confSetupCableDetected: 'VB-Cable обнаружен на вашем компьютере.',
    confSetupCableDetectedServer: 'VB-Cable обнаружен на сервере переводчика (локальный режим).',
    confSetupCableCheckPermission:
      'Разрешите доступ к микрофону в браузере, чтобы проверить VB-Cable, или нажмите «Далее», если он уже установлен.',
    confSetupCableNotDetected:
      'VB-Cable не обнаружен в браузере на этом ПК. Установите драйвер по ссылке выше и перезагрузите компьютер при необходимости.',
    confSetupAppsLead: 'Выберите программу, с помощью которой будет проходить конференция:',
    confSetupBackToCable: '← Назад',
    confSetupBackToApps: '← К программам',
    confSetupBack: '← К программам',
    confSetupClose: 'Закрыть',
    confSetupSkipStart: 'Пропустить и запустить',
    confSetupCloseNoStart: 'Окно закрыто без запуска. Нажмите «Пропустить и запустить» или «Далее» → «Запустить перевод».',
    confSetupStart: 'Запустить перевод',
    confSetupPrev: 'Назад',
    confSetupNext: 'Далее',
    confSetupDontShow: 'Больше не показывать',
    confSetupStepOf: 'Шаг {{current}} из {{total}}',
    confAppZoom: 'Zoom',
    confAppMeet: 'Google Meet',
    confAppTeams: 'Microsoft Teams',
    confAppWebex: 'Cisco Webex',
    confAppTelegram: 'Telegram',
    confAppWhatsapp: 'WhatsApp',
    confAppOther: 'Любые приложения',
    confSetupStep1Title: 'Установите VB-Audio Cable',
    confSetupStep1Text: 'Скачайте VB-Audio Virtual Cable с vb-audio.com, установите драйвер и при необходимости перезагрузите компьютер.',
    confSetupStep2Title: 'Включите режим конференции',
    confSetupStep2Text: 'Внизу окна переводчика включите переключатель «Режим конференции (VB-Cable)» — так озвученный перевод пойдёт на виртуальный кабель.',
    confSetupStep3ZoomTitle: 'Звук в Zoom',
    confSetupStep3ZoomText:
      'В окне встречи Zoom нажмите стрелку ▼ рядом с кнопкой «Микрофон». В блоке «Select a Microphone» выберите CABLE Output (VB-Audio Virtual Cable) — через этот микрофон участники услышат перевод. В блоке «Select a Speaker» выберите свои наушники или колонки, чтобы слышать собеседника (как на скриншоте выше).',
    confSetupStep3MeetTitle: 'Звук в Google Meet',
    confSetupStep3MeetText:
      'В окне встречи Google Meet нажмите стрелку ▼ слева от кнопки микрофона. В появившемся меню выберите CABLE Output (VB-Audio Virtual Cable) для микрофона — участники услышат перевод. Для динамика выберите свои наушники или колонки, чтобы слышать собеседника (как на скриншоте выше).',
    confSetupStep3TeamsTitle: 'Звук в Microsoft Teams',
    confSetupStep3TeamsText:
      'Перед входом во встречу на экране подключения Teams выберите «Компьютерный звук». Для микрофона укажите CABLE Output (VB-Audio Virtual Cable) — участники услышат перевод. Для динамика выберите свои наушники или колонки, чтобы слышать собеседника (как на скриншоте выше).',
    confSetupStep3WebexTitle: 'Звук в Cisco Webex',
    confSetupStep3WebexText:
      'Перед началом совещания на web.webex.com нажмите стрелку ^ справа от кнопки «Выключить микрофон». В меню звука в разделе «Микрофон» выберите CABLE Output (VB-Audio Virtual Cable) — участники услышат перевод. В разделе динамика выберите свои наушники или колонки, чтобы слышать собеседника (как на скриншоте выше).',
    confSetupTelegramStep1Title: 'Настройки Telegram',
    confSetupTelegramStep1Text:
      'В Telegram откройте меню «Настройки» (Settings) и выберите пункт «Динамики и камера» (Speakers and Camera) — как на скриншоте выше.',
    confSetupTelegramStep2Title: 'Динамики и камера',
    confSetupTelegramStep2Text:
      'В разделе «Динамики и камера» для микрофона выберите CABLE Output (VB-Audio Virtual Cable) — собеседник услышит перевод. Для динамиков укажите свои наушники или колонки, чтобы слышать собеседника (как на скриншоте выше).',
    confSetupStep3WhatsappTitle: 'Звук в WhatsApp',
    confSetupStep3WhatsappText:
      'Во время звонка WhatsApp откройте настройки звука и выберите CABLE Output (VB-Audio Virtual Cable) в качестве микрофона — собеседник услышит перевод. Динамики оставьте на наушниках или колонках.',
    confSetupStep3OtherTitle: 'Звук в приложении',
    confSetupStep3OtherText:
      'В настройках звука выбранной программы укажите CABLE Output (VB-Audio Virtual Cable) для микрофона — участники услышат перевод. Динамики оставьте на наушниках или колонках, если приложение позволяет выбрать устройство воспроизведения.',
    confSetupStep4Title: 'Запустите перевод и встречу',
    confSetupStep4Text: 'Нажмите «Запустить перевод» в этом окне или кнопку «Начать» в переводчике, затем подключитесь к звонку — участники услышат перевод через выбранный микрофон.',
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
    msgStatusDone: '✅ Озвучено',
    msgStatusSent: '✓ Отправлено'
  },
  
  en: {
    appTitle: 'TalkPilot',
    aiToggle: '🤖 AI',
    aiCardTitle: 'AI Assistant',
    aiContextMenuTitle: 'Conversation topic and context',
    aiToggleRowLabel: 'AI reply suggestions',
    aiHintLine: 'The neural model analyzes the dialog and suggests relevant prompts',
    aiToggleAriaLabel: 'AI reply suggestions',
    aiAssistantToggleHintLocked: 'Included on Pro and Ultimate plans. Click to learn how to upgrade.',
    aiAssistantUpgradeModalTitle: 'AI assistant is not available',
    aiAssistantUpgradeModalHint: 'AI reply suggestions and dialog analysis are included with Pro and Ultimate plans. Upgrade your plan to enable them.',
    voiceCloneToggleHintLocked: 'Voice cloning for read-out is available on Ultimate, Team, and Business plans. Click to learn how to upgrade.',
    voiceCloneUpgradeModalTitle: 'Voice cloning is not available',
    voiceCloneUpgradeModalHint: 'Cloned voices for playback are included with Ultimate, Team, and Business plans (not included in Pro). Upgrade your plan to enable this feature.',
    aiTopicPlaceholder: 'Topic...',
    voiceLabel: '🎤 Voice:',
    standardVoiceLabel: '🎤 Voice:',
    clonedVoiceLabel: '🎙️ Clone:',
    voiceCardTitle: 'Voice output',
    useClonedVoiceLabel: 'Use cloned voice',
    previewBtnTitle: 'Preview',
    resetBtn: '🔄 Reset',
    startBtn: '▶️ Start',
    stopBtn: '⏹️ Stop',
    startBtnAria: 'Start translation',
    stopBtnAria: 'Stop translation',
    testBtn: '🔊 Test',
    conferenceMode: '🔁 Conference Mode (VB-Cable)',
    desktopScreenShareStealthLabel: '🖥️ Hide window',
    desktopScreenShareStealthHint: 'Transparent background and translucent panels; screen capture often omits the window (OS-dependent). Clicks on empty areas go to the app behind; move the pointer onto a button, chat, or field to use TalkPilot. Turn off with Ctrl+Shift+X or uncheck.',
    desktopScreenShareStealthAria: 'Hide window when screen sharing (desktop)',
    desktopAiRegionLabel: '🔲 AI screen region',
    desktopAiRegionHint: 'In transparent screen mode: tap and release Left Ctrl alone (no other keys — e.g. not Ctrl+C). A dim overlay appears; hold Left Ctrl and drag to draw a red frame. Fallback: Ctrl+Shift+S if the global hook did not load. AITunnel key in project root .env.',
    desktopAiRegionAria: 'AI analysis of a screen region (desktop)',
    desktopWindowMinTitle: 'Minimize',
    desktopWindowMinAria: 'Minimize window',
    desktopWindowCloseTitle: 'Close',
    desktopWindowCloseAria: 'Close application',
    desktopExtrasCardTitle: 'Window & screen',
    desktopWindowMaxTitle: 'Maximize',
    desktopWindowMaxAria: 'Maximize window',
    desktopWindowRestoreTitle: 'Restore down',
    desktopWindowRestoreAria: 'Restore window size',
    desktopAccountMenuLabel: 'Account',
    desktopAccountMenuTitle: 'Account: cabinet and sign out',
    desktopAccountCabinet: 'Personal account',
    desktopAccountLogout: 'Sign out',
    desktopAiRegionPanelTitle: 'AI hints',
    desktopAiRegionClose: 'Close',
    desktopAiRegionAnalyzing: 'Analyzing image…',
    desktopAiRegionError: 'Could not get hints:',
    statusStopped: '⏹️ Stopped',
    statusRunning: '✅ Running',
    statusTrialListening: '🎤 Listening…',
    statusTrialRecording: '🗣️ Recording…',
    statusTrialPhrasePause: '⏸ Pause…',
    statusTrialEncoding: '📦 Preparing audio…',
    statusTrialUploading: '📤 Sending to server…',
    statusTrialMicWarmup: '🎤 Mic starting…',
    statusTrialMicResume: '🎤 Resuming mic…',
    statusTrialProcessing: '⏳ Recognizing & translating…',
    statusTrialSpeaking: '🔊 Playing…',
    statusTrialSpeakingUser: '🔊 Playing your phrase…',
    statusTrialSpeakingPartner: '🔊 Partner speaking…',
    statusTrialWaitPlayback: '⏳ Waiting for playback…',
    statusTrialPressPlay: '▶️ Press Play on your phrase',
    trialWaitPartnerPlayback: 'Wait until playback ends, then speak.',
    trialMicListeningLog: '🎤 Speak now — microphone on (browser recognition).',
    trialBootstrapWaitMic: 'Partner greeting first, then speak into your microphone.',
    trialMicNoAccess: 'Microphone access denied. Allow it in browser settings (Chrome or Edge) and press Start again.',
    trialMicBlockedBrowser: 'Microphone is blocked in the browser. Click the lock or crossed-out mic icon in the address bar → Allow microphone → refresh (F5) and press Start again. Use Chrome or Edge.',
    youColumn: '🔵 You',
    partnerColumn: '🟢 Partner',
    chatEmptyUserLine1: 'Press Start and speak',
    chatEmptyUserLine2: 'Your phrases will appear here',
    chatEmptyPartnerLine1: "Your partner's translation will appear here",
    chatEmptyPartnerLine2: 'Replies will be voiced',
    footerHint: '🎤 Speak → Tab to edit → Enter to voice',
    footerHintManualPlay: '🎤 Speak → Tab to edit → Enter or ▶ Play to voice',
    msgPlayBtn: 'Play',
    msgPlayAria: 'Voice this message',
    languageLabel: '🌐',
    languagePairTitle: 'Language pair',
    audioDevicesCardTitle: 'Microphone & speaker',
    audioDevicesHint:
      'Pick input and output separately. For Bluetooth: input = PC mic, output = headphones.',
    audioDevicesPermissionHint:
      'Click the list or press Start and allow microphone access — your devices will then appear.',
    audioInputDeviceLabel: '🎤 Microphone (input)',
    audioOutputDeviceLabel: '🔊 Speaker (output)',
    audioDeviceDefault: 'System default',
    audioDeviceUnlabeledInput: 'Microphone',
    audioDeviceUnlabeledOutput: 'Speaker',
    audioDevicesSplitLog:
      '🔊 Split devices: mic and speaker are independent — playback without stopping capture.',
    audioDeviceMicRestartFailed: 'Could not switch microphone. Check the device in chat settings.',
    audioDeviceMicFallback: 'Selected microphone unavailable — using system default.',
    trialProcessingStuck:
      'Processing stuck. Press Stop, free disk space on C:, refresh (Ctrl+F5), and press Start again.',
    trialMicHeard: '🎤 Speech detected — finish your phrase, then pause 2s.',
    trialMicSpeakLouder:
      'Mic level is low — speak louder and closer. Check Microphone in chat settings.',
    trialUploadingSpeech: '⏳ Sending speech for recognition…',
    browserStorageFull:
      'Low disk space on C: — Chrome cannot store data. Free 1–2 GB and reload the page.',
    trialUserVoicePlayHint:
      'Your phrase did not play — press ▶ Play on the message. Check Speaker in chat settings (Bluetooth headphones).',
    micHintTrialPlayback: '🔊 Playing — mic paused',
    appearanceTitle: 'Appearance',
    fontSizeLabel: 'Font size',
    contrastLabel: 'Contrast',
    contrastDefault: 'Default',
    contrastMedium: 'Medium',
    contrastHigh: 'High contrast',
    themeDark: 'Dark',
    themeDarkViolet: 'Dark violet',
    themeLight: 'Light',
    themeLightSoft: 'Light soft',
    headerPlanLoading: '…',
    headerPlanNeedLogin: 'Sign in',
    headerPlanNeedLoginSub: 'plan & minutes',
    headerPlanRemainPrefix: 'left:',
    headerPlanNoTariff: 'No active plan',
    headerPlanOpenDashboardTariff: 'Open account — plan',
    startBlockedNoTariff: 'No paid plan. Choose a plan on the Pricing page.',
    startBlockedNoMinutes: 'Minute limit reached. Renew or upgrade in your account.',
    startMicError:
      'Could not open the microphone. Check that it is connected and allowed in Windows, close Zoom/Teams, and set the default recording device in system settings.',
    startMicRemoteServer:
      'Session started, but this server has no microphone (VPS). Live voice translation requires running Python locally on your PC. On VPS: billing, clones, chat without live mic.',
    startMicBrowserMode:
      '🎤 Browser microphone: speak into your PC mic (Chrome/Edge). VB-Cable is not used on VPS — turn off Conference Mode if it is on.',
    browserMicError: 'Browser speech recognition failed — allow microphone access for this site.',
    browserMicRecording: '🎤 Browser mic: recording. Speak into your PC microphone.',
    browserMicRecordingPcm: '🎤 Browser mic (WAV 16 kHz → Pro/AITunnel). Speak into your PC mic.',
    desktopBasicWebSpeech:
      '🎤 Basic (desktop): system speech recognition. Speak into your PC mic, then pause after each phrase.',
    vpsMicExplain: 'VPS has no server microphone (unlike local PC). Audio goes via browser — speak loudly for 5 sec.',
    browserMicSessionStopped: 'Server session stopped — click Start again.',
    browserMicSessionRecovering: 'Recovering recording session…',
    voicePlayFailed: 'Playback failed: ',
    browserMicPhraseNotRecognized: 'Phrase not recognized — speak louder, closer to the mic (3–5 sec).',
    browserMicDecodeFailed: 'Could not decode mic recording — click Stop and Start again.',
    voicePlayBlockedHint: 'Audio did not play — click Play on the phrase again (prefer https://…).',
    voicePlayServerNoSpeaker: 'No speakers on the server — use https:// and click Play on the phrase.',
    proBrowserMicHint: 'Pro: AITunnel (slower on VPS than on PC). Speak a phrase, pause ~1 sec — then it is sent for recognition.',
    browserMicConferenceAutoOff: 'Conference mode (VB-Cable) turned off: on VPS recording uses the browser mic, not a virtual cable.',
    browserMicNoAccess: 'Microphone access denied — allow it for this site in Chrome/Edge.',
    browserMicNeedsHttps: 'Switching to HTTPS — Chrome blocks the microphone on HTTP.',
    micHintBrowser: 'Browser mic — recording',
    micHintBrowserWaiting: 'Mic: waiting…',
    micHintQuiet: 'Too quiet — speak louder',
    micHintClip: 'Too loud',
    micHintOk: 'Level OK',
    startTimeoutError:
      'Server timed out (25s). Run scripts/deploy-ui-start-fix.ps1 from your PC, then hard-refresh. Voice dropdown must not show "Loading…". Cloned voice can stay off.',
    micErrorModalTitle: 'Could not start translation',
    startTimeoutModalTitle: 'Server timed out',
    chatSessionBusyError:
      'The microphone is in use by another session on this server. Stop the other client (web or desktop) and try again.',
    translatorPoolFullError:
      'All translation lines are busy. Try «Start» again in 1–2 minutes, or press «Stop» in another tab.',
    modalWarmupStart: 'Warming up clone model on Modal…\nFirst start may take 1–3 minutes.',
    modalWarmupReady: 'Modal clone model is ready',
    modalWarmupFailed:
      'Could not warm up the clone model on Modal. Check MODAL_CLONING_API_BASE and run modal deploy, then try Start again.',
    subscriptionRequiredModalTitle: 'A plan is required to translate',
    subscriptionRequiredModalHint:
      'You do not have an active subscription. Choose and pay for a plan to start translation in chat.',
    subscriptionRequiredModalHintNoMinutes:
      'Your minute limit is used up. Renew your subscription or choose another plan.',
    subscriptionRequiredModalPlans: 'View plans',
    trainingBtn: '🎓 Training',
    trainingTitle: 'Training',
    trainingClose: 'Close',
    trainingPrev: 'Back',
    trainingNext: 'Next',
    trainingFinish: 'Finish',
    trainingStepHeaderBrand: 'TalkPilot logo and title — this is your main translation screen.',
    trainingStepHeaderStart: 'Start/stop translation here. On first start, a conference audio setup guide may appear.',
    trainingStepHeaderPlan: 'Your plan and remaining translation minutes. Click to open the dashboard.',
    trainingStepHeaderTheme: 'Pick a theme: dark, violet, or light — whichever is easier on your eyes.',
    trainingStepHeaderLang: 'Interface language for buttons, hints, and settings labels.',
    trainingStepHeaderMenu: 'Menu opens the settings panel below — recognition, voice, languages, and AI. It will expand now.',
    trainingStepHeaderTraining: 'Training restarts this interface tour anytime from the beginning.',
    trainingStepRecognition: 'Choose recognition mode here: Basic for speed, Pro for better accuracy.',
    trainingStepAutoplay: 'Voicing block enables automatic playback of your recognized phrases.',
    trainingStepVoice: 'Pick standard or cloned output voice here and preview the selected voice.',
    trainingStepLanguages: 'Set your language and partner language so translation flows in the right direction.',
    trainingStepAudioDevices: 'Choose the microphone for speech input and speaker for translation output. For Bluetooth, set PC mic and headphones separately.',
    trainingStepPause: 'Phrase pause controls delay before recognized speech is sent for translation.',
    trainingStepAiMode: 'AI toggle enables reply suggestions in the right-side panel.',
    trainingStepTopic: 'Conversation topic and context help AI generate more relevant suggestions.',
    trainingStepAppearance: 'Adjust font size and contrast here for comfortable reading.',
    trainingStepChat: 'Dialog workspace: your lines on the left, partner on the right, AI hints further right.',
    trainingDemoMessageText: 'Hello, nice to meet you!',
    trainingDemoPartnerMessageText: 'Hello! How are you doing today?',
    trainingDemoPartnerMessageTranslated: 'Hello! How are you doing today?',
    partnerClickForSuggestions: 'Click a partner message to see reply suggestions',
    trainingStepChatMessage: 'After recognition, your phrase appears in the You column — like the example below.',
    trainingStepChatDelete: 'The × button deletes the phrase if recognition was wrong.',
    trainingStepChatPlay: 'Play manually voices the phrase when auto-play is off.',
    trainingStepChatStatus: 'Status: waiting to voice, voicing in progress, or already voiced.',
    trainingStepChatTabOpen: 'Tab opens this window: edit the phrase and pick Question or Statement.',
    trainingStepChatModalAi: 'AI suggests reply options here. Press 3–7 on the keyboard — the text appears in the field and in the chat.',
    trainingStepChatAiPanel: 'On the right: Answer hints — AI suggests replies to the partner phrase.',
    trainingStepFooterConference: 'Conference mode routes translation to a virtual cable (VB-Cable / BlackHole) for Zoom, Teams, and other calls. First enable opens a setup guide.',
    trainingStepFooterHints: 'Center bar: Speak — the mic is listening; Tab and Enter hints are for editing and voicing phrases.',
    trainingStepFooterStatus: 'Status indicator: Stopped means translation is off; while running it shows recognition or playback.',
    trainingStepFooterMicLevel: 'Level shows incoming microphone volume — check that the mic is heard before you talk.',
    trainingStepFooterMicBtn: 'The 🎚 button opens microphone sensitivity and your phrase playback volume.',
    trainingStepFooterMicPanel: 'Adjust microphone sensitivity (trigger threshold) and the volume of your voiced phrases here.',
    trainingStepChatTabFooter: 'Reminder: Tab — open phrase editing, Enter — voice it.',
    trainingAiLoading: 'Loading suggestions…',
    trainingDemoSuggestion1: 'Yes, I agree with you.',
    trainingDemoSuggestion2: 'Could you clarify, please?',
    trainingDemoSuggestion3: 'Thank you, that helps.',
    trainingModalSuggestion1: 'Hello, nice to meet you!',
    trainingModalSuggestion2: 'Good to see you — how are you?',
    trainingModalSuggestion3: 'Good day, how are things going?',
    trainingModalSuggestion4: 'Greetings, how can I help?',
    trainingModalSuggestion5: 'Hello, how is your work going?',
    translationPauseLabel: '⏸️ Translation pause',
    chatMenuLabel: 'Menu',
    chatSettingsToggleTitle: 'Open/close chat settings menu',
    chatSettingsCollapseTitle: 'Collapse menu',
    chatSettingsCollapseAria: 'Collapse settings menu',
    recognitionModeHint: 'Select recognition mode',
    recognitionModeDiffHint: 'Basic is faster and lighter, Pro gives better recognition accuracy for complex speech.',
    autoPlayCardTitle: 'Voicing',
    autoPlaySectionHint: 'Automatic playback of my phrase',
    autoPlayLabel: '🔊 Auto',
    autoPlayHintLine: 'After recognition, the phrase will be voiced in the partner language',
    aiTopicSettingsTitle: 'AI topic and context',
    cloneViaModalLabel: 'Modal',
    a11yFontLabel: '🔤',
    a11yContrastLabel: '◐',
    phrasePauseHint: 'Pause between phrases setting',
    phrasePauseLabel: 'Pause between phrases',
    phrasePauseUnit: 's',
    phrasePauseAdjustable: 'Adjustable',
    chatPreloaderText: 'Connecting to server…',
    columnResizerUserPartner: 'Resize You/Partner columns',
    columnResizerChatAi: 'Resize chat and AI panel',
    aiSuggestionsTitle: 'Reply suggestions',
    aiSuggestionsLoading: 'Generating suggestions...',
    aiTopicModalTitle: 'Conversation topic and context',
    aiTopicModalHint: 'Set a topic and optional details to improve speech recognition and reply suggestions.',
    aiTopicFieldTitle: 'Short topic',
    aiTopicFieldTitlePh: 'For example: supplier contract negotiation',
    aiTopicFieldDesc: 'Context description',
    aiTopicFieldDescPh: 'Important details, terminology, participant roles, preferred tone, and dialogue goals.',
    aiTopicCancel: 'Cancel',
    aiTopicSave: 'Save',
    modeBasicBtnTitle: 'Free recognition via Vosk',
    modeProBtnTitle: 'Accurate recognition via OpenAI/AITunnel',
    modeProBtnTitleLocked: 'Included on Pro and Ultimate plans. Click to learn how to upgrade.',
    proUpgradeModalTitle: 'Pro mode is not available',
    proUpgradeModalHint: 'Pro recognition is included with Pro and Ultimate plans. Upgrade your plan to enable it.',
    proUpgradeModalPlans: 'View plans',
    proUpgradeModalDashboard: 'Subscription in account',
    proUpgradeModalClose: 'Got it',
    micLevelLabel: 'Level',
    micSensitivityHint: 'Open microphone sensitivity settings',
    micSensitivityLabel: 'Microphone sensitivity',
    userTtsVolumeLabel: 'Playback volume (your phrases)',
    rangeStepDownAria: 'Decrease',
    rangeStepUpAria: 'Increase',
    
    logInit: '🚀 Initializing...',
    logConnected: '✅ Backend connected',
    logReady: '✅ Ready',
    logChatOpen: '✅ Chat opened',
    logStaleSessionStopped: '⏹️ Previous session stopped — click Start',
    logTest: '🔊 Test...',
    logPlaying: '✅ Playing: ',
    logVoiced: '🔊 Voiced #',
    logNext: '🔊 Next voiced',
    logNoPhrases: '⚠️ No phrases',
    logDeleted: '🗑️ Deleted #',
    logReset: '🔄 Reset',
    logConferenceOn: '🔁 Conference Mode: ON',
    logConferenceOff: '🔁 Conference Mode: OFF',
    logConferenceNoCable: '⚠️ VB-Cable not found. Install VB-Audio Cable and set Zoom/Teams mic to «CABLE Output». Without it, only you hear the translation.',
    logConferenceCableOk: '🔁 Partner audio route → {device}',
    confSetupModalTitle: 'Conference audio setup',
    confSetupModalHint: 'Choose your meeting app — we will show step-by-step VB-Cable setup so participants hear the translation.',
    confSetupCableHint: 'Step 1: check the virtual audio cable and install it if needed.',
    confSetupAppsHint: 'Step 2: choose your meeting app.',
    confSetupAppsHintSkipped: 'Step 1: choose your meeting app.',
    confSetupGuideHint: 'Step 3: configure audio in the selected app.',
    confSetupGuideHintSkipped: 'Step 2: configure audio in the selected app.',
    confSetupCableLead: 'Check whether a virtual audio cable is installed — without it, meeting participants will not hear the translation in Zoom, Teams, and similar apps.',
    confSetupCableWindowsLine: 'Windows — VB-Audio Virtual Cable (free)',
    confSetupCableMacLine: 'macOS — BlackHole (free) or Loopback (paid)',
    confSetupDownloadWin: 'Download VB-Cable for Windows',
    confSetupDownloadMac: 'Download BlackHole for macOS',
    confSetupCableNote: 'Reboot if required after installation, then click «Next».',
    confSetupCableOsWin: 'Recommended for your system: Windows.',
    confSetupCableOsMac: 'Recommended for your system: macOS.',
    confSetupCableDetected: 'VB-Cable detected on your computer.',
    confSetupCableDetectedServer: 'VB-Cable detected on the translator server (local mode).',
    confSetupCableCheckPermission:
      'Allow microphone access in the browser to verify VB-Cable, or click «Next» if it is already installed.',
    confSetupCableNotDetected:
      'VB-Cable was not found in the browser on this PC. Install the driver using the link above and reboot if needed.',
    confSetupAppsLead: 'Choose the app you will use for the conference:',
    confSetupBackToCable: '← Back',
    confSetupBackToApps: '← Apps',
    confSetupBack: '← Apps',
    confSetupClose: 'Close',
    confSetupSkipStart: 'Skip and start',
    confSetupCloseNoStart: 'Closed without starting. Use «Skip and start» or go through «Next» → «Start translation».',
    confSetupStart: 'Start translation',
    confSetupPrev: 'Back',
    confSetupNext: 'Next',
    confSetupDontShow: "Don't show again",
    confSetupStepOf: 'Step {{current}} of {{total}}',
    confAppZoom: 'Zoom',
    confAppMeet: 'Google Meet',
    confAppTeams: 'Microsoft Teams',
    confAppWebex: 'Cisco Webex',
    confAppTelegram: 'Telegram',
    confAppWhatsapp: 'WhatsApp',
    confAppOther: 'Any application',
    confSetupStep1Title: 'Install VB-Audio Cable',
    confSetupStep1Text: 'Download VB-Audio Virtual Cable from vb-audio.com, install the driver, and reboot if Windows prompts you.',
    confSetupStep2Title: 'Enable conference mode',
    confSetupStep2Text: 'At the bottom of the translator window, turn on «Conference Mode (VB-Cable)» so translated speech is routed to the virtual cable.',
    confSetupStep3ZoomTitle: 'Audio in Zoom',
    confSetupStep3ZoomText:
      'In the Zoom meeting window, click the ▼ arrow next to Mute. Under «Select a Microphone», choose CABLE Output (VB-Audio Virtual Cable) — participants will hear the translation through this mic. Under «Select a Speaker», choose your headphones or speakers so you can hear the other person (as shown above).',
    confSetupStep3MeetTitle: 'Audio in Google Meet',
    confSetupStep3MeetText:
      'In the Google Meet window, click the ▼ arrow to the left of the microphone button. In the menu, choose CABLE Output (VB-Audio Virtual Cable) for the microphone — participants will hear the translation. For the speaker, choose your headphones or speakers so you can hear the other person (as shown above).',
    confSetupStep3TeamsTitle: 'Audio in Microsoft Teams',
    confSetupStep3TeamsText:
      'On the Teams pre-join screen, select Computer audio. Set the microphone to CABLE Output (VB-Audio Virtual Cable) — participants will hear the translation. For the speaker, choose your headphones or speakers so you can hear the other person (as shown above).',
    confSetupStep3WebexTitle: 'Audio in Cisco Webex',
    confSetupStep3WebexText:
      'Before starting the meeting on web.webex.com, click the ^ arrow to the right of the Mute button. In the audio menu, under Microphone, choose CABLE Output (VB-Audio Virtual Cable) — participants will hear the translation. For the speaker, choose your headphones or speakers so you can hear the other person (as shown above).',
    confSetupTelegramStep1Title: 'Telegram settings',
    confSetupTelegramStep1Text:
      'In Telegram, open the menu → Settings and choose «Speakers and Camera», as shown above.',
    confSetupTelegramStep2Title: 'Speakers and Camera',
    confSetupTelegramStep2Text:
      'Under Speakers and Camera, set Microphone to CABLE Output (VB-Audio Virtual Cable) — the other person will hear the translation. For speakers, choose your headphones or speakers (as shown above).',
    confSetupStep3WhatsappTitle: 'Audio in WhatsApp',
    confSetupStep3WhatsappText:
      'During a WhatsApp call, open audio settings and choose CABLE Output (VB-Audio Virtual Cable) as the microphone — the other person will hear the translation. Keep speakers on your headphones or speakers.',
    confSetupStep3OtherTitle: 'Audio in your app',
    confSetupStep3OtherText:
      'In the selected app’s audio settings, set the microphone to CABLE Output (VB-Audio Virtual Cable) — participants will hear the translation. Use your headphones or speakers for playback if the app lets you choose an output device.',
    confSetupStep4Title: 'Start translation and join',
    confSetupStep4Text: 'Click «Start translation» here or «Start» in the translator, then join the call — participants will hear translation through the selected microphone.',
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
    msgStatusDone: '✅ Voiced',
    msgStatusSent: '✓ Sent'
  },
  
  de: {
    appTitle: 'Sprachübersetzer',
    aiToggle: '🤖 KI',
    aiCardTitle: 'KI Assistent',
    aiContextMenuTitle: 'Thema und Gespraechskontext',
    aiToggleRowLabel: 'KI Antwortvorschlaege',
    aiHintLine: 'Das KI-Modell analysiert den Dialog und schlaegt passende Hinweise vor',
    aiToggleAriaLabel: 'KI-Antwortvorschlaege',
    aiAssistantToggleHintLocked: 'In Pro- und Ultimate-Tarifen enthalten. Klicken Sie, um ein Upgrade zu erfahren.',
    aiAssistantUpgradeModalTitle: 'KI-Assistent nicht verfügbar',
    aiAssistantUpgradeModalHint: 'KI-Vorschläge und Dialoganalyse sind in Pro- und Ultimate-Paketen enthalten. Wählen Sie ein passendes Paket oder upgraden Sie im Konto.',
    voiceCloneToggleHintLocked: 'Stimmklon für die Ausgabe ist ab Ultimate-Paket verfügbar. Klicken Sie, um ein Upgrade zu prüfen.',
    voiceCloneUpgradeModalTitle: 'Stimmklon nicht verfügbar',
    voiceCloneUpgradeModalHint: 'Klonstimmen für die Ausgabe sind in Ultimate-, Team- und Business-Paketen enthalten (nicht in Pro). Upgraden Sie Ihr Paket, um diese Funktion zu aktivieren.',
    aiTopicPlaceholder: 'Thema...',
    voiceLabel: '🎤 Stimme:',
    standardVoiceLabel: '🎤 Stimme:',
    clonedVoiceLabel: '🎙️ Klon:',
    voiceCardTitle: 'Ausgabestimme',
    useClonedVoiceLabel: 'Klonstimme verwenden',
    previewBtnTitle: 'Vorschau',
    resetBtn: '🔄 Zurücksetzen',
    startBtn: '▶️ Start',
    stopBtn: '⏹️ Stopp',
    startBtnAria: 'Übersetzung starten',
    stopBtnAria: 'Übersetzung stoppen',
    testBtn: '🔊 Test',
    conferenceMode: '🔁 Konferenzmodus (VB-Cable)',
    desktopScreenShareStealthLabel: '🖥️ Fenster ausblenden',
    desktopScreenShareStealthHint: 'Transparenter Hintergrund, halbtransparente Leisten; Bildschirmaufnahmen zeigen das Fenster oft nicht (OS-abhängig). Klicks auf freie Flächen gehen an die Anwendung dahinter; zum Bedienen des Translators Maus auf Schaltfläche, Chat oder Eingabefeld bewegen. Aus mit Strg+Umschalt+X oder Häkchen entfernen.',
    desktopScreenShareStealthAria: 'Fenster bei Bildschirmfreigabe ausblenden (Desktop)',
    desktopAiRegionLabel: '🔲 KI-Bereichsanalyse',
    desktopAiRegionHint: 'Im Modus „transparenter Bildschirm“: Linke Strg-Taste kurz drücken und loslassen (ohne andere Taste). Dann linke Strg halten und Bereich aufziehen. Fallback: Strg+Umschalt+S. AITunnel-Schlüssel in .env im Projektroot.',
    desktopAiRegionAria: 'KI-Analyse eines Bildschirmbereichs (Desktop)',
    desktopWindowMinTitle: 'Minimieren',
    desktopWindowMinAria: 'Fenster minimieren',
    desktopWindowCloseTitle: 'Schliessen',
    desktopWindowCloseAria: 'Anwendung schliessen',
    desktopExtrasCardTitle: 'Fenster & Bildschirm',
    desktopWindowMaxTitle: 'Maximieren',
    desktopWindowMaxAria: 'Fenster maximieren',
    desktopWindowRestoreTitle: 'Wiederherstellen',
    desktopWindowRestoreAria: 'Fenstergroesse wiederherstellen',
    desktopAccountMenuLabel: 'Konto',
    desktopAccountMenuTitle: 'Konto: Bereich und Abmelden',
    desktopAccountCabinet: 'Persoenlicher Bereich',
    desktopAccountLogout: 'Abmelden',
    desktopAiRegionPanelTitle: 'KI-Hinweise',
    desktopAiRegionClose: 'Schließen',
    desktopAiRegionAnalyzing: 'Bild wird analysiert…',
    desktopAiRegionError: 'Hinweise konnten nicht geladen werden:',
    statusStopped: '⏹️ Gestoppt',
    statusRunning: '✅ Läuft',
    youColumn: '🔵 Sie',
    partnerColumn: '🟢 Gesprächspartner',
    chatEmptyUserLine1: '„Start“ drücken und sprechen',
    chatEmptyUserLine2: 'Ihre Sätze erscheinen hier',
    chatEmptyPartnerLine1: 'Die Übersetzung des Partners erscheint hier',
    chatEmptyPartnerLine2: 'Antworten werden vorgelesen',
    footerHint: '🎤 Sprechen → Tab zum Bearbeiten → Enter für Stimme',
    footerHintManualPlay: '🎤 Sprechen → Tab — Bearbeiten → Enter oder ▶ Play',
    msgPlayBtn: 'Play',
    msgPlayAria: 'Nachricht sprechen',
    languageLabel: '🌐',
    languagePairTitle: 'Sprachpaar',
    audioDevicesCardTitle: 'Mikrofon & Lautsprecher',
    audioDevicesHint:
      'Zwei Kanäle: Mikrofon und Lautsprecher getrennt wählen. Bei Bluetooth — Eingang: PC-Mikrofon, Ausgang: Kopfhörer.',
    audioInputDeviceLabel: '🎤 Mikrofon (Eingang)',
    audioOutputDeviceLabel: '🔊 Lautsprecher (Ausgang)',
    audioDeviceDefault: 'Systemstandard',
    audioDeviceUnlabeledInput: 'Mikrofon',
    audioDeviceUnlabeledOutput: 'Lautsprecher',
    audioDevicesSplitLog:
      '🔊 Getrennte Geräte: Mikrofon und Lautsprecher unabhängig — Wiedergabe ohne Aufnahmestopp.',
    audioDeviceMicRestartFailed: 'Mikrofonwechsel fehlgeschlagen. Gerät im Chat-Menü prüfen.',
    audioDeviceMicFallback: 'Gewähltes Mikrofon nicht verfügbar — Systemstandard wird verwendet.',
    appearanceTitle: 'Darstellung',
    fontSizeLabel: 'Schriftgroesse',
    contrastLabel: 'Kontrast',
    contrastDefault: 'Standard',
    contrastMedium: 'Mittel',
    contrastHigh: 'Hoher Kontrast',
    themeDark: 'Dunkel',
    themeDarkViolet: 'Dunkel violett',
    themeLight: 'Hell',
    themeLightSoft: 'Hell weich',
    headerPlanLoading: '…',
    headerPlanNeedLogin: 'Anmelden',
    headerPlanNeedLoginSub: 'Tarif & Minuten',
    headerPlanRemainPrefix: 'Rest:',
    headerPlanNoTariff: 'Kein aktiver Tarif',
    headerPlanOpenDashboardTariff: 'Konto öffnen — Tarif und Guthaben',
    startBlockedNoTariff: 'Kein bezahlter Tarif. Wählen Sie einen Plan auf der Seite «Preise».',
    startBlockedNoMinutes: 'Minutenlimit erreicht. Verlängern oder im Konto upgraden.',
    startMicError:
      'Mikrofon konnte nicht geöffnet werden. Prüfen Sie Verbindung und Windows-Berechtigung, schließen Sie Zoom/Teams und setzen Sie das Standard-Aufnahmegerät in den Systemeinstellungen.',
    startMicRemoteServer:
      'Sitzung gestartet, aber dieser Server hat kein Mikrofon (VPS). Live-Sprachübersetzung erfordert Python lokal auf Ihrem PC. Auf VPS: Abrechnung, Klone, Chat ohne Live-Mikrofon.',
    startMicBrowserMode:
      '🎤 Browser-Mikrofon: sprechen Sie ins PC-Mikrofon (Chrome/Edge). Auf dem VPS wird kein VB-Kabel verwendet — schalten Sie den Konferenzmodus aus, wenn er aktiv ist.',
    browserMicError: 'Spracherkennung im Browser fehlgeschlagen — erlauben Sie den Mikrofonzugriff für diese Website.',
    browserMicRecording: '🎤 Browser-Mikro: Aufnahme. Sprechen Sie ins PC-Mikrofon.',
    browserMicRecordingPcm: '🎤 Browser-Mikrofon (WAV 16 kHz → Pro/AITunnel). Sprechen Sie ins PC-Mikrofon.',
    vpsMicExplain: 'Der VPS hat kein Servermikrofon (anders als ein lokaler PC). Audio läuft über den Browser — sprechen Sie etwa 5 Sekunden laut.',
    browserMicSessionStopped: 'Server-Sitzung beendet — klicken Sie erneut auf Start.',
    browserMicSessionRecovering: 'Aufnahmesitzung wird wiederhergestellt…',
    voicePlayFailed: 'Wiedergabe fehlgeschlagen: ',
    browserMicPhraseNotRecognized: 'Satz nicht erkannt — sprechen Sie lauter und näher ans Mikrofon (3–5 Sek.).',
    browserMicDecodeFailed: 'Aufnahme konnte nicht decodiert werden — klicken Sie auf Stopp und erneut auf Start.',
    voicePlayBlockedHint: 'Audio wurde nicht abgespielt — klicken Sie erneut auf Abspielen beim Satz (am besten https://…).',
    voicePlayServerNoSpeaker: 'Keine Lautsprecher auf dem Server — nutzen Sie https:// und klicken Sie auf Abspielen beim Satz.',
    proBrowserMicHint: 'Pro: AITunnel (auf dem VPS langsamer als auf dem PC). Sprechen Sie einen Satz, pausieren Sie ~1 Sek., dann wird er zur Erkennung gesendet.',
    browserMicConferenceAutoOff: 'Konferenzmodus (VB-Kabel) aus: Auf dem VPS nutzt die Aufnahme das Browser-Mikrofon, kein virtuelles Kabel.',
    browserMicNoAccess: 'Mikrofonzugriff verweigert — erlauben Sie ihn für diese Website in Chrome/Edge.',
    browserMicNeedsHttps: 'Wechsel zu HTTPS — Chrome blockiert das Mikrofon über HTTP.',
    micHintBrowser: 'Browser-Mikro — Aufnahme',
    micHintBrowserWaiting: 'Mikro: warten…',
    micHintQuiet: 'Zu leise — sprechen Sie lauter',
    micHintClip: 'Zu laut',
    micHintOk: 'Pegel OK',
    startTimeoutError:
      'Server-Timeout (25 s). Führen Sie scripts/deploy-ui-start-fix.ps1 auf Ihrem PC aus und laden Sie hart neu. Die Stimmenauswahl darf nicht «Wird geladen…» zeigen. Klonstimme kann aus bleiben.',
    micErrorModalTitle: 'Übersetzung konnte nicht gestartet werden',
    startTimeoutModalTitle: 'Server-Timeout',
    chatSessionBusyError:
      'Das Mikrofon wird von einer anderen Sitzung auf diesem Server verwendet. Beenden Sie den anderen Client (Web oder Desktop) und versuchen Sie es erneut.',
    translatorPoolFullError:
      'Alle Übersetzungsleitungen sind belegt. Versuchen Sie «Start» in 1–2 Minuten erneut oder drücken Sie «Stopp» in einem anderen Tab.',
    modalWarmupStart: 'Klonmodell auf Modal wird vorbereitet …\nDer erste Start kann 1–3 Minuten dauern.',
    modalWarmupReady: 'Modal-Klonmodell ist bereit',
    modalWarmupFailed:
      'Klonmodell auf Modal konnte nicht vorbereitet werden. Prüfen Sie MODAL_CLONING_API_BASE, deployen Sie Modal und versuchen Sie Start erneut.',
    subscriptionRequiredModalTitle: 'Für die Übersetzung ist ein Tarif erforderlich',
    subscriptionRequiredModalHint:
      'Sie haben kein aktives Abo. Wählen und bezahlen Sie einen Tarif, um die Chat-Übersetzung zu starten.',
    subscriptionRequiredModalHintNoMinutes:
      'Ihr Minutenlimit ist aufgebraucht. Verlängern Sie Ihr Abo oder wählen Sie einen anderen Tarif.',
    subscriptionRequiredModalPlans: 'Tarife anzeigen',
    logStaleSessionStopped: '⏹️ Vorherige Sitzung beendet — auf Start klicken',
    confSetupSkipStart: 'Überspringen und starten',
    confSetupCloseNoStart:
      'Geschlossen ohne Start. Nutzen Sie «Überspringen und starten» oder «Weiter» → «Übersetzung starten».',
    confSetupDontShow: 'Nicht mehr anzeigen',
    trainingBtn: '🎓 Training',
    trainingTitle: 'Training',
    trainingClose: 'Schliessen',
    trainingPrev: 'Zurueck',
    trainingNext: 'Weiter',
    trainingFinish: 'Fertig',
    trainingStepHeaderBrand: 'Logo und Titel TalkPilot — Ihr Hauptbildschirm fuer Uebersetzung.',
    trainingStepHeaderStart: 'Start/Stopp der Uebersetzung. Beim ersten Start kann ein Konferenz-Audio-Assistent erscheinen.',
    trainingStepHeaderPlan: 'Tarif und verbleibende Minuten. Klick oeffnet das Dashboard.',
    trainingStepHeaderTheme: 'Design-Thema: dunkel, violett oder hell.',
    trainingStepHeaderLang: 'Sprache der Oberflaeche: Beschriftungen und Hinweise.',
    trainingStepHeaderMenu: 'Menue oeffnet die Einstellungsleiste unten. Sie wird jetzt eingeblendet.',
    trainingStepHeaderTraining: 'Schulung startet diese Tour jederzeit von vorn.',
    trainingStepRecognition: 'Hier wird der Erkennungsmodus gewaehlt: Basic fuer Tempo, Pro fuer bessere Genauigkeit.',
    trainingStepAutoplay: 'Dieser Block aktiviert die automatische Wiedergabe erkannter Phrasen.',
    trainingStepVoice: 'Hier waehlen Sie Standard- oder Klonstimme und starten die Vorschau.',
    trainingStepLanguages: 'Legen Sie Ihre Sprache und die Sprache des Gespraechspartners fest.',
    trainingStepAudioDevices: 'Waehlen Sie Mikrofon fuer die Spracheingabe und Lautsprecher fuer die Uebersetzungsausgabe. Bei Bluetooth PC-Mikrofon und Kopfhoerer getrennt einstellen.',
    trainingStepPause: 'Die Phrasenpause steuert die Verzoegerung vor der Uebersetzung.',
    trainingStepAiMode: 'Der KI-Schalter aktiviert Antwortvorschlaege im rechten Panel.',
    trainingStepTopic: 'Thema und Kontext helfen der KI bei besseren Vorschlaegen.',
    trainingStepAppearance: 'Hier lassen sich Schriftgroesse und Kontrast anpassen.',
    trainingStepChat: 'Dialogbereich: links Ihre Phrasen, rechts der Partner, ganz rechts KI-Hinweise.',
    trainingDemoMessageText: 'Hallo, freut mich, Sie kennenzulernen!',
    trainingDemoPartnerMessageText: 'Hallo! Wie geht es Ihnen heute?',
    trainingDemoPartnerMessageTranslated: 'Hallo! Wie geht es Ihnen heute?',
    partnerClickForSuggestions: 'Auf die Partnernachricht tippen — Antwortvorschläge erscheinen',
    trainingStepChatMessage: 'Nach der Erkennung erscheint Ihre Phrase in der Spalte «Sie» — wie im Beispiel.',
    trainingStepChatDelete: 'Das × loescht die Phrase bei Erkennungsfehlern.',
    trainingStepChatPlay: 'Play spricht die Phrase manuell ab (wenn Auto-Wiedergabe aus ist).',
    trainingStepChatStatus: 'Status: wartet, wird vorgelesen oder bereits vorgelesen.',
    trainingStepChatTabOpen: 'Tab oeffnet dieses Fenster: Phrase bearbeiten, Frage oder Aussage waehlen.',
    trainingStepChatModalAi: 'Hier schlaegt die KI Antworten vor. Taste 3–7 — der Text erscheint im Feld und im Chat.',
    trainingStepChatAiPanel: 'Rechts: Antworthinweise — KI schlaegt Antworten auf die Partnerphrase vor.',
    trainingStepFooterConference: 'Konferenzmodus leitet die Uebersetzung ueber ein virtuelles Kabel (VB-Cable / BlackHole) zu Zoom, Teams usw. Beim ersten Aktivieren erscheint eine Einrichtungshilfe.',
    trainingStepFooterHints: 'Mittlere Zeile: «Sprechen» — das Mikro hoert zu; Tab und Enter — Hinweise zum Bearbeiten und Vorlesen.',
    trainingStepFooterStatus: 'Statusanzeige: «Gestoppt» — Uebersetzung aus; bei Betrieb zeigt sie Erkennung oder Wiedergabe.',
    trainingStepFooterMicLevel: '«Pegel» — Lautstaerke des Mikrofoneingangs. Pruefen Sie, ob das Mikro hoert.',
    trainingStepFooterMicBtn: 'Die 🎚-Taste oeffnet Mikrofonempfindlichkeit und Lautstaerke Ihrer Sprachausgabe.',
    trainingStepFooterMicPanel: 'Hier stellen Sie Mikrofonempfindlichkeit (Schwellwert) und Lautstaerke Ihrer vorgelesenen Phrasen ein.',
    trainingStepChatTabFooter: 'Erinnerung: Tab — Bearbeitung, Enter — vorlesen.',
    trainingAiLoading: 'Vorschlaege werden geladen…',
    trainingDemoSuggestion1: 'Ja, dem stimme ich zu.',
    trainingDemoSuggestion2: 'Koennen Sie das bitte praezisieren?',
    trainingDemoSuggestion3: 'Danke, das hilft.',
    trainingModalSuggestion1: 'Hallo, freut mich, Sie kennenzulernen!',
    trainingModalSuggestion2: 'Schön, Sie zu sehen — wie geht es?',
    trainingModalSuggestion3: 'Guten Tag, wie läuft es?',
    trainingModalSuggestion4: 'Grüß Gott, womit kann ich helfen?',
    trainingModalSuggestion5: 'Hallo, wie läuft Ihre Arbeit?',
    translationPauseLabel: '⏸️ Übersetzung pausieren',
    chatMenuLabel: 'Menü',
    chatSettingsToggleTitle: 'Chat-Einstellungen öffnen/schließen',
    chatSettingsCollapseTitle: 'Menü einklappen',
    chatSettingsCollapseAria: 'Einstellungsmenü einklappen',
    recognitionModeHint: 'Erkennungsmodus wählen',
    recognitionModeDiffHint: 'Basic ist schneller und sparsamer, Pro bietet genauere Erkennung bei schwieriger Sprache.',
    autoPlayCardTitle: 'Sprachausgabe',
    autoPlaySectionHint: 'Automatische Wiedergabe meiner Phrase',
    autoPlayLabel: '🔊 Auto',
    autoPlayHintLine: 'Nach der Erkennung wird die Phrase in der Sprache des Gesprächspartners vorgelesen',
    aiTopicSettingsTitle: 'Thema und Kontext für KI',
    cloneViaModalLabel: 'Modal',
    a11yFontLabel: '🔤',
    a11yContrastLabel: '◐',
    phrasePauseHint: 'Pause zwischen Phrasen einstellen',
    phrasePauseLabel: 'Pause zwischen Phrasen',
    phrasePauseUnit: 's',
    phrasePauseAdjustable: 'Anpassbar',
    chatPreloaderText: 'Verbindung zum Server…',
    columnResizerUserPartner: 'Spalten Sie/Gesprächspartner anpassen',
    columnResizerChatAi: 'Breite von Chat und KI-Panel anpassen',
    aiSuggestionsTitle: 'Antwortvorschläge',
    aiSuggestionsLoading: 'Vorschläge werden erstellt...',
    aiTopicModalTitle: 'Gesprächsthema und Kontext',
    aiTopicModalHint: 'Thema und optionalen Kontext festlegen, um Erkennung und Vorschläge zu verbessern.',
    aiTopicFieldTitle: 'Kurzes Thema',
    aiTopicFieldTitlePh: 'Zum Beispiel: Vertragsverhandlung mit Lieferant',
    aiTopicFieldDesc: 'Kontextbeschreibung',
    aiTopicFieldDescPh: 'Wichtige Details, Begriffe, Rollen, gewünschter Ton und Gesprächsziele.',
    aiTopicCancel: 'Abbrechen',
    aiTopicSave: 'Speichern',
    modeBasicBtnTitle: 'Kostenlose Erkennung über Vosk',
    modeProBtnTitle: 'Präzise Erkennung über OpenAI/AITunnel',
    modeProBtnTitleLocked: 'In Pro- und Ultimate-Tarifen enthalten. Klicken Sie, um ein Upgrade zu erfahren.',
    proUpgradeModalTitle: 'Pro-Modus nicht verfügbar',
    proUpgradeModalHint: 'Die Pro-Erkennung ist in Pro- und Ultimate-Paketen enthalten. Wählen Sie ein passendes Paket oder upgraden Sie im Konto.',
    proUpgradeModalPlans: 'Tarife',
    proUpgradeModalDashboard: 'Abonnement im Konto',
    proUpgradeModalClose: 'Verstanden',
    micLevelLabel: 'Pegel',
    micSensitivityHint: 'Mikrofonempfindlichkeit öffnen',
    micSensitivityLabel: 'Mikrofonempfindlichkeit',
    userTtsVolumeLabel: 'Wiedergabelautstärke (Ihre Sätze)',
    rangeStepDownAria: 'Verringern',
    rangeStepUpAria: 'Erhöhen',
    
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
    logConferenceNoCable: '⚠️ VB-Cable nicht gefunden. Installieren Sie VB-Audio Cable und wählen Sie in Zoom/Teams das Mikrofon «CABLE Output».',
    logConferenceCableOk: '🔁 Audio für Gesprächspartner → {device}',
    confSetupModalTitle: 'Audio für Videokonferenzen',
    confSetupModalHint: 'Wählen Sie Ihre Meeting-App — Schritt-für-Schritt-Anleitung für VB-Cable, damit Teilnehmer die Übersetzung hören.',
    confSetupCableHint: 'Schritt 1: Virtuelles Audiokabel prüfen und ggf. installieren.',
    confSetupAppsHint: 'Schritt 2: Meeting-App wählen.',
    confSetupAppsHintSkipped: 'Schritt 1: Meeting-App wählen.',
    confSetupGuideHint: 'Schritt 3: Audio in der gewählten App einrichten.',
    confSetupGuideHintSkipped: 'Schritt 2: Audio in der gewählten App einrichten.',
    confSetupCableLead: 'Prüfen Sie, ob ein virtuelles Audiokabel installiert ist — ohne es hören Teilnehmer die Übersetzung in Zoom, Teams usw. nicht.',
    confSetupCableWindowsLine: 'Windows — VB-Audio Virtual Cable (kostenlos)',
    confSetupCableMacLine: 'macOS — BlackHole (kostenlos) oder Loopback (kostenpflichtig)',
    confSetupDownloadWin: 'VB-Cable für Windows herunterladen',
    confSetupDownloadMac: 'BlackHole für macOS herunterladen',
    confSetupCableNote: 'Nach der Installation ggf. neu starten, dann «Weiter».',
    confSetupCableOsWin: 'Empfohlen für Ihr System: Windows.',
    confSetupCableOsMac: 'Empfohlen für Ihr System: macOS.',
    confSetupCableDetected: 'VB-Cable auf diesem PC erkannt.',
    confSetupCableDetectedServer: 'VB-Cable auf dem Übersetzungsserver erkannt (lokaler Modus).',
    confSetupCableCheckPermission:
      'Erlauben Sie den Mikrofonzugriff im Browser, um VB-Cable zu prüfen, oder klicken Sie auf «Weiter», wenn es bereits installiert ist.',
    confSetupCableNotDetected:
      'VB-Cable wurde im Browser auf diesem PC nicht gefunden. Installieren Sie den Treiber über den Link oben und starten Sie ggf. neu.',
    confSetupAppsLead: 'Wählen Sie die App für Ihre Konferenz:',
    confSetupBackToCable: '← Zurück',
    confSetupBackToApps: '← Apps',
    confSetupBack: '← Apps',
    confSetupClose: 'Schließen',
    confSetupStart: 'Übersetzung starten',
    confSetupPrev: 'Zurück',
    confSetupNext: 'Weiter',
    confSetupStepOf: 'Schritt {{current}} von {{total}}',
    confAppZoom: 'Zoom',
    confAppMeet: 'Google Meet',
    confAppTeams: 'Microsoft Teams',
    confAppWebex: 'Cisco Webex',
    confAppTelegram: 'Telegram',
    confAppWhatsapp: 'WhatsApp',
    confAppOther: 'Beliebige Anwendungen',
    confSetupStep1Title: 'VB-Audio Cable installieren',
    confSetupStep1Text: 'Laden Sie VB-Audio Virtual Cable von vb-audio.com herunter, installieren Sie den Treiber und starten Sie bei Bedarf neu.',
    confSetupStep2Title: 'Konferenzmodus aktivieren',
    confSetupStep2Text: 'Unten im Übersetzer «Konferenzmodus (VB-Cable)» einschalten — die übersetzte Stimme geht auf das virtuelle Kabel.',
    confSetupStep3ZoomTitle: 'Mikrofon in Zoom',
    confSetupStep3ZoomText: 'Zoom → Einstellungen → Audio: Mikrofon «CABLE Output (VB-Audio Virtual Cable)». Lautsprecher — Kopfhörer oder Boxen.',
    confSetupStep3MeetTitle: 'Mikrofon in Google Meet',
    confSetupStep3MeetText: 'In Meet Audio-Einstellungen: Mikrofon «CABLE Output (VB-Audio Virtual Cable)», Lautsprecher — Ihr Ausgabegerät.',
    confSetupStep3TeamsTitle: 'Mikrofon in Microsoft Teams',
    confSetupStep3TeamsText: 'Teams → Einstellungen → Geräte: Mikrofon «CABLE Output (VB-Audio Virtual Cable)».',
    confSetupStep3WebexTitle: 'Mikrofon in Cisco Webex',
    confSetupStep3WebexText: 'Webex → Audio settings: Microphone «CABLE Output (VB-Audio Virtual Cable)».',
    confSetupTelegramStep1Title: 'Telegram-Einstellungen',
    confSetupTelegramStep1Text:
      'Öffnen Sie in Telegram das Menü → Einstellungen (Settings) und wählen Sie «Lautsprecher und Kamera» (Speakers and Camera).',
    confSetupTelegramStep2Title: 'Lautsprecher und Kamera',
    confSetupTelegramStep2Text:
      'Wählen Sie unter «Lautsprecher und Kamera» CABLE Output (VB-Audio Virtual Cable) als Mikrofon. Lautsprecher — Kopfhörer oder Boxen.',
    confSetupStep3WhatsappTitle: 'Audio in WhatsApp',
    confSetupStep3WhatsappText:
      'Öffnen Sie während eines WhatsApp-Anrufs die Audioeinstellungen und wählen Sie CABLE Output (VB-Audio Virtual Cable) als Mikrofon. Lautsprecher — Kopfhörer oder Boxen.',
    confSetupStep3OtherTitle: 'Audio in der App',
    confSetupStep3OtherText:
      'Wählen Sie in den Audioeinstellungen der App CABLE Output (VB-Audio Virtual Cable) als Mikrofon. Lautsprecher — Kopfhörer oder Boxen, wenn die App die Auswahl erlaubt.',
    confSetupStep4Title: 'Übersetzung und Meeting starten',
    confSetupStep4Text: '«Übersetzung starten» hier oder «Start» im Übersetzer, dann dem Anruf beitreten.',
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
    msgStatusDone: '✅ Gesprochen',
    msgStatusSent: '✓ Gesendet'
  },
  
  es: {
    appTitle: 'Traductor de Voz',
    aiToggle: '🤖 IA',
    aiCardTitle: 'Asistente IA',
    aiContextMenuTitle: 'Tema y contexto de la conversacion',
    aiToggleRowLabel: 'Sugerencias de respuesta IA',
    aiHintLine: 'La red neuronal analiza el dialogo y propone sugerencias relevantes',
    aiToggleAriaLabel: 'Sugerencias de respuesta IA',
    aiAssistantToggleHintLocked: 'Disponible en planes Pro y Ultimate. Pulse para ver cómo mejorar su plan.',
    aiAssistantUpgradeModalTitle: 'Asistente IA no disponible',
    aiAssistantUpgradeModalHint: 'Las sugerencias IA y el análisis del diálogo están en los planes Pro y Ultimate. Mejore su plan para activarlos.',
    voiceCloneToggleHintLocked: 'La clonación de voz para la lectura está disponible desde el plan Ultimate. Pulse para ver cómo mejorar su plan.',
    voiceCloneUpgradeModalTitle: 'Clonación de voz no disponible',
    voiceCloneUpgradeModalHint: 'Las voces clonadas en la reproducción están incluidas en Ultimate, Team y Business (no en Pro). Mejore su plan para activar esta función.',
    aiTopicPlaceholder: 'Tema...',
    voiceLabel: '🎤 Voz:',
    standardVoiceLabel: '🎤 Voz:',
    clonedVoiceLabel: '🎙️ Clon:',
    voiceCardTitle: 'Voz de salida',
    useClonedVoiceLabel: 'Usar voz clonada',
    previewBtnTitle: 'Vista previa',
    resetBtn: '🔄 Reiniciar',
    startBtn: '▶️ Iniciar',
    stopBtn: '⏹️ Detener',
    startBtnAria: 'Iniciar traducción',
    stopBtnAria: 'Detener traducción',
    testBtn: '🔊 Prueba',
    conferenceMode: '🔁 Modo conferencia (VB-Cable)',
    desktopScreenShareStealthLabel: '🖥️ Ocultar ventana',
    desktopScreenShareStealthHint: 'Fondo transparente y paneles semitranslúcidos; la captura a menudo no muestra la ventana (según el SO). Los clics en zonas vacías van a la aplicación detrás; para usar el traductor, mueve el puntero a un botón, el chat o un campo. Desactivar con Ctrl+Mayús+X o desmarcar.',
    desktopScreenShareStealthAria: 'Ocultar ventana al compartir pantalla (escritorio)',
    desktopAiRegionLabel: '🔲 Análisis de región IA',
    desktopAiRegionHint: 'En modo pantalla transparente: pulse y suelte Ctrl izquierdo solo (sin otra tecla). Aparece la capa; mantenga Ctrl izquierdo y arrastre. Reserva: Ctrl+Mayús+S. Clave AITunnel en .env en la raíz del proyecto.',
    desktopAiRegionAria: 'Análisis IA de una región de pantalla (escritorio)',
    desktopWindowMinTitle: 'Minimizar',
    desktopWindowMinAria: 'Minimizar ventana',
    desktopWindowCloseTitle: 'Cerrar',
    desktopWindowCloseAria: 'Cerrar aplicación',
    desktopExtrasCardTitle: 'Ventana y pantalla',
    desktopWindowMaxTitle: 'Maximizar',
    desktopWindowMaxAria: 'Maximizar ventana',
    desktopWindowRestoreTitle: 'Restaurar',
    desktopWindowRestoreAria: 'Restaurar tamano de ventana',
    desktopAccountMenuLabel: 'Cuenta',
    desktopAccountMenuTitle: 'Cuenta: area personal y cerrar sesion',
    desktopAccountCabinet: 'Area personal',
    desktopAccountLogout: 'Cerrar sesion',
    desktopAiRegionPanelTitle: 'Sugerencias IA',
    desktopAiRegionClose: 'Cerrar',
    desktopAiRegionAnalyzing: 'Analizando imagen…',
    desktopAiRegionError: 'No se pudieron obtener sugerencias:',
    statusStopped: '⏹️ Detenido',
    statusRunning: '✅ Ejecutando',
    youColumn: '🔵 Tú',
    partnerColumn: '🟢 Interlocutor',
    chatEmptyUserLine1: 'Pulse «Iniciar» y hable',
    chatEmptyUserLine2: 'Sus frases aparecerán aquí',
    chatEmptyPartnerLine1: 'La traducción del interlocutor aparecerá aquí',
    chatEmptyPartnerLine2: 'Las respuestas se reproducirán',
    footerHint: '🎤 Habla → Tab para editar → Enter para voz',
    footerHintManualPlay: '🎤 Habla → Tab — editar → Enter o ▶ Play',
    msgPlayBtn: 'Play',
    msgPlayAria: 'Locutar mensaje',
    languageLabel: '🌐',
    languagePairTitle: 'Pareja de idiomas',
    audioDevicesCardTitle: 'Micrófono y altavoz',
    audioDevicesHint:
      'Dos canales: elija micrófono y altavoz por separado. Con Bluetooth — entrada: micrófono del PC, salida: auriculares.',
    audioInputDeviceLabel: '🎤 Micrófono (entrada)',
    audioOutputDeviceLabel: '🔊 Altavoz (salida)',
    audioDeviceDefault: 'Predeterminado del sistema',
    audioDeviceUnlabeledInput: 'Micrófono',
    audioDeviceUnlabeledOutput: 'Altavoz',
    audioDevicesSplitLog:
      '🔊 Dispositivos separados: micrófono y altavoz independientes — reproducción sin detener la captura.',
    audioDeviceMicRestartFailed: 'No se pudo cambiar el micrófono. Compruebe el dispositivo en el menú del chat.',
    audioDeviceMicFallback: 'Micrófono seleccionado no disponible — se usa el predeterminado del sistema.',
    appearanceTitle: 'Apariencia',
    fontSizeLabel: 'Tamano de fuente',
    contrastLabel: 'Contraste',
    contrastDefault: 'Normal',
    contrastMedium: 'Medio',
    contrastHigh: 'Alto contraste',
    themeDark: 'Oscuro',
    themeDarkViolet: 'Oscuro violeta',
    themeLight: 'Claro',
    themeLightSoft: 'Claro suave',
    headerPlanLoading: '…',
    headerPlanNeedLogin: 'Inicia sesión',
    headerPlanNeedLoginSub: 'plan y minutos',
    headerPlanRemainPrefix: 'restante:',
    headerPlanNoTariff: 'Sin plan activo',
    headerPlanOpenDashboardTariff: 'Abrir cuenta — plan y saldo',
    startBlockedNoTariff: 'Sin plan de pago. Elija un plan en la página Precios.',
    startBlockedNoMinutes: 'Límite de minutos alcanzado. Renueve o mejore su plan en su cuenta.',
    startMicError:
      'No se pudo abrir el micrófono. Compruebe que esté conectado y permitido en Windows, cierre Zoom/Teams y establezca el dispositivo de grabación predeterminado en la configuración del sistema.',
    startMicRemoteServer:
      'Sesión iniciada, pero este servidor no tiene micrófono (VPS). La traducción de voz en vivo requiere ejecutar Python en su PC local. En VPS: facturación, clones, chat sin micrófono en vivo.',
    startMicBrowserMode:
      '🎤 Micrófono del navegador: hable al micrófono de su PC (Chrome/Edge). En el VPS no se usa VB-Cable — desactive el modo conferencia si está activo.',
    browserMicError: 'Falló el reconocimiento de voz en el navegador — permita el acceso al micrófono para este sitio.',
    browserMicRecording: '🎤 Micrófono del navegador: grabando. Hable al micrófono de su PC.',
    browserMicRecordingPcm: '🎤 Micrófono del navegador (WAV 16 kHz → Pro/AITunnel). Hable al micrófono de su PC.',
    vpsMicExplain: 'El VPS no tiene micrófono de servidor (a diferencia de un PC local). El audio va por el navegador — hable fuerte durante unos 5 s.',
    browserMicSessionStopped: 'Sesión del servidor detenida — pulse Iniciar de nuevo.',
    browserMicSessionRecovering: 'Recuperando la sesión de grabación…',
    voicePlayFailed: 'Error de reproducción: ',
    browserMicPhraseNotRecognized: 'Frase no reconocida — hable más fuerte y cerca del micrófono (3–5 s).',
    browserMicDecodeFailed: 'No se pudo decodificar la grabación — pulse Detener e Iniciar de nuevo.',
    voicePlayBlockedHint: 'No se reprodujo el audio — pulse Reproducir en la frase otra vez (preferible https://…).',
    voicePlayServerNoSpeaker: 'No hay altavoces en el servidor — use https:// y pulse Reproducir en la frase.',
    proBrowserMicHint: 'Pro: AITunnel (más lento en el VPS que en el PC). Diga una frase, pause ~1 s — luego se envía al reconocimiento.',
    browserMicConferenceAutoOff: 'Modo conferencia (VB-Cable) desactivado: en el VPS la grabación usa el micrófono del navegador, no un cable virtual.',
    browserMicNoAccess: 'Acceso al micrófono denegado — permítalo para este sitio en Chrome/Edge.',
    browserMicNeedsHttps: 'Cambiando a HTTPS — Chrome bloquea el micrófono en HTTP.',
    micHintBrowser: 'Micrófono del navegador — grabando',
    micHintBrowserWaiting: 'Mic: esperando…',
    micHintQuiet: 'Demasiado bajo — hable más fuerte',
    micHintClip: 'Demasiado alto',
    micHintOk: 'Nivel correcto',
    startTimeoutError:
      'Tiempo de espera del servidor (25 s). Ejecute scripts/deploy-ui-start-fix.ps1 desde su PC y recargue en forzado. El menú de voz no debe mostrar «Cargando…». La voz clonada puede permanecer desactivada.',
    micErrorModalTitle: 'No se pudo iniciar la traducción',
    startTimeoutModalTitle: 'Tiempo de espera del servidor',
    chatSessionBusyError:
      'El micrófono está en uso por otra sesión en este servidor. Detenga el otro cliente (web o escritorio) e inténtelo de nuevo.',
    translatorPoolFullError:
      'Todas las líneas de traducción están ocupadas. Intente «Iniciar» de nuevo en 1–2 minutos o pulse «Detener» en otra pestaña.',
    modalWarmupStart: 'Calentando el modelo clon en Modal…\nEl primer inicio puede tardar 1–3 minutos.',
    modalWarmupReady: 'El modelo clon de Modal está listo',
    modalWarmupFailed:
      'No se pudo calentar el modelo clon en Modal. Compruebe MODAL_CLONING_API_BASE, despliegue Modal y pulse Iniciar de nuevo.',
    subscriptionRequiredModalTitle: 'Se requiere un plan para traducir',
    subscriptionRequiredModalHint:
      'No tiene una suscripción activa. Elija y pague un plan para iniciar la traducción en el chat.',
    subscriptionRequiredModalHintNoMinutes:
      'Ha agotado su límite de minutos. Renueve su suscripción o elija otro plan.',
    subscriptionRequiredModalPlans: 'Ver planes',
    logStaleSessionStopped: '⏹️ Sesión anterior detenida — pulse Iniciar',
    confSetupSkipStart: 'Omitir e iniciar',
    confSetupCloseNoStart:
      'Cerrado sin iniciar. Use «Omitir e iniciar» o «Siguiente» → «Iniciar traducción».',
    trainingBtn: '🎓 Entrenamiento',
    trainingTitle: 'Entrenamiento',
    trainingClose: 'Cerrar',
    trainingPrev: 'Atras',
    trainingNext: 'Siguiente',
    trainingFinish: 'Listo',
    trainingStepHeaderBrand: 'Logo y nombre TalkPilot — pantalla principal del traductor.',
    trainingStepHeaderStart: 'Iniciar o detener la traduccion. Al primer inicio puede aparecer la guia de audio para conferencias.',
    trainingStepHeaderPlan: 'Tu plan y minutos restantes. Haz clic para abrir el panel de cuenta.',
    trainingStepHeaderTheme: 'Tema visual: oscuro, violeta o claro.',
    trainingStepHeaderLang: 'Idioma de la interfaz: botones, textos y menu de ajustes.',
    trainingStepHeaderMenu: 'Menu abre el panel de ajustes inferior. Se desplegara ahora.',
    trainingStepHeaderTraining: 'Formacion reinicia este recorrido cuando quieras.',
    trainingStepRecognition: 'Aqui eliges el modo de reconocimiento: Basic para velocidad, Pro para mayor precision.',
    trainingStepAutoplay: 'Este bloque activa la reproduccion automatica de tus frases reconocidas.',
    trainingStepVoice: 'Selecciona voz estandar o clonada y prueba la reproduccion.',
    trainingStepLanguages: 'Configura tu idioma y el del interlocutor para una traduccion correcta.',
    trainingStepAudioDevices: 'Elige el microfono para la entrada de voz y el altavoz para la salida de la traduccion. Con Bluetooth, configura microfono del PC y auriculares por separado.',
    trainingStepPause: 'La pausa entre frases define el retraso antes de enviar al traductor.',
    trainingStepAiMode: 'El interruptor IA activa sugerencias de respuesta en el panel derecho.',
    trainingStepTopic: 'Tema y contexto ayudan a IA a sugerir respuestas mas relevantes.',
    trainingStepAppearance: 'Aqui puedes ajustar tamano de fuente y contraste.',
    trainingStepChat: 'Area de dialogo: tus frases a la izquierda, interlocutor a la derecha, sugerencias IA mas a la derecha.',
    trainingDemoMessageText: 'Hola, un placer conocerle.',
    trainingDemoPartnerMessageText: '¡Hola! ¿Cómo está hoy?',
    trainingStepChatMessage: 'Tras el reconocimiento, tu frase aparece en la columna «Tu» — como en el ejemplo.',
    trainingStepChatDelete: 'La × elimina la frase si el reconocimiento fallo.',
    trainingStepChatPlay: 'Play reproduce la frase manualmente (con auto-reproduccion desactivada).',
    trainingStepChatStatus: 'Estado: en espera, reproduciendo o ya reproducida.',
    trainingStepChatTabOpen: 'Tab abre esta ventana: edite la frase y elija Pregunta o Afirmacion.',
    trainingStepChatModalAi: 'La IA sugiere respuestas aqui. Pulse 3–7 — el texto aparece en el campo y en el chat.',
    trainingStepChatAiPanel: 'A la derecha: Sugerencias de respuesta para la frase del interlocutor.',
    trainingStepFooterConference: 'Modo conferencia envia la traduccion por cable virtual (VB-Cable / BlackHole) a Zoom, Teams, etc. Al activarlo por primera vez se abre una guia.',
    trainingStepFooterHints: 'Barra central: «Hable» — el micro escucha; Tab y Enter — editar y vocalizar frases.',
    trainingStepFooterStatus: 'Estado: «Detenido» — traduccion apagada; en marcha muestra reconocimiento o reproduccion.',
    trainingStepFooterMicLevel: '«Nivel» — volumen de entrada del microfono. Compruebe que el micro se oye.',
    trainingStepFooterMicBtn: 'El boton 🎚 abre sensibilidad del micro y volumen de sus frases habladas.',
    trainingStepFooterMicPanel: 'Aqui ajusta la sensibilidad del micro (umbral) y el volumen de sus frases vocalizadas.',
    trainingStepChatTabFooter: 'Recuerde: Tab — editar frase, Enter — vocalizar.',
    trainingAiLoading: 'Cargando sugerencias…',
    trainingDemoSuggestion1: 'Si, estoy de acuerdo.',
    trainingDemoSuggestion2: '¿Puede aclarar, por favor?',
    trainingDemoSuggestion3: 'Gracias, es util.',
    trainingModalSuggestion1: 'Hola, un placer conocerle.',
    trainingModalSuggestion2: 'Me alegra verle, ¿cómo está?',
    trainingModalSuggestion3: 'Buenos días, ¿cómo van las cosas?',
    trainingModalSuggestion4: 'Saludos, ¿en qué puedo ayudar?',
    trainingModalSuggestion5: 'Hola, ¿cómo va su trabajo?',
    translationPauseLabel: '⏸️ Pausa de traducción',
    chatMenuLabel: 'Menú',
    chatSettingsToggleTitle: 'Abrir/cerrar ajustes del chat',
    chatSettingsCollapseTitle: 'Contraer menú',
    chatSettingsCollapseAria: 'Contraer menú de ajustes',
    recognitionModeHint: 'Seleccione el modo de reconocimiento',
    recognitionModeDiffHint: 'Basic es mas rapido y ligero; Pro ofrece mayor precision en reconocimiento de habla compleja.',
    autoPlayCardTitle: 'Locucion',
    autoPlaySectionHint: 'Reproducción automática de mi frase',
    autoPlayLabel: '🔊 Auto',
    autoPlayHintLine: 'Después del reconocimiento, la frase se reproducirá en el idioma del interlocutor',
    aiTopicSettingsTitle: 'Tema y contexto para IA',
    cloneViaModalLabel: 'Modal',
    a11yFontLabel: '🔤',
    a11yContrastLabel: '◐',
    phrasePauseHint: 'Ajuste de pausa entre frases',
    phrasePauseLabel: 'Pausa entre frases',
    phrasePauseUnit: 's',
    phrasePauseAdjustable: 'Ajustable',
    chatPreloaderText: 'Conectando al servidor…',
    columnResizerUserPartner: 'Cambiar tamaño de columnas Tú/Interlocutor',
    columnResizerChatAi: 'Cambiar tamaño de chat y panel IA',
    aiSuggestionsTitle: 'Sugerencias de respuesta',
    aiSuggestionsLoading: 'Generando sugerencias...',
    aiTopicModalTitle: 'Tema y contexto de conversación',
    aiTopicModalHint: 'Define un tema y contexto opcional para mejorar reconocimiento y sugerencias.',
    aiTopicFieldTitle: 'Tema breve',
    aiTopicFieldTitlePh: 'Por ejemplo: negociación con proveedor',
    aiTopicFieldDesc: 'Descripción del contexto',
    aiTopicFieldDescPh: 'Detalles clave, terminología, roles, tono deseado y objetivos de la conversación.',
    aiTopicCancel: 'Cancelar',
    aiTopicSave: 'Guardar',
    modeBasicBtnTitle: 'Reconocimiento gratuito con Vosk',
    modeProBtnTitle: 'Reconocimiento preciso con OpenAI/AITunnel',
    modeProBtnTitleLocked: 'Disponible en planes Pro y Ultimate. Pulse para ver cómo mejorar su plan.',
    proUpgradeModalTitle: 'Modo Pro no disponible',
    proUpgradeModalHint: 'El reconocimiento Pro está incluido en los planes Pro y Ultimate. Mejore su plan para activarlo.',
    proUpgradeModalPlans: 'Ver tarifas',
    proUpgradeModalDashboard: 'Suscripción en la cuenta',
    proUpgradeModalClose: 'Entendido',
    micLevelLabel: 'Nivel',
    micSensitivityHint: 'Abrir sensibilidad del micrófono',
    micSensitivityLabel: 'Sensibilidad del micrófono',
    userTtsVolumeLabel: 'Volumen de reproducción (sus frases)',
    rangeStepDownAria: 'Disminuir',
    rangeStepUpAria: 'Aumentar',
    
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
    logConferenceNoCable: '⚠️ VB-Cable no encontrado. Instale VB-Audio Cable y en Zoom/Teams elija el micrófono «CABLE Output».',
    logConferenceCableOk: '🔁 Audio para el interlocutor → {device}',
    confSetupModalTitle: 'Audio para videoconferencia',
    confSetupModalHint: 'Elija su app de reuniones: guía paso a paso con VB-Cable para que los participantes oigan la traducción.',
    confSetupCableHint: 'Paso 1: compruebe el cable de audio virtual e instálelo si hace falta.',
    confSetupAppsHint: 'Paso 2: elija la app de la reunión.',
    confSetupAppsHintSkipped: 'Paso 1: elija la app de la reunión.',
    confSetupGuideHint: 'Paso 3: configure el audio en la app elegida.',
    confSetupGuideHintSkipped: 'Paso 2: configure el audio en la app elegida.',
    confSetupCableLead: 'Compruebe si tiene un cable de audio virtual — sin él los participantes no oirán la traducción en Zoom, Teams, etc.',
    confSetupCableWindowsLine: 'Windows — VB-Audio Virtual Cable (gratis)',
    confSetupCableMacLine: 'macOS — BlackHole (gratis) o Loopback (de pago)',
    confSetupDownloadWin: 'Descargar VB-Cable para Windows',
    confSetupDownloadMac: 'Descargar BlackHole para macOS',
    confSetupCableNote: 'Reinicie si es necesario tras instalar y pulse «Siguiente».',
    confSetupCableOsWin: 'Recomendado para su sistema: Windows.',
    confSetupCableOsMac: 'Recomendado para su sistema: macOS.',
    confSetupCableDetected: 'VB-Cable detectado en este PC.',
    confSetupCableDetectedServer: 'VB-Cable detectado en el servidor del traductor (modo local).',
    confSetupCableCheckPermission:
      'Permita el acceso al micrófono en el navegador para comprobar VB-Cable, o pulse «Siguiente» si ya está instalado.',
    confSetupCableNotDetected:
      'No se encontró VB-Cable en el navegador de este PC. Instale el controlador con el enlace de arriba y reinicie si hace falta.',
    confSetupAppsLead: 'Elija la app con la que hará la conferencia:',
    confSetupBackToCable: '← Atrás',
    confSetupBackToApps: '← Apps',
    confSetupBack: '← Apps',
    confSetupClose: 'Cerrar',
    confSetupStart: 'Iniciar traducción',
    confSetupPrev: 'Atrás',
    confSetupNext: 'Siguiente',
    confSetupDontShow: 'No volver a mostrar',
    confSetupStepOf: 'Paso {{current}} de {{total}}',
    confAppZoom: 'Zoom',
    confAppMeet: 'Google Meet',
    confAppTeams: 'Microsoft Teams',
    confAppWebex: 'Cisco Webex',
    confAppTelegram: 'Telegram',
    confAppWhatsapp: 'WhatsApp',
    confAppOther: 'Cualquier aplicación',
    confSetupStep1Title: 'Instalar VB-Audio Cable',
    confSetupStep1Text: 'Descargue VB-Audio Virtual Cable en vb-audio.com, instale el controlador y reinicie si Windows lo pide.',
    confSetupStep2Title: 'Activar modo conferencia',
    confSetupStep2Text: 'Abajo en el traductor, active «Modo conferencia (VB-Cable)» para enviar la voz traducida al cable virtual.',
    confSetupStep3ZoomTitle: 'Micrófono en Zoom',
    confSetupStep3ZoomText: 'Zoom → Ajustes → Audio: micrófono «CABLE Output (VB-Audio Virtual Cable)». Altavoces — auriculares.',
    confSetupStep3MeetTitle: 'Micrófono en Google Meet',
    confSetupStep3MeetText: 'En Meet, audio: micrófono «CABLE Output (VB-Audio Virtual Cable)», altavoz — su dispositivo.',
    confSetupStep3TeamsTitle: 'Micrófono en Microsoft Teams',
    confSetupStep3TeamsText: 'Teams → Configuración → Dispositivos: micrófono «CABLE Output (VB-Audio Virtual Cable)».',
    confSetupStep3WebexTitle: 'Micrófono en Cisco Webex',
    confSetupStep3WebexText: 'Webex → Audio settings: Microphone «CABLE Output (VB-Audio Virtual Cable)».',
    confSetupTelegramStep1Title: 'Ajustes de Telegram',
    confSetupTelegramStep1Text:
      'En Telegram, abra el menú → Ajustes (Settings) y elija «Altavoces y cámara» (Speakers and Camera).',
    confSetupTelegramStep2Title: 'Altavoces y cámara',
    confSetupTelegramStep2Text:
      'En «Altavoces y cámara», elija CABLE Output (VB-Audio Virtual Cable) como micrófono. Altavoces — auriculares.',
    confSetupStep3WhatsappTitle: 'Audio en WhatsApp',
    confSetupStep3WhatsappText:
      'Durante una llamada de WhatsApp, abra el audio y elija CABLE Output (VB-Audio Virtual Cable) como micrófono. Altavoces — auriculares.',
    confSetupStep3OtherTitle: 'Audio en la aplicación',
    confSetupStep3OtherText:
      'En el audio de la app elegida, seleccione CABLE Output (VB-Audio Virtual Cable) como micrófono. Altavoces — auriculares si la app lo permite.',
    confSetupStep4Title: 'Iniciar traducción y reunión',
    confSetupStep4Text: 'Pulse «Iniciar traducción» o «Iniciar» en el traductor y únase a la llamada.',
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
    msgStatusDone: '✅ Hablado',
    msgStatusSent: '✓ Enviado'
  },
  
  fr: {
    appTitle: 'Traducteur Vocal',
    aiToggle: '🤖 IA',
    aiCardTitle: 'Assistant IA',
    aiContextMenuTitle: 'Sujet et contexte de la conversation',
    aiToggleRowLabel: 'Suggestions de reponse IA',
    aiHintLine: 'Le modele neuronal analyse le dialogue et propose des suggestions pertinentes',
    aiToggleAriaLabel: 'Suggestions de reponse IA',
    aiAssistantToggleHintLocked: 'Disponible avec les offres Pro et Ultimate. Cliquez pour découvrir comment passer à l’offre supérieure.',
    aiAssistantUpgradeModalTitle: 'Assistant IA indisponible',
    aiAssistantUpgradeModalHint: 'Les suggestions IA et l’analyse du dialogue sont incluses dans les offres Pro et Ultimate. Améliorez votre offre pour les activer.',
    voiceCloneToggleHintLocked: 'Le clonage vocal pour la lecture est disponible à partir de l’offre Ultimate. Cliquez pour découvrir comment passer à une offre supérieure.',
    voiceCloneUpgradeModalTitle: 'Clonage vocal indisponible',
    voiceCloneUpgradeModalHint: 'Les voix clonées pour la lecture sont incluses dans les offres Ultimate, Team et Business (pas dans Pro). Améliorez votre offre pour activer cette fonctionnalité.',
    aiTopicPlaceholder: 'Sujet...',
    voiceLabel: '🎤 Voix:',
    standardVoiceLabel: '🎤 Voix:',
    clonedVoiceLabel: '🎙️ Clone:',
    voiceCardTitle: 'Voix de sortie',
    useClonedVoiceLabel: 'Utiliser une voix clonee',
    previewBtnTitle: 'Aperçu',
    resetBtn: '🔄 Réinitialiser',
    startBtn: '▶️ Démarrer',
    stopBtn: '⏹️ Arrêter',
    startBtnAria: 'Démarrer la traduction',
    stopBtnAria: 'Arrêter la traduction',
    testBtn: '🔊 Test',
    conferenceMode: '🔁 Mode conférence (VB-Cable)',
    desktopScreenShareStealthLabel: '🖥️ Masquer la fenêtre',
    desktopScreenShareStealthHint: 'Fond transparent et panneaux semi-transparents; la capture omet souvent la fenêtre (selon l’OS). Les clics sur les zones vides vont à l’application derrière; pour utiliser le traducteur, placez le pointeur sur un bouton, le chat ou un champ. Désactiver avec Ctrl+Maj+X ou décocher.',
    desktopScreenShareStealthAria: 'Masquer la fenêtre pendant le partage d’écran (bureau)',
    desktopAiRegionLabel: '🔲 Analyse de zone IA',
    desktopAiRegionHint: 'En mode écran transparent : appuyez et relâchez Ctrl gauche seul (sans autre touche). Couche d’assombrissement : maintenez Ctrl gauche et tracez la zone. Secours : Ctrl+Maj+S. Clé AITunnel dans .env à la racine du projet.',
    desktopAiRegionAria: 'Analyse IA d’une zone d’écran (bureau)',
    desktopWindowMinTitle: 'Réduire',
    desktopWindowMinAria: 'Réduire la fenêtre',
    desktopWindowCloseTitle: 'Fermer',
    desktopWindowCloseAria: 'Fermer l’application',
    desktopExtrasCardTitle: 'Fenêtre et écran',
    desktopWindowMaxTitle: 'Agrandir',
    desktopWindowMaxAria: 'Agrandir la fenêtre',
    desktopWindowRestoreTitle: 'Restaurer',
    desktopWindowRestoreAria: 'Restaurer la taille de la fenêtre',
    desktopAccountMenuLabel: 'Compte',
    desktopAccountMenuTitle: 'Compte : espace personnel et déconnexion',
    desktopAccountCabinet: 'Espace personnel',
    desktopAccountLogout: 'Déconnexion',
    desktopAiRegionPanelTitle: 'Conseils IA',
    desktopAiRegionClose: 'Fermer',
    desktopAiRegionAnalyzing: 'Analyse de l’image…',
    desktopAiRegionError: 'Impossible d’obtenir les conseils :',
    statusStopped: '⏹️ Arrêté',
    statusRunning: '✅ En cours',
    youColumn: '🔵 Vous',
    partnerColumn: '🟢 Interlocuteur',
    chatEmptyUserLine1: 'Appuyez sur « Démarrer » et parlez',
    chatEmptyUserLine2: 'Vos phrases apparaîtront ici',
    chatEmptyPartnerLine1: "La traduction de l'interlocuteur apparaîtra ici",
    chatEmptyPartnerLine2: 'Les réponses seront vocalisées',
    footerHint: '🎤 Parlez → Tab pour éditer → Enter pour voix',
    footerHintManualPlay: '🎤 Parlez → Tab — éditer → Enter ou ▶ Play',
    msgPlayBtn: 'Play',
    msgPlayAria: 'Lire le message',
    languageLabel: '🌐',
    languagePairTitle: 'Paire de langues',
    audioDevicesCardTitle: 'Microphone et haut-parleur',
    audioDevicesHint:
      'Deux canaux : choisissez le micro et le haut-parleur séparément. Bluetooth — entrée : micro du PC, sortie : casque.',
    audioInputDeviceLabel: '🎤 Microphone (entrée)',
    audioOutputDeviceLabel: '🔊 Haut-parleur (sortie)',
    audioDeviceDefault: 'Par défaut (système)',
    audioDeviceUnlabeledInput: 'Microphone',
    audioDeviceUnlabeledOutput: 'Haut-parleur',
    audioDevicesSplitLog:
      '🔊 Périphériques séparés : micro et haut-parleur indépendants — lecture sans arrêter la capture.',
    audioDeviceMicRestartFailed: 'Impossible de changer de micro. Vérifiez l’appareil dans le menu du chat.',
    audioDeviceMicFallback: 'Micro sélectionné indisponible — utilisation du périphérique par défaut.',
    appearanceTitle: 'Apparence',
    fontSizeLabel: 'Taille de police',
    contrastLabel: 'Contraste',
    contrastDefault: 'Normal',
    contrastMedium: 'Moyen',
    contrastHigh: 'Contraste élevé',
    themeDark: 'Sombre',
    themeDarkViolet: 'Sombre violet',
    themeLight: 'Clair',
    themeLightSoft: 'Clair doux',
    headerPlanLoading: '…',
    headerPlanNeedLogin: 'Connexion',
    headerPlanNeedLoginSub: 'forfait et minutes',
    headerPlanRemainPrefix: 'restant:',
    headerPlanNoTariff: 'Aucun forfait actif',
    headerPlanOpenDashboardTariff: 'Ouvrir le compte — forfait et solde',
    startBlockedNoTariff: 'Aucun forfait payant. Choisissez un forfait sur la page Tarifs.',
    startBlockedNoMinutes: 'Limite de minutes atteinte. Renouvelez ou changez de forfait dans votre compte.',
    startMicError:
      'Impossible d ouvrir le micro. Verifiez la connexion et l autorisation Windows, fermez Zoom/Teams et definissez le peripherique d enregistrement par defaut dans les parametres systeme.',
    startMicRemoteServer:
      'Session demarree, mais ce serveur n a pas de micro (VPS). La traduction vocale en direct necessite Python sur votre PC local. Sur VPS : facturation, clones, chat sans micro en direct.',
    startMicBrowserMode:
      '🎤 Micro du navigateur : parlez dans le micro du PC (Chrome/Edge). Pas de VB-Cable sur le VPS — desactivez le mode conference s il est actif.',
    browserMicError: 'Echec de la reconnaissance vocale du navigateur — autorisez l acces au micro pour ce site.',
    browserMicRecording: '🎤 Micro navigateur : enregistrement. Parlez dans le micro du PC.',
    browserMicRecordingPcm: '🎤 Micro navigateur (WAV 16 kHz → Pro/AITunnel). Parlez dans le micro du PC.',
    vpsMicExplain: 'Le VPS n a pas de micro serveur (contrairement au PC local). L audio passe par le navigateur — parlez fort pendant environ 5 s.',
    browserMicSessionStopped: 'Session serveur arretee — cliquez a nouveau sur Demarrer.',
    browserMicSessionRecovering: 'Recuperation de la session d enregistrement…',
    voicePlayFailed: 'Lecture impossible : ',
    browserMicPhraseNotRecognized: 'Phrase non reconnue — parlez plus fort, plus pres du micro (3–5 s).',
    browserMicDecodeFailed: 'Impossible de decoder l enregistrement — cliquez sur Arreter puis Demarrer.',
    voicePlayBlockedHint: 'L audio ne s est pas joue — cliquez a nouveau sur Lecture sur la phrase (de preference https://…).',
    voicePlayServerNoSpeaker: 'Pas de haut-parleurs sur le serveur — utilisez https:// et cliquez sur Lecture sur la phrase.',
    proBrowserMicHint: 'Pro : AITunnel (plus lent sur le VPS que sur le PC). Dites une phrase, pause ~1 s — puis envoi pour reconnaissance.',
    browserMicConferenceAutoOff: 'Mode conference (VB-Cable) desactive : sur le VPS l enregistrement utilise le micro du navigateur, pas un cable virtuel.',
    browserMicNoAccess: 'Acces au micro refuse — autorisez-le pour ce site dans Chrome/Edge.',
    browserMicNeedsHttps: 'Passage en HTTPS — Chrome bloque le micro sur HTTP.',
    micHintBrowser: 'Micro navigateur — enregistrement',
    micHintBrowserWaiting: 'Micro : attente…',
    micHintQuiet: 'Trop bas — parlez plus fort',
    micHintClip: 'Trop fort',
    micHintOk: 'Niveau OK',
    startTimeoutError:
      'Delai serveur depasse (25 s). Executez scripts/deploy-ui-start-fix.ps1 sur votre PC puis rechargez a fond. Le menu vocal ne doit pas afficher « Chargement… ». La voix clonee peut rester desactivee.',
    micErrorModalTitle: 'Impossible de demarrer la traduction',
    startTimeoutModalTitle: 'Delai serveur depasse',
    chatSessionBusyError:
      'Le micro est utilise par une autre session sur ce serveur. Arretez l autre client (web ou bureau) et reessayez.',
    translatorPoolFullError:
      'Toutes les lignes de traduction sont occupees. Reessayez « Demarrer » dans 1–2 minutes ou appuyez sur « Arreter » dans un autre onglet.',
    modalWarmupStart: 'Prechauffage du modele clone sur Modal…\nLe premier demarrage peut prendre 1–3 minutes.',
    modalWarmupReady: 'Le modele clone Modal est pret',
    modalWarmupFailed:
      'Impossible de prechauffer le modele clone sur Modal. Verifiez MODAL_CLONING_API_BASE, deployez Modal puis cliquez sur Demarrer.',
    subscriptionRequiredModalTitle: 'Un forfait est requis pour traduire',
    subscriptionRequiredModalHint:
      'Vous n avez pas d abonnement actif. Choisissez et payez un forfait pour demarrer la traduction dans le chat.',
    subscriptionRequiredModalHintNoMinutes:
      'Votre limite de minutes est epuisee. Renouvelez votre abonnement ou choisissez un autre forfait.',
    subscriptionRequiredModalPlans: 'Voir les forfaits',
    logStaleSessionStopped: '⏹️ Session precedente arretee — cliquez sur Demarrer',
    confSetupSkipStart: 'Ignorer et demarrer',
    confSetupCloseNoStart:
      'Ferme sans demarrer. Utilisez « Ignorer et demarrer » ou « Suivant » → « Demarrer la traduction ».',
    trainingBtn: '🎓 Formation',
    trainingTitle: 'Formation',
    trainingClose: 'Fermer',
    trainingPrev: 'Retour',
    trainingNext: 'Suivant',
    trainingFinish: 'Terminer',
    trainingStepHeaderBrand: 'Logo et nom TalkPilot — ecran principal du traducteur.',
    trainingStepHeaderStart: 'Demarrer ou arreter la traduction. Au premier lancement, un guide audio conference peut s afficher.',
    trainingStepHeaderPlan: 'Votre forfait et minutes restantes. Cliquez pour ouvrir le tableau de bord.',
    trainingStepHeaderTheme: 'Theme d affichage : sombre, violet ou clair.',
    trainingStepHeaderLang: 'Langue de l interface : libelles et menus.',
    trainingStepHeaderMenu: 'Menu ouvre le panneau de reglages en dessous. Il va s ouvrir maintenant.',
    trainingStepHeaderTraining: 'Formation relance cette visite guidee a tout moment.',
    trainingStepRecognition: 'Choisissez ici le mode de reconnaissance : Basic pour la vitesse, Pro pour plus de precision.',
    trainingStepAutoplay: 'Ce bloc active la lecture automatique de vos phrases reconnues.',
    trainingStepVoice: 'Selectionnez la voix standard ou clonee et lancez un apercu.',
    trainingStepLanguages: 'Definissez votre langue et celle de l interlocuteur pour une traduction correcte.',
    trainingStepAudioDevices: 'Choisissez le micro pour la saisie vocale et le haut-parleur pour la sortie de traduction. Avec Bluetooth, reglez micro PC et ecouteurs separement.',
    trainingStepPause: 'La pause entre phrases regle le delai avant envoi a la traduction.',
    trainingStepAiMode: 'Le bouton IA active les suggestions de reponse dans le panneau droit.',
    trainingStepTopic: 'Le sujet et le contexte aident IA a proposer de meilleures reponses.',
    trainingStepAppearance: 'Ajustez ici la taille de police et le contraste.',
    trainingStepChat: 'Zone de dialogue : vos phrases a gauche, l interlocuteur a droite, suggestions IA plus loin.',
    trainingDemoMessageText: 'Bonjour, ravi de vous rencontrer.',
    trainingDemoPartnerMessageText: 'Bonjour ! Comment allez-vous aujourd\'hui ?',
    trainingStepChatMessage: 'Apres la reconnaissance, votre phrase apparait dans la colonne « Vous » — comme l exemple.',
    trainingStepChatDelete: 'La × supprime la phrase en cas d erreur de reconnaissance.',
    trainingStepChatPlay: 'Play lit la phrase manuellement (si lecture auto desactivee).',
    trainingStepChatStatus: 'Statut : en attente, en cours de lecture ou deja lu.',
    trainingStepChatTabOpen: 'Tab ouvre cette fenetre : modifiez la phrase, choisissez Question ou Affirmation.',
    trainingStepChatModalAi: 'L IA propose des reponses ici. Touches 3–7 — le texte apparait dans le champ et le chat.',
    trainingStepChatAiPanel: 'A droite : Suggestions de reponse a la phrase du partenaire.',
    trainingStepFooterConference: 'Mode conference : la traduction passe par un cable virtuel (VB-Cable / BlackHole) vers Zoom, Teams, etc. La premiere activation ouvre un guide.',
    trainingStepFooterHints: 'Barre centrale : « Parlez » — le micro ecoute ; Tab et Entree — modifier et lire les phrases.',
    trainingStepFooterStatus: 'Statut : « Arrete » — traduction off ; en marche : reconnaissance ou lecture.',
    trainingStepFooterMicLevel: '« Niveau » — volume entrant du micro. Verifiez que le micro est entendu.',
    trainingStepFooterMicBtn: 'Le bouton 🎚 ouvre la sensibilite du micro et le volume de vos phrases lues.',
    trainingStepFooterMicPanel: 'Reglez ici la sensibilite du micro (seuil) et le volume de vos phrases vocalisees.',
    trainingStepChatTabFooter: 'Rappel : Tab — editer la phrase, Entree — la lire.',
    trainingAiLoading: 'Chargement des suggestions…',
    trainingDemoSuggestion1: 'Oui, je suis d accord.',
    trainingDemoSuggestion2: 'Pouvez-vous preciser, s il vous plait ?',
    trainingDemoSuggestion3: 'Merci, c est utile.',
    trainingModalSuggestion1: 'Bonjour, ravi de vous rencontrer.',
    trainingModalSuggestion2: 'Heureux de vous voir, comment allez-vous ?',
    trainingModalSuggestion3: 'Bonjour, comment se passent les choses ?',
    trainingModalSuggestion4: 'Salut, comment puis-je aider ?',
    trainingModalSuggestion5: 'Bonjour, comment se passe votre travail ?',
    translationPauseLabel: '⏸️ Pause de traduction',
    chatMenuLabel: 'Menu',
    chatSettingsToggleTitle: 'Ouvrir/fermer le menu des réglages',
    chatSettingsCollapseTitle: 'Replier le menu',
    chatSettingsCollapseAria: 'Replier le menu des réglages',
    recognitionModeHint: 'Choisissez le mode de reconnaissance',
    recognitionModeDiffHint: 'Basic est plus rapide et leger ; Pro offre une meilleure precision sur la parole complexe.',
    autoPlayCardTitle: 'Lecture vocale',
    autoPlaySectionHint: 'Lecture automatique de ma phrase',
    autoPlayLabel: '🔊 Auto',
    autoPlayHintLine: 'Après la reconnaissance, la phrase sera lue dans la langue de votre interlocuteur',
    aiTopicSettingsTitle: 'Sujet et contexte IA',
    cloneViaModalLabel: 'Modal',
    a11yFontLabel: '🔤',
    a11yContrastLabel: '◐',
    phrasePauseHint: 'Réglage de la pause entre phrases',
    phrasePauseLabel: 'Pause entre phrases',
    phrasePauseUnit: 's',
    phrasePauseAdjustable: 'Réglable',
    chatPreloaderText: 'Connexion au serveur…',
    columnResizerUserPartner: 'Redimensionner les colonnes Vous/Interlocuteur',
    columnResizerChatAi: 'Redimensionner le chat et le panneau IA',
    aiSuggestionsTitle: 'Suggestions de réponse',
    aiSuggestionsLoading: 'Génération des suggestions...',
    aiTopicModalTitle: 'Sujet et contexte de conversation',
    aiTopicModalHint: 'Indiquez le sujet et un contexte optionnel pour améliorer reconnaissance et suggestions.',
    aiTopicFieldTitle: 'Sujet court',
    aiTopicFieldTitlePh: 'Par exemple : négociation avec un fournisseur',
    aiTopicFieldDesc: 'Description du contexte',
    aiTopicFieldDescPh: 'Détails clés, terminologie, rôles, ton souhaité et objectifs de la conversation.',
    aiTopicCancel: 'Annuler',
    aiTopicSave: 'Enregistrer',
    modeBasicBtnTitle: 'Reconnaissance gratuite via Vosk',
    modeProBtnTitle: 'Reconnaissance précise via OpenAI/AITunnel',
    modeProBtnTitleLocked: 'Disponible avec les offres Pro et Ultimate. Cliquez pour découvrir comment passer à l’offre supérieure.',
    proUpgradeModalTitle: 'Mode Pro indisponible',
    proUpgradeModalHint: 'La reconnaissance Pro est incluse dans les offres Pro et Ultimate. Améliorez votre offre pour l’activer.',
    proUpgradeModalPlans: 'Voir les offres',
    proUpgradeModalDashboard: 'Abonnement dans le compte',
    proUpgradeModalClose: 'Compris',
    micLevelLabel: 'Niveau',
    micSensitivityHint: 'Ouvrir la sensibilité du micro',
    micSensitivityLabel: 'Sensibilité du microphone',
    userTtsVolumeLabel: 'Volume de lecture (vos phrases)',
    rangeStepDownAria: 'Diminuer',
    rangeStepUpAria: 'Augmenter',
    
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
    logConferenceNoCable: '⚠️ VB-Cable introuvable. Installez VB-Audio Cable et dans Zoom/Teams choisissez le micro « CABLE Output ».',
    logConferenceCableOk: '🔁 Audio pour l’interlocuteur → {device}',
    confSetupModalTitle: 'Audio pour visioconférence',
    confSetupModalHint: 'Choisissez votre application de réunion — guide pas à pas VB-Cable pour que les participants entendent la traduction.',
    confSetupCableHint: 'Étape 1 : vérifiez le câble audio virtuel et installez-le si besoin.',
    confSetupAppsHint: 'Étape 2 : choisissez l’application de réunion.',
    confSetupAppsHintSkipped: 'Étape 1 : choisissez l’application de réunion.',
    confSetupGuideHint: 'Étape 3 : configurez l’audio dans l’application choisie.',
    confSetupGuideHintSkipped: 'Étape 2 : configurez l’audio dans l’application choisie.',
    confSetupCableLead: 'Vérifiez si un câble audio virtuel est installé — sans lui, les participants n’entendront pas la traduction dans Zoom, Teams, etc.',
    confSetupCableWindowsLine: 'Windows — VB-Audio Virtual Cable (gratuit)',
    confSetupCableMacLine: 'macOS — BlackHole (gratuit) ou Loopback (payant)',
    confSetupDownloadWin: 'Télécharger VB-Cable pour Windows',
    confSetupDownloadMac: 'Télécharger BlackHole pour macOS',
    confSetupCableNote: 'Redémarrez si nécessaire après l’installation, puis cliquez « Suivant ».',
    confSetupCableOsWin: 'Recommandé pour votre système : Windows.',
    confSetupCableOsMac: 'Recommandé pour votre système : macOS.',
    confSetupCableDetected: 'VB-Cable détecté sur cet ordinateur.',
    confSetupCableDetectedServer: 'VB-Cable détecté sur le serveur de traduction (mode local).',
    confSetupCableCheckPermission:
      'Autorisez l’accès au micro dans le navigateur pour vérifier VB-Cable, ou cliquez sur « Suivant » s’il est déjà installé.',
    confSetupCableNotDetected:
      'VB-Cable introuvable dans le navigateur sur ce PC. Installez le pilote via le lien ci-dessus et redémarrez si nécessaire.',
    confSetupAppsLead: 'Choisissez l’application pour votre conférence :',
    confSetupBackToCable: '← Retour',
    confSetupBackToApps: '← Apps',
    confSetupBack: '← Apps',
    confSetupClose: 'Fermer',
    confSetupStart: 'Démarrer la traduction',
    confSetupPrev: 'Précédent',
    confSetupNext: 'Suivant',
    confSetupDontShow: 'Ne plus afficher',
    confSetupStepOf: 'Étape {{current}} sur {{total}}',
    confAppZoom: 'Zoom',
    confAppMeet: 'Google Meet',
    confAppTeams: 'Microsoft Teams',
    confAppWebex: 'Cisco Webex',
    confAppTelegram: 'Telegram',
    confAppWhatsapp: 'WhatsApp',
    confAppOther: 'Toute application',
    confSetupStep1Title: 'Installer VB-Audio Cable',
    confSetupStep1Text: 'Téléchargez VB-Audio Virtual Cable sur vb-audio.com, installez le pilote et redémarrez si nécessaire.',
    confSetupStep2Title: 'Activer le mode conférence',
    confSetupStep2Text: 'En bas du traducteur, activez « Mode conférence (VB-Cable) » pour envoyer la voix traduite sur le câble virtuel.',
    confSetupStep3ZoomTitle: 'Micro dans Zoom',
    confSetupStep3ZoomText: 'Zoom → Paramètres → Audio : micro « CABLE Output (VB-Audio Virtual Cable) ». Haut-parleurs — casque.',
    confSetupStep3MeetTitle: 'Micro dans Google Meet',
    confSetupStep3MeetText: 'Dans Meet, réglages audio : micro « CABLE Output (VB-Audio Virtual Cable) », haut-parleur — votre sortie.',
    confSetupStep3TeamsTitle: 'Micro dans Microsoft Teams',
    confSetupStep3TeamsText: 'Teams → Paramètres → Périphériques : micro « CABLE Output (VB-Audio Virtual Cable) ».',
    confSetupStep3WebexTitle: 'Micro dans Cisco Webex',
    confSetupStep3WebexText: 'Webex → Audio settings : Microphone « CABLE Output (VB-Audio Virtual Cable) ».',
    confSetupTelegramStep1Title: 'Paramètres Telegram',
    confSetupTelegramStep1Text:
      'Dans Telegram, ouvrez le menu → Paramètres (Settings) et choisissez « Haut-parleurs et caméra » (Speakers and Camera).',
    confSetupTelegramStep2Title: 'Haut-parleurs et caméra',
    confSetupTelegramStep2Text:
      'Dans « Haut-parleurs et caméra », choisissez CABLE Output (VB-Audio Virtual Cable) comme micro. Haut-parleurs — casque.',
    confSetupStep3WhatsappTitle: 'Audio dans WhatsApp',
    confSetupStep3WhatsappText:
      'Pendant un appel WhatsApp, ouvrez les réglages audio et choisissez CABLE Output (VB-Audio Virtual Cable) comme micro. Haut-parleurs — casque.',
    confSetupStep3OtherTitle: 'Audio dans l’application',
    confSetupStep3OtherText:
      'Dans les réglages audio de l’application, choisissez CABLE Output (VB-Audio Virtual Cable) comme micro. Haut-parleurs — casque si l’app le permet.',
    confSetupStep4Title: 'Lancer traduction et réunion',
    confSetupStep4Text: 'Cliquez « Démarrer la traduction » ou « Démarrer » dans le traducteur, puis rejoignez l’appel.',
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
    msgStatusDone: '✅ Parlé',
    msgStatusSent: '✓ Envoyé'
  }
};

function normalizeUiLang(code) {
  if (typeof window.vfNormalizeUiLang === 'function') {
    const n = window.vfNormalizeUiLang(code);
    return n || 'en';
  }
  const c = String(code || '').toLowerCase().slice(0, 2);
  const opts = (typeof window !== 'undefined' && window.VF_CONVERSATION_LANG_OPTIONS) || [];
  for (let i = 0; i < opts.length; i++) {
    if (opts[i] && opts[i].value === c) return c;
  }
  const fallback = new Set([
    'en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'pl', 'nl', 'sv', 'tr', 'el', 'cs', 'ca', 'br',
    'zh', 'ja', 'ko', 'hi', 'ar', 'vi', 'kk', 'uz', 'ky', 'tg', 'te', 'gu', 'tl', 'fa', 'uk', 'ka', 'eo'
  ]);
  return fallback.has(c) ? c : 'en';
}

function uiLangPack(code) {
  const c = normalizeUiLang(code);
  if (!c) return 'en';
  if (typeof window.vfGetUiLangPack === 'function') {
    return window.vfGetUiLangPack(c) || 'en';
  }
  return c;
}

function resolveUiTranslationBundle(uiCode) {
  const extra = (typeof window !== 'undefined' && window.VF_CHAT_UI_PACKS) || {};
  const packCode =
    typeof window.vfGetUiLangPack === 'function'
      ? window.vfGetUiLangPack(uiCode)
      : uiCode;
  const core = TRANSLATIONS[packCode] || TRANSLATIONS[uiCode] || {};
  const fromExtra = extra[packCode] || extra[uiCode] || {};
  // Только выбранный язык: без подстановки строк из EN (полный пакет в translations.js или VF_CHAT_UI_PACKS).
  return Object.assign({}, core, fromExtra);
}

function buildI18nResources() {
  const resources = {};
  const packCodes = new Set(['ru', 'en', 'de', 'es', 'fr']);
  const extra = (typeof window !== 'undefined' && window.VF_CHAT_UI_PACKS) || {};
  Object.keys(extra).forEach((c) => {
    packCodes.add(uiLangPack(c));
  });
  const opts =
    typeof window !== 'undefined' && window.VF_CONVERSATION_LANG_OPTIONS
      ? window.VF_CONVERSATION_LANG_OPTIONS
      : [];
  opts.forEach((o) => {
    if (o && o.value) packCodes.add(uiLangPack(o.value));
  });
  packCodes.forEach((code) => {
    const translation = resolveUiTranslationBundle(code);
    if (translation) resources[code] = { translation };
  });
  return resources;
}

function populateTranslatorLangSelect() {
  const sel = document.getElementById('languageSelect');
  if (!sel) return;
  if (typeof window.vfPopulateUiLangSelect === 'function') {
    window.vfPopulateUiLangSelect(sel, currentLang);
  }
}

function detectLangFromNavigator() {
  if (typeof window.vfNormalizeUiLang === 'function') {
    const list =
      (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language || 'en'];
    for (let i = 0; i < list.length; i++) {
      const n = window.vfNormalizeUiLang(list[i]);
      if (n) return n;
    }
    return 'en';
  }
  return normalizeUiLang(navigator.language || 'en');
}

function isVoiceTranslatorDesktop() {
  try {
    if (typeof window !== 'undefined' && window.voiceflowDesktop) return true;
    return /VoiceTranslatorDesktop/i.test(navigator.userAgent || '');
  } catch (e) {
    return false;
  }
}

async function resolveInitialUiLang() {
  try {
    const isDesktop = isVoiceTranslatorDesktop();
    const vt = localStorage.getItem('voiceTranslator_lang');
    if (vt) {
      const n = normalizeUiLang(vt);
      if (n) return n;
    }
    /**
     * Десктоп: на самом первом запуске принудительно английский,
     * даже если сайт раньше сохранял другой язык в siteLang/siteLangUserSet.
     */
    if (isDesktop) {
      return 'en';
    }
    const userSet = localStorage.getItem('siteLangUserSet') === '1';
    const site = localStorage.getItem('siteLang');
    if (site) {
      const n = normalizeUiLang(site);
      if (n) return n;
    }
    if (userSet && vt) {
      const n = normalizeUiLang(vt);
      if (n) return n;
    }
  } catch (e) {
    /* ignore */
  }

  try {
    const r = await fetch('/api/site/detect-language', { credentials: 'same-origin' });
    if (r.ok) {
      const j = await r.json();
      if (j && j.lang) return normalizeUiLang(j.lang);
    }
  } catch (e) {
    /* ignore */
  }

  return detectLangFromNavigator();
}

let currentLang = 'en';

const vfI18nBootPromise = (async function bootTranslations() {
  currentLang = await resolveInitialUiLang();
  window.currentLang = currentLang;
  try {
    localStorage.setItem('voiceTranslator_lang', currentLang);
    localStorage.setItem('siteLang', currentLang);
  } catch (e) {
    /* ignore */
  }
  if (document.documentElement) {
    document.documentElement.lang = currentLang;
    document.documentElement.classList.remove('site-lang-loading');
    document.documentElement.classList.add('site-lang-ready');
  }

  await new Promise((resolve) => {
    i18next.init({
      lng: uiLangPack(currentLang),
      fallbackLng: false,
      returnEmptyString: false,
      returnNull: false,
      resources: buildI18nResources()
    }, () => {
      populateTranslatorLangSelect();
      applyTranslations();
      resolve();
    });
  });
})();

window.vfWaitForI18n = () => vfI18nBootPromise;

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

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    el.setAttribute('aria-label', i18next.t(key));
  });

  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.getAttribute('data-i18n-opt');
    if (key) el.textContent = i18next.t(key);
  });
  
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    const isRunning = statusDiv.classList.contains('running');
    statusDiv.textContent = isRunning ? i18next.t('statusRunning') : i18next.t('statusStopped');
  }

  if (typeof window.syncProRecognitionGateUi === 'function') {
    window.syncProRecognitionGateUi();
  }

  if (typeof window.syncDesktopWindowMaxUi === 'function') {
    window.syncDesktopWindowMaxUi();
  }

  console.log(`🌐 Language: ${currentLang}`);
}

function changeLanguage(lang) {
  const norm = normalizeUiLang(lang);
  if (!norm) return;
  currentLang = norm;
  window.currentLang = norm;
  localStorage.setItem('voiceTranslator_lang', norm);
  try {
    localStorage.setItem('siteLang', norm);
    localStorage.setItem('siteLangUserSet', '1');
  } catch (e) {
    /* ignore */
  }
  const sel = document.getElementById('languageSelect');
  if (sel) sel.value = norm;
  const pack = uiLangPack(norm);
  if (!i18next.hasResourceBundle(pack, 'translation')) {
    i18next.addResourceBundle(pack, 'translation', resolveUiTranslationBundle(norm), true, true);
  }
  if (document.documentElement) document.documentElement.lang = norm;
  i18next.changeLanguage(pack, () => {
    applyTranslations();
    if (typeof window.updateUI === 'function') window.updateUI();
    if (typeof window.applyA11yDom === 'function') window.applyA11yDom();
    if (typeof window.syncFooterPlayHint === 'function') window.syncFooterPlayHint();
    if (typeof window.syncAllMsgPlayButtons === 'function') window.syncAllMsgPlayButtons();
    if (typeof window.refreshHeaderPlanUsage === 'function') window.refreshHeaderPlanUsage();
  });
}

function t(key) {
  return i18next.t(key);
}

window.t = t;
window.changeLanguage = changeLanguage;
window.applyTranslations = applyTranslations;
window.TRANSLATIONS = TRANSLATIONS;
window.currentLang = currentLang;

/** Hotfix для установленного TalkPilot: подгружает audio-devices.js с сервера (без переустановки). */
(function vfDesktopAudioHotfixLoader() {
  const HOTFIX_REV = '20260605b';

  function isDesktopClient() {
    try {
      return (
        document.documentElement.classList.contains('vf-desktop-app') ||
        /VoiceTranslatorDesktop/i.test(navigator.userAgent || '')
      );
    } catch (_) {
      return false;
    }
  }

  function injectAudioDevicesHotfix() {
    if (!isDesktopClient()) return;
    if (window.__vfDesktopHotfixRev === HOTFIX_REV && window.__vfAudioDevicesRev === HOTFIX_REV) return;
    window.__vfDesktopHotfixRev = HOTFIX_REV;
    const url = `/ui/audio-devices.js?v=${HOTFIX_REV}&vf_hotfix=${Date.now()}`;
    fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`audio-devices ${r.status}`))))
      .then((code) => {
        let el = document.getElementById('vf-audio-devices-hotfix');
        if (!el) {
          el = document.createElement('script');
          el.id = 'vf-audio-devices-hotfix';
          (document.head || document.documentElement).appendChild(el);
        }
        el.textContent = code;
      })
      .catch((e) => console.warn('[vf-hotfix] audio-devices:', e));
  }

  function scheduleHotfix() {
    injectAudioDevicesHotfix();
    [800, 2000, 4500, 8000].forEach((ms) => setTimeout(injectAudioDevicesHotfix, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleHotfix);
  } else {
    scheduleHotfix();
  }
  window.addEventListener('load', () => setTimeout(scheduleHotfix, 500));
})();

/** Десктоп: 3 колонки в меню настроек (после inject layout-fix из Electron). */
(function vfDesktopToolbarColsHotfix() {
  const HOTFIX_REV = '20260605cols3';

  function isDesktopClient() {
    try {
      return document.documentElement.classList.contains('vf-desktop-app');
    } catch (_) {
      return false;
    }
  }

  function applyToolbarCols() {
    if (!isDesktopClient()) return;
    const id = 'vf-desktop-toolbar-cols-hotfix';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.getAttribute('data-rev') === HOTFIX_REV) return;
    el.setAttribute('data-rev', HOTFIX_REV);
    el.textContent = `
      .chat-session-settings-wrap .header-controls.chat-session-toolbar {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
      @media (max-width: 1180px) {
        .chat-session-settings-wrap .header-controls.chat-session-toolbar {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
      @media (max-width: 900px) {
        .chat-session-settings-wrap .header-controls.chat-session-toolbar {
          grid-template-columns: minmax(0, 1fr) !important;
        }
      }
    `;
  }

  function schedule() {
    applyToolbarCols();
    [400, 1200, 2500].forEach((ms) => setTimeout(applyToolbarCols, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
  window.addEventListener('load', () => setTimeout(schedule, 600));
})();

/** Десктоп stealth: полупрозрачные пузыри сообщений (inline background в app.js). */
(function vfDesktopStealthMsgHotfix() {
  const HOTFIX_REV = '20260605stealthmsg';

  function apply() {
    if (!document.documentElement.classList.contains('vf-desktop-app')) return;
    const id = 'vf-desktop-stealth-msg-hotfix';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.getAttribute('data-rev') === HOTFIX_REV) return;
    el.setAttribute('data-rev', HOTFIX_REV);
    el.textContent = `
      html.vf-desktop-stealth .msg-bubble.user .msg-content {
        background: rgba(59, 130, 246, 0.38) !important;
        border: 1px solid rgba(96, 165, 250, 0.42) !important;
        box-shadow: none !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      html.vf-desktop-stealth .msg-bubble.partner .msg-content {
        background: rgba(34, 197, 94, 0.38) !important;
        border: 1px solid rgba(74, 222, 128, 0.42) !important;
        box-shadow: none !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      html.vf-desktop-stealth .msg-bubble.user .msg-content:has(.msg-input) {
        border: 2px solid rgba(250, 204, 21, 0.72) !important;
      }
    `;
  }

  function schedule() {
    apply();
    [300, 1200, 3000].forEach((ms) => setTimeout(apply, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
  try {
    const obs = new MutationObserver(() => apply());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } catch (_) {
    /* ignore */
  }
})();

/** Десктоп: баннер автообновления (видно на уже установленных версиях без переустановки UI). */
(function vfDesktopUpdateBannerHotfix() {
  const HOTFIX_REV = '20260605upd2';
  let bannerEl = null;
  let unsub = null;

  function isDesktopClient() {
    try {
      return (
        document.documentElement.classList.contains('vf-desktop-app') &&
        typeof window.voiceflowDesktop === 'object' &&
        window.voiceflowDesktop
      );
    } catch (_) {
      return false;
    }
  }

  function tUpd(key) {
    const loc = (typeof window.currentLang === 'string' && window.currentLang) || 'en';
    const ru = loc === 'ru' || loc.startsWith('ru-');
    const map = {
      checking: ru ? 'Проверка обновлений…' : 'Checking for updates…',
      available: ru ? 'Доступно обновление TalkPilot' : 'TalkPilot update available',
      downloading: ru ? 'Загрузка обновления…' : 'Downloading update…',
      downloaded: ru ? 'Обновление загружено — перезапустите приложение' : 'Update ready — restart the app',
      install: ru ? 'Установить сейчас' : 'Install now',
      check: ru ? 'Проверить обновления' : 'Check for updates',
      manual: ru ? 'Скачать установщик' : 'Download installer',
      version: ru ? 'Версия' : 'Version',
      errHint: ru
        ? 'Закройте TalkPilot полностью и установите вручную'
        : 'Close TalkPilot completely and install manually',
    };
    return map[key] || key;
  }

  function ensureBanner() {
    if (bannerEl) return bannerEl;
    bannerEl = document.createElement('div');
    bannerEl.id = 'vf-desktop-update-banner';
    bannerEl.setAttribute('data-rev', HOTFIX_REV);
    bannerEl.style.cssText =
      'display:none;position:fixed;top:0;left:0;right:0;z-index:2147483000;' +
      'padding:0.55rem 1rem;background:linear-gradient(90deg,#1d4ed8,#2563eb);' +
      'color:#fff;font:500 0.9rem/1.35 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.35);' +
      'align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;';
    bannerEl.innerHTML =
      '<span id="vf-desktop-update-text"></span>' +
      '<button type="button" id="vf-desktop-update-install" style="display:none;padding:0.35rem 0.85rem;border:none;border-radius:8px;background:#fff;color:#1d4ed8;font-weight:600;cursor:pointer;"></button>' +
      '<button type="button" id="vf-desktop-update-check" style="padding:0.35rem 0.85rem;border:1px solid rgba(255,255,255,.55);border-radius:8px;background:transparent;color:#fff;cursor:pointer;"></button>' +
      '<button type="button" id="vf-desktop-update-manual" style="display:none;padding:0.35rem 0.85rem;border:1px solid rgba(255,255,255,.55);border-radius:8px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;"></button>';
    (document.body || document.documentElement).appendChild(bannerEl);
    const installBtn = bannerEl.querySelector('#vf-desktop-update-install');
    const checkBtn = bannerEl.querySelector('#vf-desktop-update-check');
    const manualBtn = bannerEl.querySelector('#vf-desktop-update-manual');
    if (installBtn) {
      installBtn.textContent = tUpd('install');
      installBtn.addEventListener('click', () => {
        const vd = window.voiceflowDesktop;
        if (vd && typeof vd.installUpdateNow === 'function') void vd.installUpdateNow();
      });
    }
    if (checkBtn) {
      checkBtn.textContent = tUpd('check');
      checkBtn.addEventListener('click', () => {
        const vd = window.voiceflowDesktop;
        if (vd && typeof vd.checkForUpdates === 'function') void vd.checkForUpdates();
      });
    }
    if (manualBtn) {
      manualBtn.textContent = tUpd('manual');
      manualBtn.addEventListener('click', () => {
        const vd = window.voiceflowDesktop;
        const isMac =
          /Mac|iPhone|iPod|iPad/i.test(navigator.platform || '') ||
          /Mac OS X/i.test(navigator.userAgent || '');
        const url = isMac
          ? 'https://talkpilot.pro/mac-install.html'
          : 'https://talkpilot.pro/downloads/Voice-Translator-Setup.exe?t=' + Date.now();
        if (vd && typeof vd.openExternal === 'function') void vd.openExternal(url);
        else window.open(url, '_blank');
      });
    }
    return bannerEl;
  }

  function renderUpdateState(state) {
    if (!isDesktopClient() || !state) return;
    const bar = ensureBanner();
    const text = bar.querySelector('#vf-desktop-update-text');
    const installBtn = bar.querySelector('#vf-desktop-update-install');
    const manualBtn = bar.querySelector('#vf-desktop-update-manual');
    const status = String(state.status || '');
    const ver = String(state.version || '').trim();
    const nextVer = String(state.availableVersion || '').trim();
    let msg = '';
    let show = false;
    let showInstall = false;
    if (status === 'checking') {
      show = true;
      msg = tUpd('checking');
    } else if (status === 'available' || status === 'downloading') {
      show = true;
      msg = status === 'downloading' ? tUpd('downloading') : tUpd('available');
      if (nextVer) msg += ` (${nextVer})`;
      if (state.message) msg += ' — ' + state.message;
    } else if (status === 'downloaded') {
      show = true;
      showInstall = true;
      msg = tUpd('downloaded');
      if (nextVer) msg += ` (${nextVer})`;
    } else if (status === 'error') {
      const raw = String(state.message || 'Update error');
      /* macOS без latest-mac.yml — не пугать пользователя длинным HttpError 404 */
      if (
        /latest-mac\.yml/i.test(raw) ||
        /Cannot find channel/i.test(raw) ||
        (/HttpError:\s*404/i.test(raw) && /downloads/i.test(raw))
      ) {
        show = false;
        msg = '';
      } else {
        show = true;
        msg = raw;
        if (/EPERM|EBUSY|rename|удалить старые/i.test(msg)) {
          msg += '. ' + tUpd('errHint');
        }
      }
    }
    if (ver && show) msg = `${tUpd('version')} ${ver}. ${msg}`;
    if (text) text.textContent = msg;
    if (installBtn) installBtn.style.display = showInstall ? 'inline-block' : 'none';
    if (manualBtn) manualBtn.style.display = status === 'error' ? 'inline-block' : 'none';
    bar.style.display = show ? 'flex' : 'none';
    try {
      document.documentElement.style.setProperty(
        '--vf-desktop-update-banner-h',
        show ? '2.6rem' : '0px'
      );
    } catch (_) {
      /* ignore */
    }
  }

  function bindUpdateUi() {
    if (!isDesktopClient() || window.__vfDesktopUpdateBannerRev === HOTFIX_REV) return;
    const vd = window.voiceflowDesktop;
    if (!vd || typeof vd.onUpdateState !== 'function') return;
    window.__vfDesktopUpdateBannerRev = HOTFIX_REV;
    if (typeof unsub === 'function') unsub();
    unsub = vd.onUpdateState((state) => renderUpdateState(state));
    if (typeof vd.getUpdateState === 'function') {
      void vd.getUpdateState().then((state) => renderUpdateState(state)).catch(() => {});
    }
  }

  function schedule() {
    bindUpdateUi();
    [600, 1800, 4000, 9000].forEach((ms) => setTimeout(bindUpdateUi, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
  window.addEventListener('load', () => setTimeout(schedule, 800));
})();