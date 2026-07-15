const { contextBridge, ipcRenderer } = require("electron");

try {
  document.documentElement.classList.add("vf-desktop-app");
} catch (_) {
  /* ignore */
}

const DESKTOP_RESIZE_HANDLE_CSS = `
#vf-desktop-resize-root {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
}
.vf-desktop-resize-handle {
  position: absolute;
  pointer-events: auto;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  background: transparent;
}
.vf-desktop-resize-n { top: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
.vf-desktop-resize-s { bottom: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
.vf-desktop-resize-e { top: 10px; right: 0; bottom: 10px; width: 6px; cursor: ew-resize; }
.vf-desktop-resize-w { top: 10px; left: 0; bottom: 10px; width: 6px; cursor: ew-resize; }
.vf-desktop-resize-ne { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.vf-desktop-resize-nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.vf-desktop-resize-se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.vf-desktop-resize-sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }
`;

/** Подписи кнопок titlebar для страниц оболочки (не /ui), по document.documentElement.lang */
const DESKTOP_SHELL_WIN_LABELS = {
  en: { min: "Minimize", max: "Maximize", restore: "Restore", close: "Close" },
  ru: { min: "Свернуть", max: "Развернуть", restore: "Восстановить", close: "Закрыть" },
  de: { min: "Minimieren", max: "Maximieren", restore: "Wiederherstellen", close: "Schließen" },
  fr: { min: "Réduire", max: "Agrandir", restore: "Restaurer", close: "Fermer" },
  es: { min: "Minimizar", max: "Maximizar", restore: "Restaurar", close: "Cerrar" },
  it: { min: "Riduci a icona", max: "Ingrandisci", restore: "Ripristina", close: "Chiudi" },
  pt: { min: "Minimizar", max: "Maximizar", restore: "Restaurar", close: "Fechar" },
  br: { min: "Minimizar", max: "Maximizar", restore: "Restaurar", close: "Fechar" },
  pl: { min: "Minimalizuj", max: "Maksymalizuj", restore: "Przywróć", close: "Zamknij" },
  nl: { min: "Minimaliseren", max: "Maximaliseren", restore: "Herstellen", close: "Sluiten" },
  sv: { min: "Minimera", max: "Maximera", restore: "Återställ", close: "Stäng" },
  tr: { min: "Simge durumuna küçült", max: "Ekranı kapla", restore: "Geri yükle", close: "Kapat" },
  uk: { min: "Згорнути", max: "Розгорнути", restore: "Відновити", close: "Закрити" },
  zh: { min: "最小化", max: "最大化", restore: "还原", close: "关闭" },
  ja: { min: "最小化", max: "最大化", restore: "元に戻す", close: "閉じる" },
  ko: { min: "최소화", max: "최대화", restore: "복원", close: "닫기" },
  ar: { min: "تصغير", max: "تكبير", restore: "استعادة", close: "إغلاق" },
  hi: { min: "छोटा करें", max: "बड़ा करें", restore: "पुनर्स्थापित करें", close: "बंद करें" },
  vi: { min: "Thu nhỏ", max: "Phóng to", restore: "Khôi phục", close: "Đóng" },
  cs: { min: "Minimalizovat", max: "Maximalizovat", restore: "Obnovit", close: "Zavřít" },
  el: { min: "Ελαχιστοποίηση", max: "Μεγιστοποίηση", restore: "Επαναφορά", close: "Κλείσιμο" },
  ca: { min: "Minimitza", max: "Maximitza", restore: "Restaura", close: "Tanca" },
  fa: { min: "کوچک‌سازی", max: "بزرگ‌سازی", restore: "بازگرداندن", close: "بستن" },
  ka: { min: "ჩაკეცვა", max: "გაშლა", restore: "აღდგენა", close: "დახურვა" },
  eo: { min: "Malgrandigi", max: "Pligrandigi", restore: "Restarigi", close: "Fermi" },
};

function desktopShellWinChromeLabels() {
  let code = "en";
  try {
    const raw = (document.documentElement && document.documentElement.getAttribute("lang")) || "";
    const prim = String(raw).trim().split(/[-_]/)[0].toLowerCase();
    if (prim && DESKTOP_SHELL_WIN_LABELS[prim]) code = prim;
  } catch (_) {
    /* ignore */
  }
  return DESKTOP_SHELL_WIN_LABELS[code] || DESKTOP_SHELL_WIN_LABELS.en;
}

const DESKTOP_RESIZE_EDGES = [
  { edge: "n", cls: "vf-desktop-resize-n" },
  { edge: "s", cls: "vf-desktop-resize-s" },
  { edge: "e", cls: "vf-desktop-resize-e" },
  { edge: "w", cls: "vf-desktop-resize-w" },
  { edge: "ne", cls: "vf-desktop-resize-ne" },
  { edge: "nw", cls: "vf-desktop-resize-nw" },
  { edge: "se", cls: "vf-desktop-resize-se" },
  { edge: "sw", cls: "vf-desktop-resize-sw" },
];

function onDesktopResizePointerDown(edge, e) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const sx = e.screenX;
  const sy = e.screenY;
  void ipcRenderer.invoke("desktop:window-resize-start", edge);
  const onMove = (ev) => {
    void ipcRenderer.invoke("desktop:window-resize-move", {
      dx: ev.screenX - sx,
      dy: ev.screenY - sy,
    });
  };
  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    void ipcRenderer.invoke("desktop:window-resize-end");
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function injectDesktopResizeHandles() {
  if (document.getElementById("vf-desktop-resize-root")) return;
  try {
    let style = document.getElementById("vf-desktop-resize-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "vf-desktop-resize-style";
      style.textContent = DESKTOP_RESIZE_HANDLE_CSS;
      (document.head || document.documentElement).appendChild(style);
    }
    const root = document.createElement("div");
    root.id = "vf-desktop-resize-root";
    root.setAttribute("aria-hidden", "true");
    for (const { edge, cls } of DESKTOP_RESIZE_EDGES) {
      const el = document.createElement("div");
      el.className = `vf-desktop-resize-handle ${cls}`;
      el.dataset.edge = edge;
      el.addEventListener("pointerdown", (e) => onDesktopResizePointerDown(edge, e));
      root.appendChild(el);
    }
    (document.body || document.documentElement).appendChild(root);
  } catch (_) {
    /* ignore */
  }
}

/** Экран переводчика: /ui, /ui/, /ui?… (старый regex не ловил /ui/ — на чат вешалась белая .vf-desktop-titlebar). */
function isChatUiPath() {
  try {
    let p = String(window.location.pathname || "/");
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "/ui" || p.startsWith("/ui/");
  } catch {
    return false;
  }
}

function stripDesktopSiteChromeFromChat() {
  if (!isChatUiPath()) return;
  try {
    document.documentElement.classList.remove("vf-desktop-site");
    document.querySelectorAll(".vf-desktop-titlebar").forEach((el) => {
      el.remove();
    });
  } catch (_) {
    /* ignore */
  }
}

function isDesktopSiteShellPage() {
  if (isChatUiPath()) return false;
  try {
    return /VoiceTranslatorDesktop/i.test(navigator.userAgent || "");
  } catch {
    return false;
  }
}

function shouldSkipPreloadSiteChrome() {
  try {
    if (/\/login(\.html)?\/?$/i.test(window.location.pathname || "")) return true;
    if (document.querySelector(".login-desktop-titlebar")) return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

let desktopSiteChromeCssText = "";

function injectDesktopSiteChromeStyles() {
  if (!desktopSiteChromeCssText) return;
  try {
    let el = document.getElementById("vf-desktop-site-chrome-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "vf-desktop-site-chrome-style";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = desktopSiteChromeCssText;
  } catch (_) {
    /* ignore */
  }
}

function wireDesktopSiteChromeButtons(bar) {
  if (!bar || bar.getAttribute("data-vf-chrome-wired") === "1") return;
  const minBtn = bar.querySelector("#desktopChromeWinMin, #vfDesktopWinMin");
  const maxBtn = bar.querySelector("#desktopChromeWinMax, #vfDesktopWinMax");
  const closeBtn = bar.querySelector("#desktopChromeWinClose, #vfDesktopWinClose");
  if (!minBtn || !maxBtn || !closeBtn) return;
  bar.setAttribute("data-vf-chrome-wired", "1");

  const syncMaxUi = () => {
    const L = desktopShellWinChromeLabels();
    const m = maxBtn.classList.contains("is-maximized");
    const t = m ? L.restore : L.max;
    maxBtn.title = t;
    maxBtn.setAttribute("aria-label", t);
  };

  const pullMaxState = () => {
    ipcRenderer
      .invoke("desktop:window-is-maximized")
      .then((m) => {
        maxBtn.classList.toggle("is-maximized", Boolean(m));
        syncMaxUi();
      })
      .catch(() => {});
  };
  pullMaxState();

  ipcRenderer.on("desktop:window-maximized-changed", (_e, m) => {
    maxBtn.classList.toggle("is-maximized", Boolean(m));
    syncMaxUi();
  });

  minBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    void ipcRenderer.invoke("desktop:window-minimize");
  });
  maxBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    void ipcRenderer.invoke("desktop:window-maximize-toggle").then((m) => {
      maxBtn.classList.toggle("is-maximized", Boolean(m));
      syncMaxUi();
    });
  });
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    void ipcRenderer.invoke("desktop:window-close");
  });
}

function ensureDesktopSiteChromeTitlebar() {
  let bar = document.querySelector(".vf-desktop-titlebar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "vf-desktop-titlebar";
    bar.setAttribute("data-vf-preload", "1");
    const spacer = document.createElement("span");
    spacer.className = "vf-desktop-titlebar-spacer";
    const L = desktopShellWinChromeLabels();
    const controls = document.createElement("div");
    controls.className = "desktop-window-controls";
    controls.innerHTML =
      '<button type="button" id="vfDesktopWinMin" class="desktop-win-btn desktop-win-min" title="' +
      L.min +
      '" aria-label="' +
      L.min +
      '">&#8722;</button>' +
      '<button type="button" id="vfDesktopWinMax" class="desktop-win-btn desktop-win-max" title="' +
      L.max +
      '" aria-label="' +
      L.max +
      '"><span class="desktop-win-max-glyph" aria-hidden="true"></span></button>' +
      '<button type="button" id="vfDesktopWinClose" class="desktop-win-btn desktop-win-close" title="' +
      L.close +
      '" aria-label="' +
      L.close +
      '">&#215;</button>';
    const controlsEl = document.createElement("div");
    controlsEl.className = "desktop-window-controls";
    controlsEl.innerHTML = controls.innerHTML;
    bar.appendChild(spacer);
    bar.appendChild(controlsEl);
    const parent = document.body || document.documentElement;
    parent.insertBefore(bar, parent.firstChild);
  }
  bar.hidden = false;
  bar.removeAttribute("hidden");
  bar.setAttribute("aria-hidden", "false");
  return bar;
}

function injectDesktopSiteChrome() {
  if (isChatUiPath()) {
    stripDesktopSiteChromeFromChat();
    return;
  }
  if (!isDesktopSiteShellPage() || shouldSkipPreloadSiteChrome()) return;
  try {
    document.documentElement.classList.add("vf-desktop-site");
  } catch (_) {
    /* ignore */
  }
  injectDesktopSiteChromeStyles();
  wireDesktopSiteChromeButtons(ensureDesktopSiteChromeTitlebar());
}

function requestSiteChromeCss() {
  ipcRenderer
    .invoke("desktop:get-site-chrome-css")
    .then((css) => {
      desktopSiteChromeCssText = css || "";
      injectDesktopSiteChrome();
    })
    .catch(() => {});
}

function setupDesktopSiteChrome() {
  stripDesktopSiteChromeFromChat();
  if (!isDesktopSiteShellPage() || shouldSkipPreloadSiteChrome()) return;
  injectDesktopSiteChrome();
}

stripDesktopSiteChromeFromChat();
requestSiteChromeCss();
ipcRenderer.on("desktop:site-chrome-css", (_event, css) => {
  desktopSiteChromeCssText = css || "";
  injectDesktopSiteChrome();
});
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupDesktopSiteChrome, { once: true });
} else {
  setupDesktopSiteChrome();
}
window.addEventListener("load", setupDesktopSiteChrome, { once: true });

function injectDesktopLayoutFix(css) {
  stripDesktopSiteChromeFromChat();
  if (!css || !isChatUiPath()) return;
  try {
    let el = document.getElementById("vf-desktop-layout-fix");
    if (!el) {
      el = document.createElement("style");
      el.id = "vf-desktop-layout-fix";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
    document.documentElement.setAttribute("data-vf-layout", "preload");
  } catch (_) {
    /* ignore */
  }
}

function requestLayoutFix() {
  ipcRenderer
    .invoke("desktop:get-layout-css")
    .then((css) => {
      injectDesktopLayoutFix(css);
    })
    .catch(() => {});
}

requestLayoutFix();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", requestLayoutFix, { once: true });
} else {
  requestLayoutFix();
}
window.addEventListener("load", requestLayoutFix, { once: true });

function setupDesktopResizeHandles() {
  injectDesktopResizeHandles();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupDesktopResizeHandles, { once: true });
} else {
  setupDesktopResizeHandles();
}
window.addEventListener("load", setupDesktopResizeHandles, { once: true });

ipcRenderer.on("desktop:layout-css", (_event, css) => {
  injectDesktopLayoutFix(css);
});

ipcRenderer.on("stealth:state", (_event, state) => {
  try {
    const on = Boolean(state);
    document.documentElement.classList.toggle("vf-desktop-stealth", on);
    if (on && document.body) {
      document.body.style.background = "transparent";
    } else if (document.body) {
      document.body.style.removeProperty("background");
    }
  } catch (_) {
    /* ignore */
  }
});

contextBridge.exposeInMainWorld("voiceflowDesktop", {
  getStealthState: () => ipcRenderer.invoke("stealth:get-state"),
  toggleStealth: () => ipcRenderer.invoke("stealth:toggle"),
  setStealthMode: (enabled) => ipcRenderer.invoke("stealth:set", enabled),
  setStealthMousePassthrough: (passThrough) => ipcRenderer.invoke("stealth:set-mouse-passthrough", passThrough),
  disableStealth: () => ipcRenderer.invoke("stealth:disable"),
  openChatInBrowser: () => ipcRenderer.invoke("desktop:open-chat"),
  openExternal: (url) => ipcRenderer.invoke("desktop:open-external", url),
  openCabinet: (url) => ipcRenderer.invoke("desktop:open-cabinet", url),
  getChatUrl: () => ipcRenderer.invoke("desktop:get-chat-url"),
  getAppVersion: () => ipcRenderer.invoke("desktop:get-app-version"),
  getUpdateState: () => ipcRenderer.invoke("desktop:update-state"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:update-check"),
  downloadUpdate: () => ipcRenderer.invoke("desktop:update-download"),
  installUpdateNow: () => ipcRenderer.invoke("desktop:update-install"),
  reloadUi: () => ipcRenderer.invoke("desktop:reload-ui"),
  toggleDevTools: () => ipcRenderer.invoke("desktop:toggle-devtools"),
  /** Origin сервера чата (https://host) — для login.html с file:// и запросов к API */
  getChatOrigin: () => ipcRenderer.invoke("desktop:get-chat-origin"),
  navigateAfterLogin: (redirect) => ipcRenderer.invoke("desktop:navigate-after-login", redirect),
  /** Вход в ЛК с file:// (cookie в ту же session, что у окна; без CORS file→https). */
  authLogin: (payload) => ipcRenderer.invoke("desktop:auth-login", payload),
  /** Google OAuth во внешнем браузере (desktop). */
  startGoogleOAuth: (redirect) => ipcRenderer.invoke("desktop:google-oauth", { redirect }),
  windowMinimize: () => ipcRenderer.invoke("desktop:window-minimize"),
  windowClose: () => ipcRenderer.invoke("desktop:window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("desktop:window-is-maximized"),
  windowMaximizeToggle: () => ipcRenderer.invoke("desktop:window-maximize-toggle"),
  windowResizeStart: (edge) => ipcRenderer.invoke("desktop:window-resize-start", edge),
  windowResizeMove: (payload) => ipcRenderer.invoke("desktop:window-resize-move", payload),
  windowResizeEnd: () => ipcRenderer.invoke("desktop:window-resize-end"),
  onWindowMaximizedChanged: (cb) => {
    const handler = (_event, v) => cb(Boolean(v));
    ipcRenderer.on("desktop:window-maximized-changed", handler);
    return () => ipcRenderer.removeListener("desktop:window-maximized-changed", handler);
  },
  onStealthState: (cb) => {
    const handler = (_event, state) => cb(Boolean(state));
    ipcRenderer.on("stealth:state", handler);
    return () => ipcRenderer.removeListener("stealth:state", handler);
  },
  onUpdateState: (cb) => {
    const handler = (_event, state) => cb(state);
    ipcRenderer.on("desktop:update-state", handler);
    return () => ipcRenderer.removeListener("desktop:update-state", handler);
  },
  getAiRegionAnalysisEnabled: () => ipcRenderer.invoke("desktop:get-ai-region-enabled"),
  setAiRegionAnalysisEnabled: (enabled) => ipcRenderer.invoke("desktop:set-ai-region-enabled", enabled),
  startAiRegionSelect: () => ipcRenderer.invoke("desktop:start-ai-region-select"),
  onRegionCapture: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on("desktop:region-capture", handler);
    return () => ipcRenderer.removeListener("desktop:region-capture", handler);
  },
  regionInsight: (pngBase64, locale) => ipcRenderer.invoke("desktop:region-insight", { pngBase64, locale }),
  logoutToLogin: () => ipcRenderer.invoke("desktop:logout-to-login"),
});
