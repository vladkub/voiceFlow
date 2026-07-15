/**
 * Лендинг TalkPilot: язык по IP (/api/site/detect-language) + localStorage siteLang
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'siteLang';
  const USER_SET_KEY = 'siteLangUserSet';
  const SUPPORTED = (function () {
    if (typeof window !== 'undefined' && window.VF_CONVERSATION_LANG_OPTIONS) {
      return window.VF_CONVERSATION_LANG_OPTIONS.map(function (o) {
        return o.value;
      });
    }
    return ['ru', 'en', 'de', 'fr', 'es'];
  })();

  /** Vosk language chips: same flag ids for every UI language; labels per locale. */
  const VOSK_EU_IDS = ['us', 'de', 'fr', 'es', 'it', 'br', 'ru', 'pl', 'nl', 'se', 'tr', 'gr', 'cz', 'ca', 'bt'];
  const VOSK_AS_IDS = ['cn', 'jp', 'kr', 'in', 'sa', 'vn', 'kz', 'uz', 'kg', 'tj', 'in', 'in', 'ph'];
  const VOSK_OT_IDS = ['ir', 'ua', 'ge', 'eo'];

  function vfVoskChipRowHtml(ids, labels) {
    var html = '';
    for (var i = 0; i < ids.length; i++) {
      html +=
        '<div class="lang-chip" role="listitem">' +
        '<span class="lang-chip-flag lang-chip-flag--svg" aria-hidden="true">' +
        '<svg class="vf-lang-flag-svg" width="22" height="15" viewBox="0 0 22 15" focusable="false"><use href="#vf-flag-' +
        ids[i] +
        '"/></svg></span>' +
        '<span class="lang-chip-label">' +
        labels[i] +
        '</span></div>';
    }
    return html;
  }

  var VOSK_LABELS = {
    ru: {
      eu: [
        'Английский (США, Индия)',
        'Немецкий',
        'Французский',
        'Испанский',
        'Итальянский',
        'Португальский (Бразилия)',
        'Русский',
        'Польский',
        'Нидерландский',
        'Шведский',
        'Турецкий',
        'Греческий',
        'Чешский',
        'Каталанский',
        'Бретонский'
      ],
      as: [
        'Китайский',
        'Японский',
        'Корейский',
        'Хинди',
        'Арабский',
        'Вьетнамский',
        'Казахский',
        'Узбекский',
        'Киргизский',
        'Таджикский',
        'Телугу',
        'Гуджарати',
        'Филиппино (тагальский)'
      ],
      ot: ['Персидский (фарси)', 'Украинский', 'Грузинский', 'Эсперанто']
    },
    en: {
      eu: [
        'English (US, India)',
        'German',
        'French',
        'Spanish',
        'Italian',
        'Portuguese (Brazil)',
        'Russian',
        'Polish',
        'Dutch',
        'Swedish',
        'Turkish',
        'Greek',
        'Czech',
        'Catalan',
        'Breton'
      ],
      as: [
        'Chinese',
        'Japanese',
        'Korean',
        'Hindi',
        'Arabic',
        'Vietnamese',
        'Kazakh',
        'Uzbek',
        'Kyrgyz',
        'Tajik',
        'Telugu',
        'Gujarati',
        'Filipino (Tagalog)'
      ],
      ot: ['Persian (Farsi)', 'Ukrainian', 'Georgian', 'Esperanto']
    },
    de: {
      eu: [
        'Englisch (USA, Indien)',
        'Deutsch',
        'Französisch',
        'Spanisch',
        'Italienisch',
        'Portugiesisch (Brasilien)',
        'Russisch',
        'Polnisch',
        'Niederländisch',
        'Schwedisch',
        'Türkisch',
        'Griechisch',
        'Tschechisch',
        'Katalanisch',
        'Bretonisch'
      ],
      as: [
        'Chinesisch',
        'Japanisch',
        'Koreanisch',
        'Hindi',
        'Arabisch',
        'Vietnamesisch',
        'Kasachisch',
        'Usbekisch',
        'Kirgisisch',
        'Tadschikisch',
        'Telugu',
        'Gujarati',
        'Filipino (Tagalog)'
      ],
      ot: ['Persisch (Farsi)', 'Ukrainisch', 'Georgisch', 'Esperanto']
    },
    fr: {
      eu: [
        'Anglais (États-Unis, Inde)',
        'Allemand',
        'Français',
        'Espagnol',
        'Italien',
        'Portugais (Brésil)',
        'Russe',
        'Polonais',
        'Néerlandais',
        'Suédois',
        'Turc',
        'Grec',
        'Tchèque',
        'Catalan',
        'Breton'
      ],
      as: [
        'Chinois',
        'Japonais',
        'Coréen',
        'Hindi',
        'Arabe',
        'Vietnamien',
        'Kazakh',
        'Ouzbek',
        'Kirghiz',
        'Tadjik',
        'Télougou',
        'Gujarati',
        'Filipino (tagalog)'
      ],
      ot: ['Persan (farsi)', 'Ukrainien', 'Géorgien', 'Espéranto']
    },
    es: {
      eu: [
        'Inglés (EE. UU., India)',
        'Alemán',
        'Francés',
        'Español',
        'Italiano',
        'Portugués (Brasil)',
        'Ruso',
        'Polaco',
        'Neerlandés',
        'Sueco',
        'Turco',
        'Griego',
        'Checo',
        'Catalán',
        'Bretón'
      ],
      as: [
        'Chino',
        'Japonés',
        'Coreano',
        'Hindi',
        'Árabe',
        'Vietnamita',
        'Kazajo',
        'Uzbeko',
        'Kirguís',
        'Tayiko',
        'Telugu',
        'Guyaratí',
        'Filipino (tagalo)'
      ],
      ot: ['Persa (farsi)', 'Ucraniano', 'Georgiano', 'Esperanto']
    },
    it: {
      eu: [
        'Inglese (USA, India)',
        'Tedesco',
        'Francese',
        'Spagnolo',
        'Italiano',
        'Portoghese (Brasile)',
        'Russo',
        'Polacco',
        'Olandese',
        'Svedese',
        'Turco',
        'Greco',
        'Ceco',
        'Catalano',
        'Bretone'
      ],
      as: [
        'Cinese',
        'Giapponese',
        'Coreano',
        'Hindi',
        'Arabo',
        'Vietnamita',
        'Kazako',
        'Uzbeco',
        'Kirghiso',
        'Tagiko',
        'Telugu',
        'Gujarati',
        'Filippino (tagalog)'
      ],
      ot: ['Persiano (farsi)', 'Ucraino', 'Georgiano', 'Esperanto']
    },
    pt: {
      eu: [
        'Inglês (EUA, Índia)',
        'Alemão',
        'Francês',
        'Espanhol',
        'Italiano',
        'Português (Brasil)',
        'Russo',
        'Polonês',
        'Holandês',
        'Sueco',
        'Turco',
        'Grego',
        'Tcheco',
        'Catalão',
        'Bretão'
      ],
      as: [
        'Chinês',
        'Japonês',
        'Coreano',
        'Hindi',
        'Árabe',
        'Vietnamita',
        'Cazaque',
        'Uzbeque',
        'Quirguiz',
        'Tajique',
        'Telugu',
        'Gujarati',
        'Filipino (tagalo)'
      ],
      ot: ['Persa (farsi)', 'Ucraniano', 'Georgiano', 'Esperanto']
    },
    pl: {
      eu: [
        'Angielski (USA, Indie)',
        'Niemiecki',
        'Francuski',
        'Hiszpański',
        'Włoski',
        'Portugalski (Brazylia)',
        'Rosyjski',
        'Polski',
        'Niderlandzki',
        'Szwedzki',
        'Turecki',
        'Grecki',
        'Czeski',
        'Kataloński',
        'Bretoński'
      ],
      as: [
        'Chiński',
        'Japoński',
        'Koreański',
        'Hindi',
        'Arabski',
        'Wietnamski',
        'Kazachski',
        'Uzbecki',
        'Kirgiski',
        'Tadżycki',
        'Telugu',
        'Gudżarati',
        'Filipiński (tagalog)'
      ],
      ot: ['Perski (farsi)', 'Ukraiński', 'Gruziński', 'Esperanto']
    },
    nl: {
      eu: [
        'Engels (VS, India)',
        'Duits',
        'Frans',
        'Spaans',
        'Italiaans',
        'Portugees (Brazilië)',
        'Russisch',
        'Pools',
        'Nederlands',
        'Zweeds',
        'Turks',
        'Grieks',
        'Tsjechisch',
        'Catalaans',
        'Bretons'
      ],
      as: [
        'Chinees',
        'Japans',
        'Koreaans',
        'Hindi',
        'Arabisch',
        'Vietnamees',
        'Kazachs',
        'Oezbeeks',
        'Kirgizisch',
        'Tadzjieks',
        'Telugu',
        'Gujarati',
        'Filipijns (Tagalog)'
      ],
      ot: ['Perzisch (Farsi)', 'Oekraïens', 'Georgisch', 'Esperanto']
    },
    sv: {
      eu: [
        'Engelska (USA, Indien)',
        'Tyska',
        'Franska',
        'Spanska',
        'Italienska',
        'Portugisiska (Brasilien)',
        'Ryska',
        'Polska',
        'Nederländska',
        'Svenska',
        'Turkiska',
        'Grekiska',
        'Tjeckiska',
        'Katalanska',
        'Bretonska'
      ],
      as: [
        'Kinesiska',
        'Japanska',
        'Koreanska',
        'Hindi',
        'Arabiska',
        'Vietnamesiska',
        'Kazakiska',
        'Uzbekiska',
        'Kirgiziska',
        'Tadzjikiska',
        'Telugu',
        'Gujarati',
        'Filippinska (tagalog)'
      ],
      ot: ['Persiska (farsi)', 'Ukrainska', 'Georgiska', 'Esperanto']
    }
  };

  function vfVoskAllIds() {
    return VOSK_EU_IDS.concat(VOSK_AS_IDS, VOSK_OT_IDS);
  }

  function vfVoskAllLabels(L) {
    return L.eu.concat(L.as, L.ot);
  }

  function vfVoskHtmlFor(lang) {
    var L = VOSK_LABELS[lang] || VOSK_LABELS.en;
    return {
      'index.vosk.all_html': vfVoskChipRowHtml(vfVoskAllIds(), vfVoskAllLabels(L)),
    };
  }

  const RU = {
    'nav.lang_label': 'Язык',
    'nav.menu_open': 'Открыть меню',
    'nav.menu_close': 'Закрыть меню',
    'nav.lang_aria': 'Язык сайта',
    'nav.home': 'Главная',
    'nav.features': 'Возможности',
    'nav.tech': 'Технологии',
    'nav.pricing': 'Тарифы',
    'nav.faq': 'FAQ',
    'nav.download': 'Скачать TalkPilot',
    'auth.login': 'Войти',
    'auth.register': 'Регистрация',
    'auth.logout': 'Выйти',
    'auth.cabinet': 'Личный кабинет',
    'nav.launch_app': 'Запустить приложение',
    'trial.metaTitle': 'Демо TalkPilot — выбор темы',
    'trial.hero.title': 'Попробовать бесплатно',
    'trial.hero.sub': 'Выберите тему тестового диалога и настройки — они подставятся в полное приложение после демо.',
    'trial.section.dialog_topic': 'Тема диалога',
    'trial.section.chat_presets': 'Предустановки чата',
    'trial.recognition.title': 'Режим распознавания',
    'trial.recognition.hint': 'От этого зависит качество распознавания речи и стоимость тарифа.',
    'trial.autoplay.title': 'Автовоспроизведение перевода',
    'trial.autoplay.hint': 'В чате ваши фразы будут автоматически озвучиваться.',
    'trial.autoplay.label': 'Автовоспроизведение перевода',
    'trial.languages.title': 'Выбор языков собеседников',
    'trial.languages.your_language': 'Ваш язык',
    'trial.languages.partner_language': 'Собеседник',
    'trial.my_voice.title': 'Выбор моего голоса',
    'trial.my_voice.hint': 'Голос для озвучки ваших фраз на языке собеседника.',
    'trial.my_voice.label': 'Мой голос',
    'trial.my_voice.disabled_by_clone': 'При включённом клоне используется ваш клонированный голос — выбор Edge-голоса ниже не нужен.',
    'trial.partner_voice.title': 'Выбор голоса собеседника',
    'trial.partner_voice.label': 'Голос собеседника',
    'trial.partner_voice.browser_fallback': 'Для этого языка нет нейроголоса Microsoft — в демо озвучка через браузер (качество может отличаться).',
    'trial.partner_voice.filtered': 'Показаны голоса для языка собеседника ({count}).',
    'trial.partner_voice.none': '— Озвучка браузером —',
    'trial.preview.button': 'Предпрослушать',
    'trial.clone.title': 'Один клонированный голос (необязательно)',
    'trial.clone.use_checkbox': 'Использовать клонированный голос',
    'trial.clone.tips.title': '💡 Советы:',
    'trial.clone.tips.item1': '6-30 секунд чёткой речи',
    'trial.clone.tips.item2': 'Без шума и музыки',
    'trial.clone.tips.item3': 'WAV, MP3, OGG, FLAC (до 10 МБ)',
    'trial.clone.source.legend': 'Источник голоса для демо',
    'trial.clone.source.aria': 'Источник клонированного голоса',
    'trial.clone.source.new': 'Записать или загрузить новый',
    'trial.clone.source.existing': 'Выбрать из личного кабинета',
    'trial.clone.existing.label': 'Клонированный голос',
    'trial.clone.existing.aria': 'Выберите клонированный голос',
    'trial.clone.existing.empty': 'В кабинете пока нет сохранённых клонов — запишите или загрузите новый голос ниже.',
    'trial.clone.upload.title': 'Загрузка файла для клонирования голоса',
    'trial.clone.upload.aria': 'Выбрать аудиофайл для клонирования',
    'trial.clone.drop_title': 'Перетащите аудио-файл сюда',
    'trial.clone.drop_sub': 'или нажмите для выбора',
    'trial.clone.name.label': 'Название голоса',
    'trial.clone.name.placeholder': 'Например: Мой голос, Диктор...',
    'trial.record.title': 'Запись голоса для клонирования',
    'trial.record.start': 'Начать запись',
    'trial.record.stop': 'Остановить',
    'trial.record.not_started': 'Запись не начата',
    'trial.record.prompts_title': 'Текст для чтения (для записи клона)',
    'trial.record.prompts_lang': 'Язык фраз',
    'trial.record.prompts_lang_aria': 'Язык фраз для чтения',
    'trial.record.generate': 'Сгенерировать текст',
    'trial.record.note_default': 'Нажмите «Сгенерировать текст», затем «Начать запись» и прочитайте фразы по списку (15-30 секунд).',
    'trial.record.note_count_prefix': 'Нужно прочитать',
    'trial.record.note_count_phrases': 'фраз',
    'trial.record.note_duration': 'Примерно 15-30 секунд (ориентир).',
    'trial.record.note_total_length': 'Общая длина:',
    'trial.record.note_symbols': 'символов',
    'trial.record.unavailable_browser': 'Запись недоступна в этом браузере',
    'trial.record.empty_retry': 'Запись пустая, попробуйте еще раз',
    'trial.record.ready_prefix': 'Запись готова:',
    'trial.record.in_progress': 'Идет запись...',
    'trial.record.no_microphone': 'Нет доступа к микрофону',
    'trial.record.file_selected': 'Выбран файл:',
    'trial.ai.section_title': 'Тема и контекст беседы (AI)',
    'trial.ai.topic_title': 'Тема беседы',
    'trial.ai.topic_placeholder': 'Например: собеседование на позицию backend-разработчика',
    'trial.ai.context_title': 'Контекст беседы',
    'trial.ai.context_placeholder': 'Ключевые детали, термины, стиль общения, цели диалога...',
    'trial.launch.button': 'Запустить приложение',
    'trial.launch.note': 'Ваши настройки сохранятся и будут применены в полном приложении',
    'trial.training.open': 'Обучение',
    'trial.training.close': 'Закрыть',
    'trial.training.close_hint': 'Закрыть подсказку',
    'trial.training.hint': 'Нажмите «Обучение», чтобы запустить пошаговый тур по функциям этой страницы.',
    'trial.guide.step_topic': 'Выберите тип тестовой беседы',
    'trial.guide.step_recognition_mode': 'Выберите режим распознавания',
    'trial.guide.step_autoplay': 'Включите или отключите автовоспроизведение перевода',
    'trial.guide.step_languages': 'Выберите ваш язык и язык собеседника',
    'trial.guide.step_user_voice': 'Выберите голос для озвучки ваших сообщений на языке собеседника',
    'trial.guide.step_partner_voice': 'Выберите голос собеседника и прослушайте пример',
    'trial.guide.step_clone': 'При необходимости добавьте ваш клонированный голос',
    'trial.guide.step_ai_context': 'Заполните тему и контекст, чтобы AI-подсказки были точнее в демо-чате',
    'trial.guide.step_launch': 'Когда все готово — нажмите «Запустить приложение»',
    'trial.guide.next': 'Далее',
    'trial.guide.finish': 'Завершить',
    'trial.topic.business.label': 'Бизнес-переговоры',
    'trial.topic.business.desc': 'Переговоры, сделки, партнерства',
    'trial.topic.interview.label': 'Собеседование',
    'trial.topic.interview.desc': 'Вопросы HR, техническое интервью',
    'trial.topic.friendly.label': 'Дружеская беседа',
    'trial.topic.friendly.desc': 'Неформальный диалог, small talk',
    'trial.topic.work.label': 'Рабочий диалог',
    'trial.topic.work.desc': 'Коллеги, задачи, рабочие созвоны',
    'trial.voice.group_male': '👨 Мужские',
    'trial.voice.group_female': '👩 Женские',
    'trial.clone.preview_preparing': 'Подготовка голоса (при необходимости — загрузка в облако)...',
    'trial.clone.preview_text': 'Привет! Это предпрослушивание вашего клонированного голоса.',
    'trial.clone.preview_upgrade_required': 'Этот голос недоступен для предпрослушивания. Выберите другой из списка или запишите новый.',
    'trial.clone.demo_voice_name': 'Демо голос',
    'trial.preview.loading': 'Загрузка предпрослушивания...',
    'trial.preview.playing': 'Воспроизведение...',
    'trial.preview.unavailable': 'Предпрослушивание недоступно',
    'trial.preview.done': 'Готово',
    'trial.preview.play_failed': 'Не удалось воспроизвести',
    'trial.alert.bad_audio_format': 'Формат аудио не поддерживается. Используйте WAV, MP3, OGG, FLAC или WEBM (в т.ч. запись с микрофона).',
    'trial.alert.upload_voice': 'Загрузка голоса',
    'trial.alert.file_too_large': 'Файл слишком большой. Максимум 10 МБ. Сократите запись или сожмите аудио.',
    'trial.alert.create_session_failed': 'Не удалось создать сессию',
    'trial.alert.popup_blocked': 'Не удалось открыть приложение в новом окне. Разрешите всплывающие окна для этого сайта.',
    'trial.error_prefix': 'Ошибка',
    'index.metaTitle': 'TalkPilot — Голосовой переводчик нового поколения',
    'index.hero.line1': 'Голосовой переводчик',
    'index.hero.line2': 'нового поколения',
    'index.hero.sub': 'Мгновенный перевод речи в реальном времени с использованием передовых технологий искусственного интеллекта',
    'index.hero.cta1': 'Попробовать бесплатно',
    'index.hero.cta2': 'Как это работает',
    'index.hero.video_modal.hint': 'Здесь будет встроено видео.',
    'index.stat.voices': 'Голосов',
    'index.stat.langs': 'Языков',
    'index.stat.acc': 'Точность',
    'index.stat.latency': 'Задержка',
    'index.why.title': 'Почему TalkPilot?',
    'index.why.sub': 'Мы объединили передовые технологии для создания лучшего голосового переводчика',
    'index.f1.t': 'Мгновенный перевод',
    'index.f1.p': 'Перевод речи в реальном времени с задержкой менее 0.5 секунды. Общайтесь без пауз и ожидания.',
    'index.f2.t': '322+ Голоса',
    'index.f2.p': 'Огромная библиотека естественных голосов для разных языков. Найдите идеальный голос для вашего проекта.',
    'index.f3.t': 'AI Технологии',
    'index.f3.p': 'Нейронные сети последнего поколения обеспечивают точность перевода до 98%.',
    'index.f4.t': '50+ Языков',
    'index.f4.p': 'Поддержка всех основных языков мира. От английского до редких диалектов.',
    'index.f5.t': 'Безопасность',
    'index.f5.p': 'Ваши данные защищены. Мы не храним аудио записи и используем шифрование.',
    'index.f6.t': 'Клонированный голос',
    'index.f6.p': 'Возможна озвучка перевода вашим клонированным голосом — загрузите образец, и собеседник услышит вас, а не робота.',
    'index.vosk.title': 'Поддерживаемые языки',
    'index.vosk.p': 'Поддерживаемые языки распознавания работают в режимах Basic и Pro. Полный список языков TalkPilot и рекомендации по качеству распознавания доступны в документации.',
    'index.vosk.badge': '30+ языков',
    'index.vosk.eu_t': 'Европейские языки',
    'index.vosk.as_t': 'Азиатские языки',
    'index.vosk.ot_t': 'Другие языки',
    ...vfVoskHtmlFor('ru'),
    'index.how.title': 'Как это работает',
    'index.how.title_prefix': 'Как это',
    'index.how.title_accent': 'работает',
    'index.how.sub': 'Полный сценарий работы TalkPilot: от подготовки сессии и настройки AI-контекста до живого двустороннего перевода, сохранения истории и последующей аналитики.',
    'index.how.s1t': '1) Подготовка сессии',
    'index.how.s1p': 'Сначала вы выбираете формат работы (веб или десктоп), языковую пару, тему беседы и режим распознавания Basic/Pro под нужную точность и скорость. Затем настраиваете параметры диалога: AI-контекст, подсказки ответов, голос озвучки и дополнительные опции (например, клон голоса), чтобы система сразу работала под ваш сценарий.',
    'index.how.s2t': '2) Диалог в реальном времени',
    'index.how.s2p': 'Во время разговора TalkPilot в реальном времени захватывает аудио, распознает речь, переводит с учетом контекста и моментально озвучивает результат на целевом языке. В интерфейсе параллельно отображаются обе стороны диалога, ключевые метки качества, активные настройки сессии и AI-подсказки, чтобы вы могли поддерживать естественный темп общения.',
    'index.how.s3t': '3) Управление и масштабирование',
    'index.how.s3p': 'После завершения сессии вся история остается в чате и личном кабинете: можно пересмотреть реплики, оценить качество, проанализировать статистику и скорректировать настройки для следующих разговоров. На этом же этапе вы управляете тарифом и масштабируете использование сервиса — подключаете клон голоса, настраиваете команды и интегрируете TalkPilot в свои продукты через API.',
    'index.cta.title': 'Готовы начать?',
    'index.cta.sub': 'Присоединяйтесь к тысячам пользователей, которые уже используют TalkPilot',
    'index.cta.btn': 'Создать аккаунт бесплатно',
    'index.cta.btnDashboard': 'Перейти в личный кабинет',
    'index.integrations.title': 'С какими сервисами работает переводчик',
    'index.integrations.sub': 'TalkPilot можно использовать во встречах, чатах и звонках: через веб-клиент, десктоп и API-интеграции.',
    'index.integrations.zoom.t': 'Zoom',
    'index.integrations.zoom.p': 'Подходит для международных встреч и вебинаров с двусторонним голосовым переводом.',
    'index.integrations.telegram.t': 'Telegram',
    'index.integrations.telegram.p': 'Можно подключать сценарии через ботов и API для многоязычных коммуникаций.',
    'index.integrations.meet.t': 'Google Meet',
    'index.integrations.meet.p': 'Работа в браузере без сложной установки в привычных видеозвонках.',
    'index.integrations.teams.t': 'Microsoft Teams',
    'index.integrations.teams.p': 'Для командных звонков, интервью и переговоров с иностранными участниками.',
    'index.integrations.webex.t': 'Cisco Webex',
    'index.integrations.webex.p': 'Подходит для корпоративных конференций и клиентских онлайн-сессий.',
    'index.integrations.api.t': 'Любые приложения',
    'index.integrations.api.p': 'Где возможно выбрать источник звука',
    'index.cap.title_html': 'Что умеет <span class="title-accent">TalkPilot</span>',
    'index.cap.sub': 'От демо-диалога до полного рабочего переводчика и личного кабинета',
    'index.cap1.t': 'Онлайн перевод речи',
    'index.cap1.p': 'Двусторонний диалог в реальном времени с минимальной задержкой.',
    'index.cap2.t': 'Режимы Basic / Pro',
    'index.cap2.p': 'Быстрый старт и продвинутое распознавание под ваш сценарий.',
    'index.cap3.t': 'AI-подсказки ответов',
    'index.cap3.p': 'Варианты реплик по контексту беседы для ускорения общения.',
    'index.cap4.t': 'Клонирование голоса',
    'index.cap4.p': 'Загрузка образца и озвучка фраз клонированным голосом.',
    'index.cap5.t': 'Тема и контекст беседы',
    'index.cap5.p': 'Точная подстройка AI и распознавания под нужный тип диалога.',
    'index.cap6.t': 'Гибкие настройки чата',
    'index.cap6.p': 'Языки, пауза между фразами, автоозвучка и другие параметры.',
    'index.cap7.t': 'Личный кабинет и статистика',
    'index.cap7.p': 'Минуты, фразы, история бесед, профиль и персональные настройки.',
    'index.cap8.t': 'Тарифы и платежи',
    'index.cap8.p': 'Управление подпиской, оплата по счёту и контроль расходов.',
    'index.cap.cta1': 'Попробовать демо бесплатно',
    'index.cap.cta2': 'Открыть личный кабинет',
    'index.cap.note': 'Демо за 1 минуту, регистрация — по желанию.',
    'index.pf.title_html': 'Веб и <span class="title-accent">Десктоп версии</span>',
    'index.pf.sub': 'Выберите формат работы: в браузере или в отдельной программе на компьютере. Все возможности AI-перевода всегда с вами.',
    'index.pf.web.h': 'Веб версия',
    'index.pf.web.sub': 'Работает прямо в браузере',
    'index.pf.web.li1': 'Онлайн перевод речи в реальном времени',
    'index.pf.web.li2': 'Режимы распознавания Basic / Pro',
    'index.pf.web.li3': 'AI-подсказки ответов по контексту',
    'index.pf.web.li4': 'Клонирование голоса и озвучка',
    'index.pf.web.li5': 'Гибкие настройки и личный кабинет',
    'index.pf.web.badge': 'Работает в браузере · Без установки',
    'index.pf.web.btn1': 'Попробовать веб-демо',
    'index.pf.desk.h': 'Десктоп программа',
    'index.pf.desk.sub': 'Максимум возможностей',
    'index.pf.desk.li1': 'Все функции веб версии',
    'index.pf.desk.li2': 'Прозрачный экран во время конференций',
    'index.pf.desk.li3': 'ИИ помощник экрана для live-подсказок',
    'index.pf.desk.li4': 'Глубокая интеграция с Zoom / Teams',
    'index.pf.desk.li5': 'Расширенная аналитика разговоров',
    'index.pf.desk.badge': 'Отдельное окно приложения · Работает оффлайн (базовый режим)',
    'index.pf.desk.btn1': 'Скачать десктоп',
    'index.desk.modal.title': 'Скачать TalkPilot',
    'index.desk.modal.sub': 'Выберите версию для вашей операционной системы',
    'index.desk.modal.win': 'Windows',
    'index.desk.modal.win_meta': 'Установщик · 64-bit',
    'index.desk.modal.mac': 'macOS · образ DMG',
    'index.desk.modal.mac_meta': 'Внутри запустите «Install TalkPilot»',
    'index.desk.modal.mac_easy': 'macOS · простая установка',
    'index.desk.modal.mac_easy_meta': '2 шага · через Терминал',
    'index.desk.modal.hint': 'После установки войдите в аккаунт — приложение подключится к серверу TalkPilot.',
    'index.desk.modal.mac_tip': 'macOS: откройте «простая установка» — там всего 2 шага. Без сертификата Apple двойной клик по файлам блокируется системой.',
    'index.how.c01.t': 'Подготовка сессии',
    'index.how.c01.p': 'Выберите формат работы (веб или десктоп), языковую пару, тему беседы и режим распознавания Basic/Pro для нужной точности и скорости.',
    'index.how.c01.chip': 'AI-контекст + клонирование голоса',
    'index.how.c02.t': 'Диалог в реальном времени',
    'index.how.c02.p': 'TalkPilot захватывает аудио, распознаёт речь, переводит с учётом контекста и моментально озвучивает результат. Обе стороны видят реплики параллельно.',
    'index.how.c02.chip': 'задержка < 0.5с · двусторонний перевод',
    'index.how.c03.t': 'Управление и масштабирование',
    'index.how.c03.p': 'История сохраняется в чате и личном кабинете. Вы можете пересмотреть реплики, оценить качество, проанализировать статистику и скорректировать настройки.',
    'index.how.c03.chip': 'Статистика · API · Тарифы',
    'index.how.c04.t': 'AI-подсказки ответов',
    'index.how.c04.p': 'Система предлагает варианты ответов по контексту беседы для ускорения общения и более точной коммуникации.',
    'index.how.c04.chip': 'Ускорение диалога',
    'index.how.c05.t': 'Клонирование голоса',
    'index.how.c05.p': 'Загрузите образец голоса — и TalkPilot создаст его цифровой клон для озвучивания ваших переводов натуральным тембром.',
    'index.how.c05.chip': 'Клон голоса',
    'index.how.c06.t': 'Аналитика и экспорт',
    'index.how.c06.p': 'Получайте детальную аналитику по диалогам, экспортируйте историю, следите за качеством и улучшайте результаты с каждым разговором.',
    'index.how.c06.chip': 'Экспорт данных',
    'footer.brand': 'TalkPilot',
    'footer.tagline': 'Голосовой переводчик нового поколения на базе искусственного интеллекта.',
    'footer.product': 'Продукт',
    'footer.support': 'Поддержка',
    'footer.company': 'Компания',
    'footer.api_doc': 'Документация API',
    'footer.status': 'Статус сервиса',
    'footer.about': 'О нас',
    'footer.blog': 'Блог',
    'footer.career': 'Карьера',
    'footer.contact': 'Контакты',
    'footer.copy': '© 2026 TalkPilot. Все права защищены.',
    'footer.trial_setup': 'Демо-настройка',
    'footer.trial_chat': 'Демо-чат',
    'modal.login.title': 'Вход',
    'modal.login.email_ph': 'Email',
    'modal.login.pass_ph': 'Пароль',
    'modal.login.submit': 'Войти',
    'modal.login.google': 'Войти через Google',
    'modal.login.switch_prefix': 'Нет аккаунта?',
    'modal.login.switch_link': 'Зарегистрироваться',
    'modal.reg.title': 'Регистрация',
    'modal.reg.name_ph': 'Имя',
    'modal.reg.pass_ph': 'Пароль',
    'modal.reg.submit': 'Зарегистрироваться',
    'modal.reg.google': 'Регистрация через Google',
    'modal.reg.switch_prefix': 'Уже есть аккаунт?',
    'modal.reg.switch_link': 'Войти',
    'login.page.title_login': 'Вход в личный кабинет',
    'login.page.title_register': 'Регистрация',
    'login.page.sub_login': 'Введите email и пароль. После входа вы вернётесь к оформлению выбранного тарифа.',
    'login.page.sub_register': 'Создайте аккаунт. После регистрации вы войдёте в личный кабинет.',
    'login.page.name_label': 'Имя',
    'login.page.email_label': 'Email',
    'login.page.password_label': 'Пароль',
    'login.page.or': 'или',
    'login.page.home': 'На главную',
    'login.page.doc_title_login': 'Вход — TalkPilot',
    'login.page.doc_title_register': 'Регистрация — TalkPilot',
    'login.captcha.title': 'Проверка безопасности',
    'login.captcha.hint': 'Решите пример, чтобы подтвердить регистрацию',
    'login.captcha.refresh_aria': 'Другой пример',
    'login.captcha.answer_aria': 'Ответ',
    'login.err.fill_all': 'Заполните все поля',
    'login.err.email_password': 'Укажите email и пароль',
    'login.err.password_min': 'Пароль: минимум 6 символов',
    'login.err.captcha_required': 'Решите пример для подтверждения',
    'login.err.register_failed': 'Не удалось зарегистрироваться',
    'login.err.login_failed': 'Не удалось войти',
    'login.err.network': 'Ошибка сети. Попробуйте ещё раз.',
    'login.ok.login_redirect': 'Вход выполнен, перенаправление…',
    'login.ok.register_redirect': 'Регистрация успешна, перенаправление…',
    'login.ok.register_login_manual': 'Аккаунт создан. Войдите с указанным email и паролем.',
    'login.oauth.denied': 'Вход через Google отменён.',
    'login.oauth.failed': 'Не удалось войти через Google. Попробуйте ещё раз.',
    'login.oauth.unavailable': 'Вход через Google недоступен',
    'features.metaTitle': 'Возможности — TalkPilot',
    'features.metaDesc': 'Распознавание Basic и Pro, нейроголоса Edge, клон голоса, ИИ-подсказки, демо-чат, автоперевод, личный кабинет и API — полный обзор TalkPilot.',
    'features.header.title': 'Возможности TalkPilot',
    'features.header.sub': 'От первого слова до готового двуязычного диалога: распознавание, перевод, синтез, контекст ИИ и удобный веб-интерфейс в одной экосистеме.',
    'features.why.title': 'Почему TalkPilot?',
    'features.why.sub': 'Мы объединили передовые технологии для создания удобного голосового переводчика',
    'features.c1.t': 'Мгновенный перевод',
    'features.c1.p': 'Перевод речи в реальном времени с задержкой менее 0.5 секунды. Общайтесь без пауз и ожидания.',
    'features.c2.t': '322+ голоса',
    'features.c2.p': 'Библиотека естественных голосов для разных языков. Подберите тембр под ситуацию или бренд.',
    'features.c3.t': 'ИИ-перевод',
    'features.c3.p': 'Нейросети последнего поколения дают точность до 98% и учитывают контекст фразы.',
    'features.c4.t': '50+ языков',
    'features.c4.p': 'Основные мировые языки и популярные пары для путешествий, работы и учёбы.',
    'features.c5.t': 'Безопасность',
    'features.c5.p': 'Шифрование и ответственная политика данных. Аудио не используется для обучения без вашего согласия.',
    'features.c6.t': 'API',
    'features.c6.p': 'Встройте перевод и синтез в свои продукты через документированный API.',
    'features.use.title': 'Сценарии использования',
    'features.use.sub': 'Один инструмент — разные задачи',
    'features.s1.t': 'Путешествия',
    'features.s1.p': 'Заказы, трансфер, экскурсии и бытовые вопросы — говорите сами, собеседник слышит перевод голосом.',
    'features.s2.t': 'Бизнес и звонки',
    'features.s2.p': 'Встречи с зарубежными партнёрами, интервью и переговоры без постоянного «переводите, пожалуйста».',
    'features.s3.t': 'Обучение',
    'features.s3.p': 'Лекции, языковая практика и доступ к материалам на иностранном языке с подсказкой в реальном времени.',
    'features.s4.t': 'Медицина и клиентский сервис',
    'features.s4.p': 'Спокойный тон общения с пациентами и клиентами из других стран: вы говорите на своём языке, собеседник слышит естественную речь на своём.',
    'features.s5.t': 'Онлайн-события и поддержка',
    'features.s5.p': 'Вебинары, Q&A и линии поддержки без «третьего окна»: один поток речи и текста с переводом в обе стороны.',
    'features.det.sec1.title': 'Голос, распознавание и синтез',
    'features.det.sec1.sub': 'Настройте цепочку «услышали → перевели → озвучили» под свою задачу и бюджет',
    'features.det.d1.t': 'Два режима распознавания',
    'features.det.d1.p': 'Basic на движке Vosk для старта без лишних затрат и Pro через AITunnel для максимального качества узнавания речи в шуме и на длинных фразах.',
    'features.det.d2.t': 'Нейроголоса Edge: вы и собеседник',
    'features.det.d2.p': 'Отдельно выбираются ваш голос на языке партнёра и голос ответов собеседника. Предпрослушивание образца перед запуском сессии.',
    'features.det.d3.t': 'Клонированный голос',
    'features.det.d3.p': 'Загрузите WAV, MP3, OGG или FLAC либо запишите дикторский образец с микрофона — закрепите клон в профиле и комбинируйте со стандартными голосами там, где это доступно по тарифу.',
    'features.det.d4.t': 'Автовоспроизведение перевода',
    'features.det.d4.p': 'После распознавания реплики перевод на язык собеседника может сразу озвучиваться — удобно в демо и в полноценном чате, когда важен темп диалога.',
    'features.det.sec2.title': 'ИИ, контекст и демо',
    'features.det.sec2.sub': 'Умные подсказки и готовые сценарии, чтобы разговор не сбивался с темы',
    'features.det.i1.t': 'Тема и контекст беседы',
    'features.det.i1.p': 'Опишите ситуацию: переговоры, собеседование, дружеский тон или рабочий стиль. ИИ-подсказки и формулировки подстраиваются под вашу сферу и терминологию.',
    'features.det.i2.t': 'Демо и мастер настройки',
    'features.det.i2.p': 'Бесплатный пошаговый тур по странице настроек: языки, режимы, голоса, клон, тема для ИИ. Демо-диалог с лимитом реплик партнёра и плавный переход в полный интерфейс приложения.',
    'features.det.i3.t': 'Подсказки ответов и уточнения по тексту',
    'features.det.i3.p': 'Идеи фраз на языке собеседника и подсказки после распознавания помогают отвечать быстрее — меньше пауз и «как это сказать правильно».',
    'features.det.i4.t': 'Двусторонний чат',
    'features.det.i4.p': 'История сообщений, переводы и подписи к репликам, ручная озвучка отдельных фраз — полноценный поток для двух языков в одной комнате.',
    'features.det.sec3.title': 'Аккаунт, доступность и интеграции',
    'features.det.sec3.sub': 'Работайте из браузера, масштабируйте использование и подключайте продукт к своим системам',
    'features.det.x1.t': 'Личный кабинет и тарифы',
    'features.det.x1.p': 'Учёт минут перевода, пакеты на 1 и 20 часов (Basic, Pro, Ultimate), оплата картой через Stripe и криптовалютами — прозрачные лимиты и апгрейд в пару кликов.',
    'features.det.x2.t': 'Доступность интерфейса',
    'features.det.x2.p': 'Масштаб шрифта и режим контрастности — комфорт на разных мониторах и при повышенных требованиях к читаемости без отдельных расширений.',
    'features.det.x3.t': 'Современный веб-клиент',
    'features.det.x3.p': 'Рекомендуемые Chrome и Edge, доступ к микрофону или ввод текста с клавиатуры, гибкие настройки вывода — без тяжёлой установки на устройство.',
    'features.det.x4.t': 'API для разработчиков',
    'features.det.x4.p': 'Документированный API для встраивания перевода и синтеза в свои сервисы; доступ открывается на тарифах, где предусмотрена интеграция.',
    'features.cta.title': 'Попробуйте сами',
    'features.cta.sub': 'Создайте аккаунт и запустите приложение — первые минуты бесплатно на стартовом тарифе',
    'features.cta.btn': 'Начать бесплатно',
    'features.cta.demo': 'Демо-настройка без регистрации',
    'pricing.metaTitle': 'Тарифы — TalkPilot',
    'pricing.metaDesc': 'Тарифы TalkPilot: пакеты на 1 и 20 часов — Basic, Pro, Ultimate.',
    'pricing.header.title': 'Тарифные планы',
    'pricing.header.title_dark': 'Тарифные',
    'pricing.header.title_accent': 'планы',
    'pricing.header.sub': 'Выберите план, который подходит именно вам',
    'pricing.header.sub_l1': 'Выберите план,',
    'pricing.header.sub_l2': 'который подходит именно вам',
    'pricing.pack.sub_1h': 'пакет · 1 час включённого времени',
    'pricing.pack.sub_20h': 'пакет · 20 часов включённого времени',
    'pricing.p1h_basic.title': '1 час Basic',
    'pricing.p1h_pro.title': '1 час Pro',
    'pricing.p1h_ultimate.title': '1 час Ultimate',
    'pricing.p20h_basic.title': '20 часов Basic',
    'pricing.p20h_pro.title': '20 часов Pro',
    'pricing.p20h_ultimate.title': '20 часов Ultimate',
    'pricing.btn_order': 'Оформить',
    'pricing.cart_qty_short': 'Количество:',
    'pricing.qty_minus': 'Уменьшить количество',
    'pricing.qty_plus': 'Увеличить количество',
    'pricing.f.b1': '60 минут беседы',
    'pricing.f.b2': 'Возможность использования 322 голосов в качестве своей озвучки',
    'pricing.f.b3': 'Помощник построения фразы',
    'pricing.f.b4': 'Перевод собеседника',
    'pricing.f.b5': 'Возможность редактирования своей фразы до озвучивания',
    'pricing.f.b6': 'История диалога',
    'pricing.f.b7': 'Возможность прозрачного экрана в веб-версии',
    'pricing.inc_basic': 'Все возможности тарифа Basic',
    'pricing.f.ai1': 'AI-подсказки во время диалога',
    'pricing.f.ai2': 'AI-подсказки отображения на экране в веб-версии',
    'pricing.inc_pro': 'Все возможности тарифов Basic и Pro',
    'pricing.f.clone': 'Возможность клонирования своего голоса',
    'pricing.f.ultimate_desktop_stealth': 'Возможность прозрачного экрана TalkPilot во время видеоконференции в десктопной версии',
    'pricing.f.ultimate_desktop_region_ai': 'Возможность подсказок ИИ для выделенной области экрана во время видеоконференции в десктопной версии',
    'pricing.current_plan_label': 'Текущий тариф:',
    'pricing.valid_till_short': 'до',
    'pricing.bonus_minutes': 'бонус',
    'pricing.minutes_limit': 'лимит',
    'pricing.pack_unavailable': 'Этот пакет недоступен на вашем текущем тарифе.',
    'pricing.unit_minutes': 'минут',
    'technology.metaTitle': 'Технологии — TalkPilot',
    'technology.metaDesc': 'Стек TalkPilot: Vosk и облачное распознавание речи, нейроперевод, Edge TTS и клонирование голоса, защищённый бэкенд, Redis и платёжные webhook — обзор архитектуры.',
    'technology.header.title': 'Наши технологии',
    'technology.header.sub': 'Современный стек технологий для максимальной производительности и точности',
    'technology.stack.title': 'Технологический стек',
    'tech.c1.h': 'Распознавание речи',
    'tech.c1.li4': 'Vosk (офлайн)',
    'tech.c2.h': 'Перевод',
    'tech.c2.li4': 'Собственные нейросети',
    'tech.c3.h': 'Синтез речи',
    'tech.c4.h': 'Бэкенд',
    'tech.c4.li4': 'Redis (кэширование)',
    'tech.c5.h': 'Безопасность',
    'tech.c5.li4': 'CORS защита',
    'tech.c6.h': 'Платежи',
    'tech.c6.li3': 'Webhook уведомления',
    'tech.c6.li4': 'Автоматическое продление',
    'tech.arch.title': 'Архитектура системы',
    'tech.arch.sub': 'Микросервисная архитектура для масштабирования',
    'faq.metaTitle': 'FAQ — TalkPilot',
    'faq.metaDesc': 'Ответы про голосовой перевод онлайн в реальном времени, Zoom, Teams, VB-Cable, тарифы и минуты, безопасность и GDPR, клон голоса и десктоп TalkPilot — частые вопросы и поддержка.',
    'dash.metaTitle': 'Личный кабинет — TalkPilot',
    'dash.showAppAudioSetup': 'Показать настройки приложений',
    'dash.sidebar.stats': 'Статистика',
    'dash.sidebar.settings': 'Настройки аккаунта',
    'dash.sidebar.conversation': 'Настройки беседы',
    'dash.sidebar.subscription': 'Тариф',
    'dash.sidebar.voice': 'Генерация голоса',
    'dash.sidebar.history': 'История бесед',
    'dash.sidebar.serviceStats': 'Статистика сервиса',
    'dash.summary.today': 'Сводка за сегодня',
    'dash.summary.minutes': 'минут',
    'dash.summary.phrases': 'фраз',
    'dash.summary.usedMin': 'исп. мин',
    'dash.summary.accuracy': 'точность',
    'dash.stats.title': 'Статистика использования',
    'dash.stats.lead': 'Обзор активности и использования сервиса',
    'dash.stats.minutesLeft': 'Осталось минут',
    'dash.stats.phrasesSent': 'Передано фраз',
    'dash.stats.minutesUsed': 'Использовано минут',
    'dash.stats.translationAccuracy': 'Точность перевода',
    'dash.plan.usageTitle': 'Использование тарифа',
    'dash.plan.loadingHint': 'Текущий тариф и лимит минут подгружаются после входа.',
    'dash.plan.manage': 'Управление тарифом',
    'dash.pro.unlock': 'Разблокируйте больше минут и приоритет Pro.',
    'dash.pro.learnMore': 'Узнать больше',
    'dash.chart.usageDynamics': 'Динамика использования',
    'dash.chart.byDays': 'По дням',
    'dash.chart.langDistribution': 'Распределение по языкам',
    'dash.chart.allLangs': 'Все языки',
    'dash.profile.user': 'Пользователь',
    'dash.profile.freePlan': 'Бесплатный тариф',
    'dash.profile.validTill': 'Действует до:',
    'dash.password.mismatch': '❌ Пароли не совпадают',
    'dash.password.changed': '✅ Пароль успешно изменён!',
    'dash.password.changeError': 'Ошибка смены пароля',
    'dash.error.network': '❌ Ошибка сети:',
    'dash.logout.confirm': 'Вы действительно хотите выйти?',
    'dash.plan.buyConfirm': 'Вы действительно хотите купить тариф',
    'dash.plan.buyError': 'Ошибка покупки',
    'dash.tx.empty': 'Нет транзакций',
    'dash.tx.topup': 'Пополнение',
    'dash.tx.ok': 'Успешно',
    'dash.tx.pending': 'В обработке',
    'dash.tx.cancelled': 'Отменено',
    'dash.unit.month': '/мес',
    'dash.unit.minutes': 'минут',
    'faq.header.title_prefix': 'Часто задаваемые',
    'faq.header.title_accent': 'вопросы',
    'faq.header.sub': 'Найдите ответы на популярные вопросы о TalkPilot',
    'faq.cat.general': 'Общие вопросы',
    'faq.q1': 'Что такое TalkPilot?',
    'faq.a1': 'TalkPilot — это голосовой переводчик нового поколения, который использует искусственный интеллект для мгновенного перевода речи в реальном времени. Поддерживает 50+ языков и 322+ голоса.',
    'faq.q2': 'Как начать пользоваться?',
    'faq.a2': 'Просто зарегистрируйтесь на сайте — это бесплатно. После регистрации вы получите 60 минут перевода в месяц на бесплатном тарифе.',
    'faq.q3': 'Какие языки поддерживаются?',
    'faq.a3': 'Мы поддерживаем 50+ языков, включая английский, испанский, французский, немецкий, китайский, японский, русский и многие другие. Полный список доступен в личном кабинете.',
    'faq.cat.pay': 'Тарифы и оплата',
    'faq.q4': 'Какие способы оплаты доступны?',
    'faq.a4': 'Мы принимаем оплату банковскими картами (Visa, Mastercard) через Stripe, а также криптовалюты (USDT, BTC, ETH) через NowPayments.',
    'faq.q5': 'Могу ли я отменить подписку?',
    'faq.a5': 'Да, вы можете отменить подписку в любой момент в личном кабинете. Доступ к функциям сохранится до конца оплаченного периода.',
    'faq.q6': 'Есть ли возврат средств?',
    'faq.a6': 'Возврат средств возможен в течение 14 дней после покупки, если вы не использовали более 10% лимита минут.',
    'faq.cat.tech': 'Технические вопросы',
    'faq.q7': 'Какие браузеры поддерживаются?',
    'faq.a7': 'TalkPilot работает во всех современных браузерах: Chrome, Firefox, Safari, Edge. Для лучшей производительности рекомендуем Chrome или Edge.',
    'faq.q8': 'Нужен ли микрофон?',
    'faq.a8': 'Да, для голосового ввода требуется микрофон. Также можно вводить текст вручную, если микрофон недоступен.',
    'faq.q9': 'Есть ли API для разработчиков?',
    'faq.a9': 'Да, API доступен на тарифах Pro и Team. Документация доступна в личном кабинете после активации подписки.',
    'faq.search_ph': 'Поиск по вопросам...',
    'faq.cat.general_sub': 'Основная информация о TalkPilot',
    'faq.cat.pay_sub': 'Вопросы о подписках и оплате',
    'faq.cat.tech_sub': 'Технические требования и совместимость',
    'faq.cat.security': 'Безопасность и конфиденциальность',
    'faq.cat.security_sub': 'Защита данных и учётная запись',
    'faq.cat.support': 'Поддержка и помощь',
    'faq.cat.support_sub': 'Как связаться с командой TalkPilot',
    'faq.q10': 'Чем веб-версия отличается от десктопного приложения?',
    'faq.a10': 'Веб-клиент открывается в браузере и не требует установки. Десктопное приложение удобнее для длительных созвонов: доступны режим полупрозрачного окна и подсказки ИИ по выделенной области экрана поверх Zoom, Teams и других программ там, где это предусмотрено тарифом.',
    'faq.q11': 'Что такое режим конференции и зачем нужен VB-Cable?',
    'faq.a11': 'Режим конференции отправляет озвученный перевод в виртуальный аудиокабель (VB-Audio Cable в Windows, BlackHole и аналоги в macOS). В Zoom или Teams вы выбираете микрофон «CABLE Output» — и участники слышат перевод как обычный голос.',
    'faq.q12': 'Есть ли в TalkPilot ИИ-подсказки ответов?',
    'faq.a12': 'На тарифах с AI в чате доступны контекстные подсказки формулировок. Тема и описание беседы в настройках помогают и распознаванию, и качеству рекомендаций.',
    'faq.q13': 'Можно ли работать без подключения к интернету?',
    'faq.a13': 'Нет, для распознавания, перевода и синтеза речи нужна сеть. Часть обработки выполняется на серверах TalkPilot или у партнёров в облаке (например в режиме Pro).',
    'faq.q14': 'Нужна ли регистрация для демо-диалога?',
    'faq.a14': 'Короткий демо-сценарий на сайте доступен через мастер без полного аккаунта; для сохранения настроек и регулярной работы создайте учётную запись.',
    'faq.q15': 'Что означают пакеты «1 час» и «20 часов»?',
    'faq.a15': 'Это включённый объём минут перевода на оплаченном периоде. Расход и остаток отображаются в личном кабинете.',
    'faq.q16': 'Что произойдёт, если закончатся минуты?',
    'faq.a16': 'Запуск перевода станет недоступен до продления или покупки нового пакета. История сохранённых чатов сохраняется.',
    'faq.q17': 'Можно ли сменить тариф до окончания периода?',
    'faq.a17': 'Смена плана доступна в кабинете; условия перерасчёта зависят от платёжного провайдера и выбранного способа оплаты.',
    'faq.q18': 'Как оплатить криптовалютой?',
    'faq.a18': 'Через NowPayments поддерживаются USDT, BTC, ETH и др. После подтверждения в блокчейне статус обновится автоматически; приложите hash транзакции в обращении к поддержке при задержке.',
    'faq.q19': 'Можно ли получить счёт для компании?',
    'faq.a19': 'Для картовых платежей доступны стандартные квитанции Stripe. Для B2B-счетов и реквизитов свяжитесь с поддержкой.',
    'faq.q20': 'Как работает возврат при проблемах с оплатой?',
    'faq.a20': 'Опишите ситуацию в поддержке с маскированными данными карты и временем попытки — мы сверим статус с платёжным провайдером.',
    'faq.q21': 'В Zoom не слышат перевод — что проверить?',
    'faq.a21': 'Установите VB-Cable (или BlackHole на Mac), включите режим конференции в TalkPilot, в Zoom выберите микрофон CABLE Output, наушники — для прослушивания собеседника; перезагрузите аудиоустройства при необходимости.',
    'faq.q22': 'Чем отличаются режимы распознавания Basic и Pro?',
    'faq.a22': 'Basic быстрее и экономичнее (распознавание Vosk). Pro точнее в сложной речи за счёт облачных моделей — включение зависит от тарифа.',
    'faq.q23': 'Почему сервер пишет, что микрофон занят?',
    'faq.a23': 'Одновременно может быть активна только одна сессия записи на сервере. Закройте другое окно переводчика или десктоп-клиент.',
    'faq.q24': 'Как выбрать голос озвучки?',
    'faq.a24': 'В чате доступны нейронные голоса и клон (на поддерживаемых планах). Пресеты удобно сохранить в разделе кабинета «Настройки беседы».',
    'faq.q25': 'Работает ли TalkPilot с Teams и Google Meet?',
    'faq.a25': 'Да, схема та же: виртуальный кабель как вход микрофона в программе встречи. Встроенный мастер помогает пройти настройку по шагам.',
    'faq.q26': 'На каких ОС доступен десктоп-клиент?',
    'faq.a26': 'Наличие сборки зависит от релиза; следите за инструкцией загрузки на сайте и системными требованиями в документации.',
    'faq.q27': 'Сохраняются ли аудиозаписи моих разговоров?',
    'faq.a27': 'Сервис ориентирован на потоковую обработку речи для перевода. Детали хранения обрабатываемых данных уточняйте в политике конфиденциальности и у поддержки.',
    'faq.q28': 'Как защищён доступ к аккаунту?',
    'faq.a28': 'Применяются современные механизмы аутентификации и разграничения прав для API. Не делитесь паролем и сессиями с посторонними.',
    'faq.q29': 'Можно ли удалить персональные данные?',
    'faq.a29': 'Запрос на удаление оформляется через поддержку; сроки зависят от объёма данных и применимых норм.',
    'faq.q30': 'Как сообщить об уязвимости безопасности?',
    'faq.a30': 'Пишите на support@talkpilot.pro с темой «Security», приложите шаги воспроизведения и не раскрывайте публично до ответа команды.',
    'faq.q31': 'Передаются ли фразы сторонним ИИ-сервисам?',
    'faq.a31': 'Облачные функции (перевод, подсказки, улучшение распознавания) могут вызывать внешние модели согласно вашему тарифу и конфигурации сервиса.',
    'faq.q32': 'За какое время отвечает поддержка?',
    'faq.a32': 'Обычно в течение 24–48 часов в рабочие дни; сложные запросы по биллингу могут занять дольше.',
    'faq.q33': 'Что указать в письме при ошибке оплаты?',
    'faq.a33': 'Email аккаунта, время попытки, способ оплаты, текст ошибки и скриншот (без полных номеров карты).',
    'faq.q34': 'Где почитать про возможности продукта?',
    'faq.a34': 'Разделы «Возможности», «Технологии», «Тарифы» на сайте и этот FAQ дополняют друг друга.',
    'faq.q35': 'Как предложить идею продукта?',
    'faq.a35': 'Напишите в поддержку краткий сценарий и ожидаемый эффект — это попадает в бэклог продукта.',
    'faq.q36': 'Какие данные приложить к баг-репорту?',
    'faq.a36': 'Версия браузера или приложения, ОС, шаги воспроизведения, скрин консоли (F12) и примерное время сбоя.',
    'faq.q37': 'Что такое голосовой переводчик онлайн в реальном времени?',
    'faq.a37': 'TalkPilot распознаёт речь, переводит и озвучивает результат — удобно для созвонов, переговоров и работы с иностранными партнёрами без отдельного переводчика рядом. Качество зависит от дикции, микрофона и выбранного режима распознавания.',
    'faq.q38': 'Чем TalkPilot отличается от Google Translate и переводчика в браузере?',
    'faq.a38': 'TalkPilot заточен под непрерывный голосовой диалог: микрофон, очередь реплик, выбор голоса TTS, режим конференции с виртуальным кабелем для Zoom/Teams и (на тарифах) ИИ-подсказки. Обычный мгновенный перевод текста в другом приложении не закрывает сценарий «говорю — слышат перевод в звонке».',
    'faq.q39': 'Можно ли использовать TalkPilot как переводчик для Zoom, Teams и вебинаров?',
    'faq.a39': 'Да: типичная схема — виртуальный аудиокабель как микрофон в программе встречи плюс режим конференции в TalkPilot. Следуйте мастеру настройки в приложении и проверьте громкость в наушниках, чтобы избежать эха.',
    'faq.q40': 'Подходит ли TalkPilot для обучения иностранному языку?',
    'faq.a40': 'Сервис в первую очередь для живого общения и работы; можно тренировать произношение и слушать нейро-озвучку, но это не замена полноценному языковому курсу и грамматике.',
    'faq.q41': 'Насколько точен ИИ-перевод и какая бывает задержка?',
    'faq.a41': 'Точность растёт при чёткой речи, хорошем микрофоне и разумном темпе; задержка зависит от сети, длины фразы и режима Basic/Pro. Для критичных юридических или медицинских формулировок используйте проверку человеком.',
    'faq.q42': 'Есть ли бесплатный тариф голосового переводчика TalkPilot?',
    'faq.a42': 'После регистрации на бесплатном плане доступен лимит перевода в месяц — см. раздел «Тарифы» для актуальных минут и условий.',
    'faq.q43': 'Как считаются минуты голосового перевода на платных тарифах?',
    'faq.a43': 'Списание обычно привязано ко времени активной сессии перевода; детали отображаются в личном кабинете. При исчерпании лимита нужно продление или пакет.',
    'faq.q44': 'Поддерживает ли TalkPilot корпоративные и командные сценарии (B2B)?',
    'faq.a44': 'Для счетов, настроек под организацию и интеграций свяжитесь с поддержкой. API и расширенные планы описаны на странице «Тарифы» и в документации кабинета.',
    'faq.q45': 'Что такое клон голоса и нейро-озвучка в TalkPilot?',
    'faq.a45': 'Нейро-озвучка — естественное произношение перевода; клон голоса (где доступен по тарифу) приближает тембр к вашему эталонному образцу при соблюдении правил использования.',
    'faq.q46': 'Как уменьшить шум, эхо и обрывы при голосовом вводе?',
    'faq.a46': 'Используйте гарнитуру с близким микрофоном, закрывайте лишние вкладки с тем же микрофоном, проверьте уровень сигнала в системе и разрешите доступ к микрофону только одному клиенту TalkPilot.',
    'faq.q47': 'Можно ли переводить с английского на русский и с русского на английский?',
    'faq.a47': 'Да, пара языков задаётся в интерфейсе чата перед беседой; поддерживаются и другие направления из списка языков.',
    'faq.q48': 'Работает ли TalkPilot со Skype, Discord или стримингом (OBS)?',
    'faq.a48': 'Если приложение позволяет выбрать системный микрофон, обычно можно направить ту же схему с виртуальным кабелем, что и для Zoom. Точная маршрутизация зависит от настроек звука ОС — см. гайды и поддержку.',
    'faq.q49': 'Соответствует ли TalkPilot требованиям GDPR и обработке персональных данных?',
    'faq.a49': 'Юридические условия и описание обработки данных приведены в политике конфиденциальности и пользовательском соглашении на сайте; при специальных регламентах компании запросите уточнение у поддержки.',
    'faq.q50': 'Можно ли использовать TalkPilot для переговоров с коммерческой тайной?',
    'faq.a50': 'Оценивайте риски с точки зрения NDA вашей компании: часть функций использует облако и внешние модели. Для строгих режимов согласуйте с юристом политику данных и выделенные условия с вендором.',
    'faq.q51': 'Есть ли техподдержка и документация на русском языке?',
    'faq.a51': 'Интерфейс и материалы на сайте рассчитаны на русскоязычную аудиторию; обращения в поддержку можно писать на русском на support@talkpilot.pro.',
    'faq.q52': 'Где скачать программу TalkPilot и найти инструкцию по настройке Zoom/Teams?',
    'faq.a52': 'Ссылки на загрузку и актуальные пошаговые инструкции размещаются на сайте TalkPilot и в разделе кабинета или диалога «настройка звука»; при изменениях интерфейса ориентируйтесь на последнюю версию страницы загрузки.',
    'faq.contact.title': 'Не нашли ответ?',
    'faq.contact.sub': 'Наша команда поддержки готова помочь вам в любое время',
    'faq.contact.btn': 'Написать в поддержку',
    'contacts.title': 'Контакты',
    'contacts.metaTitle': 'Контакты — TalkPilot',
    'contacts.metaDesc': 'Свяжитесь с командой TalkPilot через форму обратной связи.',
    'contacts.hero.title_html': 'Свяжитесь <span class="accent">с командой TalkPilot</span>',
    'contacts.hero.sub': 'Есть вопрос, предложения или нужна помощь? Мы всегда на связи и готовы помочь вам в любое время.',
    'contacts.hero.cta1': 'Написать нам',
    'contacts.hero.cta2': 'Частые вопросы',
    'contacts.stat.support': 'Поддержка',
    'contacts.stat.response': 'Среднее время ответа',
    'contacts.stat.clients': 'Довольных клиентов',
    'contacts.stat.security': 'Безопасность данных',
    'contacts.stat.support_val': '24/7',
    'contacts.stat.response_val': '15 мин',
    'contacts.stat.clients_val': '100%',
    'contacts.stat.security_val': '100%',
    'contacts.main.title': 'Связаться с нами',
    'contacts.info.title': 'Контактная информация',
    'contacts.info.email': 'Email',
    'contacts.info.email_hint_html': 'support@talkpilot.pro<br>Ответим в ближайшее время',
    'contacts.info.hours': 'Время работы',
    'contacts.info.hours_hint_html': 'Ежедневно с 09:00 до 21:00 (UTC+3)<br>Онлайн поддержка',
    'contacts.info.format': 'Формат поддержки',
    'contacts.info.format_hint_html': 'Онлайн поддержка<br>Веб и десктоп версии',
    'contacts.info.secure': 'Безопасность',
    'contacts.info.secure_hint_html': 'Все данные защищены<br>SSL шифрование и GDPR',
    'contacts.form.title': 'Форма обратной связи',
    'contacts.form.name': 'Ваше имя',
    'contacts.form.name_ph': 'Введите ваше имя',
    'contacts.form.email': 'Email',
    'contacts.form.email_ph': 'Введите email',
    'contacts.form.subject': 'Тема обращения',
    'contacts.form.subject_ph': 'Например: Вопрос по тарифу',
    'contacts.form.message': 'Сообщение',
    'contacts.form.message_ph': 'Подробно опишите ваш вопрос или предложение...',
    'contacts.form.submit': 'Отправить сообщение',
    'contacts.form.privacy': 'Нажимая кнопку, вы соглашаетесь с обработкой персональных данных',
    'checkout.orderTitle': 'Заказ',
    'checkout.qtyLabel': 'Количество пакетов',
    'checkout.unitPriceLabel': 'Цена за 1 пакет',
    'checkout.totalLabel': 'К оплате (USD)',
    'checkout.hint': 'Оплатите картой или криптовалютой (NowPayments). Сумма списания в USD по курсу на момент оплаты.',
    'checkout.cardTitle': 'Оплата картой',
    'checkout.cardProvidersHint': 'Visa, Mastercard, Apple Pay — защищённая платёжная страница.',
    'checkout.cardPayBtn': 'Оплатить картой',
    'checkout.payerEmailLabel': 'Email для чека',
    'checkout.payerEmailHint': 'Укажите email покупателя — он нужен для чека и связи по заказу.',
    'checkout.stripeTitle': 'Оплата картой',
    'checkout.amountLabel': 'Сумма (USD)',
    'checkout.amountPh': 'Сумма',
    'checkout.stripePayBtn': 'Оплатить картой',
    'checkout.cryptoTitle': 'Оплата криптовалютой',
    'checkout.cryptoHint': 'Счёт выставляется на точную сумму заказа. Зачисление после подтверждения в сети.',
    'checkout.cryptoMinPh': 'Минимум 5 USD',
    'checkout.cryptoCurrencyLabel': 'Криптовалюта',
    'checkout.cryptoCreateBtn': 'Создать счёт',
    'checkout.modalStripeTitle': 'Оплата картой',
    'checkout.modalAmount': 'Сумма:',
    'checkout.cardDetailsLabel': 'Данные карты',
    'checkout.modalCardHolder': 'Имя держателя карты',
    'checkout.modalCardHolderPh': 'Иван Иванов',
    'checkout.modalPay': 'Оплатить',
    'checkout.modalCryptoTitle': 'Оплата криптовалютой',
    'checkout.modalCryptoAmount': 'Сумма к оплате:',
    'checkout.modalWallet': 'Адрес кошелька:',
    'checkout.modalCopy': 'Копировать',
    'checkout.modalWait': 'Ожидаем поступление<br>на указанный крипто-кошелёк',
    'checkout.metaTitle': 'Оформление покупки — TalkPilot',
    'checkout.suffix_minutes_topup': ' (докупка минут)',
    'checkout.suffix_renewal': ' (продление)',
    'checkout.topup_hint': 'Докупка {minutes} мин к текущему тарифу. Срок действия подписки не меняется.',
    'checkout.renewal_hint_until': 'Продление того же тарифа: действует до {date}, +{minutes} мин.',
    'checkout.renewal_hint_default': 'Продление того же тарифа: срок подписки будет продлён, минуты зачислятся на баланс.',
    'checkout.cryptoNetworkHint': 'USDT и USDC принимаются в сети TRC20 (Tron). Остальные монеты — в своей основной сети (Bitcoin, Ethereum и т.д.).',
    'checkout.cryptoBelowMin': 'Сумма заказа ${order} ниже минимума для {label} (от ${min} через NOWPayments). Оплатите картой, выберите другую криптовалюту или пакет с большей суммой.',
    'checkout.pick_crypto': 'Выберите криптовалюту',
    'checkout.addr_copied': 'Адрес скопирован',
    'checkout.order_compose': 'Состав заказа',
    'checkout.invoice_create_failed': 'Не удалось создать счёт',
    'checkout.amount_unknown': 'Не удалось определить сумму заказа',
    'checkout.error_generic': 'Ошибка',
    'footer.privacy': 'Политика конфиденциальности',
    'footer.terms': 'Пользовательское соглашение',
    'privacy.metaTitle': 'Политика конфиденциальности — TalkPilot',
    'privacy.metaDesc': 'Политика конфиденциальности TalkPilot: какие данные мы собираем, зачем используем и как защищаем.',
    'privacy.h1': 'Политика конфиденциальности',
    'privacy.updated': 'Действует с 24 мая 2026 г. · Сайт: talkpilot.pro',
    'privacy.intro': 'Настоящая политика описывает, как сервис TalkPilot (далее — «мы», «сервис») обрабатывает персональные данные пользователей сайта и приложений. Используя TalkPilot, вы соглашаетесь с этой политикой.',
    'privacy.s1.title': '1. Оператор и контакты',
    'privacy.s1.text': 'Сервис TalkPilot доступен по адресу <a href="https://talkpilot.pro">https://talkpilot.pro</a>. По вопросам конфиденциальности: <a href="mailto:support@talkpilot.pro">support@talkpilot.pro</a>.',
    'privacy.s2.title': '2. Какие данные мы обрабатываем',
    'privacy.s2.l1': 'Данные аккаунта: email, имя (при регистрации или входе через Google).',
    'privacy.s2.l2': 'Данные OAuth Google: идентификатор, email, имя и фото профиля — только для входа и создания учётной записи.',
    'privacy.s2.l3': 'Голос и аудио: записи для перевода в реальном времени, демо, клонирования голоса — по вашему действию в приложении.',
    'privacy.s2.l4': 'Технические данные: IP, тип браузера, cookies сессии, журналы использования и ошибок.',
    'privacy.s2.l5': 'Платежи: идентификаторы подписки и статус оплаты через Stripe (мы не храним полные данные банковских карт).',
    'privacy.s3.title': '3. Цели обработки',
    'privacy.s3.l1': 'Регистрация, аутентификация и ведение личного кабинета.',
    'privacy.s3.l2': 'Предоставление функций перевода, конференций, клонирования голоса и демо.',
    'privacy.s3.l3': 'Учёт тарифа, минут и платежей.',
    'privacy.s3.l4': 'Поддержка пользователей и улучшение сервиса.',
    'privacy.s3.l5': 'Безопасность, предотвращение злоупотреблений и соблюдение закона.',
    'privacy.s4.title': '4. Правовые основания',
    'privacy.s4.text': 'Обработка осуществляется для исполнения договора (оказание услуг), на основании вашего согласия (например, запись голоса, маркетинговые рассылки — если вы подписались) и законного интереса (безопасность и аналитика в обезличенном виде), а также для соблюдения юридических обязанностей.',
    'privacy.s5.title': '5. Cookies и сессии',
    'privacy.s5.text': 'Мы используем необходимые cookies для входа (JWT-сессия, идентификатор пользователя). Без них работа личного кабинета и переводчика невозможна. Рекламные cookies третьих лиц по умолчанию не применяются.',
    'privacy.s6.title': '6. Передача третьим лицам',
    'privacy.s6.text': 'Данные могут передаваться поставщикам, без которых сервис не работает: Google (OAuth), Stripe (оплата), хостинг и облачные API для распознавания речи, перевода и синтеза голоса. Передача ограничена целями, указанными в этой политике, и договорами о конфиденциальности.',
    'privacy.s7.title': '7. Срок хранения',
    'privacy.s7.text': 'Данные аккаунта хранятся, пока учётная запись активна. После удаления аккаунта мы удаляем или обезличиваем данные в разумный срок, кроме случаев, когда закон требует более длительного хранения (например, учёт платежей).',
    'privacy.s8.title': '8. Ваши права',
    'privacy.s8.text': 'Вы можете запросить доступ, исправление или удаление персональных данных, ограничение обработки или отзыв согласия — напишите на support@talkpilot.pro. Жители ЕС/ЕЭЗ также могут подать жалобу в надзорный орган по защите данных.',
    'privacy.s9.title': '9. Безопасность',
    'privacy.s9.text': 'Мы применяем HTTPS, ограничение доступа к серверам и другие организационные и технические меры. Ни один метод передачи данных в интернете не гарантирует абсолютную безопасность.',
    'privacy.s10.title': '10. Дети',
    'privacy.s10.text': 'Сервис не предназначен для лиц младше 16 лет. Если вы считаете, что ребёнок передал нам данные, свяжитесь с нами для удаления.',
    'privacy.s11.title': '11. Изменения политики',
    'privacy.s11.text': 'Мы можем обновлять эту страницу. Актуальная версия всегда доступна по адресу <a href="/privacy">/privacy</a>. Существенные изменения по возможности доводятся до сведения через сайт или email.',
    'terms.metaTitle': 'Пользовательское соглашение — TalkPilot',
    'terms.metaDesc': 'Условия использования сервиса TalkPilot: аккаунт, подписки, допустимое использование и ограничение ответственности.',
    'terms.h1': 'Пользовательское соглашение',
    'terms.updated': 'Действует с 24 мая 2026 г. · Сайт: talkpilot.pro',
    'terms.intro': 'Используя сайт и сервисы TalkPilot, вы принимаете настоящие условия. Если вы не согласны — не используйте сервис.',
    'terms.s1.title': '1. Сервис',
    'terms.s1.text': 'TalkPilot предоставляет онлайн- и десктоп-инструменты для голосового перевода в реальном времени, работы в видеоконференциях, демо, клонирования голоса и связанных функций. Возможности зависят от выбранного тарифа и технических ограничений.',
    'terms.s2.title': '2. Аккаунт',
    'terms.s2.text': 'Вы обязуетесь указывать достоверные данные, хранить пароль в тайне и не передавать доступ третьим лицам. Вы несёте ответственность за действия в своём аккаунте. Мы можем приостановить или удалить аккаунт при нарушении условий.',
    'terms.s3.title': '3. Подписки и оплата',
    'terms.s3.text': 'Платные тарифы оформляются через Stripe. Стоимость, лимиты минут и период списания указаны на странице тарифов. Подписка продлевается автоматически, пока вы не отмените её в личном кабинете или через Stripe. Возвраты — по применимому законодательству и политике поддержки.',
    'terms.s4.title': '4. Допустимое использование',
    'terms.s4.l1': 'Запрещено нарушать закон, права третьих лиц, распространять вредоносный контент или перегружать инфраструктуру.',
    'terms.s4.l2': 'Нельзя использовать сервис для обхода санкций, мошенничества, несанкционированной записи разговоров без согласия участников.',
    'terms.s4.l3': 'Вы подтверждаете, что имеете право загружать и обрабатывать голосовые данные (включая клонирование).',
    'terms.s5.title': '5. Контент и голос',
    'terms.s5.text': 'Вы сохраняете права на свой контент. Вы предоставляете нам ограниченную лицензию на обработку аудио и текста исключительно для оказания услуг. Мы не претендуем на владение вашими записями, но можем хранить их технически в период, необходимый для работы сервиса.',
    'terms.s6.title': '6. Точность перевода',
    'terms.s6.text': 'Перевод и синтез генерируются автоматически и могут содержать ошибки. Сервис предоставляется «как есть»; для юридически значимых, медицинских и иных критичных ситуаций требуется проверка человеком.',
    'terms.s7.title': '7. Ограничение ответственности',
    'terms.s7.text': 'В максимальной степени, допускаемой законом, TalkPilot не несёт ответственности за косвенные убытки, потерю прибыли или данных. Совокупная ответственность ограничена суммой, уплаченной вами за сервис за последние 12 месяцев (или минимальной суммой, установленной законом).',
    'terms.s8.title': '8. Прекращение',
    'terms.s8.text': 'Вы можете прекратить использование в любой момент. Мы можем ограничить доступ при нарушении условий, неоплате или по техническим причинам. Положения об ограничении ответственности и спорах сохраняются после прекращения.',
    'terms.s9.title': '9. Конфиденциальность',
    'terms.s9.text': 'Обработка персональных данных регулируется <a href="/privacy">политикой конфиденциальности</a>.',
    'terms.s10.title': '10. Изменения условий',
    'terms.s10.text': 'Мы можем обновлять соглашение. Продолжение использования после публикации новой версии означает согласие, если иное не запрещено законом.',
    'terms.s11.title': '11. Контакты',
    'terms.s11.text': 'Вопросы по условиям: <a href="mailto:support@talkpilot.pro">support@talkpilot.pro</a>, <a href="/contacts">форма контактов</a>.',
  };

  const EN = {
    'nav.lang_label': 'Language',
    'nav.menu_open': 'Open menu',
    'nav.menu_close': 'Close menu',
    'nav.lang_aria': 'Site language',
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.tech': 'Technology',
    'nav.pricing': 'Pricing',
    'nav.faq': 'FAQ',
    'nav.download': 'Download TalkPilot',
    'auth.login': 'Log in',
    'auth.register': 'Sign up',
    'auth.logout': 'Log out',
    'auth.cabinet': 'Dashboard',
    'nav.launch_app': 'Launch app',
    'trial.metaTitle': 'TalkPilot demo — topic selection',
    'trial.hero.title': 'Try for free',
    'trial.hero.sub': 'Choose a demo conversation topic and settings. They will be applied in the full app after demo.',
    'trial.section.dialog_topic': 'Conversation topic',
    'trial.section.chat_presets': 'Chat presets',
    'trial.recognition.title': 'Recognition mode',
    'trial.recognition.hint': 'This affects speech recognition quality and plan cost.',
    'trial.autoplay.title': 'Translation autoplay',
    'trial.autoplay.hint': 'Your phrases in chat will be played automatically.',
    'trial.autoplay.label': 'Translation autoplay',
    'trial.languages.title': 'Conversation languages',
    'trial.languages.your_language': 'Your language',
    'trial.languages.partner_language': 'Partner language',
    'trial.my_voice.title': 'My voice selection',
    'trial.my_voice.hint': 'Voice used to play your phrases in partner language.',
    'trial.my_voice.label': 'My voice',
    'trial.my_voice.disabled_by_clone': 'With cloning enabled, your cloned voice is used — the Edge voice below is not needed.',
    'trial.partner_voice.title': 'Partner voice selection',
    'trial.partner_voice.label': 'Partner voice',
    'trial.partner_voice.browser_fallback': 'No Microsoft neural voice for this language — demo will use browser speech (quality may vary).',
    'trial.partner_voice.filtered': 'Voices for the interlocutor language ({count} available).',
    'trial.partner_voice.none': '— Browser speech —',
    'trial.preview.button': 'Preview',
    'trial.clone.title': 'One cloned voice (optional)',
    'trial.clone.use_checkbox': 'Use cloned voice',
    'trial.clone.tips.title': '💡 Tips:',
    'trial.clone.tips.item1': '6-30 seconds of clear speech',
    'trial.clone.tips.item2': 'No noise or music',
    'trial.clone.tips.item3': 'WAV, MP3, OGG, FLAC (up to 10 MB)',
    'trial.clone.source.legend': 'Voice source for demo',
    'trial.clone.source.aria': 'Cloned voice source',
    'trial.clone.source.new': 'Record or upload a new one',
    'trial.clone.source.existing': 'Select from dashboard',
    'trial.clone.existing.label': 'Cloned voice',
    'trial.clone.existing.aria': 'Select cloned voice',
    'trial.clone.existing.empty': 'No saved clones in dashboard yet - record or upload a new voice below.',
    'trial.clone.upload.title': 'Upload file for voice cloning',
    'trial.clone.upload.aria': 'Select audio file for cloning',
    'trial.clone.drop_title': 'Drag audio file here',
    'trial.clone.drop_sub': 'or click to choose',
    'trial.clone.name.label': 'Voice name',
    'trial.clone.name.placeholder': 'For example: My voice, Narrator...',
    'trial.record.title': 'Record voice for cloning',
    'trial.record.start': 'Start recording',
    'trial.record.stop': 'Stop',
    'trial.record.not_started': 'Recording not started',
    'trial.record.prompts_title': 'Reading text (for clone recording)',
    'trial.record.prompts_lang': 'Prompt language',
    'trial.record.prompts_lang_aria': 'Prompt language for reading',
    'trial.record.generate': 'Generate text',
    'trial.record.note_default': 'Click "Generate text", then "Start recording", and read the phrases in the list (15-30 seconds).',
    'trial.record.note_count_prefix': 'You need to read',
    'trial.record.note_count_phrases': 'phrases',
    'trial.record.note_duration': 'About 15-30 seconds (estimated).',
    'trial.record.note_total_length': 'Total length:',
    'trial.record.note_symbols': 'characters',
    'trial.record.unavailable_browser': 'Recording is unavailable in this browser',
    'trial.record.empty_retry': 'Recording is empty, please try again',
    'trial.record.ready_prefix': 'Recording is ready:',
    'trial.record.in_progress': 'Recording...',
    'trial.record.no_microphone': 'No microphone access',
    'trial.record.file_selected': 'Selected file:',
    'trial.ai.section_title': 'Conversation topic and context (AI)',
    'trial.ai.topic_title': 'Conversation topic',
    'trial.ai.topic_placeholder': 'For example: backend developer interview',
    'trial.ai.context_title': 'Conversation context',
    'trial.ai.context_placeholder': 'Key details, terms, communication style, dialogue goals...',
    'trial.launch.button': 'Launch app',
    'trial.launch.note': 'Your settings will be saved and applied in the full app',
    'trial.training.open': 'Training',
    'trial.training.close': 'Close',
    'trial.training.close_hint': 'Close hint',
    'trial.training.hint': 'Click "Training" to start a step-by-step tour of this page.',
    'trial.guide.step_topic': 'Choose a test conversation type',
    'trial.guide.step_recognition_mode': 'Choose recognition mode',
    'trial.guide.step_autoplay': 'Enable or disable translation autoplay',
    'trial.guide.step_languages': 'Choose your language and your partner language',
    'trial.guide.step_user_voice': 'Choose a voice for your translated speech',
    'trial.guide.step_partner_voice': 'Choose your partner voice and preview it',
    'trial.guide.step_clone': 'Add your cloned voice if needed',
    'trial.guide.step_ai_context': 'Fill in topic and context for better AI hints in demo chat',
    'trial.guide.step_launch': 'When everything is ready, click "Launch app"',
    'trial.guide.next': 'Next',
    'trial.guide.finish': 'Finish',
    'trial.topic.business.label': 'Business negotiations',
    'trial.topic.business.desc': 'Negotiations, deals, partnerships',
    'trial.topic.interview.label': 'Interview',
    'trial.topic.interview.desc': 'HR questions, technical interview',
    'trial.topic.friendly.label': 'Friendly chat',
    'trial.topic.friendly.desc': 'Informal conversation, small talk',
    'trial.topic.work.label': 'Work dialogue',
    'trial.topic.work.desc': 'Colleagues, tasks, work calls',
    'trial.voice.group_male': '👨 Male',
    'trial.voice.group_female': '👩 Female',
    'trial.clone.preview_preparing': 'Preparing voice (uploading to cloud if needed)...',
    'trial.clone.preview_text': 'Hello! This is a preview of your cloned voice.',
    'trial.clone.preview_upgrade_required': 'This voice is unavailable for preview. Choose another one or record a new voice.',
    'trial.clone.demo_voice_name': 'Demo voice',
    'trial.preview.loading': 'Loading preview...',
    'trial.preview.playing': 'Playing...',
    'trial.preview.unavailable': 'Preview is unavailable',
    'trial.preview.done': 'Done',
    'trial.preview.play_failed': 'Failed to play',
    'trial.alert.bad_audio_format': 'Unsupported audio format. Use WAV, MP3, OGG, FLAC, or WEBM (including microphone recording).',
    'trial.alert.upload_voice': 'Voice upload',
    'trial.alert.file_too_large': 'File is too large. Maximum size is 10 MB. Try a shorter recording or compress the audio.',
    'trial.alert.create_session_failed': 'Failed to create session',
    'trial.alert.popup_blocked': 'Failed to open the app in a new window. Please allow pop-ups for this site.',
    'trial.error_prefix': 'Error',
    'index.metaTitle': 'TalkPilot — Next-generation voice translator',
    'index.hero.line1': 'Next-generation',
    'index.hero.line2': 'voice translator',
    'index.hero.sub': 'Real-time speech translation powered by state-of-the-art AI.',
    'index.hero.cta1': 'Try for free',
    'index.hero.cta2': 'How it works',
    'index.hero.video_modal.hint': 'Video will be embedded here.',
    'index.stat.voices': 'Voices',
    'index.stat.langs': 'Languages',
    'index.stat.acc': 'Accuracy',
    'index.stat.latency': 'Latency',
    'index.why.title': 'Why TalkPilot?',
    'index.why.sub': 'We combined cutting-edge tech to build the best voice translation experience.',
    'index.f1.t': 'Instant translation',
    'index.f1.p': 'Real-time speech with under 0.5s latency. Talk naturally without awkward pauses.',
    'index.f2.t': '322+ voices',
    'index.f2.p': 'A large library of natural voices across languages. Pick the timbre that fits your use case.',
    'index.f3.t': 'AI stack',
    'index.f3.p': 'Latest neural models deliver up to 98% translation quality with context awareness.',
    'index.f4.t': '50+ languages',
    'index.f4.p': 'Major world languages and popular pairs for travel, work, and study.',
    'index.f5.t': 'Security',
    'index.f5.p': 'Your data is protected. We do not keep audio recordings and use encryption in transit.',
    'index.f6.t': 'Your cloned voice',
    'index.f6.p': 'Hear translations in your own cloned voice — upload a sample and your counterpart hears you, not a robot.',
    'index.vosk.title': 'Supported languages',
    'index.vosk.p': 'Supported recognition languages work in both Basic and Pro modes. The full TalkPilot language list and quality guidance are available in the documentation.',
    'index.vosk.badge': '30+ languages',
    'index.vosk.eu_t': 'European languages',
    'index.vosk.as_t': 'Asian languages',
    'index.vosk.ot_t': 'Other languages',
    ...vfVoskHtmlFor('en'),
    'index.how.title': 'How it works',
    'index.how.title_prefix': 'How it',
    'index.how.title_accent': 'works',
    'index.how.sub': 'The full TalkPilot flow: from session setup and AI context configuration to live two-way translation, saved history, and post-call analytics.',
    'index.how.s1t': '1) Session setup',
    'index.how.s1p': 'First, choose your mode (web or desktop), language pair, conversation topic, and Basic/Pro recognition profile for the right balance of speed and accuracy. Then configure dialogue options such as AI context, reply hints, output voice, and advanced settings like voice cloning so the system starts fully tuned for your scenario.',
    'index.how.s2t': '2) Live conversation',
    'index.how.s2p': 'During the conversation, TalkPilot captures audio, recognizes speech, translates it with context awareness, and immediately plays back the output in the target language. The interface keeps both sides of the dialogue, quality indicators, active session parameters, and AI reply hints visible to help you keep a natural conversation pace.',
    'index.how.s3t': '3) Control and scale',
    'index.how.s3p': 'After the session, full history remains in chat and dashboard so you can review turns, assess quality, analyze metrics, and refine settings for future calls. You can also manage plans and scale usage from the same area by enabling voice cloning, configuring team workflows, and integrating TalkPilot into your products through API.',
    'index.cta.title': 'Ready to start?',
    'index.cta.sub': 'Join thousands of users who already use TalkPilot',
    'index.cta.btn': 'Create a free account',
    'index.cta.btnDashboard': 'Go to dashboard',
    'index.integrations.title': 'Compatible services for translation',
    'index.integrations.sub': 'Use TalkPilot in meetings, chats, and calls through the web client, desktop app, and API integrations.',
    'index.integrations.zoom.t': 'Zoom',
    'index.integrations.zoom.p': 'Great for international meetings and webinars with two-way voice translation.',
    'index.integrations.telegram.t': 'Telegram',
    'index.integrations.telegram.p': 'Connect bot and API scenarios for multilingual communication flows.',
    'index.integrations.meet.t': 'Google Meet',
    'index.integrations.meet.p': 'Works in browser-first call scenarios without complex local setup.',
    'index.integrations.teams.t': 'Microsoft Teams',
    'index.integrations.teams.p': 'Use in team calls, interviews, and negotiations with foreign participants.',
    'index.integrations.webex.t': 'Cisco Webex',
    'index.integrations.webex.p': 'Suitable for enterprise conferences and customer online sessions.',
    'index.integrations.api.t': 'Any application',
    'index.integrations.api.p': 'Where you can choose an audio input source',
    'index.cap.title_html': 'What <span class="title-accent">TalkPilot</span> can do',
    'index.cap.sub': 'From a quick demo dialogue to a full translator workflow and personal dashboard.',
    'index.cap1.t': 'Live speech translation',
    'index.cap1.p': 'Two-way dialogue in real time with minimal latency.',
    'index.cap2.t': 'Basic / Pro modes',
    'index.cap2.p': 'Fast onboarding and advanced recognition tuned to your scenario.',
    'index.cap3.t': 'AI reply hints',
    'index.cap3.p': 'Context-aware line suggestions to keep conversations moving.',
    'index.cap4.t': 'Voice cloning',
    'index.cap4.p': 'Upload a sample and speak translated lines with your cloned voice.',
    'index.cap5.t': 'Topic and conversation context',
    'index.cap5.p': 'Fine-tune AI and recognition for the type of dialogue you need.',
    'index.cap6.t': 'Flexible chat settings',
    'index.cap6.p': 'Languages, pause between phrases, auto-playback, and more.',
    'index.cap7.t': 'Dashboard and statistics',
    'index.cap7.p': 'Minutes, phrases, chat history, profile, and personal preferences.',
    'index.cap8.t': 'Plans and payments',
    'index.cap8.p': 'Manage subscriptions, top up balance, and track spend.',
    'index.cap.cta1': 'Try the demo for free',
    'index.cap.cta2': 'Open dashboard',
    'index.cap.note': 'Demo in about a minute; sign-up is optional.',
    'index.pf.title_html': 'Web and <span class="title-accent">desktop apps</span>',
    'index.pf.sub': 'Pick how you work: in the browser or in a dedicated desktop app. Full AI translation features stay with you.',
    'index.pf.web.h': 'Web version',
    'index.pf.web.sub': 'Runs right in your browser',
    'index.pf.web.li1': 'Live speech translation in real time',
    'index.pf.web.li2': 'Basic / Pro recognition modes',
    'index.pf.web.li3': 'Context-aware AI reply hints',
    'index.pf.web.li4': 'Voice cloning and playback',
    'index.pf.web.li5': 'Flexible settings and dashboard',
    'index.pf.web.badge': 'Browser-based · No install required',
    'index.pf.web.btn1': 'Try web demo',
    'index.pf.desk.h': 'Desktop app',
    'index.pf.desk.sub': 'Maximum capability',
    'index.pf.desk.li1': 'Everything from the web version',
    'index.pf.desk.li2': 'Transparent overlay during calls',
    'index.pf.desk.li3': 'On-screen AI assistant for live hints',
    'index.pf.desk.li4': 'Deeper Zoom / Teams integration',
    'index.pf.desk.li5': 'Richer conversation analytics',
    'index.pf.desk.badge': 'Dedicated app window · Offline-friendly (basic mode)',
    'index.pf.desk.btn1': 'Download desktop',
    'index.desk.modal.title': 'Download TalkPilot',
    'index.desk.modal.sub': 'Choose the build for your operating system',
    'index.desk.modal.win': 'Windows',
    'index.desk.modal.win_meta': 'Installer · 64-bit',
    'index.desk.modal.mac': 'macOS · DMG image',
    'index.desk.modal.mac_meta': 'Then run “Install TalkPilot” inside',
    'index.desk.modal.mac_easy': 'macOS · easy install',
    'index.desk.modal.mac_easy_meta': '2 steps · via Terminal',
    'index.desk.modal.hint': 'After installation, sign in — the app will connect to the TalkPilot server.',
    'index.desk.modal.mac_tip': 'macOS: open “easy install” — only 2 steps. Without an Apple certificate, double-click installs are blocked by the system.',
    'index.how.c01.t': 'Session setup',
    'index.how.c01.p': 'Choose web or desktop, your language pair, conversation topic, and Basic/Pro recognition for the right speed and accuracy.',
    'index.how.c01.chip': 'AI context + voice cloning',
    'index.how.c02.t': 'Live dialogue',
    'index.how.c02.p': 'TalkPilot captures audio, transcribes, translates with context, and plays back instantly. Both sides see lines in parallel.',
    'index.how.c02.chip': 'Latency < 0.5s · two-way translation',
    'index.how.c03.t': 'Control and scale',
    'index.how.c03.p': 'History stays in chat and the dashboard—review lines, check quality, analyze stats, and refine settings.',
    'index.how.c03.chip': 'Statistics · API · Plans',
    'index.how.c04.t': 'AI reply hints',
    'index.how.c04.p': 'Suggested replies based on context for faster, clearer communication.',
    'index.how.c04.chip': 'Faster dialogue',
    'index.how.c05.t': 'Voice cloning',
    'index.how.c05.p': 'Upload a voice sample and TalkPilot builds a digital clone to read your translations in a natural timbre.',
    'index.how.c05.chip': 'Voice clone',
    'index.how.c06.t': 'Analytics and export',
    'index.how.c06.p': 'Detailed per-dialogue analytics, exportable history, quality tracking, and steady improvement over time.',
    'index.how.c06.chip': 'Data export',
    'footer.brand': 'TalkPilot',
    'footer.tagline': 'Next-generation AI voice translator.',
    'footer.product': 'Product',
    'footer.support': 'Support',
    'footer.company': 'Company',
    'footer.api_doc': 'API documentation',
    'footer.status': 'Service status',
    'footer.about': 'About',
    'footer.blog': 'Blog',
    'footer.career': 'Careers',
    'footer.contact': 'Contact',
    'footer.copy': '© 2026 TalkPilot. All rights reserved.',
    'footer.trial_setup': 'Demo setup',
    'footer.trial_chat': 'Demo chat',
    'modal.login.title': 'Log in',
    'modal.login.email_ph': 'Email',
    'modal.login.pass_ph': 'Password',
    'modal.login.submit': 'Log in',
    'modal.login.google': 'Continue with Google',
    'modal.login.switch_prefix': 'No account?',
    'modal.login.switch_link': 'Sign up',
    'modal.reg.title': 'Sign up',
    'modal.reg.name_ph': 'Name',
    'modal.reg.pass_ph': 'Password',
    'modal.reg.submit': 'Create account',
    'modal.reg.google': 'Sign up with Google',
    'modal.reg.switch_prefix': 'Already have an account?',
    'modal.reg.switch_link': 'Log in',
    'login.page.title_login': 'Log in to your account',
    'login.page.title_register': 'Sign up',
    'login.page.sub_login': 'Enter your email and password. After sign-in you will return to checkout.',
    'login.page.sub_register': 'Create an account. After sign-up you will enter your dashboard.',
    'login.page.name_label': 'Name',
    'login.page.email_label': 'Email',
    'login.page.password_label': 'Password',
    'login.page.or': 'or',
    'login.page.home': 'Home',
    'login.page.doc_title_login': 'Log in — TalkPilot',
    'login.page.doc_title_register': 'Sign up — TalkPilot',
    'login.captcha.title': 'Security check',
    'login.captcha.hint': 'Solve the math problem to confirm registration',
    'login.captcha.refresh_aria': 'New problem',
    'login.captcha.answer_aria': 'Answer',
    'login.err.fill_all': 'Fill in all fields',
    'login.err.email_password': 'Enter email and password',
    'login.err.password_min': 'Password: at least 6 characters',
    'login.err.captcha_required': 'Solve the math problem to continue',
    'login.err.register_failed': 'Could not sign up',
    'login.err.login_failed': 'Could not sign in',
    'login.err.network': 'Network error. Please try again.',
    'login.ok.login_redirect': 'Signed in. Redirecting…',
    'login.ok.register_redirect': 'Sign-up successful. Redirecting…',
    'login.ok.register_login_manual': 'Account created. Sign in with your email and password.',
    'login.oauth.denied': 'Google sign-in was cancelled.',
    'login.oauth.failed': 'Google sign-in failed. Please try again.',
    'login.oauth.unavailable': 'Google sign-in is unavailable',
    'features.metaTitle': 'Features — TalkPilot',
    'features.metaDesc': 'Basic and Pro speech recognition, Edge neural voices, voice cloning, AI hints, demo chat, auto-playback, dashboard, and API — the full TalkPilot overview.',
    'features.header.title': 'TalkPilot features',
    'features.header.sub': 'From the first word to a smooth bilingual dialogue: recognition, translation, synthesis, AI context, and a polished web experience in one place.',
    'features.why.title': 'Why TalkPilot?',
    'features.why.sub': 'We combined advanced technologies into an easy voice translator.',
    'features.c1.t': 'Instant translation',
    'features.c1.p': 'Real-time speech with under 0.5s latency. Talk naturally without awkward pauses.',
    'features.c2.t': '322+ voices',
    'features.c2.p': 'A library of natural voices across languages. Pick a timbre for your situation or brand.',
    'features.c3.t': 'AI translation',
    'features.c3.p': 'State-of-the-art neural nets deliver up to 98% accuracy with phrase context.',
    'features.c4.t': '50+ languages',
    'features.c4.p': 'Major world languages and popular pairs for travel, work, and study.',
    'features.c5.t': 'Security',
    'features.c5.p': 'Encryption and a responsible data policy. Audio is not used for training without your consent.',
    'features.c6.t': 'API',
    'features.c6.p': 'Embed translation and synthesis into your products via a documented API.',
    'features.use.title': 'Use cases',
    'features.use.sub': 'One tool — many tasks',
    'features.s1.t': 'Travel',
    'features.s1.p': 'Orders, transfers, tours, and daily questions — you speak, your partner hears the translated voice.',
    'features.s2.t': 'Business and calls',
    'features.s2.p': 'Meetings with international partners, interviews, and negotiations without constant “please translate”.',
    'features.s3.t': 'Learning',
    'features.s3.p': 'Lectures, language practice, and access to materials in a foreign language with real-time hints.',
    'features.s4.t': 'Healthcare and customer care',
    'features.s4.p': 'Calm conversations with patients and clients abroad: you speak your language, they hear natural speech in theirs.',
    'features.s5.t': 'Online events and support',
    'features.s5.p': 'Webinars, Q&A, and helpdesk flows without juggling extra tools — one stream of speech and text with two-way translation.',
    'features.det.sec1.title': 'Voice, recognition, and synthesis',
    'features.det.sec1.sub': 'Tune the hear → translate → speak chain for your workflow and budget',
    'features.det.d1.t': 'Two recognition modes',
    'features.det.d1.p': 'Basic with Vosk for a cost-friendly start, and Pro via AITunnel for stronger accuracy on longer phrases and noisy environments.',
    'features.det.d2.t': 'Edge neural voices: you and your partner',
    'features.det.d2.p': 'Pick your outgoing voice in the partner’s language and a separate voice for their replies. Preview samples before you start.',
    'features.det.d3.t': 'Cloned voice',
    'features.det.d3.p': 'Upload WAV, MP3, OGG, or FLAC, or record a sample from the microphone — attach a clone in your profile and combine it with standard voices where your plan allows.',
    'features.det.d4.t': 'Auto-play translation',
    'features.det.d4.p': 'After recognition, the translated line can play immediately — great in demo and full chat when rhythm matters.',
    'features.det.sec2.title': 'AI, context, and demo',
    'features.det.sec2.sub': 'Smart hints and presets so the conversation stays on topic',
    'features.det.i1.t': 'Conversation topic and context',
    'features.det.i1.p': 'Describe the situation—negotiations, interviews, friendly tone, or work style. AI hints adapt to your domain and wording.',
    'features.det.i2.t': 'Demo and setup wizard',
    'features.det.i2.p': 'A free guided tour of settings: languages, modes, voices, clone, AI topic. A capped demo dialogue, then the same full /ui experience.',
    'features.det.i3.t': 'Reply hints and text refinements',
    'features.det.i3.p': 'Suggested phrases in the partner’s language and hints after recognition help you answer faster—with fewer awkward pauses.',
    'features.det.i4.t': 'Two-way chat',
    'features.det.i4.p': 'Message history, translations and captions, on-demand voicing for specific lines—a full two-language flow in one room.',
    'features.det.sec3.title': 'Account, accessibility, and integrations',
    'features.det.sec3.sub': 'Use the browser, scale up, and connect to your stack',
    'features.det.x1.t': 'Dashboard and pricing',
    'features.det.x1.p': 'Translation minutes tracked, 1-hour and 20-hour packs (Basic, Pro, Ultimate), card payments via Stripe and crypto—clear limits and upgrades in a few clicks.',
    'features.det.x2.t': 'Interface accessibility',
    'features.det.x2.p': 'Font scaling and contrast mode—comfortable on different screens and for stronger readability without extra extensions.',
    'features.det.x3.t': 'Modern web client',
    'features.det.x3.p': 'Chrome and Edge recommended, microphone access or keyboard input, flexible output settings—no heavy local install.',
    'features.det.x4.t': 'Developer API',
    'features.det.x4.p': 'A documented API to embed translation and synthesis; access unlocks on plans that include integration.',
    'features.cta.title': 'Try it yourself',
    'features.cta.sub': 'Create an account and launch the app — starter minutes are free on the free tier.',
    'features.cta.btn': 'Start for free',
    'features.cta.demo': 'Demo setup (no sign-up)',
    'pricing.metaTitle': 'Pricing — TalkPilot',
    'pricing.metaDesc': 'TalkPilot pricing: 1-hour and 20-hour packs — Basic, Pro, and Ultimate.',
    'pricing.header.title': 'Pricing plans',
    'pricing.header.title_dark': 'Pricing',
    'pricing.header.title_accent': 'plans',
    'pricing.header.sub': 'Choose the plan that fits you best',
    'pricing.header.sub_l1': 'Choose the plan',
    'pricing.header.sub_l2': 'that fits you best',
    'pricing.pack.sub_1h': 'pack · 1 hour of included time',
    'pricing.pack.sub_20h': 'pack · 20 hours of included time',
    'pricing.p1h_basic.title': '1 hour Basic',
    'pricing.p1h_pro.title': '1 hour Pro',
    'pricing.p1h_ultimate.title': '1 hour Ultimate',
    'pricing.p20h_basic.title': '20 hours Basic',
    'pricing.p20h_pro.title': '20 hours Pro',
    'pricing.p20h_ultimate.title': '20 hours Ultimate',
    'pricing.btn_order': 'Get started',
    'pricing.cart_qty_short': 'Quantity:',
    'pricing.qty_minus': 'Decrease quantity',
    'pricing.qty_plus': 'Increase quantity',
    'pricing.f.b1': '60 minutes of conversation',
    'pricing.f.b2': 'Use any of 322 voices for your own playback',
    'pricing.f.b3': 'Phrase composition assistant',
    'pricing.f.b4': "Partner's speech translation",
    'pricing.f.b5': 'Edit your phrase before it is spoken',
    'pricing.f.b6': 'Conversation history',
    'pricing.f.b7': 'Transparent screen mode in the web app',
    'pricing.inc_basic': 'Everything in the Basic plan',
    'pricing.f.ai1': 'AI hints during the conversation',
    'pricing.f.ai2': 'On-screen AI hints in the web app',
    'pricing.inc_pro': 'Everything in Basic and Pro',
    'pricing.f.clone': 'Clone your own voice',
    'pricing.f.ultimate_desktop_stealth': 'Transparent TalkPilot window during video calls in the desktop app',
    'pricing.f.ultimate_desktop_region_ai': 'AI hints for a selected screen region during video calls in the desktop app',
    'pricing.current_plan_label': 'Current plan:',
    'pricing.valid_till_short': 'until',
    'pricing.bonus_minutes': 'bonus',
    'pricing.minutes_limit': 'limit',
    'pricing.pack_unavailable': 'This pack is unavailable on your current plan.',
    'pricing.unit_minutes': 'minutes',
    'technology.metaTitle': 'Technology — TalkPilot',
    'technology.metaDesc': 'TalkPilot stack: Vosk and cloud speech recognition, neural translation, Edge TTS and voice cloning, secure backend, Redis, and payment webhooks — architecture overview.',
    'technology.header.title': 'Our technology',
    'technology.header.sub': 'A modern stack for performance and accuracy',
    'technology.stack.title': 'Technology stack',
    'tech.c1.h': 'Speech recognition',
    'tech.c1.li4': 'Vosk (offline)',
    'tech.c2.h': 'Translation',
    'tech.c2.li4': 'Proprietary neural models',
    'tech.c3.h': 'Text-to-speech',
    'tech.c4.h': 'Backend',
    'tech.c4.li4': 'Redis (caching)',
    'tech.c5.h': 'Security',
    'tech.c5.li4': 'CORS protection',
    'tech.c6.h': 'Payments',
    'tech.c6.li3': 'Webhook notifications',
    'tech.c6.li4': 'Automatic renewal',
    'tech.arch.title': 'System architecture',
    'tech.arch.sub': 'Microservice architecture for scaling',
    'faq.metaTitle': 'FAQ — TalkPilot',
    'faq.metaDesc': 'Answers about real-time voice translation, Zoom, Teams, VB-Cable, plans and minutes, security and GDPR, voice cloning, and the TalkPilot desktop app — FAQ and support.',
    'dash.metaTitle': 'Dashboard — TalkPilot',
    'dash.showAppAudioSetup': 'Show meeting app audio setup',
    'dash.sidebar.stats': 'Usage statistics',
    'dash.sidebar.settings': 'Account settings',
    'dash.sidebar.conversation': 'Conversation settings',
    'dash.sidebar.subscription': 'Plan',
    'dash.sidebar.voice': 'Voice generation',
    'dash.sidebar.history': 'Conversation history',
    'dash.sidebar.serviceStats': 'Service analytics',
    'dash.summary.today': 'Today summary',
    'dash.summary.minutes': 'minutes',
    'dash.summary.phrases': 'phrases',
    'dash.summary.usedMin': 'used min',
    'dash.summary.accuracy': 'accuracy',
    'dash.stats.title': 'Usage statistics',
    'dash.stats.lead': 'Activity and service usage overview',
    'dash.stats.minutesLeft': 'Minutes left',
    'dash.stats.phrasesSent': 'Phrases sent',
    'dash.stats.minutesUsed': 'Minutes used',
    'dash.stats.translationAccuracy': 'Translation accuracy',
    'dash.plan.usageTitle': 'Plan usage',
    'dash.plan.loadingHint': 'Current plan and minute limit are loaded after sign in.',
    'dash.plan.manage': 'Manage plan',
    'dash.pro.unlock': 'Unlock more minutes and Pro priority.',
    'dash.pro.learnMore': 'Learn more',
    'dash.chart.usageDynamics': 'Usage dynamics',
    'dash.chart.byDays': 'By day',
    'dash.chart.langDistribution': 'Language distribution',
    'dash.chart.allLangs': 'All languages',
    'dash.profile.user': 'User',
    'dash.profile.freePlan': 'Free plan',
    'dash.profile.validTill': 'Valid until:',
    'dash.password.mismatch': '❌ Passwords do not match',
    'dash.password.changed': '✅ Password changed successfully!',
    'dash.password.changeError': 'Password change error',
    'dash.error.network': '❌ Network error:',
    'dash.logout.confirm': 'Are you sure you want to log out?',
    'dash.plan.buyConfirm': 'Are you sure you want to buy the plan',
    'dash.plan.buyError': 'Purchase error',
    'dash.tx.empty': 'No transactions yet',
    'dash.tx.topup': 'Top up',
    'dash.tx.ok': 'Completed',
    'dash.tx.pending': 'Processing',
    'dash.tx.cancelled': 'Cancelled',
    'dash.unit.month': '/mo',
    'dash.unit.minutes': 'minutes',
    'faq.header.title_prefix': 'Frequently asked',
    'faq.header.title_accent': 'questions',
    'faq.header.sub': 'Answers to common questions about TalkPilot',
    'faq.cat.general': 'General questions',
    'faq.q1': 'What is TalkPilot?',
    'faq.a1': 'TalkPilot is a next-generation voice translator that uses AI for real-time speech translation. It supports 50+ languages and 322+ voices.',
    'faq.q2': 'How do I get started?',
    'faq.a2': 'Sign up on the site — it is free. After registration you get 60 minutes of translation per month on the free plan.',
    'faq.q3': 'Which languages are supported?',
    'faq.a3': 'We support 50+ languages including English, Spanish, French, German, Chinese, Japanese, Russian, and many more. The full list is available in your dashboard.',
    'faq.cat.pay': 'Pricing and billing',
    'faq.q4': 'What payment methods are available?',
    'faq.a4': 'We accept major cards (Visa, Mastercard) via Stripe and cryptocurrencies (USDT, BTC, ETH) via NowPayments.',
    'faq.q5': 'Can I cancel my subscription?',
    'faq.a5': 'Yes, you can cancel anytime in your dashboard. Access remains until the end of the paid period.',
    'faq.q6': 'Is there a refund policy?',
    'faq.a6': 'Refunds are possible within 14 days of purchase if you have used no more than 10% of your minute allowance.',
    'faq.cat.tech': 'Technical questions',
    'faq.q7': 'Which browsers are supported?',
    'faq.a7': 'TalkPilot works in all modern browsers: Chrome, Firefox, Safari, Edge. For best performance we recommend Chrome or Edge.',
    'faq.q8': 'Do I need a microphone?',
    'faq.a8': 'Yes, for voice input you need a microphone. You can also type text manually if a microphone is unavailable.',
    'faq.q9': 'Is there an API for developers?',
    'faq.a9': 'Yes, the API is available on Pro and Team plans. Documentation is available in the dashboard after you activate a subscription.',
    'faq.search_ph': 'Search questions…',
    'faq.cat.general_sub': 'Basics about TalkPilot',
    'faq.cat.pay_sub': 'Subscriptions, packs, and payments',
    'faq.cat.tech_sub': 'Requirements, audio, and compatibility',
    'faq.cat.security': 'Security and privacy',
    'faq.cat.security_sub': 'Data protection and your account',
    'faq.cat.support': 'Support and help',
    'faq.cat.support_sub': 'How to reach the TalkPilot team',
    'faq.q10': 'How is the web app different from the desktop app?',
    'faq.a10': 'The web client runs in the browser with no install. The desktop app is better for long calls: you can use a translucent window and AI hints for a selected screen region over Zoom, Teams, and similar apps where your plan includes these features.',
    'faq.q11': 'What is conference mode and why do I need VB-Cable?',
    'faq.a11': 'Conference mode routes spoken translation to a virtual audio cable (VB-Audio Cable on Windows, BlackHole or similar on macOS). In Zoom or Teams you pick the «CABLE Output» microphone so participants hear the translation like a normal voice.',
    'faq.q12': 'Does TalkPilot offer AI reply suggestions?',
    'faq.a12': 'On plans with AI, the chat can suggest context-aware phrasing. A conversation topic and description in settings also improve recognition and suggestion quality.',
    'faq.q13': 'Can I use TalkPilot offline?',
    'faq.a13': 'No — recognition, translation, and speech synthesis need a network. Some processing runs on TalkPilot servers or partner cloud services (for example in Pro recognition).',
    'faq.q14': 'Do I need an account for the demo?',
    'faq.a14': 'A short on-site demo flow can start from the guided setup without a full account; create one to keep presets and use the translator regularly.',
    'faq.q15': 'What do the 1-hour and 20-hour packs mean?',
    'faq.a15': 'They are included translation minutes for the paid period. Usage and balance are shown in your dashboard.',
    'faq.q16': 'What happens when I run out of minutes?',
    'faq.a16': 'Starting translation is blocked until you renew or buy another pack. Saved chat history remains available.',
    'faq.q17': 'Can I change my plan mid-period?',
    'faq.a17': 'Plan changes are available in the dashboard; proration rules depend on the payment provider and method.',
    'faq.q18': 'How do I pay with cryptocurrency?',
    'faq.a18': 'Via NowPayments you can pay with USDT, BTC, ETH, and more. After blockchain confirmation the status updates automatically; if it stalls, email support with the transaction hash.',
    'faq.q19': 'Can I get a company invoice?',
    'faq.a19': 'Card payments include standard Stripe receipts. For B2B invoices and billing details, contact support.',
    'faq.q20': 'What if my card payment fails?',
    'faq.a20': 'Write to support with your account email, time of attempt, and any error text (mask card numbers). We will check status with the payment provider.',
    'faq.q21': 'Zoom participants do not hear the translation — what should I check?',
    'faq.a21': 'Install VB-Cable (or BlackHole on Mac), enable conference mode in TalkPilot, set Zoom’s microphone to CABLE Output, and use headphones/speakers to hear the other side. Restart audio devices if needed.',
    'faq.q22': 'How do Basic and Pro recognition differ?',
    'faq.a22': 'Basic is faster and more economical (Vosk). Pro is more accurate for difficult speech via cloud models — availability depends on your plan.',
    'faq.q23': 'Why does the server say the microphone is busy?',
    'faq.a23': 'Only one active capture session may run at a time. Close another translator tab or the desktop client and try again.',
    'faq.q24': 'How do I choose the playback voice?',
    'faq.a24': 'The chat offers neural voices and optional voice clone on supported plans. Save presets in Dashboard → Conversation settings.',
    'faq.q25': 'Does TalkPilot work with Teams and Google Meet?',
    'faq.a25': 'Yes — the same virtual-cable microphone setup applies. The in-app wizard walks through common meeting apps.',
    'faq.q26': 'Which desktop operating systems are supported?',
    'faq.a26': 'Supported OS builds depend on the release; follow the download page and documentation for current installers and requirements.',
    'faq.q27': 'Are my calls recorded on the server?',
    'faq.a27': 'The service is built around streaming speech for translation. For retention details, read the privacy policy or ask support for your use case.',
    'faq.q28': 'How is account access secured?',
    'faq.a28': 'We use modern authentication and API authorization. Do not share passwords or active sessions with others.',
    'faq.q29': 'Can I delete my personal data?',
    'faq.a29': 'Deletion requests go through support; timing depends on data volume and applicable regulations.',
    'faq.q30': 'How do I report a security vulnerability?',
    'faq.a30': 'Email support@talkpilot.pro with subject «Security», include reproduction steps, and avoid public disclosure until we respond.',
    'faq.q31': 'Are my phrases sent to third-party AI?',
    'faq.a31': 'Cloud features (translation, hints, improved recognition) may call external models according to your plan and service configuration.',
    'faq.q32': 'How fast does support reply?',
    'faq.a32': 'Usually within 24–48 business hours; complex billing cases may take longer.',
    'faq.q33': 'What should I include for a payment error email?',
    'faq.a33': 'Account email, time of attempt, payment method, error text, and a screenshot without full card numbers.',
    'faq.q34': 'Where can I read about product capabilities?',
    'faq.a34': 'The Features, Technology, and Pricing pages complement this FAQ.',
    'faq.q35': 'How can I suggest a product idea?',
    'faq.a35': 'Email support with a short scenario and expected outcome — it is routed to the product backlog.',
    'faq.q36': 'What should a bug report include?',
    'faq.a36': 'Browser or app version, OS, reproduction steps, a console screenshot (F12), and approximate time of failure.',
    'faq.q37': 'What is real-time online voice translation?',
    'faq.a37': 'TalkPilot listens, translates, and speaks the result—useful for calls, negotiations, and international work without an on-site interpreter. Quality depends on articulation, your microphone, and the recognition mode you choose.',
    'faq.q38': 'How is TalkPilot different from Google Translate or a browser translator?',
    'faq.a38': 'TalkPilot is built for continuous voice dialogue: mic input, conversational flow, TTS voice choice, conference routing over a virtual cable into Zoom/Teams, and (on supported plans) AI reply hints. A plain text translator in another app does not cover «I speak—they hear translation in the meeting» scenarios.',
    'faq.q39': 'Can TalkPilot translate Zoom, Teams, and webinars?',
    'faq.a39': 'Yes—the usual pattern is a virtual audio cable as the meeting microphone plus conference mode in TalkPilot. Follow the in-app wizard and use headphones to reduce echo.',
    'faq.q40': 'Is TalkPilot good for language learning?',
    'faq.a40': 'It is primarily for live communication and work; you can practice pronunciation and hear neural TTS, but it does not replace a structured language course or grammar training.',
    'faq.q41': 'How accurate is AI translation and what latency should I expect?',
    'faq.a41': 'Accuracy improves with clear speech, a good mic, and a moderate pace; latency depends on the network, phrase length, and Basic versus Pro recognition. For legal or medical wording always have a human verify critical content.',
    'faq.q42': 'Does TalkPilot offer a free voice-translation plan?',
    'faq.a42': 'After signup the free tier includes a monthly translation allowance—see Pricing for the current minute limits and terms.',
    'faq.q43': 'How are voice-translation minutes counted on paid plans?',
    'faq.a43': 'Usage is tied to active translation sessions; details appear in your dashboard. When minutes run out you renew or add a pack.',
    'faq.q44': 'Does TalkPilot support corporate and team (B2B) use cases?',
    'faq.a44': 'For invoicing, org-specific setup, and integrations, contact support. Team-tier API details are on the Pricing page and in dashboard documentation.',
    'faq.q45': 'What are voice cloning and neural TTS in TalkPilot?',
    'faq.a45': 'Neural TTS delivers natural-sounding spoken translations; voice cloning (where your plan allows) can match a reference sample timbre subject to acceptable-use rules.',
    'faq.q46': 'How do I reduce noise, echo, and dropouts in voice input?',
    'faq.a46': 'Prefer a headset mic close to your mouth, close other tabs using the same microphone, check OS input levels, and keep only one TalkPilot client actively capturing audio.',
    'faq.q47': 'Can I translate English to Russian and Russian to English?',
    'faq.a47': 'Yes—you set source and target languages in the chat before the conversation; many other language pairs from the catalog are supported.',
    'faq.q48': 'Does TalkPilot work with Skype, Discord, or OBS streaming?',
    'faq.a48': 'If the app lets you choose a system microphone, you can often reuse the same virtual-cable routing as for Zoom. Routing differs by OS audio settings—see guides or ask support.',
    'faq.q49': 'Is TalkPilot GDPR-aligned for personal data processing?',
    'faq.a49': 'Legal terms and data-processing descriptions are in the site privacy policy and user agreement; ask support if your company needs specific compliance documents.',
    'faq.q50': 'Can I use TalkPilot for trade-secret or confidential negotiations?',
    'faq.a50': 'Consider your NDA obligations: some features use cloud and third-party models. For strict regimes involve legal counsel and vendor terms before processing sensitive information.',
    'faq.q51': 'Is support available in Russian?',
    'faq.a51': 'The site and materials support Russian-speaking users; you can email support@talkpilot.pro in Russian.',
    'faq.q52': 'Where do I download TalkPilot and read Zoom/Teams setup guides?',
    'faq.a52': 'Download links and step-by-step guides live on the TalkPilot site and in the dashboard/audio-setup flow; always use the latest download page when the app UI changes.',
    'faq.contact.title': 'Still have questions?',
    'faq.contact.sub': 'Our support team is ready to help you anytime',
    'faq.contact.btn': 'Contact support',
    'contacts.title': 'Contacts',
    'contacts.metaTitle': 'Contacts — TalkPilot',
    'contacts.metaDesc': 'Contact the TalkPilot team through our feedback form — support, partnerships, and press inquiries.',
    'contacts.hero.title_html': 'Contact <span class="accent">the TalkPilot team</span>',
    'contacts.hero.sub': 'Have a question, feedback, or need help? We are here for you.',
    'contacts.hero.cta1': 'Email us',
    'contacts.hero.cta2': 'FAQ',
    'contacts.stat.support': 'Support',
    'contacts.stat.response': 'Avg. response time',
    'contacts.stat.clients': 'Happy clients',
    'contacts.stat.security': 'Data security',
    'contacts.stat.support_val': '24/7',
    'contacts.stat.response_val': '15 min',
    'contacts.stat.clients_val': '100%',
    'contacts.stat.security_val': '100%',
    'contacts.main.title': 'Get in touch',
    'contacts.info.title': 'Contact information',
    'contacts.info.email': 'Email',
    'contacts.info.email_hint_html': 'support@talkpilot.pro<br>We will reply as soon as possible',
    'contacts.info.hours': 'Business hours',
    'contacts.info.hours_hint_html': 'Daily 09:00–21:00 (UTC+3)<br>Online support',
    'contacts.info.format': 'Support format',
    'contacts.info.format_hint_html': 'Online support<br>Web and desktop apps',
    'contacts.info.secure': 'Security',
    'contacts.info.secure_hint_html': 'All data protected<br>SSL encryption and GDPR',
    'contacts.form.title': 'Feedback form',
    'contacts.form.name': 'Your name',
    'contacts.form.name_ph': 'Enter your name',
    'contacts.form.email': 'Email',
    'contacts.form.email_ph': 'Enter your email',
    'contacts.form.subject': 'Subject',
    'contacts.form.subject_ph': 'e.g. Question about pricing',
    'contacts.form.message': 'Message',
    'contacts.form.message_ph': 'Describe your question or suggestion in detail...',
    'contacts.form.submit': 'Send message',
    'contacts.form.privacy': 'By clicking Send, you agree to personal data processing',
    'checkout.orderTitle': 'Order',
    'checkout.qtyLabel': 'Package quantity',
    'checkout.unitPriceLabel': 'Price per package',
    'checkout.totalLabel': 'Total (USD)',
    'checkout.hint': 'Pay by card or cryptocurrency (NowPayments). Amount is charged in USD at the current rate.',
    'checkout.cardTitle': 'Card payment',
    'checkout.cardProvidersHint': 'Visa, Mastercard, Apple Pay — secure checkout page.',
    'checkout.cardPayBtn': 'Pay by card',
    'checkout.payerEmailLabel': 'Email for receipt',
    'checkout.payerEmailHint': 'Enter the buyer’s email — used for your receipt and order support.',
    'checkout.stripeTitle': 'Card payment',
    'checkout.amountLabel': 'Amount (USD)',
    'checkout.amountPh': 'Amount',
    'checkout.stripePayBtn': 'Pay by card',
    'checkout.cryptoTitle': 'Cryptocurrency payment',
    'checkout.cryptoHint': 'An invoice is created for the exact order amount. Credited after on-chain confirmation.',
    'checkout.cryptoMinPh': 'Minimum 5 USD',
    'checkout.cryptoCurrencyLabel': 'Cryptocurrency',
    'checkout.cryptoCreateBtn': 'Create invoice',
    'checkout.modalStripeTitle': 'Card payment',
    'checkout.modalAmount': 'Amount:',
    'checkout.cardDetailsLabel': 'Card details',
    'checkout.modalCardHolder': 'Cardholder name',
    'checkout.modalCardHolderPh': 'John Doe',
    'checkout.modalPay': 'Pay',
    'checkout.modalCryptoTitle': 'Cryptocurrency payment',
    'checkout.modalCryptoAmount': 'Amount to pay:',
    'checkout.modalWallet': 'Wallet address:',
    'checkout.modalCopy': 'Copy',
    'checkout.modalWait': 'Waiting for payment<br>to the wallet address',
    'checkout.metaTitle': 'Checkout — TalkPilot',
    'checkout.suffix_minutes_topup': ' (minute top-up)',
    'checkout.suffix_renewal': ' (renewal)',
    'checkout.topup_hint': 'Top-up of {minutes} minutes on your current plan. Your subscription expiry date stays the same.',
    'checkout.renewal_hint_until': 'Renewal of the same plan: valid until {date}, +{minutes} min.',
    'checkout.renewal_hint_default': 'Renewal of the same plan: your subscription period will be extended and minutes credited to your balance.',
    'checkout.cryptoNetworkHint': 'USDT and USDC are accepted on the TRC20 network (Tron). Other coins use their native network (Bitcoin, Ethereum, etc.).',
    'checkout.cryptoBelowMin': 'Order amount ${order} is below the minimum for {label} (from ${min} via NOWPayments). Pay by card, choose another cryptocurrency, or a larger pack.',
    'checkout.pick_crypto': 'Select cryptocurrency',
    'checkout.addr_copied': 'Address copied',
    'checkout.order_compose': 'Order summary',
    'checkout.invoice_create_failed': 'Failed to create invoice',
    'checkout.amount_unknown': 'Could not determine order amount',
    'checkout.error_generic': 'Error',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'privacy.metaTitle': 'Privacy Policy — TalkPilot',
    'privacy.metaDesc': 'TalkPilot Privacy Policy: what data we collect, why we use it, and how we protect it.',
    'privacy.h1': 'Privacy Policy',
    'privacy.updated': 'Effective 24 May 2026 · Website: talkpilot.pro',
    'privacy.intro': 'This policy explains how TalkPilot (“we”, “the service”) processes personal data of users of our website and apps. By using TalkPilot, you agree to this policy.',
    'privacy.s1.title': '1. Operator and contacts',
    'privacy.s1.text': 'TalkPilot is available at <a href="https://talkpilot.pro">https://talkpilot.pro</a>. Privacy inquiries: <a href="mailto:support@talkpilot.pro">support@talkpilot.pro</a>.',
    'privacy.s2.title': '2. Data we process',
    'privacy.s2.l1': 'Account data: email, name (on sign-up or Google sign-in).',
    'privacy.s2.l2': 'Google OAuth data: ID, email, name, and profile photo — only for sign-in and account creation.',
    'privacy.s2.l3': 'Voice and audio: recordings for real-time translation, demos, and voice cloning — when you use those features.',
    'privacy.s2.l4': 'Technical data: IP address, browser type, session cookies, usage and error logs.',
    'privacy.s2.l5': 'Payments: subscription IDs and payment status via Stripe (we do not store full card numbers).',
    'privacy.s3.title': '3. Purposes',
    'privacy.s3.l1': 'Registration, authentication, and account management.',
    'privacy.s3.l2': 'Providing translation, conference, voice cloning, and demo features.',
    'privacy.s3.l3': 'Plans, minutes, and billing.',
    'privacy.s3.l4': 'User support and service improvement.',
    'privacy.s3.l5': 'Security, abuse prevention, and legal compliance.',
    'privacy.s4.title': '4. Legal bases',
    'privacy.s4.text': 'We process data to perform our contract with you, based on your consent (e.g. voice recording, marketing if you opt in), and for legitimate interests (security and aggregated analytics), and where required by law.',
    'privacy.s5.title': '5. Cookies and sessions',
    'privacy.s5.text': 'We use essential cookies for sign-in (JWT session, user ID). The dashboard and translator cannot work without them. We do not use third-party advertising cookies by default.',
    'privacy.s6.title': '6. Third parties',
    'privacy.s6.text': 'Data may be shared with providers required to run the service: Google (OAuth), Stripe (payments), hosting, and cloud APIs for speech recognition, translation, and voice synthesis. Sharing is limited to the purposes in this policy and confidentiality agreements.',
    'privacy.s7.title': '7. Retention',
    'privacy.s7.text': 'Account data is kept while your account is active. After deletion we remove or anonymize data within a reasonable period, except where law requires longer retention (e.g. payment records).',
    'privacy.s8.title': '8. Your rights',
    'privacy.s8.text': 'You may request access, correction, deletion, restriction, or withdrawal of consent — email support@talkpilot.pro. EEA residents may also lodge a complaint with a data protection authority.',
    'privacy.s9.title': '9. Security',
    'privacy.s9.text': 'We use HTTPS, access controls, and other organizational and technical measures. No internet transmission is completely secure.',
    'privacy.s10.title': '10. Children',
    'privacy.s10.text': 'The service is not intended for anyone under 16. If you believe a child provided data to us, contact us to delete it.',
    'privacy.s11.title': '11. Changes',
    'privacy.s11.text': 'We may update this page. The current version is always at <a href="/privacy">/privacy</a>. Material changes will be communicated via the site or email when possible.',
    'terms.metaTitle': 'Terms of Service — TalkPilot',
    'terms.metaDesc': 'TalkPilot Terms of Service: account, subscriptions, acceptable use, and limitation of liability.',
    'terms.h1': 'Terms of Service',
    'terms.updated': 'Effective 24 May 2026 · Website: talkpilot.pro',
    'terms.intro': 'By using TalkPilot’s website and services, you accept these terms. If you do not agree, do not use the service.',
    'terms.s1.title': '1. The service',
    'terms.s1.text': 'TalkPilot provides web and desktop tools for real-time voice translation, video conferences, demos, voice cloning, and related features. Availability depends on your plan and technical limits.',
    'terms.s2.title': '2. Account',
    'terms.s2.text': 'You must provide accurate information, keep your password confidential, and not share access. You are responsible for activity under your account. We may suspend or delete accounts for violations.',
    'terms.s3.title': '3. Subscriptions and payment',
    'terms.s3.text': 'Paid plans are processed via Stripe. Price, minute limits, and billing period are shown on the pricing page. Subscriptions renew automatically until you cancel in the dashboard or via Stripe. Refunds follow applicable law and support policy.',
    'terms.s4.title': '4. Acceptable use',
    'terms.s4.l1': 'You must not break the law, infringe others’ rights, distribute malware, or overload our infrastructure.',
    'terms.s4.l2': 'You must not use the service for sanctions evasion, fraud, or recording conversations without participants’ consent.',
    'terms.s4.l3': 'You confirm you have the right to upload and process voice data (including cloning).',
    'terms.s5.title': '5. Content and voice',
    'terms.s5.text': 'You retain rights to your content. You grant us a limited license to process audio and text solely to provide the service. We do not claim ownership of your recordings but may store them as needed to operate the service.',
    'terms.s6.title': '6. Translation accuracy',
    'terms.s6.text': 'Translation and synthesis are automatic and may contain errors. The service is provided “as is”; human review is required for legal, medical, or other critical use.',
    'terms.s7.title': '7. Limitation of liability',
    'terms.s7.text': 'To the maximum extent permitted by law, TalkPilot is not liable for indirect damages or loss of profit or data. Total liability is limited to fees you paid in the last 12 months (or the minimum required by law).',
    'terms.s8.title': '8. Termination',
    'terms.s8.text': 'You may stop using the service at any time. We may restrict access for violations, non-payment, or technical reasons. Liability and dispute provisions survive termination.',
    'terms.s9.title': '9. Privacy',
    'terms.s9.text': 'Personal data processing is governed by our <a href="/privacy">Privacy Policy</a>.',
    'terms.s10.title': '10. Changes',
    'terms.s10.text': 'We may update these terms. Continued use after a new version is published means acceptance, unless prohibited by law.',
    'terms.s11.title': '11. Contact',
    'terms.s11.text': 'Questions: <a href="mailto:support@talkpilot.pro">support@talkpilot.pro</a> or the <a href="/contacts">contact form</a>.',
  };

  const DE = Object.assign({}, EN, {
    'nav.lang_label': 'Sprache',
    'nav.menu_open': 'Menü öffnen',
    'nav.menu_close': 'Menü schließen',
    'nav.lang_aria': 'Websprache',
    'nav.home': 'Start',
    'nav.features': 'Funktionen',
    'nav.tech': 'Technologie',
    'nav.pricing': 'Preise',
    'nav.faq': 'FAQ',
    'nav.download': 'TalkPilot herunterladen',
    'auth.login': 'Anmelden',
    'auth.register': 'Registrieren',
    'auth.logout': 'Abmelden',
    'auth.cabinet': 'Konto',
    'nav.launch_app': 'App starten',
    'index.metaTitle': 'TalkPilot — Sprachübersetzer der nächsten Generation',
    'index.hero.line1': 'Sprachübersetzer',
    'index.hero.line2': 'der nächsten Generation',
    'index.hero.sub': 'Echtzeit-Übersetzung gesprochener Sprache mit modernster KI.',
    'index.hero.cta1': 'Kostenlos testen',
    'index.hero.cta2': 'So funktioniert’s',
    'index.stat.voices': 'Stimmen',
    'index.stat.langs': 'Sprachen',
    'index.stat.acc': 'Genauigkeit',
    'index.stat.latency': 'Latenz',
    'index.why.title': 'Warum TalkPilot?',
    'index.why.sub': 'Wir verbinden Spitzentechnologien für die beste Sprachübersetzung.',
    'index.f1.t': 'Sofortübersetzung',
    'index.f1.p': 'Echtzeit-Sprache mit unter 0,5 s Latenz. Sprechen Sie natürlich, ohne lange Pausen.',
    'index.f2.t': '322+ Stimmen',
    'index.f2.p': 'Eine große Bibliothek natürlicher Stimmen in vielen Sprachen. Wählen Sie die Klangfarbe für Ihren Anwendungsfall.',
    'index.f3.t': 'KI-Technologie',
    'index.f3.p': 'Neueste neuronale Modelle liefern bis zu 98 % Übersetzungsqualität mit Kontext.',
    'index.f4.t': '50+ Sprachen',
    'index.f4.p': 'Wichtige Weltsprachen und beliebte Paare für Reisen, Arbeit und Lernen.',
    'index.f5.t': 'Sicherheit',
    'index.f5.p': 'Ihre Daten sind geschützt. Wir speichern keine Audioaufnahmen und nutzen Verschlüsselung.',
    'index.f6.t': 'Geklonte Stimme',
    'index.f6.p': 'Übersetzungen können mit Ihrer geklonten Stimme ausgegeben werden — laden Sie eine Probe hoch, und Ihr Gegenüber hört Sie, nicht einen Roboter.',
    'index.vosk.title': 'Unterstützte Sprachen',
    'index.vosk.p': 'Unterstützte Erkennungssprachen funktionieren sowohl im Basic- als auch im Pro-Modus. Die vollständige TalkPilot-Sprachenliste und Qualitätshinweise finden Sie in der Dokumentation.',
    'index.vosk.badge': '30+ Sprachen',
    'index.vosk.eu_t': 'Europäische Sprachen',
    'index.vosk.as_t': 'Asiatische Sprachen',
    'index.vosk.ot_t': 'Weitere Sprachen',
    ...vfVoskHtmlFor('de'),
    'index.how.title': 'So funktioniert’s',
    'index.how.title_prefix': 'So',
    'index.how.title_accent': 'funktioniert’s',
    'index.how.sub': 'Der komplette TalkPilot-Ablauf: von der Sitzungsvorbereitung und KI-Kontextkonfiguration bis zur live Zwei-Wege-Übersetzung, gespeicherter Historie und Analyse danach.',
    'index.how.s1t': '1) Sitzungsvorbereitung',
    'index.how.s1p': 'Wählen Sie zuerst Modus (Web oder Desktop), Sprachpaar, Gesprächsthema und Basic/Pro-Erkennung für das richtige Verhältnis von Geschwindigkeit und Genauigkeit. Konfigurieren Sie Dialogoptionen wie KI-Kontext, Antworthinweise, Ausgabestimme und erweiterte Einstellungen wie Stimmklonen, damit das System sofort auf Ihr Szenario abgestimmt ist.',
    'index.how.s2t': '2) Live-Gespräch',
    'index.how.s2p': 'Während des Gesprächs erfasst TalkPilot Audio, erkennt Sprache, übersetzt kontextbewusst und spielt die Ausgabe sofort in der Zielsprache ab. Die Oberfläche zeigt beide Seiten des Dialogs, Qualitätsindikatoren, aktive Sitzungsparameter und KI-Antworthinweise, damit Sie ein natürliches Gesprächstempo halten.',
    'index.how.s3t': '3) Steuerung und Skalierung',
    'index.how.s3p': 'Nach der Sitzung bleibt die komplette Historie im Chat und im Konto: Sie können Repliken prüfen, Qualität bewerten, Kennzahlen analysieren und Einstellungen für künftige Gespräche verfeinern. Dort verwalten Sie auch Tarife und Skalierung — Stimmklonen, Team-Workflows und API-Integration.',
    'index.cta.title': 'Bereit loszulegen?',
    'index.cta.sub': 'Schließen Sie sich Tausenden Nutzerinnen und Nutzern an, die TalkPilot bereits verwenden',
    'index.cta.btn': 'Kostenloses Konto erstellen',
    'index.cta.btnDashboard': 'Zum Konto',
    'index.integrations.title': 'Kompatible Dienste für Übersetzung',
    'index.integrations.sub': 'Nutzen Sie TalkPilot in Meetings, Chats und Anrufen über den Web-Client, die Desktop-App und API-Integrationen.',
    'index.integrations.zoom.p': 'Ideal für internationale Meetings und Webinare mit Zwei-Wege-Sprachübersetzung.',
    'index.integrations.telegram.p': 'Verbinden Sie Bot- und API-Szenarien für mehrsprachige Kommunikation.',
    'index.integrations.meet.p': 'Läuft im Browser ohne aufwendige lokale Installation.',
    'index.integrations.teams.p': 'Für Team-Anrufe, Interviews und Verhandlungen mit internationalen Teilnehmenden.',
    'index.integrations.webex.p': 'Geeignet für Unternehmenskonferenzen und Kunden-Sessions online.',
    'index.integrations.api.t': 'Beliebige Anwendungen',
    'index.integrations.api.p': 'Wenn Sie die Audioquelle auswählen können',
    'index.cap.title_html': 'Was <span class="title-accent">TalkPilot</span> kann',
    'index.cap.sub': 'Vom kurzen Demo-Dialog bis zum vollen Übersetzer-Workflow und persönlichen Konto.',
    'index.cap1.t': 'Live-Sprachübersetzung',
    'index.cap1.p': 'Zwei-Wege-Dialog in Echtzeit mit minimaler Latenz.',
    'index.cap2.t': 'Basic- / Pro-Modi',
    'index.cap2.p': 'Schneller Einstieg und präzise Erkennung, abgestimmt auf Ihr Szenario.',
    'index.cap3.t': 'KI-Antworthinweise',
    'index.cap3.p': 'Kontextbezogene Formulierungsvorschläge, damit Gespräche flüssig bleiben.',
    'index.cap4.t': 'Stimmklonen',
    'index.cap4.p': 'Beispiel hochladen und übersetzte Sätze mit geklonter Stimme ausgeben.',
    'index.cap5.t': 'Thema und Gesprächskontext',
    'index.cap5.p': 'KI und Erkennung fein auf Ihren Dialogtyp abstimmen.',
    'index.cap6.t': 'Flexible Chat-Einstellungen',
    'index.cap6.p': 'Sprachen, Pause zwischen Sätzen, automatische Wiedergabe und mehr.',
    'index.cap7.t': 'Konto und Statistik',
    'index.cap7.p': 'Minuten, Sätze, Verlauf, Profil und persönliche Einstellungen.',
    'index.cap8.t': 'Tarife und Zahlungen',
    'index.cap8.p': 'Abos verwalten, Guthaben aufladen und Ausgaben im Blick behalten.',
    'index.cap.cta1': 'Demo kostenlos testen',
    'index.cap.cta2': 'Konto öffnen',
    'index.cap.note': 'Demo in etwa einer Minute; Registrierung optional.',
    'index.pf.title_html': 'Web- und <span class="title-accent">Desktop-Apps</span>',
    'index.pf.sub': 'So arbeiten Sie: im Browser oder in einer eigenen Desktop-App. Die komplette KI-Übersetzung bleibt bei Ihnen.',
    'index.pf.web.h': 'Web-Version',
    'index.pf.web.sub': 'Läuft direkt im Browser',
    'index.pf.web.li1': 'Live-Sprachübersetzung in Echtzeit',
    'index.pf.web.li2': 'Basic- / Pro-Erkennungsmodi',
    'index.pf.web.li3': 'KI-Antworthinweise mit Kontext',
    'index.pf.web.li4': 'Stimmklonen und Wiedergabe',
    'index.pf.web.li5': 'Flexible Einstellungen und Konto',
    'index.pf.web.badge': 'Im Browser · Keine Installation',
    'index.pf.web.btn1': 'Web-Demo testen',
    'index.pf.desk.h': 'Desktop-App',
    'index.pf.desk.sub': 'Maximale Möglichkeiten',
    'index.pf.desk.li1': 'Alle Funktionen der Web-Version',
    'index.pf.desk.li2': 'Transparentes Overlay während Calls',
    'index.pf.desk.li3': 'KI-Assistent auf dem Bildschirm für Live-Hinweise',
    'index.pf.desk.li4': 'Tiefere Zoom- / Teams-Integration',
    'index.pf.desk.li5': 'Ausführlichere Gesprächsanalyse',
    'index.pf.desk.badge': 'Eigenes App-Fenster · Offline-freundlich (Basismodus)',
    'index.pf.desk.btn1': 'Desktop herunterladen',
    'index.desk.modal.title': 'TalkPilot herunterladen',
    'index.desk.modal.sub': 'Wählen Sie die Version für Ihr Betriebssystem',
    'index.desk.modal.win': 'Windows',
    'index.desk.modal.win_meta': 'Installer · 64-bit',
    'index.desk.modal.mac': 'macOS',
    'index.desk.modal.mac_meta': 'DMG-Abbild · Apple Silicon und Intel',
    'index.desk.modal.hint': 'Nach der Installation anmelden — die App verbindet sich mit dem TalkPilot-Server.',
    'index.how.c01.t': 'Sitzungsvorbereitung',
    'index.how.c01.p': 'Wählen Sie Web oder Desktop, Sprachpaar, Thema und Basic/Pro-Erkennung für passende Geschwindigkeit und Genauigkeit.',
    'index.how.c01.chip': 'KI-Kontext + Stimmklonen',
    'index.how.c02.t': 'Live-Dialog',
    'index.how.c02.p': 'TalkPilot erfasst Audio, transkribiert, übersetzt mit Kontext und spielt sofort ab. Beide Seiten sehen die Repliken parallel.',
    'index.how.c02.chip': 'Latenz < 0,5 s · Zwei-Wege-Übersetzung',
    'index.how.c03.t': 'Steuerung und Skalierung',
    'index.how.c03.p': 'Der Verlauf bleibt im Chat und im Konto — Repliken prüfen, Qualität bewerten, Statistik auswerten, Einstellungen anpassen.',
    'index.how.c03.chip': 'Statistik · API · Tarife',
    'index.how.c04.t': 'KI-Antworthinweise',
    'index.how.c04.p': 'Vorschläge nach Kontext für schnellere, klarere Kommunikation.',
    'index.how.c04.chip': 'Schnellerer Dialog',
    'index.how.c05.t': 'Stimmklonen',
    'index.how.c05.p': 'Stimmprobe hochladen — TalkPilot erstellt einen digitalen Klon für natürliche Übersetzungsausgabe.',
    'index.how.c05.chip': 'Stimmklon',
    'index.how.c06.t': 'Analyse und Export',
    'index.how.c06.p': 'Detaillierte Analysen pro Dialog, exportierbare Historie, Qualitätsverfolgung und stetige Verbesserung.',
    'index.how.c06.chip': 'Datenexport',
    'footer.tagline': 'KI-Sprachübersetzer der nächsten Generation.',
    'footer.product': 'Produkt',
    'footer.support': 'Support',
    'footer.company': 'Unternehmen',
    'footer.contact': 'Kontakt',
    'footer.copy': '© 2026 TalkPilot. Alle Rechte vorbehalten.',
    'footer.trial_setup': 'Demo-Einrichtung',
    'footer.trial_chat': 'Demo-Chat',
    'modal.login.title': 'Anmelden',
    'modal.login.submit': 'Anmelden',
    'modal.login.google': 'Mit Google anmelden',
    'modal.login.switch_prefix': 'Noch kein Konto?',
    'modal.login.switch_link': 'Registrieren',
    'modal.reg.title': 'Registrieren',
    'modal.reg.submit': 'Konto erstellen',
    'modal.reg.google': 'Mit Google registrieren',
    'modal.reg.switch_prefix': 'Bereits ein Konto?',
    'modal.reg.switch_link': 'Anmelden',
  });
  const FR = Object.assign({}, EN, {
    'nav.lang_label': 'Langue',
    'nav.lang_aria': 'Langue du site',
    'nav.home': 'Accueil',
    'nav.features': 'Fonctionnalités',
    'nav.tech': 'Technologie',
    'nav.pricing': 'Tarifs',
    'nav.faq': 'FAQ',
    'nav.download': 'Télécharger TalkPilot',
    'auth.login': 'Connexion',
    'auth.register': 'Inscription',
    'auth.logout': 'Déconnexion',
    'auth.cabinet': 'Espace client',
    'nav.launch_app': "Lancer l'application",
    'index.metaTitle': 'TalkPilot — Traducteur vocal nouvelle génération',
    'index.hero.line1': 'Traducteur vocal',
    'index.hero.line2': 'nouvelle génération',
    'index.hero.sub': 'Traduction vocale en temps réel grâce à une IA de pointe.',
    'index.hero.cta1': 'Essayer gratuitement',
    'index.hero.cta2': 'Comment ça marche',
    'index.stat.voices': 'Voix',
    'index.stat.langs': 'Langues',
    'index.stat.acc': 'Précision',
    'index.stat.latency': 'Latence',
    'index.why.title': 'Pourquoi TalkPilot ?',
    'index.why.sub': 'Nous réunissons les technologies de pointe pour la meilleure expérience de traduction vocale.',
    'index.f1.t': 'Traduction instantanée',
    'index.f1.p': 'Voix en temps réel avec une latence inférieure à 0,5 s. Parlez naturellement, sans pauses gênantes.',
    'index.f2.t': '322+ voix',
    'index.f2.p': 'Une large bibliothèque de voix naturelles dans plusieurs langues. Choisissez le timbre adapté à votre usage.',
    'index.f3.t': 'Technologie IA',
    'index.f3.p': 'Les derniers modèles neuronaux offrent jusqu’à 98 % de qualité de traduction avec prise en compte du contexte.',
    'index.f4.t': '50+ langues',
    'index.f4.p': 'Les principales langues du monde et des paires courantes pour voyager, travailler et apprendre.',
    'index.f5.t': 'Sécurité',
    'index.f5.p': 'Vos données sont protégées. Nous ne conservons pas d’enregistrements audio et utilisons le chiffrement.',
    'index.f6.t': 'Voix clonée',
    'index.f6.p': 'Les traductions peuvent être lues avec votre voix clonée — téléversez un échantillon et votre interlocuteur vous entendra, pas un robot.',
    'index.vosk.title': 'Langues prises en charge',
    'index.vosk.p': 'Les langues de reconnaissance prises en charge fonctionnent en modes Basic et Pro. La liste complète des langues TalkPilot et les recommandations de qualité sont disponibles dans la documentation.',
    'index.vosk.badge': '30+ langues',
    'index.vosk.eu_t': 'Langues européennes',
    'index.vosk.as_t': 'Langues asiatiques',
    'index.vosk.ot_t': 'Autres langues',
    ...vfVoskHtmlFor('fr'),
    'index.how.title': 'Comment ça marche',
    'index.how.title_prefix': 'Comment',
    'index.how.title_accent': 'ça marche',
    'index.how.sub': 'Le parcours TalkPilot complet : préparation de session et contexte IA, traduction bidirectionnelle en direct, historique enregistré et analyses après l’appel.',
    'index.how.s1t': '1) Préparation de session',
    'index.how.s1p': "Choisissez d'abord le mode (web ou bureau), la paire de langues, le sujet de conversation et la reconnaissance Basic/Pro pour le bon équilibre vitesse et précision. Configurez ensuite le contexte IA, les suggestions de réponses, la voix de lecture et des options avancées comme le clonage vocal afin que le système soit immédiatement adapté à votre scénario.",
    'index.how.s2t': '2) Conversation en direct',
    'index.how.s2p': 'Pendant l’échange, TalkPilot capture l’audio, reconnaît la parole, traduit avec contexte et lit immédiatement le résultat dans la langue cible. L’interface affiche les deux côtés du dialogue, des indicateurs de qualité, les paramètres actifs et les suggestions IA pour garder un rythme naturel.',
    'index.how.s3t': '3) Pilotage et montée en charge',
    'index.how.s3p': 'Après la session, tout l’historique reste dans le chat et l’espace client : relisez les répliques, évaluez la qualité, analysez les statistiques et affinez les réglages. Gérez aussi les offres et la montée en charge — clonage vocal, workflows d’équipe et intégration API.',
    'index.cta.title': 'Prêt à commencer ?',
    'index.cta.sub': 'Rejoignez des milliers d’utilisateurs qui utilisent déjà TalkPilot',
    'index.cta.btn': 'Créer un compte gratuit',
    'index.cta.btnDashboard': 'Accéder à l’espace client',
    'index.integrations.title': 'Services compatibles pour la traduction',
    'index.integrations.sub': 'Utilisez TalkPilot en réunion, chat et appel via le client web, l’application bureau et les intégrations API.',
    'index.integrations.zoom.p': 'Idéal pour les réunions internationales et webinaires avec traduction vocale bidirectionnelle.',
    'index.integrations.telegram.p': 'Reliez bots et scénarios API pour des flux multilingues.',
    'index.integrations.meet.p': 'Fonctionne dans le navigateur sans installation locale lourde.',
    'index.integrations.teams.p': 'Pour appels d’équipe, entretiens et négociations avec des participants internationaux.',
    'index.integrations.webex.p': 'Adapté aux conférences d’entreprise et sessions clients en ligne.',
    'index.integrations.api.t': 'Toute application',
    'index.integrations.api.p': 'Lorsque vous pouvez choisir la source audio',
    'index.cap.title_html': 'Ce que <span class="title-accent">TalkPilot</span> peut faire',
    'index.cap.sub': 'D’une démo rapide au traducteur complet et à l’espace client.',
    'index.cap1.t': 'Traduction vocale en ligne',
    'index.cap1.p': 'Dialogue bidirectionnel en temps réel avec une latence minimale.',
    'index.cap2.t': 'Modes Basic / Pro',
    'index.cap2.p': 'Démarrage rapide et reconnaissance avancée adaptée à votre cas d’usage.',
    'index.cap3.t': 'Suggestions de réponses IA',
    'index.cap3.p': 'Formulations contextuelles pour garder la conversation fluide.',
    'index.cap4.t': 'Clonage de voix',
    'index.cap4.p': 'Téléversez un échantillon et lisez les phrases traduites avec la voix clonée.',
    'index.cap5.t': 'Sujet et contexte de conversation',
    'index.cap5.p': 'Affinez l’IA et la reconnaissance selon le type de dialogue.',
    'index.cap6.t': 'Réglages de chat flexibles',
    'index.cap6.p': 'Langues, pause entre les phrases, lecture automatique et plus encore.',
    'index.cap7.t': 'Espace client et statistiques',
    'index.cap7.p': 'Minutes, phrases, historique, profil et préférences personnelles.',
    'index.cap8.t': 'Offres et paiements',
    'index.cap8.p': 'Gérez l’abonnement, rechargez le solde et suivez les dépenses.',
    'index.cap.cta1': 'Essayer la démo gratuitement',
    'index.cap.cta2': 'Ouvrir l’espace client',
    'index.cap.note': 'Démo en environ une minute ; inscription facultative.',
    'index.pf.title_html': 'Web et <span class="title-accent">applications bureau</span>',
    'index.pf.sub': 'Choisissez votre mode : navigateur ou application bureau dédiée. Toute la puissance de la traduction IA reste avec vous.',
    'index.pf.web.h': 'Version web',
    'index.pf.web.sub': 'Fonctionne directement dans le navigateur',
    'index.pf.web.li1': 'Traduction vocale en direct',
    'index.pf.web.li2': 'Modes de reconnaissance Basic / Pro',
    'index.pf.web.li3': 'Suggestions de réponses IA contextuelles',
    'index.pf.web.li4': 'Clonage de voix et lecture',
    'index.pf.web.li5': 'Réglages flexibles et espace client',
    'index.pf.web.badge': 'Dans le navigateur · Sans installation',
    'index.pf.web.btn1': 'Essayer la démo web',
    'index.pf.desk.h': 'Application bureau',
    'index.pf.desk.sub': 'Fonctionnalités maximales',
    'index.pf.desk.li1': 'Toutes les fonctions de la version web',
    'index.pf.desk.li2': 'Superposition transparente pendant les appels',
    'index.pf.desk.li3': 'Assistant IA à l’écran pour des conseils en direct',
    'index.pf.desk.li4': 'Intégration plus poussée avec Zoom / Teams',
    'index.pf.desk.li5': 'Analyses de conversation plus riches',
    'index.pf.desk.badge': 'Fenêtre dédiée · Mode hors ligne basique',
    'index.pf.desk.btn1': 'Télécharger le bureau',
    'index.desk.modal.title': 'Télécharger TalkPilot',
    'index.desk.modal.sub': 'Choisissez la version pour votre système',
    'index.desk.modal.win': 'Windows',
    'index.desk.modal.win_meta': 'Installateur · 64 bits',
    'index.desk.modal.mac': 'macOS',
    'index.desk.modal.mac_meta': 'Image DMG · Apple Silicon et Intel',
    'index.desk.modal.hint': 'Après l’installation, connectez-vous — l’app se liera au serveur TalkPilot.',
    'index.how.c01.t': 'Préparation de session',
    'index.how.c01.p': 'Choisissez web ou bureau, la paire de langues, le sujet et la reconnaissance Basic/Pro pour la bonne vitesse et précision.',
    'index.how.c01.chip': 'Contexte IA + clonage vocal',
    'index.how.c02.t': 'Dialogue en direct',
    'index.how.c02.p': 'TalkPilot capture l’audio, transcrit, traduit avec contexte et lit immédiatement. Les deux parties voient les répliques en parallèle.',
    'index.how.c02.chip': 'Latence < 0,5 s · Traduction bidirectionnelle',
    'index.how.c03.t': 'Pilotage et montée en charge',
    'index.how.c03.p': 'L’historique reste dans le chat et l’espace client — relire, évaluer la qualité, analyser les stats et ajuster les réglages.',
    'index.how.c03.chip': 'Statistiques · API · Offres',
    'index.how.c04.t': 'Suggestions de réponses IA',
    'index.how.c04.p': 'Réponses suggérées selon le contexte pour communiquer plus vite et plus clairement.',
    'index.how.c04.chip': 'Dialogue plus rapide',
    'index.how.c05.t': 'Clonage de voix',
    'index.how.c05.p': 'Téléversez un échantillon vocal — TalkPilot crée un clone numérique pour lire vos traductions avec un timbre naturel.',
    'index.how.c05.chip': 'Clone vocal',
    'index.how.c06.t': 'Analyse et export',
    'index.how.c06.p': 'Analyses détaillées par dialogue, historique exportable, suivi de qualité et amélioration continue.',
    'index.how.c06.chip': 'Export de données',
    'footer.tagline': 'Traducteur vocal nouvelle génération propulsé par l’IA.',
    'footer.product': 'Produit',
    'footer.support': 'Assistance',
    'footer.company': 'Entreprise',
    'footer.contact': 'Contact',
    'footer.copy': '© 2026 TalkPilot. Tous droits réservés.',
    'footer.trial_setup': 'Configuration démo',
    'footer.trial_chat': 'Chat démo',
    'modal.login.title': 'Connexion',
    'modal.login.submit': 'Connexion',
    'modal.login.google': 'Continuer avec Google',
    'modal.login.switch_prefix': 'Pas encore de compte ?',
    'modal.login.switch_link': 'S’inscrire',
    'modal.reg.title': 'Inscription',
    'modal.reg.submit': 'Créer un compte',
    'modal.reg.google': 'S’inscrire avec Google',
    'modal.reg.switch_prefix': 'Déjà un compte ?',
    'modal.reg.switch_link': 'Connexion',
  });
  const ES = Object.assign({}, EN, {
    'nav.lang_label': 'Idioma',
    'nav.lang_aria': 'Idioma del sitio',
    'nav.home': 'Inicio',
    'nav.features': 'Funciones',
    'nav.tech': 'Tecnología',
    'nav.pricing': 'Precios',
    'nav.faq': 'FAQ',
    'nav.download': 'Descargar TalkPilot',
    'auth.login': 'Entrar',
    'auth.register': 'Registrarse',
    'auth.logout': 'Salir',
    'auth.cabinet': 'Panel',
    'nav.launch_app': 'Abrir aplicación',
    'index.metaTitle': 'TalkPilot — Traductor de voz de nueva generación',
    'index.hero.line1': 'Traductor de voz',
    'index.hero.line2': 'de nueva generación',
    'index.hero.sub': 'Traducción de voz en tiempo real con IA de última generación.',
    'index.hero.cta1': 'Probar gratis',
    'index.hero.cta2': 'Cómo funciona',
    'index.stat.voices': 'Voces',
    'index.stat.langs': 'Idiomas',
    'index.stat.acc': 'Precisión',
    'index.stat.latency': 'Latencia',
    'index.why.title': '¿Por qué TalkPilot?',
    'index.why.sub': 'Unimos tecnología de vanguardia para ofrecer la mejor experiencia de traducción de voz.',
    'index.f1.t': 'Traducción instantánea',
    'index.f1.p': 'Voz en tiempo real con menos de 0,5 s de latencia. Hable con naturalidad, sin pausas incómodas.',
    'index.f2.t': '322+ voces',
    'index.f2.p': 'Una gran biblioteca de voces naturales en varios idiomas. Elija el timbre adecuado a su caso.',
    'index.f3.t': 'Tecnología de IA',
    'index.f3.p': 'Los modelos neuronales más recientes ofrecen hasta un 98 % de calidad con comprensión del contexto.',
    'index.f4.t': '50+ idiomas',
    'index.f4.p': 'Los principales idiomas del mundo y pares habituales para viajar, trabajar y estudiar.',
    'index.f5.t': 'Seguridad',
    'index.f5.p': 'Sus datos están protegidos. No guardamos grabaciones de audio y usamos cifrado en tránsito.',
    'index.f6.t': 'Voz clonada',
    'index.f6.p': 'Las traducciones pueden reproducirse con su voz clonada — suba una muestra y su interlocutor le escuchará a usted, no a un robot.',
    'index.vosk.title': 'Idiomas admitidos',
    'index.vosk.p': 'Los idiomas de reconocimiento compatibles funcionan en los modos Basic y Pro. La lista completa de idiomas de TalkPilot y las recomendaciones de calidad están disponibles en la documentación.',
    'index.vosk.badge': '30+ idiomas',
    'index.vosk.eu_t': 'Idiomas europeos',
    'index.vosk.as_t': 'Idiomas asiáticos',
    'index.vosk.ot_t': 'Otros idiomas',
    ...vfVoskHtmlFor('es'),
    'index.how.title': 'Cómo funciona',
    'index.how.title_prefix': 'Cómo',
    'index.how.title_accent': 'funciona',
    'index.how.sub': 'El flujo completo de TalkPilot: desde la preparación de la sesión y el contexto de IA hasta la traducción bidireccional en vivo, el historial guardado y el análisis posterior.',
    'index.how.s1t': '1) Preparación de la sesión',
    'index.how.s1p': 'Primero elija el modo (web o escritorio), el par de idiomas, el tema de la conversación y el perfil de reconocimiento Basic/Pro para equilibrar velocidad y precisión. Luego configure el contexto de IA, sugerencias de respuesta, voz de salida y opciones avanzadas como clonación de voz para que el sistema arranque afinado a su escenario.',
    'index.how.s2t': '2) Conversación en vivo',
    'index.how.s2p': 'Durante la conversación, TalkPilot captura el audio, reconoce el habla, traduce con contexto y reproduce al instante en el idioma de destino. La interfaz muestra ambos lados del diálogo, indicadores de calidad, parámetros activos y sugerencias de IA para mantener un ritmo natural.',
    'index.how.s3t': '3) Control y escalado',
    'index.how.s3p': 'Tras la sesión, todo el historial permanece en el chat y el panel: revise réplicas, evalúe la calidad, analice métricas y ajuste la configuración. Desde el mismo lugar gestione planes y escalado: clonación de voz, flujos de equipo e integración por API.',
    'index.cta.title': '¿Listo para empezar?',
    'index.cta.sub': 'Únase a miles de usuarios que ya usan TalkPilot',
    'index.cta.btn': 'Crear una cuenta gratis',
    'index.cta.btnDashboard': 'Ir al panel',
    'index.integrations.title': 'Servicios compatibles con la traducción',
    'index.integrations.sub': 'Use TalkPilot en reuniones, chats y llamadas mediante el cliente web, la app de escritorio e integraciones API.',
    'index.integrations.zoom.p': 'Ideal para reuniones internacionales y seminarios web con traducción de voz bidireccional.',
    'index.integrations.telegram.p': 'Conecte escenarios de bots y API para flujos multilingües.',
    'index.integrations.meet.p': 'Funciona en el navegador sin instalación local compleja.',
    'index.integrations.teams.p': 'Para llamadas de equipo, entrevistas y negociaciones con participantes internacionales.',
    'index.integrations.webex.p': 'Adecuado para conferencias corporativas y sesiones con clientes en línea.',
    'index.integrations.api.t': 'Cualquier aplicación',
    'index.integrations.api.p': 'Donde se puede elegir la fuente de audio',
    'index.cap.title_html': 'Lo que puede hacer <span class="title-accent">TalkPilot</span>',
    'index.cap.sub': 'Desde un diálogo demo rápido hasta un flujo completo de traducción y un panel personal.',
    'index.cap1.t': 'Traducción de voz en línea',
    'index.cap1.p': 'Diálogo bidireccional en tiempo real con latencia mínima.',
    'index.cap2.t': 'Modos Basic / Pro',
    'index.cap2.p': 'Inicio rápido y reconocimiento avanzado adaptado a su escenario.',
    'index.cap3.t': 'Sugerencias de respuesta con IA',
    'index.cap3.p': 'Frases sugeridas según el contexto para agilizar la conversación.',
    'index.cap4.t': 'Clonación de voz',
    'index.cap4.p': 'Suba una muestra y reproduzca las frases traducidas con la voz clonada.',
    'index.cap5.t': 'Tema y contexto de la conversación',
    'index.cap5.p': 'Afine la IA y el reconocimiento al tipo de diálogo que necesite.',
    'index.cap6.t': 'Ajustes flexibles del chat',
    'index.cap6.p': 'Idiomas, pausa entre frases, reproducción automática y más.',
    'index.cap7.t': 'Panel y estadísticas',
    'index.cap7.p': 'Minutos, frases, historial de conversación, perfil y preferencias personales.',
    'index.cap8.t': 'Planes y pagos',
    'index.cap8.p': 'Gestione la suscripción, recargue saldo y controle los gastos.',
    'index.cap.cta1': 'Probar la demo gratis',
    'index.cap.cta2': 'Abrir el panel',
    'index.cap.note': 'Demo en aproximadamente un minuto; el registro es opcional.',
    'index.pf.title_html': 'Web y <span class="title-accent">aplicaciones de escritorio</span>',
    'index.pf.sub': 'Elija cómo trabajar: en el navegador o en una aplicación de escritorio dedicada. Toda la traducción con IA siempre con usted.',
    'index.pf.web.h': 'Versión web',
    'index.pf.web.sub': 'Funciona directamente en el navegador',
    'index.pf.web.li1': 'Traducción de voz en vivo en tiempo real',
    'index.pf.web.li2': 'Modos de reconocimiento Basic / Pro',
    'index.pf.web.li3': 'Sugerencias de respuesta con IA según el contexto',
    'index.pf.web.li4': 'Clonación de voz y reproducción',
    'index.pf.web.li5': 'Ajustes flexibles y panel',
    'index.pf.web.badge': 'En el navegador · Sin instalación',
    'index.pf.web.btn1': 'Probar demo web',
    'index.pf.desk.h': 'Aplicación de escritorio',
    'index.pf.desk.sub': 'Máximo potencial',
    'index.pf.desk.li1': 'Todas las funciones de la versión web',
    'index.pf.desk.li2': 'Superposición transparente durante las llamadas',
    'index.pf.desk.li3': 'Asistente de IA en pantalla para sugerencias en vivo',
    'index.pf.desk.li4': 'Integración más profunda con Zoom / Teams',
    'index.pf.desk.li5': 'Análisis de conversación más detallado',
    'index.pf.desk.badge': 'Ventana propia de la app · Modo sin conexión (básico)',
    'index.pf.desk.btn1': 'Descargar escritorio',
    'index.desk.modal.title': 'Descargar TalkPilot',
    'index.desk.modal.sub': 'Elija la versión para su sistema operativo',
    'index.desk.modal.win': 'Windows',
    'index.desk.modal.win_meta': 'Instalador · 64 bits',
    'index.desk.modal.mac': 'macOS',
    'index.desk.modal.mac_meta': 'Imagen DMG · Apple Silicon e Intel',
    'index.desk.modal.hint': 'Tras instalar, inicie sesión — la app se conectará al servidor TalkPilot.',
    'index.how.c01.t': 'Preparación de la sesión',
    'index.how.c01.p': 'Elija web o escritorio, par de idiomas, tema y reconocimiento Basic/Pro para la velocidad y precisión adecuadas.',
    'index.how.c01.chip': 'Contexto IA + clonación de voz',
    'index.how.c02.t': 'Diálogo en vivo',
    'index.how.c02.p': 'TalkPilot captura el audio, transcribe, traduce con contexto y reproduce al instante. Ambas partes ven las réplicas en paralelo.',
    'index.how.c02.chip': 'Latencia < 0,5 s · Traducción bidireccional',
    'index.how.c03.t': 'Control y escalado',
    'index.how.c03.p': 'El historial permanece en el chat y el panel: revise réplicas, evalúe la calidad, analice estadísticas y ajuste la configuración.',
    'index.how.c03.chip': 'Estadísticas · API · Planes',
    'index.how.c04.t': 'Sugerencias de respuesta con IA',
    'index.how.c04.p': 'Respuestas sugeridas según el contexto para comunicarse más rápido y con mayor claridad.',
    'index.how.c04.chip': 'Diálogo más ágil',
    'index.how.c05.t': 'Clonación de voz',
    'index.how.c05.p': 'Suba una muestra de voz: TalkPilot crea un clon digital para leer sus traducciones con timbre natural.',
    'index.how.c05.chip': 'Clon de voz',
    'index.how.c06.t': 'Análisis y exportación',
    'index.how.c06.p': 'Análisis detallado por diálogo, historial exportable, seguimiento de calidad y mejora continua.',
    'index.how.c06.chip': 'Exportación de datos',
    'footer.tagline': 'Traductor de voz de nueva generación con IA.',
    'footer.product': 'Producto',
    'footer.support': 'Soporte',
    'footer.company': 'Empresa',
    'footer.contact': 'Contacto',
    'footer.copy': '© 2026 TalkPilot. Todos los derechos reservados.',
    'footer.trial_setup': 'Configuración demo',
    'footer.trial_chat': 'Chat demo',
    'modal.login.title': 'Entrar',
    'modal.login.submit': 'Entrar',
    'modal.login.google': 'Continuar con Google',
    'modal.login.switch_prefix': '¿No tiene cuenta?',
    'modal.login.switch_link': 'Registrarse',
    'modal.reg.title': 'Registrarse',
    'modal.reg.submit': 'Crear cuenta',
    'modal.reg.google': 'Registrarse con Google',
    'modal.reg.switch_prefix': '¿Ya tiene cuenta?',
    'modal.reg.switch_link': 'Entrar',
  });

  const PACK = { ru: RU, en: EN, de: DE, fr: FR, es: ES };
  const extraPacks =
    typeof window.vfSiteLangExtraPacks === 'function'
      ? window.vfSiteLangExtraPacks(EN, ES, vfVoskHtmlFor)
      : {};
  Object.assign(PACK, extraPacks);
  if (typeof window.vfSiteLangMorePacks === 'function') {
    Object.assign(
      PACK,
      window.vfSiteLangMorePacks(EN, RU, ES, DE, FR, PACK.pt || ES, vfVoskHtmlFor)
    );
  }
  if (typeof window.vfSiteLangPagesPacks === 'function') {
    const pagePacks = window.vfSiteLangPagesPacks();
    Object.keys(pagePacks).forEach(function (code) {
      if (PACK[code]) Object.assign(PACK[code], pagePacks[code]);
      else PACK[code] = Object.assign({}, PACK.en, pagePacks[code]);
    });
  }
  if (typeof window.vfSiteLangLoginPacks === 'function') {
    const loginPacks = window.vfSiteLangLoginPacks();
    Object.keys(loginPacks).forEach(function (code) {
      if (PACK[code]) Object.assign(PACK[code], loginPacks[code]);
      else PACK[code] = Object.assign({}, PACK.en, loginPacks[code]);
    });
  }

  function resolveUiPackBase(code) {
    const c = String(code || '').toLowerCase();
    if (!c) return 'en';
    if (PACK[c]) return c;
    if (typeof window.vfGetUiLangPack === 'function') {
      const fb = window.vfGetUiLangPack(c);
      if (fb && fb !== c) return resolveUiPackBase(fb);
    }
    return 'en';
  }

  function ensureAllUiPacks() {
    for (let i = 0; i < SUPPORTED.length; i++) {
      const code = SUPPORTED[i];
      if (PACK[code]) continue;
      const base = resolveUiPackBase(code);
      const src = PACK[base] || PACK.en;
      PACK[code] = Object.assign({}, src);
    }
  }
  ensureAllUiPacks();

  function normalizeLang(code) {
    if (typeof window.vfNormalizeUiLang === 'function') {
      const n = window.vfNormalizeUiLang(code);
      return n || 'en';
    }
    const c = String(code || '').toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(c) >= 0 ? c : 'en';
  }

  function getPackLang(code) {
    const c = normalizeLang(code);
    if (!c) return 'en';
    ensureAllUiPacks();
    return PACK[c] ? c : 'en';
  }

  function getLang() {
    if (typeof window.vfGetPathLocale === 'function') {
      const pl = window.vfGetPathLocale();
      if (pl) return normalizeLang(pl);
    }
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return normalizeLang(s);
    } catch (e) { /* ignore */ }
    return 'ru';
  }

  /** Язык UI веб-переводчика (/ui, frontend) — держим в синхроне с лендингом и ЛК. */
  const TRANSLATOR_LANG_KEY = 'voiceTranslator_lang';

  function tryTranslatorStoredLang() {
    try {
      const s = localStorage.getItem(TRANSLATOR_LANG_KEY);
      return s ? normalizeLang(s) : null;
    } catch (e) {
      return null;
    }
  }

  function setLang(code) {
    const n = normalizeLang(code);
    try {
      localStorage.setItem(STORAGE_KEY, n);
    } catch (e) { /* ignore */ }
    try {
      localStorage.setItem(TRANSLATOR_LANG_KEY, n);
    } catch (e2) { /* ignore */ }
    try {
      if (typeof document !== 'undefined' && document.cookie != null) {
        document.cookie =
          'siteLang=' +
          encodeURIComponent(n) +
          '; Path=/; Max-Age=31536000; SameSite=Lax';
      }
    } catch (e3) { /* ignore */ }
  }

  function T(key) {
    const pack = getPackLang(getLang());
    const table = PACK[pack] || PACK.en;
    return table[key] || PACK.en[key] || RU[key] || key;
  }

  function populateSiteLangSelect() {
    const sel = document.getElementById('siteLangSelect');
    if (!sel) return;
    if (typeof window.vfPopulateUiLangSelect === 'function') {
      window.vfPopulateUiLangSelect(sel, getLang());
    }
  }

  function rebuildNavLangDropdown(sel) {
    const wrap = sel && sel.closest('.nav-lang-wrap');
    const list = document.getElementById('siteLangDropdown');
    if (!sel || !list || !wrap) return;
    list.innerHTML = '';
    for (let i = 0; i < sel.options.length; i++) {
      const o = sel.options[i];
      const li = document.createElement('li');
      li.className = 'nav-lang-dropdown-li';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-lang-dropdown-item';
      btn.setAttribute('role', 'option');
      btn.setAttribute('data-value', o.value);
      btn.textContent = o.textContent;
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        setNavLangMenuOpen(wrap, false);
        if (sel.value !== o.value) {
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
    syncNavLangCustomUi();
  }

  function applyToRoot(root) {
    const scope = root || document;
    const isFullDoc = !root || root === document || root.nodeType === 9;
    scope.querySelectorAll('[data-site-i18n]').forEach(function (el) {
      const k = el.getAttribute('data-site-i18n');
      if (!k) return;
      el.textContent = T(k);
    });
    scope.querySelectorAll('[data-site-i18n-html]').forEach(function (el) {
      const k = el.getAttribute('data-site-i18n-html');
      if (!k) return;
      el.innerHTML = T(k);
    });
    scope.querySelectorAll('[data-site-i18n-placeholder]').forEach(function (el) {
      const k = el.getAttribute('data-site-i18n-placeholder');
      if (k) el.setAttribute('placeholder', T(k));
    });
    scope.querySelectorAll('[data-site-i18n-aria]').forEach(function (el) {
      const k = el.getAttribute('data-site-i18n-aria');
      if (k) el.setAttribute('aria-label', T(k));
    });
    if (isFullDoc) {
      const titleKey = document.body && document.body.getAttribute('data-site-title-key');
      if (titleKey) document.title = T(titleKey);
      const m = document.querySelector('meta[name="description"]');
      const dk = document.body && document.body.getAttribute('data-site-desc-key');
      if (m && dk) m.setAttribute('content', T(dk));
    }
    const sel = document.getElementById('siteLangSelect');
    if (sel) {
      sel.value = getLang();
      sel.setAttribute('aria-label', T('nav.lang_aria'));
      syncNavLangCustomUi();
    }
  }

  function syncNavLangCustomUi() {
    const sel = document.getElementById('siteLangSelect');
    const trig = document.getElementById('siteLangTrigger');
    const pill = sel && sel.closest('.nav-lang-pill');
    if (!sel || !trig || sel.dataset.navLangUi !== '1') return;
    const code = String(sel.value || 'en').toUpperCase();
    trig.textContent = code;
    const ariaBase =
      typeof window.siteLangT === 'function' ? window.siteLangT('nav.lang_aria') : 'Site language';
    if (pill) pill.setAttribute('aria-label', ariaBase + ': ' + code);
    const dd = document.getElementById('siteLangDropdown');
    if (dd) {
      dd.querySelectorAll('[role="option"]').forEach(function (el) {
        el.setAttribute('aria-selected', el.getAttribute('data-value') === sel.value ? 'true' : 'false');
      });
    }
  }

  function setNavLangMenuOpen(wrap, open) {
    var pill = wrap.querySelector('.nav-lang-pill');
    var dd = wrap.querySelector('.nav-lang-dropdown');
    if (!pill || !dd) return;
    if (open) {
      wrap.classList.add('nav-lang-menu-open');
      pill.setAttribute('aria-expanded', 'true');
      dd.removeAttribute('hidden');
      dd.setAttribute('aria-hidden', 'false');
    } else {
      wrap.classList.remove('nav-lang-menu-open');
      pill.setAttribute('aria-expanded', 'false');
      dd.setAttribute('aria-hidden', 'true');
      dd.setAttribute('hidden', '');
    }
  }

  function bindNavLangOutsideClose() {
    if (window.__siteLangNavDocBound) return;
    window.__siteLangNavDocBound = true;
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.nav-lang-wrap.nav-lang-menu-open').forEach(function (wrap) {
        if (!wrap.contains(e.target)) setNavLangMenuOpen(wrap, false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.nav-lang-wrap.nav-lang-menu-open');
      if (!open) return;
      setNavLangMenuOpen(open, false);
      var pill = open.querySelector('.nav-lang-pill');
      if (pill) pill.focus();
    });
  }

  function enhanceNavLangSelect() {
    const sel = document.getElementById('siteLangSelect');
    if (!sel || sel.dataset.navLangUi === '1') return;
    const wrap = sel.closest('.nav-lang-wrap');
    const pill = sel.closest('.nav-lang-pill');
    if (!wrap || !pill) return;
    sel.dataset.navLangUi = '1';
    sel.classList.add('nav-lang-select--native');
    sel.setAttribute('tabindex', '-1');
    sel.setAttribute('aria-hidden', 'true');

    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('aria-haspopup', 'listbox');
    pill.setAttribute('aria-expanded', 'false');
    var labelId = sel.getAttribute('aria-labelledby');
    if (labelId) pill.setAttribute('aria-labelledby', labelId);

    const trigger = document.createElement('span');
    trigger.className = 'nav-lang-trigger';
    trigger.id = 'siteLangTrigger';
    trigger.setAttribute('aria-hidden', 'true');

    pill.insertBefore(trigger, sel);

    const list = document.createElement('ul');
    list.className = 'nav-lang-dropdown';
    list.id = 'siteLangDropdown';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-hidden', 'true');
    list.setAttribute('hidden', '');

    for (let i = 0; i < sel.options.length; i++) {
      const o = sel.options[i];
      const li = document.createElement('li');
      li.className = 'nav-lang-dropdown-li';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-lang-dropdown-item';
      btn.setAttribute('role', 'option');
      btn.setAttribute('data-value', o.value);
      btn.textContent = o.textContent;
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        setNavLangMenuOpen(wrap, false);
        if (sel.value !== o.value) {
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    }

    wrap.appendChild(list);
    bindNavLangOutsideClose();

    function toggleNavLangMenu(e) {
      if (e) e.stopPropagation();
      var opening = !wrap.classList.contains('nav-lang-menu-open');
      document.querySelectorAll('.nav-lang-wrap.nav-lang-menu-open').forEach(function (w) {
        if (w !== wrap) setNavLangMenuOpen(w, false);
      });
      setNavLangMenuOpen(wrap, opening);
    }

    pill.addEventListener('click', toggleNavLangMenu);
    pill.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleNavLangMenu(e);
      }
    });

    syncNavLangCustomUi();
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
    return normalizeLang(typeof navigator !== 'undefined' ? navigator.language : 'en');
  }

  function userChoseLang() {
    try {
      return localStorage.getItem(USER_SET_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function desktopUiLang() {
    try {
      if (!isDesktopApp()) return null;
      const raw = localStorage.getItem('voiceTranslator_lang');
      const n = normalizeLang(raw);
      return n || null;
    } catch (e) {
      return null;
    }
  }

  async function detectLangFromServer() {
    try {
      const r = await fetch('/api/site/detect-language', { credentials: 'same-origin' });
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.lang ? normalizeLang(j.lang) : null;
    } catch (e) {
      return null;
    }
  }

  function revealSiteLangBody() {
    if (!document.documentElement) return;
    document.documentElement.classList.remove('site-lang-loading');
    document.documentElement.classList.add('site-lang-ready');
  }

  async function initSiteLanguage() {
    const pathLang = typeof window.vfGetPathLocale === 'function' ? window.vfGetPathLocale() : null;
    if (pathLang) revealSiteLangBody();
    const desktopLang = desktopUiLang();
    if (desktopLang) {
      setLang(desktopLang);
    }
    if (pathLang) {
      setLang(pathLang);
    }

    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }

    if (!pathLang && !stored && !userChoseLang()) {
      const fromNav = detectLangFromNavigator();
      if (fromNav) setLang(fromNav);

      const detected = await detectLangFromServer();
      if (detected) {
        setLang(detected);
      } else if (!fromNav) {
        setLang('en');
      }
    } else if (!pathLang && stored) {
      setLang(stored);
    }

    const lang = getLang();
    if (document.documentElement) {
      document.documentElement.lang = lang;
    }
    revealSiteLangBody();
  }

  window.siteLangT = T;
  window.applySiteLangTo = applyToRoot;
  window.getSiteLang = getLang;

  let resolveReady = function () {};
  window.siteLangReady = new Promise(function (resolve) {
    resolveReady = resolve;
  });

  function bindSelect() {
    const sel = document.getElementById('siteLangSelect');
    if (!sel) return;
    populateSiteLangSelect();
    sel.value = getLang();
    if (sel.dataset.navLangUi === '1') {
      rebuildNavLangDropdown(sel);
    }
    if (!sel.dataset.navLangChangeBound) {
      sel.dataset.navLangChangeBound = '1';
      sel.addEventListener('change', function () {
        try {
          localStorage.setItem(USER_SET_KEY, '1');
        } catch (e) { /* ignore */ }
        setLang(sel.value);
        if (typeof window.vfSwapPathLocale === 'function') {
          window.location.href = window.vfSwapPathLocale(sel.value);
          return;
        }
        location.reload();
      });
    }
    enhanceNavLangSelect();
  }

  function boot() {
    initSiteLanguage()
      .then(function () {
        applyToRoot(document);
        bindSelect();
      })
      .catch(function () {
        applyToRoot(document);
        bindSelect();
      })
      .finally(function () {
        resolveReady();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
