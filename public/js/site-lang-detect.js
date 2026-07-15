/**
 * Установка языка до site-lang.js (в конце страницы после conversation-lang-options + site-locale-urls).
 * На URL с префиксом /{xx}/ не скрываем body — язык уже в HTML с сервера (LCP).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'siteLang';
  var USER_SET_KEY = 'siteLangUserSet';
  var PATH_LOCALE_RE = /^\/([a-z]{2})(?:\/|$)/;

  function pathLocaleFromLocation() {
    if (typeof window.vfGetPathLocale === 'function') {
      return window.vfGetPathLocale() || '';
    }
    var m = PATH_LOCALE_RE.exec((location && location.pathname) || '/');
    return m ? m[1] : '';
  }

  function detectFromNavigator() {
    if (typeof window.vfNormalizeUiLang !== 'function') return '';
    var list = navigator.languages;
    if (!list || !list.length) {
      list = [navigator.language || ''];
    }
    for (var i = 0; i < list.length; i++) {
      var n = window.vfNormalizeUiLang(list[i]);
      if (n) return n;
    }
    return '';
  }

  function readStored() {
    try {
      if (localStorage.getItem(USER_SET_KEY) === '1') {
        return localStorage.getItem(STORAGE_KEY) || '';
      }
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function readVoiceTranslatorLang() {
    try {
      if (typeof window.vfNormalizeUiLang !== 'function') return '';
      var raw = localStorage.getItem('voiceTranslator_lang') || '';
      var n = window.vfNormalizeUiLang(raw);
      return n || '';
    } catch (e) {
      return '';
    }
  }

  function isDesktopApp() {
    try {
      return /VoiceTranslatorDesktop/i.test(navigator.userAgent || '');
    } catch (e) {
      return false;
    }
  }

  var pathLocale = pathLocaleFromLocation();
  var lang = readStored();
  var userExplicit = false;
  try {
    userExplicit = localStorage.getItem(USER_SET_KEY) === '1';
  } catch (e) {
    /* ignore */
  }
  var desktopLang = isDesktopApp() ? readVoiceTranslatorLang() : '';
  if (pathLocale) {
    lang = pathLocale;
  } else if (desktopLang) {
    lang = desktopLang;
  } else if (!lang) {
    lang = isDesktopApp() && !userExplicit ? 'en' : detectFromNavigator() || 'en';
  } else if (typeof window.vfNormalizeUiLang === 'function') {
    lang = window.vfNormalizeUiLang(lang) || lang;
  }

  document.documentElement.lang = lang;
  if (pathLocale || isDesktopApp()) {
    /* Desktop: без hide body — иначе «пустое окно» при сбое site-lang.js */
    document.documentElement.classList.add('site-lang-ready');
    document.documentElement.classList.remove('site-lang-loading');
  } else {
    document.documentElement.classList.add('site-lang-loading');
  }
})();
