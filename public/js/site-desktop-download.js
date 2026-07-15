/**
 * Модальное окно «Скачать TalkPilot» + кнопка в шапке (#navDesktopDownloadBtn).
 */
(function () {
  'use strict';

  var modalEl = null;

  var MODAL_HTML =
    '<div id="desktopDownloadModal" class="modal desktop-download-modal" role="dialog" aria-modal="true" aria-labelledby="desktopDownloadModalTitle" hidden>' +
    '<div class="desktop-download-dialog">' +
    '<button type="button" class="desktop-download-close" id="desktopDownloadModalClose" aria-label="Закрыть">&times;</button>' +
    '<h2 class="desktop-download-title" id="desktopDownloadModalTitle" data-site-i18n="index.desk.modal.title">Скачать TalkPilot</h2>' +
    '<p class="desktop-download-lead" data-site-i18n="index.desk.modal.sub">Выберите версию для вашей операционной системы</p>' +
    '<div class="desktop-download-options">' +
    '<a href="/downloads/Voice-Translator-Setup.exe" class="desktop-download-option desktop-download-option--win" id="desktopDownloadWinBtn" download data-desktop-os="windows">' +
    '<i class="fab fa-windows platform-icon" aria-hidden="true"></i>' +
    '<span class="desktop-download-option-text">' +
    '<span class="desktop-download-option-label" data-site-i18n="index.desk.modal.win">Windows</span>' +
    '<span class="desktop-download-option-meta" data-site-i18n="index.desk.modal.win_meta">Установщик · 64-bit</span>' +
    '</span><i class="fas fa-download" aria-hidden="true"></i></a>' +
    '<a href="/downloads/Voice-Translator.dmg" class="desktop-download-option desktop-download-option--mac" id="desktopDownloadMacBtn" download data-desktop-os="macos">' +
    '<i class="fab fa-apple platform-icon" aria-hidden="true"></i>' +
    '<span class="desktop-download-option-text">' +
    '<span class="desktop-download-option-label" data-site-i18n="index.desk.modal.mac">macOS</span>' +
    '<span class="desktop-download-option-meta" data-site-i18n="index.desk.modal.mac_meta">DMG · затем «Install TalkPilot»</span>' +
    '</span><i class="fas fa-download" aria-hidden="true"></i></a>' +
    '<a href="/downloads/Install-TalkPilot-Mac.command" class="desktop-download-option desktop-download-option--mac" id="desktopDownloadMacEasyBtn" download data-desktop-os="macos-easy">' +
    '<i class="fas fa-magic platform-icon" aria-hidden="true"></i>' +
    '<span class="desktop-download-option-text">' +
    '<span class="desktop-download-option-label" data-site-i18n="index.desk.modal.mac_easy">macOS · простая установка</span>' +
    '<span class="desktop-download-option-meta" data-site-i18n="index.desk.modal.mac_easy_meta">Один файл · двойной клик</span>' +
    '</span><i class="fas fa-download" aria-hidden="true"></i></a>' +
    '</div>' +
    '<p class="desktop-download-hint" data-site-i18n="index.desk.modal.hint">После установки войдите в аккаунт — приложение подключится к серверу TalkPilot.</p>' +
    '<p class="desktop-download-mac-tip" data-site-i18n="index.desk.modal.mac_tip">macOS: скачайте «простую установку» и дважды нажмите файл (если macOS спросит — правый клик → «Открыть»). Либо откройте DMG и запустите «Install TalkPilot».</p>' +
    '</div></div>';

  function ensureModal() {
    if (!modalEl) modalEl = document.getElementById('desktopDownloadModal');
    if (modalEl) return modalEl;
    var wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML;
    modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);
    bindModalControls(modalEl);
    if (typeof window.applySiteLang === 'function') {
      try {
        window.applySiteLang();
      } catch (e) {
        /* ignore */
      }
    }
    return modalEl;
  }

  function openDesktopDownloadModal() {
    var m = ensureModal();
    if (!m) return;
    m.removeAttribute('hidden');
    m.classList.add('active');
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    var closeBtn = document.getElementById('desktopDownloadModalClose');
    if (closeBtn) closeBtn.focus();
  }

  function closeDesktopDownloadModal() {
    if (!modalEl) modalEl = document.getElementById('desktopDownloadModal');
    if (!modalEl) return;
    modalEl.classList.remove('active');
    modalEl.style.display = 'none';
    modalEl.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function trackDesktopAppDownload(os, url) {
    var fileName =
      os === 'macos-easy'
        ? 'Install-TalkPilot-Mac.command'
        : os === 'macos'
          ? 'Voice-Translator.dmg'
          : 'Voice-Translator-Setup.exe';
    if (typeof window.vfTrack !== 'function') return;
    window.vfTrack('desktop_app_download', {
      platform: os === 'macos-easy' ? 'macos' : os,
      file_name: fileName,
      file_extension: fileName.split('.').pop() || '',
      link_url: String(url || '').replace(/\?.*$/, ''),
      install_mode: os === 'macos-easy' ? 'easy_command' : 'package',
    });
  }

  function startDesktopDownload(os) {
    var base =
      os === 'macos-easy'
        ? 'https://talkpilot.pro/downloads/Install-TalkPilot-Mac.command'
        : os === 'macos'
          ? 'https://talkpilot.pro/downloads/Voice-Translator.dmg'
          : 'https://talkpilot.pro/downloads/Voice-Translator-Setup.exe';
    var url = base + '?t=' + Date.now();
    trackDesktopAppDownload(os, url);
    window.setTimeout(function () {
      window.location.assign(url);
    }, 120);
  }

  window.vfTrackDesktopAppDownload = trackDesktopAppDownload;
  window.vfStartDesktopDownload = startDesktopDownload;

  function bindDownloadLinks() {
    var winBtn = document.getElementById('desktopDownloadWinBtn');
    if (winBtn && !winBtn.dataset.vfBound) {
      winBtn.dataset.vfBound = '1';
      winBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        startDesktopDownload('windows');
      });
    }
    var macBtn = document.getElementById('desktopDownloadMacBtn');
    if (macBtn && !macBtn.dataset.vfBound) {
      macBtn.dataset.vfBound = '1';
      macBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        startDesktopDownload('macos');
      });
    }
    var macEasyBtn = document.getElementById('desktopDownloadMacEasyBtn');
    if (macEasyBtn && !macEasyBtn.dataset.vfBound) {
      macEasyBtn.dataset.vfBound = '1';
      macEasyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        startDesktopDownload('macos-easy');
      });
    }
  }

  function bindModalControls(m) {
    var closeBtn = document.getElementById('desktopDownloadModalClose');
    if (closeBtn && !closeBtn.dataset.vfBound) {
      closeBtn.dataset.vfBound = '1';
      closeBtn.addEventListener('click', closeDesktopDownloadModal);
    }
    if (!m.dataset.vfBackdropBound) {
      m.dataset.vfBackdropBound = '1';
      m.addEventListener('click', function (e) {
        if (e.target === m) closeDesktopDownloadModal();
      });
    }
    bindDownloadLinks();
  }

  if (typeof window.openDesktopDownloadModal !== 'function') {
    window.openDesktopDownloadModal = openDesktopDownloadModal;
  }
  if (typeof window.closeDesktopDownloadModal !== 'function') {
    window.closeDesktopDownloadModal = closeDesktopDownloadModal;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modalEl) modalEl = document.getElementById('desktopDownloadModal');
    if (modalEl && modalEl.classList.contains('active')) {
      closeDesktopDownloadModal();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    modalEl = document.getElementById('desktopDownloadModal');
    if (modalEl) bindModalControls(modalEl);

    var navBtn = document.getElementById('navDesktopDownloadBtn');
    if (navBtn && !navBtn.dataset.vfBound) {
      navBtn.dataset.vfBound = '1';
      navBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openDesktopDownloadModal === 'function') {
          window.openDesktopDownloadModal();
        }
      });
    }
  });
})();
