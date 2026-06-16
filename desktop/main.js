const path = require("path");
const fs = require("fs");
const http = require("http");
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  shell,
  desktopCapturer,
  screen,
  nativeImage,
  Menu,
  session,
  dialog,
} = require("electron");
const pkg = require("./package.json");
let autoUpdater = null;
try {
  // Optional runtime dependency for manual updates.
  ({ autoUpdater } = require("electron-updater"));
} catch {
  autoUpdater = null;
}

/** Без HTTP-кэша документов /ui в Electron (иначе правки CSS не видны без полного перезапуска). */
app.commandLine.appendSwitch("disable-http-cache");

const desktopUpdateState = {
  supported: false,
  status: "idle",
  message: "",
  version: pkg.version || "",
  availableVersion: "",
};

function setDesktopUpdateState(patch = {}) {
  Object.assign(desktopUpdateState, patch || {});
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("desktop:update-state", desktopUpdateState);
    }
  } catch (_) {
    /* ignore */
  }
}

let desktopUpdateCheckInFlight = false;
let desktopUpdateDownloadInFlight = false;
let desktopUpdateRetryTimer = null;

function desktopUpdaterPendingDir() {
  return path.join(
    process.env.LOCALAPPDATA || app.getPath("temp"),
    "voiceflow-desktop-updater",
    "pending"
  );
}

function cleanupDesktopUpdaterPending() {
  try {
    const pending = desktopUpdaterPendingDir();
    if (!fs.existsSync(pending)) return;
    for (const name of fs.readdirSync(pending)) {
      if (/^temp-/i.test(name)) {
        try {
          fs.unlinkSync(path.join(pending, name));
        } catch (_) {
          /* ignore locked temp files */
        }
      }
    }
  } catch (_) {
    /* ignore */
  }
}

function quitForDesktopUpdate() {
  if (!autoUpdater) return false;
  try {
    globalShortcut.unregisterAll();
  } catch (_) {
    /* ignore */
  }
  try {
    if (regionOverlayWindow && !regionOverlayWindow.isDestroyed()) regionOverlayWindow.destroy();
  } catch (_) {
    /* ignore */
  }
  try {
    if (cabinetWindow && !cabinetWindow.isDestroyed()) cabinetWindow.destroy();
  } catch (_) {
    /* ignore */
  }
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  } catch (_) {
    /* ignore */
  }
  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (e) {
      console.warn("[desktop] quitAndInstall:", e);
    }
  }, 500);
  return true;
}

function promptDesktopUpdateRestart(availableVersion) {
  if (!app.isPackaged || !autoUpdater) return;
  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const ver = String(availableVersion || desktopUpdateState.availableVersion || "").trim();
  const title = "TalkPilot — обновление";
  const message = ver ? `Доступна версия ${ver}` : "Доступно обновление TalkPilot";
  const detail =
    "Обновление загружено. Сейчас приложение закроется и установит новую версию. Не запускайте TalkPilot вручную до окончания установки.";
  void dialog
    .showMessageBox(parent, {
      type: "info",
      title,
      message,
      detail,
      buttons: ["Установить сейчас", "Позже"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })
    .then((result) => {
      if (result && result.response === 0) quitForDesktopUpdate();
    })
    .catch((e) => {
      console.warn("[desktop] update dialog:", e);
    });
}

async function checkDesktopUpdatesOnce() {
  if (!autoUpdater || desktopUpdateCheckInFlight) return desktopUpdateState;
  desktopUpdateCheckInFlight = true;
  try {
    cleanupDesktopUpdaterPending();
    await autoUpdater.checkForUpdates();
  } catch (err) {
    setDesktopUpdateState({
      status: "error",
      message: String(err && err.message ? err.message : err),
    });
  } finally {
    desktopUpdateCheckInFlight = false;
  }
  return desktopUpdateState;
}

async function downloadDesktopUpdateOnce() {
  if (!autoUpdater || desktopUpdateDownloadInFlight) return desktopUpdateState;
  desktopUpdateDownloadInFlight = true;
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    setDesktopUpdateState({ status: "error", message: msg });
    if (/EPERM|EBUSY|rename/i.test(msg)) {
      cleanupDesktopUpdaterPending();
      if (desktopUpdateRetryTimer) clearTimeout(desktopUpdateRetryTimer);
      desktopUpdateRetryTimer = setTimeout(() => {
        desktopUpdateRetryTimer = null;
        void downloadDesktopUpdateOnce();
      }, 10000);
    }
  } finally {
    desktopUpdateDownloadInFlight = false;
  }
  return desktopUpdateState;
}

function configureManualUpdater() {
  if (!app.isPackaged) {
    setDesktopUpdateState({
      supported: false,
      status: "dev",
      message: "Auto-update is disabled in development",
      version: pkg.version || "",
    });
    return;
  }
  if (!autoUpdater) {
    setDesktopUpdateState({
      supported: false,
      status: "unavailable",
      message: "electron-updater is not installed",
    });
    return;
  }
  const feed = String(
    process.env.VOICE_TRANSLATOR_DESKTOP_UPDATE_URL || "https://talkpilot.pro/downloads"
  ).trim();
  /** Одна загрузка за раз — параллельные check/download давали EPERM rename в pending. */
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = null;
  autoUpdater.setFeedURL({ provider: "generic", url: feed });
  setDesktopUpdateState({
    supported: true,
    status: "ready",
    message: `Auto-update is enabled (${feed})`,
  });

  autoUpdater.on("checking-for-update", () => {
    setDesktopUpdateState({ status: "checking", message: "Checking for updates..." });
  });
  autoUpdater.on("update-available", (info) => {
    setDesktopUpdateState({
      status: "available",
      message: "Update available",
      availableVersion: String(info && info.version ? info.version : ""),
    });
    void downloadDesktopUpdateOnce();
  });
  autoUpdater.on("update-not-available", () => {
    setDesktopUpdateState({
      status: "latest",
      message: "You already have the latest version",
      availableVersion: "",
    });
  });
  autoUpdater.on("error", (err) => {
    setDesktopUpdateState({
      status: "error",
      message: String(err && err.message ? err.message : err),
    });
  });
  autoUpdater.on("download-progress", (p) => {
    const percent = Number(p && p.percent ? p.percent : 0).toFixed(1);
    setDesktopUpdateState({
      status: "downloading",
      message: `Downloading update ${percent}%`,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    const availableVersion = String(
      info && info.version ? info.version : desktopUpdateState.availableVersion
    );
    setDesktopUpdateState({
      status: "downloaded",
      message: "Update downloaded. Restart to install.",
      availableVersion,
    });
    promptDesktopUpdateRestart(availableVersion);
  });

  setTimeout(() => {
    void checkDesktopUpdatesOnce();
  }, 5000);

  setInterval(() => {
    void checkDesktopUpdatesOnce();
  }, 30 * 60 * 1000);
}

/** Подхватываем AITUNNEL_* из .env в корне репозитория (desktop/..) — без отдельного пакета dotenv. */
function loadParentEnv() {
  const candidates = [path.join(__dirname, "..", ".env"), path.join(__dirname, ".env")];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, "utf8");
      for (let line of text.split(/\r?\n/)) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 1) continue;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (k && process.env[k] === undefined) process.env[k] = v;
      }
      break;
    } catch (e) {
      console.warn("[desktop] loadParentEnv", p, e.message);
    }
  }
}
loadParentEnv();

const ELECTRON_MEDIA_PERMISSIONS = new Set([
  "media",
  "microphone",
  "camera",
  "audioCapture",
  "videoCapture",
]);

function allowElectronMediaPermission(permission) {
  return ELECTRON_MEDIA_PERMISSIONS.has(String(permission || ""));
}

function wireElectronMediaPermissions(sess) {
  if (!sess) return;
  try {
    sess.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(allowElectronMediaPermission(permission));
    });
    sess.setPermissionCheckHandler((_webContents, permission) =>
      allowElectronMediaPermission(permission)
    );
  } catch (e) {
    console.warn("[desktop] media permissions:", e.message || e);
  }
}

/** Только app.js — translations/conference-setup грузятся с talkpilot.pro как в index.html. */
const DESKTOP_UI_OVERRIDE_NAMES = ["app.js"];

/** Путь к frontend/*.js: dev — репозиторий; portable — extraResources/frontend. */
function resolveDesktopUiOverridePath(filename) {
  const base = path.basename(String(filename || ""));
  if (!DESKTOP_UI_OVERRIDE_NAMES.includes(base)) return null;
  const candidates = [];
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "frontend", base));
  }
  candidates.push(path.join(__dirname, "..", "frontend", base));
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (_) {
      /* ignore */
    }
  }
  return null;
}

/** Dev: блокируем удалённый app.js (подмена в ensureDesktopLocalAppJsLoaded). Packaged: грузим с сервера. */
function installDesktopLocalUiOverrides(sess) {
  if (!sess || !sess.webRequest) return;
  if (app.isPackaged) return;
  let origin;
  try {
    origin = chatOrigin();
  } catch {
    return;
  }
  const filter = { urls: [`${origin}/ui/*`] };
  sess.webRequest.onBeforeRequest(filter, (details, callback) => {
    try {
      if (details.resourceType && details.resourceType !== "script") {
        callback({});
        return;
      }
      const u = new URL(details.url);
      const base = path.basename(u.pathname).split("?")[0];
      if (DESKTOP_UI_OVERRIDE_NAMES.includes(base) && resolveDesktopUiOverridePath(base)) {
        callback({ cancel: true });
        return;
      }
    } catch (e) {
      console.warn("[desktop] ui cancel:", e.message || e);
    }
    callback({});
  });
  console.log("[desktop] Block remote app.js, inject local after load:", origin);
}

async function ensureDesktopLocalAppJsLoaded(wc) {
  if (!wc || wc.isDestroyed()) return;
  let url = "";
  try {
    url = wc.getURL() || "";
  } catch {
    return;
  }
  if (!isChatUiUrl(url)) return;
  const REQUIRED_BUILD_MARK = "audiodev";
  try {
    let build = await wc.executeJavaScript("String(window.__VF_UI_BUILD||'')", true);
    if (build && build.includes(REQUIRED_BUILD_MARK)) return;

    let code = null;
    try {
      const remote = await fetchRemoteUiScriptText("app.js");
      if (remote && remote.includes(REQUIRED_BUILD_MARK)) code = remote;
    } catch (e) {
      console.warn("[desktop] remote app.js fetch:", e.message || e);
    }

    if (!code && !app.isPackaged) {
      code = readDesktopLocalUiScript("app.js");
    }
    if (!code) {
      console.warn("[desktop] app.js not loaded (remote/local missing)");
      return;
    }
    await wc.executeJavaScript(code, true);
    build = await wc.executeJavaScript("String(window.__VF_UI_BUILD||'')", true);
    if (build && build.length >= 8) {
      console.log("[desktop] app.js loaded, build=" + build);
    } else {
      console.warn("[desktop] app.js ran but __VF_UI_BUILD missing");
    }
  } catch (e) {
    console.warn("[desktop] app.js inject:", e.message || e);
  }
}

function readDesktopLocalUiScript(name) {
  const fp = resolveDesktopUiOverridePath(String(name || ""));
  if (!fp) return null;
  try {
    return fs.readFileSync(fp, "utf8");
  } catch (e) {
    console.warn("[desktop] read local ui script:", name, e.message || e);
    return null;
  }
}

function wireDesktopPersistentSession() {
  const part = "persist:voiceflow-translator-desktop-v1";
  const desktopSess = session.fromPartition(part);
  wireElectronMediaPermissions(desktopSess);
  installDesktopLocalUiOverrides(desktopSess);
  return desktopSess;
}

/** URL/path экрана переводчика (/ui, /ui/, /ui?…). */
function isChatUiUrl(urlStr) {
  try {
    let p = new URL(String(urlStr || "")).pathname || "/";
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "/ui" || p.startsWith("/ui/");
  } catch {
    const m = String(urlStr || "").match(/^(?:https?:\/\/[^/]+)?(\/[^?#]*)/i);
    let p = (m && m[1]) || "/";
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "/ui" || p.startsWith("/ui/");
  }
}

/** Иконка приложения (логотип Voice Translator) — панель задач и заголовок. */
let cachedAppIcon = null;
function getAppIcon() {
  if (cachedAppIcon) return cachedAppIcon;
  const tryPaths = [
    path.join(__dirname, "icons", "icon.png"),
    path.join(__dirname, "icons", "icon.ico"),
    path.join(__dirname, "favicon.svg"),
  ];
  for (const p of tryPaths) {
    try {
      if (!fs.existsSync(p)) continue;
      const img = nativeImage.createFromPath(p);
      if (img && !img.isEmpty()) {
        cachedAppIcon = img;
        return img;
      }
    } catch (e) {
      console.warn("[desktop] getAppIcon", p, e.message || e);
    }
  }
  return null;
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.voiceflow.desktop");
}

/**
 * Vision через OpenAI-совместимый AITunnel (обходит 404, если Python-сервер без нового маршрута).
 */
/** Vision через API TalkPilot (ключ AITunnel на сервере, без .env у пользователя). */
async function serverDesktopRegionInsight(pngBase64, locale) {
  const ses =
    mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents
      ? mainWindow.webContents.session
      : session.defaultSession;
  const url = new URL("/api/desktop/region-insight", chatOrigin()).href;
  const r = await desktopSessionFetch(ses, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_png_base64: pngBase64,
      locale: locale != null ? String(locale) : "ru",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const det = j.detail != null ? j.detail : j.message || j.error;
    const msg =
      typeof det === "string" ? det : det && det.message ? String(det.message) : JSON.stringify(det || {});
    throw new Error(msg || r.statusText || `HTTP ${r.status}`);
  }
  return String((j && j.hints) || "").trim();
}

async function aitunnelDesktopRegionInsight(pngBase64, locale) {
  const key = (process.env.AITUNNEL_API_KEY || "").trim();
  const base = (process.env.AITUNNEL_BASE_URL || "https://api.aitunnel.ru/v1").replace(/\/$/, "");
  if (!key || key.startsWith("ваш_")) {
    throw new Error(
      "Нет AITUNNEL_API_KEY в .env (корень проекта). Добавьте ключ AITunnel — тот же, что для Pro STT."
    );
  }
  const primary = (process.env.DESKTOP_REGION_VISION_MODEL || "gpt-4o-mini").trim();
  const fallbacks = [primary, "gpt-4o", "gpt-4-turbo"].filter((m, i, a) => m && a.indexOf(m) === i);
  const loc = String(locale || "ru").toLowerCase();
  const promptRu =
    "На изображении — выделенная пользователем область экрана (режим переводчика поверх других окон). " +
    "Кратко по-русски: что за контент, зачем это может быть важно в разговоре или работе, дай 3–6 коротких подсказок " +
    "(как ответить, на что обратить внимание, риски). Только маркированный список, без вступлений.";
  const promptEn =
    "The image is a user-selected screen region (translator overlay mode). Briefly: what the content likely is, " +
    "why it matters in a conversation or work, 3–6 short hints (how to respond, what to watch for). Bullet list only, no preamble.";
  const prompt = loc.startsWith("ru") ? promptRu : promptEn;
  let lastErr = "Vision недоступен";
  for (const model of fallbacks) {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/png;base64,${pngBase64}` } },
            ],
          },
        ],
        max_tokens: 700,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = j.choices?.[0]?.message?.content;
      return String(text || "").trim();
    }
    lastErr = j.error?.message || (typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail || {})) || r.statusText || `HTTP ${r.status}`;
    if (r.status === 404 && fallbacks.indexOf(model) < fallbacks.length - 1) continue;
    throw new Error(lastErr);
  }
  throw new Error(lastErr);
}

let mainWindow = null;
let cabinetWindow = null;
const DESKTOP_WIN_MIN_WIDTH = 820;
const DESKTOP_WIN_MIN_HEIGHT = 640;
/** @type {{ edge: string, startBounds: Electron.Rectangle } | null} */
let desktopResizeSession = null;
let stealthMode = false;
let aiRegionAnalysisEnabled = false;
let regionOverlayWindow = null;
/** Глобальный хук: отпускание левого Ctrl без комбинации запускает выделение области. */
let suppressRegionHookUntil = 0;
let uiohookLeftCtrlHookOk = false;
/** Свернуть из UI: не откатывать minimize в режиме stealth (иначе окно сразу восстанавливается). */
let bypassStealthMinimizeRestore = false;

function getVirtualScreenBounds() {
  const displays = screen.getAllDisplays();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of displays) {
    const b = d.bounds;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 1920, height: 1080 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

async function captureScreenRectToPng(rectScreen) {
  const cx = Math.floor(rectScreen.x + rectScreen.width / 2);
  const cy = Math.floor(rectScreen.y + rectScreen.height / 2);
  const disp = screen.getDisplayNearestPoint({ x: cx, y: cy });
  const b = disp.bounds;
  const scale = disp.scaleFactor || 1;
  const tw = Math.max(320, Math.min(4096, Math.floor(b.width * scale)));
  const th = Math.max(240, Math.min(4096, Math.floor(b.height * scale)));
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: tw, height: th },
  });
  const wantId = String(disp.id);
  let src = sources.find((s) => String(s.display_id) === wantId);
  if (!src) src = sources[0];
  if (!src?.thumbnail) throw new Error("Нет снимка экрана (desktopCapturer)");
  const thumb = src.thumbnail;
  const iw = thumb.getSize().width;
  const ih = thumb.getSize().height;
  const relX = rectScreen.x - b.x;
  const relY = rectScreen.y - b.y;
  const scaleX = iw / b.width;
  const scaleY = ih / b.height;
  let cropX = Math.round(relX * scaleX);
  let cropY = Math.round(relY * scaleY);
  let cropW = Math.round(rectScreen.width * scaleX);
  let cropH = Math.round(rectScreen.height * scaleY);
  cropX = Math.max(0, Math.min(cropX, iw - 1));
  cropY = Math.max(0, Math.min(cropY, ih - 1));
  cropW = Math.max(1, Math.min(cropW, iw - cropX));
  cropH = Math.max(1, Math.min(cropH, ih - cropY));
  let cropped = thumb.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
  const maxLong = 1280;
  const sz = cropped.getSize();
  if (Math.max(sz.width, sz.height) > maxLong) {
    const ratio = maxLong / Math.max(sz.width, sz.height);
    cropped = cropped.resize({
      width: Math.max(1, Math.floor(sz.width * ratio)),
      height: Math.max(1, Math.floor(sz.height * ratio)),
    });
  }
  return cropped.toPNG();
}

function refreshAiRegionShortcut() {
  try {
    globalShortcut.unregister("CommandOrControl+Shift+S");
  } catch (e) {
    /* ignore */
  }
  if (uiohookLeftCtrlHookOk) return;
  if (aiRegionAnalysisEnabled && stealthMode) {
    try {
      const ok = globalShortcut.register("CommandOrControl+Shift+S", () => {
        void startAiRegionSelectFlow().catch((err) => console.error("[desktop] region select", err));
      });
      if (!ok) console.warn("[desktop] Ctrl+Shift+S shortcut not registered");
    } catch (e) {
      console.warn("[desktop] shortcut register", e);
    }
  }
}

function setupAiRegionLeftCtrlGlobalHook() {
  let uIOhook;
  let UiohookKey;
  try {
    ({ uIOhook, UiohookKey } = require("uiohook-napi"));
  } catch (e) {
    console.warn("[desktop] uiohook-napi недоступен — для выделения области используйте Ctrl+Shift+S", e.message);
    return false;
  }
  const isModifierOnly = (code) =>
    code === UiohookKey.Ctrl ||
    code === UiohookKey.CtrlRight ||
    code === UiohookKey.Shift ||
    code === UiohookKey.ShiftRight ||
    code === UiohookKey.Alt ||
    code === UiohookKey.AltRight ||
    code === UiohookKey.Meta ||
    code === UiohookKey.MetaRight ||
    code === UiohookKey.CapsLock;

  let leftCtrlHeld = false;
  let ctrlChord = false;

  uIOhook.on("keydown", (e) => {
    if (e.keycode === UiohookKey.Ctrl) {
      if (!leftCtrlHeld) ctrlChord = false;
      leftCtrlHeld = true;
      return;
    }
    if (leftCtrlHeld && !isModifierOnly(e.keycode)) {
      ctrlChord = true;
    }
  });

  uIOhook.on("keyup", (e) => {
    if (e.keycode !== UiohookKey.Ctrl) return;
    const wasHeld = leftCtrlHeld;
    leftCtrlHeld = false;
    if (!wasHeld) return;
    if (Date.now() < suppressRegionHookUntil) return;
    if (!stealthMode || !aiRegionAnalysisEnabled) return;
    if (ctrlChord) {
      ctrlChord = false;
      return;
    }
    ctrlChord = false;
    void startAiRegionSelectFlow().catch((err) => console.error("[desktop] region select", err));
  });

  try {
    uIOhook.start();
  } catch (e) {
    console.warn("[desktop] uIOhook.start", e.message);
    return false;
  }

  app.on("will-quit", () => {
    try {
      uIOhook.stop();
    } catch (err) {
      /* ignore */
    }
  });
  return true;
}

async function startAiRegionSelectFlow() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: "no_window" };
    if (!stealthMode || !aiRegionAnalysisEnabled) return { ok: false, error: "disabled" };
    if (regionOverlayWindow && !regionOverlayWindow.isDestroyed()) return { ok: false, error: "busy" };

    const vb = getVirtualScreenBounds();
  let settled = false;
  let doneHandler = null;
  let ov = null;

  const payload = await new Promise((resolve) => {
    const finish = (p) => {
      if (settled) return;
      settled = true;
      if (typeof doneHandler === "function") ipcMain.removeListener("region-select-completed", doneHandler);
      if (ov && !ov.isDestroyed()) {
        try {
          ov.removeAllListeners("closed");
          ov.close();
        } catch (e) {
          /* ignore */
        }
      }
      regionOverlayWindow = null;
      resolve(p ?? { cancel: true });
    };

    doneHandler = (_event, pl) => finish(pl);
    ipcMain.on("region-select-completed", doneHandler);

    mainWindow.hide();

    ov = regionOverlayWindow = new BrowserWindow({
      x: vb.x,
      y: vb.y,
      width: vb.width,
      height: vb.height,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      show: false,
      focusable: true,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: path.join(__dirname, "region-select-preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    try {
      ov.setAlwaysOnTop(true, "pop-up-menu");
    } catch (e) {
      console.warn("[desktop] overlay alwaysOnTop", e);
    }

    ov.once("closed", () => finish({ cancel: true }));

    ov.loadFile(path.join(__dirname, "region-select.html"));
    ov.once("ready-to-show", () => {
      if (ov && !ov.isDestroyed()) ov.show();
    });
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }

  if (payload?.cancel || !payload?.rect) {
    return { ok: false, cancel: true };
  }

  let pngBuf;
  try {
    pngBuf = await captureScreenRectToPng(payload.rect);
  } catch (e) {
    console.error("[desktop] captureScreenRectToPng", e);
    return { ok: false, error: String(e.message || e) };
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop:region-capture", {
      pngBase64: pngBuf.toString("base64"),
      screenRect: payload.rect,
    });
  }
  return { ok: true };
  } finally {
    suppressRegionHookUntil = Date.now() + 1600;
  }
}

function applyAlwaysOnTopForStealth() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!stealthMode) {
    mainWindow.setAlwaysOnTop(false);
    return;
  }
  try {
    if (process.platform === "darwin") {
      mainWindow.setAlwaysOnTop(true, "floating");
    } else {
      // Windows/Linux: держим окно поверх остальных; «screen-saver» на Windows ранее давал сбои.
      mainWindow.setAlwaysOnTop(true, "pop-up-menu");
    }
  } catch (e) {
    console.warn("[desktop] setAlwaysOnTop stealth:", e);
    try {
      mainWindow.setAlwaysOnTop(true);
    } catch (e2) {
      console.warn("[desktop] setAlwaysOnTop stealth fallback:", e2);
    }
  }
}

/** Полный URL веб-чата. Для Google OAuth с прод-клиентом Google задайте VOICE_TRANSLATOR_CHAT_URL на TalkPilot (см. docs/GOOGLE_OAUTH.md). */
function chatUrl() {
  return (
    process.env.VOICE_TRANSLATOR_CHAT_URL ||
    process.env.ELECTRON_START_URL ||
    "https://talkpilot.pro/ui"
  ).trim();
}

function chatOrigin() {
  try {
    return new URL(chatUrl()).origin;
  } catch {
    return "http://localhost:8000";
  }
}

/** Локальная копия login.html внутри приложения (не зависит от деплоя на сервер). */
function loginPageDiskPath() {
  const rel = path.join("public", "login.html");
  if (app.isPackaged) {
    return path.join(process.resourcesPath, rel);
  }
  return path.join(__dirname, "..", "public", "login.html");
}

/**
 * Режим «не виден при демонстрации экрана»:
 * - setContentProtection: окно исключается из захвата во многих приложениях (Zoom/Teams и т.д., зависит от ОС).
 * - прозрачный фон окна + полупрозрачные панели (класс vf-desktop-stealth). Клики в «пустых» местах проходят к приложению под окном; над кнопками, чатом и полями — окно принимает клики (синхронизация по движению мыши).
 * - в режиме скрытия окно закреплено поверх других программ (always-on-top; на Windows — уровень pop-up-menu, без screen-saver).
 * - окно остаётся развёрнутым (см. обработчик minimize при stealth).
 * Выключение: снова переключите в приложении или Ctrl+Shift+X (когда фокус в системе).
 */
/** Windows/Linux: для «скрыть окно» нужен BrowserWindow с transparent:true; иначе setBackgroundColor(#00000000) не даёт сквозной фон. */
const DESKTOP_WIN_NATIVE_TRANSPARENT =
  process.platform === "win32" || process.platform === "linux";

function applyStealthState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (stealthMode) {
    try {
      mainWindow.setContentProtection(true);
    } catch (e) {
      console.warn("[desktop] setContentProtection:", e);
    }
    mainWindow.setOpacity(1);
    try {
      mainWindow.setBackgroundColor("#00000000");
    } catch (e) {
      console.warn("[desktop] setBackgroundColor stealth:", e);
    }
    if (DESKTOP_WIN_NATIVE_TRANSPARENT) {
      try {
        mainWindow.setHasShadow(false);
      } catch (e) {
        console.warn("[desktop] setHasShadow stealth:", e);
      }
    }
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    applyAlwaysOnTopForStealth();
    try {
      mainWindow.setMinimizable(false);
    } catch (e) {
      console.warn("[desktop] setMinimizable:", e);
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
  } else {
    mainWindow.setIgnoreMouseEvents(false);
    applyAlwaysOnTopForStealth();
    mainWindow.setOpacity(1);
    try {
      mainWindow.setBackgroundColor(DESKTOP_WIN_NATIVE_TRANSPARENT ? "#ff0a0e1a" : "#0a0e1a");
    } catch (e) {
      mainWindow.setBackgroundColor("#0a0e1a");
    }
    if (DESKTOP_WIN_NATIVE_TRANSPARENT) {
      try {
        mainWindow.setHasShadow(true);
      } catch (e) {
        console.warn("[desktop] setHasShadow normal:", e);
      }
    }
    try {
      mainWindow.setContentProtection(false);
    } catch (e) {
      console.warn("[desktop] setContentProtection off:", e);
    }
    try {
      mainWindow.setMinimizable(true);
    } catch (e) {
      console.warn("[desktop] setMinimizable off:", e);
    }
  }
  refreshAiRegionShortcut();
  mainWindow.webContents.send("stealth:state", stealthMode);
}

let desktopOAuthInFlight = false;

const DESKTOP_SESSION_COOKIE = "vf_desktop_session";
const WEB_SESSION_COOKIE = "user_id";
const DESKTOP_CLIENT_HEADER = "X-VoiceFlow-Client";
const DESKTOP_FETCH_HEADERS = { [DESKTOP_CLIENT_HEADER]: "desktop" };

function desktopSessionFetch(ses, url, init = {}) {
  const headers = { ...DESKTOP_FETCH_HEADERS, ...(init.headers || {}) };
  return ses.fetch(url, { ...init, headers });
}

async function clearElectronAuthCookies(ses) {
  const origin = chatOrigin();
  const u = new URL(origin);
  const cookieUrl = `${u.protocol}//${u.host}/`;
  for (const name of [DESKTOP_SESSION_COOKIE, WEB_SESSION_COOKIE]) {
    try {
      await ses.cookies.remove(cookieUrl, name);
    } catch (_) {
      /* ignore */
    }
  }
}

async function setElectronAuthCookie(ses, userId) {
  const origin = chatOrigin();
  const u = new URL(origin);
  const cookieUrl = `${u.protocol}//${u.host}/`;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  await ses.cookies.set({
    url: cookieUrl,
    name: DESKTOP_SESSION_COOKIE,
    value: String(userId),
    httpOnly: true,
    secure: u.protocol === "https:",
    sameSite: "lax",
    expirationDate: exp,
    path: "/",
  });
  try {
    await ses.cookies.remove(cookieUrl, WEB_SESSION_COOKIE);
  } catch (_) {
    /* ignore */
  }
}

function readRedirectFromWebContents(wc) {
  let redirect = "/ui";
  try {
    const cur = new URL(wc.getURL());
    const fromQuery = (cur.searchParams.get("redirect") || "").trim();
    if (fromQuery && fromQuery.startsWith("/") && !fromQuery.startsWith("//")) {
      redirect = fromQuery.split("#")[0];
    }
  } catch {
    /* ignore */
  }
  return redirect;
}

async function navigateDesktopAfterLogin(redirectAfter) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const origin = chatOrigin();
  let target = chatLoadUrl();
  try {
    const r = String(redirectAfter || "/ui").trim() || "/ui";
    const pathOnly = r.startsWith("/") ? r : "/ui";
    const u = new URL(pathOnly, origin);
    u.searchParams.set("vf_desktop", String(pkg.version || "1"));
    target = u.href;
  } catch {
    target = chatLoadUrl();
  }
  const ua = `${mainWindow.webContents.getUserAgent() || ""} VoiceTranslatorDesktop/1.0.1`;
  await mainWindow.loadURL(target, { userAgent: ua });
  await applyDesktopResponsiveUi(mainWindow.webContents);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  try {
    app.focus({ steal: true });
  } catch {
    /* ignore */
  }
}

const DESKTOP_OAUTH_SUCCESS_HTML = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>VoiceFlow</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0e1a;color:#e8ecf4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{max-width:420px}h1{font-size:1.25rem;margin:0 0 12px}p{opacity:.85;line-height:1.5;margin:0}</style></head>
<body><div class="box"><h1>Вход выполнен</h1><p>Закройте эту вкладку — приложение VoiceFlow на рабочем столе откроет чат автоматически.</p></div></body></html>`;

const DESKTOP_OAUTH_ERROR_HTML = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>VoiceFlow</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0e1a;color:#e8ecf4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{max-width:420px}h1{font-size:1.25rem;margin:0 0 12px;color:#f87171}p{opacity:.85;line-height:1.5;margin:0}</style></head>
<body><div class="box"><h1>Не удалось войти</h1><p>Вернитесь в приложение VoiceFlow и попробуйте снова.</p></div></body></html>`;

/** Проверить сессию на сервере и записать vf_desktop_session для главного окна. */
async function syncDesktopAuthFromRemoteSession(ses) {
  const origin = String(chatOrigin() || "")
    .trim()
    .replace(/\/$/, "");
  if (!origin) return null;
  try {
    const meResp = await desktopSessionFetch(ses, `${origin}/api/auth/me`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!meResp.ok) return null;
    const d = await meResp.json().catch(() => null);
    const rid = d && d.id != null ? String(d.id).trim() : "";
    if (!d || isDesktopAnonymousUserId(rid)) return null;
    await setElectronAuthCookie(ses, rid);
    return rid;
  } catch {
    return null;
  }
}

/**
 * Google OAuth во встроенном окне Electron (та же cookie-session, что у чата).
 * Если сервер после Google отдал веб-редирект на /ui — подхватываем сессию здесь, без внешнего Chrome.
 */
function startDesktopOAuthBrowser(googleUrl, { origin, redirectClean }) {
  let oauthWin = null;
  let pollIv = null;
  let timer = null;
  let settled = false;

  const close = () => {
    try {
      if (oauthWin && !oauthWin.isDestroyed()) {
        oauthWin.removeAllListeners("closed");
        oauthWin.close();
      }
    } catch (_) {
      /* ignore */
    }
    oauthWin = null;
  };

  const cleanup = () => {
    if (pollIv) {
      clearInterval(pollIv);
      pollIv = null;
    }
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const promise = new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      reject(new Error("no_window"));
      return;
    }
    const ses = mainWindow.webContents.session;
    const redPath = (redirectClean || "/ui").split("?")[0].split("#")[0] || "/ui";

    const finishWeb = async () => {
      if (settled) return;
      const uid = await syncDesktopAuthFromRemoteSession(ses);
      if (!uid) return;
      settled = true;
      cleanup();
      close();
      resolve({ kind: "web", user_id: uid });
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      close();
      reject(err);
    };

    const checkNavigation = (rawUrl) => {
      if (settled || !rawUrl) return;
      try {
        const u = new URL(rawUrl);
        if (u.origin !== origin) return;
        const p = u.pathname || "/";
        if (
          p === "/ui" ||
          p.startsWith("/ui/") ||
          p === "/dashboard" ||
          p.startsWith("/dashboard/") ||
          p === redPath ||
          p.startsWith(`${redPath}/`)
        ) {
          void finishWeb();
        }
      } catch (_) {
        /* ignore */
      }
    };

    pollIv = setInterval(() => {
      void finishWeb();
    }, 1500);

    timer = setTimeout(() => fail(new Error("oauth_timeout")), 300000);

    const icon = getAppIcon();
    oauthWin = new BrowserWindow({
      parent: mainWindow,
      modal: false,
      width: 520,
      height: 740,
      minWidth: 400,
      minHeight: 500,
      frame: true,
      closable: true,
      minimizable: false,
      maximizable: false,
      transparent: false,
      title: "Вход через Google — TalkPilot",
      show: false,
      autoHideMenuBar: true,
      backgroundColor: "#f8fafc",
      ...(icon ? { icon } : {}),
      webPreferences: {
        partition: "persist:voiceflow-translator-desktop-v1",
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    oauthWin.once("ready-to-show", () => {
      if (oauthWin && !oauthWin.isDestroyed()) oauthWin.show();
    });
    oauthWin.on("closed", () => {
      if (!settled) fail(new Error("oauth_window_closed"));
    });

    const wc = oauthWin.webContents;
    const ua = desktopShellUserAgent(mainWindow);
    try {
      wc.setUserAgent(ua);
    } catch (_) {
      /* ignore */
    }
    wc.on("will-redirect", (_e, url) => checkNavigation(url));
    wc.on("will-navigate", (_e, url) => checkNavigation(url));
    wc.on("did-navigate", (_e, url) => checkNavigation(url));
    wc.on("before-input-event", (event, input) => {
      if (input && input.type === "keyDown" && input.key === "Escape") {
        event.preventDefault();
        try {
          if (oauthWin && !oauthWin.isDestroyed()) oauthWin.close();
        } catch (_) {
          /* ignore */
        }
      }
    });

    void wc.loadURL(googleUrl, { userAgent: ua }).catch((e) => fail(e));
  });

  return { promise, close, cleanupTimers: cleanup };
}

function runDesktopGoogleOAuth(redirectAfter) {
  return new Promise(async (resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      reject(new Error("no_window"));
      return;
    }
    if (desktopOAuthInFlight) {
      reject(new Error("oauth_in_progress"));
      return;
    }
    desktopOAuthInFlight = true;
    const origin = String(chatOrigin() || "")
      .trim()
      .replace(/\/$/, "");
    const rawRedirect = String(redirectAfter || "/ui").trim() || "/ui";
    const ses = mainWindow.webContents.session;

    let server = null;
    const cleanup = () => {
      if (server) {
        try {
          server.close();
        } catch (_) {
          /* ignore */
        }
        server = null;
      }
    };

    try {
      const port = await new Promise((res, rej) => {
        server = http.createServer();
        server.on("error", rej);
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          if (!addr || typeof addr !== "object" || !addr.port) {
            rej(new Error("loopback_bind_failed"));
            return;
          }
          res(addr.port);
        });
      });

      let loopbackWaitActive = true;
      let loopbackTimeoutId = null;

      const tokenPromise = new Promise((res, rej) => {
        loopbackTimeoutId = setTimeout(() => {
          if (!loopbackWaitActive) return;
          cleanup();
          rej(new Error("oauth_timeout"));
        }, 300000);

        server.on("request", (req, resHttp) => {
          try {
            const u = new URL(req.url || "/", `http://127.0.0.1:${port}`);
            if (u.pathname !== "/callback") {
              resHttp.writeHead(404);
              resHttp.end();
              return;
            }
            if (loopbackTimeoutId) {
              clearTimeout(loopbackTimeoutId);
              loopbackTimeoutId = null;
            }
            const err = u.searchParams.get("error");
            const token = u.searchParams.get("token") || "";
            resHttp.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            if (err || !token) {
              resHttp.end(DESKTOP_OAUTH_ERROR_HTML);
              cleanup();
              rej(new Error(err || "no_token"));
              return;
            }
            resHttp.end(DESKTOP_OAUTH_SUCCESS_HTML);
            cleanup();
            res(token);
          } catch (e) {
            if (loopbackTimeoutId) {
              clearTimeout(loopbackTimeoutId);
              loopbackTimeoutId = null;
            }
            cleanup();
            rej(e);
          }
        });
      });

      const redirectClean = rawRedirect.split("#")[0].split("?")[0] || "/ui";
      const redirectForGoogleState = `${redirectClean}?vf_desktop_oauth=1&vf_desktop_port=${port}`;
      const startUrl =
        `${origin}/api/auth/google?redirect=${encodeURIComponent(redirectForGoogleState)}&desktop=1&desktop_port=${port}`;
      const startResp = await desktopSessionFetch(ses, startUrl, { method: "GET", cache: "no-store" });
      if (!startResp.ok) {
        cleanup();
        reject(new Error(`google_start_${startResp.status}`));
        return;
      }
      const data = await startResp.json().catch(() => ({}));
      if (!data || !data.url) {
        cleanup();
        reject(new Error("google_start_no_url"));
        return;
      }

      const oauthBrowser = startDesktopOAuthBrowser(data.url, { origin, redirectClean });

      let winner;
      try {
        winner = await Promise.race([
          tokenPromise.then((token) => ({ kind: "loopback", token })),
          oauthBrowser.promise,
        ]);
      } finally {
        loopbackWaitActive = false;
        if (loopbackTimeoutId) {
          clearTimeout(loopbackTimeoutId);
          loopbackTimeoutId = null;
        }
        oauthBrowser.close();
        oauthBrowser.cleanupTimers();
      }

      let finalUserId = null;
      if (winner.kind === "loopback") {
        const oauthToken = winner.token;
        const completeResp = await desktopSessionFetch(ses, `${origin}/api/auth/desktop-oauth-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: oauthToken }),
          credentials: "include",
        });
        const completeBody = await completeResp.json().catch(() => ({}));
        if (!completeResp.ok) {
          reject(new Error(`complete_${completeResp.status}`));
          return;
        }
        finalUserId = completeBody && completeBody.user_id != null ? completeBody.user_id : null;
        if (finalUserId == null) {
          reject(new Error("complete_no_user_id"));
          return;
        }
        await setElectronAuthCookie(ses, finalUserId);
      } else {
        finalUserId = winner.user_id;
        await setElectronAuthCookie(ses, finalUserId);
      }

      const meResp = await desktopSessionFetch(ses, `${origin}/api/auth/me`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      if (!meResp.ok) {
        reject(new Error("session_verify_failed"));
        return;
      }
      await navigateDesktopAfterLogin(redirectClean);
      resolve({ ok: true, redirect: redirectClean, navigated: true, user_id: finalUserId });
    } catch (e) {
      cleanup();
      reject(e);
    } finally {
      desktopOAuthInFlight = false;
    }
  });
}

function browserWindowFromIpc(event) {
  try {
    if (event && event.sender) {
      const w = BrowserWindow.fromWebContents(event.sender);
      if (w && !w.isDestroyed()) return w;
    }
  } catch (_) {
    /* ignore */
  }
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return null;
}

function isDesktopSiteShellPath(pathname) {
  const p = String(pathname || "").replace(/\/$/, "") || "/";
  if (p === "/ui" || p.startsWith("/ui/")) return false;
  return true;
}

/** @deprecated alias */
function isCabinetPagePath(pathname) {
  return isDesktopSiteShellPath(pathname);
}

function isCabinetPageUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.origin !== chatOrigin()) return false;
    return isDesktopSiteShellPath(u.pathname);
  } catch {
    return false;
  }
}

function desktopShellUserAgent(win) {
  const base = (win && win.webContents && win.webContents.getUserAgent()) || "";
  return `${base} VoiceTranslatorDesktop/1.0.1`;
}

function createDesktopShellWindowOptions(extra) {
  const icon = getAppIcon();
  return {
    width: 1280,
    height: 860,
    minWidth: DESKTOP_WIN_MIN_WIDTH,
    minHeight: DESKTOP_WIN_MIN_HEIGHT,
    resizable: true,
    thickFrame: true,
    frame: false,
    transparent: false,
    backgroundColor: "#f8fafc",
    title: "Voice Translator",
    ...(icon ? { icon } : {}),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      partition: "persist:voiceflow-translator-desktop-v1",
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    ...(extra || {}),
  };
}

function normalizeUiLangForSite(lang) {
  const s = String(lang || "").trim().toLowerCase();
  if (!s) return "en";
  const m = /^[a-z]{2}/.exec(s);
  return m ? m[0] : "en";
}

async function getDesktopUiLang() {
  if (!mainWindow || mainWindow.isDestroyed()) return "en";
  try {
    const out = await mainWindow.webContents.executeJavaScript(
      "(window.currentLang || localStorage.getItem('voiceTranslator_lang') || localStorage.getItem('siteLang') || 'en')",
      true
    );
    return normalizeUiLangForSite(out);
  } catch (_) {
    return "en";
  }
}

function localizeSiteUrl(urlStr, lang) {
  try {
    const u = new URL(urlStr);
    const seg = String(u.pathname || "/").split("/").filter(Boolean);
    const loc = normalizeUiLangForSite(lang);
    if (seg.length && /^[a-z]{2}$/i.test(seg[0])) {
      seg[0] = loc;
      u.pathname = `/${seg.join("/")}`;
      return u.href;
    }
    if (u.pathname === "/") return `${u.origin}/${loc}/`;
    u.pathname = `/${loc}${u.pathname.startsWith("/") ? u.pathname : `/${u.pathname}`}`;
    return u.href;
  } catch {
    return urlStr;
  }
}

async function syncCabinetWindowLang(wc, lang) {
  if (!wc || wc.isDestroyed()) return;
  const loc = normalizeUiLangForSite(lang);
  const js = `
    (function () {
      try { localStorage.setItem('siteLang', '${loc}'); } catch (e) {}
      try { localStorage.setItem('siteLangUserSet', '1'); } catch (e) {}
      try { document.cookie = 'siteLang=${loc}; path=/; max-age=31536000'; } catch (e) {}
    })();
  `;
  try {
    await wc.executeJavaScript(js, true);
  } catch (_) {
    /* ignore */
  }
}

async function openCabinetPage(urlStr) {
  const rawTarget = String(urlStr || "").trim();
  const prefLang = await getDesktopUiLang();
  const target = localizeSiteUrl(rawTarget, prefLang);
  if (!target || !isCabinetPageUrl(target)) return false;

  if (cabinetWindow && !cabinetWindow.isDestroyed()) {
    const ua = desktopShellUserAgent(cabinetWindow);
    try {
      cabinetWindow.webContents.setUserAgent(ua);
    } catch (_) {
      /* ignore */
    }
    await cabinetWindow.loadURL(target, { userAgent: ua });
    await syncCabinetWindowLang(cabinetWindow.webContents, prefLang);
    pushDesktopSiteChrome(cabinetWindow.webContents);
    if (!cabinetWindow.isDestroyed()) {
      cabinetWindow.show();
      cabinetWindow.focus();
    }
    return true;
  }

  cabinetWindow = new BrowserWindow(createDesktopShellWindowOptions());
  attachWebContentsHandlers(cabinetWindow);
  attachCabinetWindowStateListeners(cabinetWindow);
  const ua = desktopShellUserAgent(cabinetWindow);
  try {
    cabinetWindow.webContents.setUserAgent(ua);
  } catch (_) {
    /* ignore */
  }
  cabinetWindow.once("ready-to-show", () => {
    if (cabinetWindow && !cabinetWindow.isDestroyed()) cabinetWindow.show();
  });
  cabinetWindow.on("closed", () => {
    cabinetWindow = null;
    desktopResizeSession = null;
  });
  cabinetWindow.webContents.on("did-finish-load", () => {
    if (cabinetWindow && !cabinetWindow.isDestroyed()) {
      void syncCabinetWindowLang(cabinetWindow.webContents, prefLang);
      pushDesktopSiteChrome(cabinetWindow.webContents);
    }
  });
  await cabinetWindow.loadURL(target, { userAgent: ua });
  return true;
}

function attachCabinetWindowStateListeners(win) {
  if (!win) return;
  const broadcast = () => {
    try {
      if (win.isDestroyed()) return;
      win.webContents.send("desktop:window-maximized-changed", win.isMaximized());
    } catch (_) {
      /* ignore */
    }
  };
  win.on("maximize", broadcast);
  win.on("unmaximize", broadcast);
}

function toggleMainWindowDevTools() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const wc = mainWindow.webContents;
  if (wc.isDevToolsOpened()) {
    wc.closeDevTools();
    return;
  }
  wc.openDevTools({ mode: "detach", activate: true });
}

function attachDevToolsHotkeys(win) {
  const wc = win.webContents;
  wc.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const isF12 = input.key === "F12";
    const isDevToolsCombo =
      input.key === "I" &&
      input.shift &&
      !input.alt &&
      (input.control || input.meta);
    if (!isF12 && !isDevToolsCombo) return;
    event.preventDefault();
    toggleMainWindowDevTools();
  });
}

function registerDevToolsGlobalShortcuts() {
  for (const accel of ["F12", "CommandOrControl+Shift+I"]) {
    try {
      const ok = globalShortcut.register(accel, () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        toggleMainWindowDevTools();
      });
      if (!ok) {
        console.warn("[desktop] shortcut not registered:", accel);
      }
    } catch (e) {
      console.warn("[desktop] shortcut", accel, e.message || e);
    }
  }
}

function attachWebContentsHandlers(win) {
  const wc = win.webContents;
  attachDevToolsHotkeys(win);

  wireElectronMediaPermissions(wc.session);

  wc.on("will-navigate", (event, url) => {
    try {
      const u = new URL(url);
      if (u.hostname !== "accounts.google.com") return;
      event.preventDefault();
      if (desktopOAuthInFlight) return;
      const redirect = readRedirectFromWebContents(wc);
      void runDesktopGoogleOAuth(redirect).catch((e) => {
        console.error("[desktop] google oauth (will-navigate):", e.message || e);
      });
    } catch {
      /* ignore */
    }
  });

  wc.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.origin === chatOrigin()) {
        const p = u.pathname || "";
        if (p === "/ui" || p.startsWith("/ui/")) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const ua = desktopShellUserAgent(mainWindow);
            void mainWindow.loadURL(u.href, { userAgent: ua });
            mainWindow.show();
            mainWindow.focus();
          }
          return { action: "deny" };
        }
        if (isDesktopSiteShellPath(p)) {
          void openCabinetPage(u.href);
          return { action: "deny" };
        }
        return { action: "allow" };
      }
    } catch {
      /* fall through */
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  wc.on("page-title-updated", (event, title) => {
    if (title && String(title).trim()) {
      event.preventDefault();
      win.setTitle(String(title).trim());
    }
  });
}

/** Меняйте при правках UI — сбрасывает кэш HTML в Electron. */
const UI_CACHE_REV = "20260605stealth";

function fetchRemoteUiScriptText(filename) {
  const origin = chatOrigin();
  const url = `${origin}/ui/${encodeURIComponent(filename)}?vf_hotfix=${encodeURIComponent(UI_CACHE_REV)}`;
  const lib = url.startsWith("https:") ? require("https") : require("http");
  return new Promise((resolve, reject) => {
    lib
      .get(url, (res) => {
        if (!res || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res && res.statusCode}`));
          res.resume();
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function loadDesktopSiteChromeCss() {
  try {
    return fs.readFileSync(path.join(__dirname, "..", "public", "css", "desktop-chrome.css"), "utf8");
  } catch (e) {
    console.warn("[desktop] desktop-chrome.css:", e.message || e);
    return "";
  }
}

const DESKTOP_SITE_CHROME_CSS = loadDesktopSiteChromeCss();

function pushDesktopSiteChrome(wc) {
  if (!wc || wc.isDestroyed()) return;
  let url = "";
  try {
    url = wc.getURL() || "";
  } catch {
    return;
  }
  if (isChatUiUrl(url)) return;
  if (/\/login(\.html)?(\?|$)/i.test(url)) return;
  try {
    wc.send("desktop:site-chrome-css", DESKTOP_SITE_CHROME_CSS);
  } catch (e) {
    console.warn("[desktop] site-chrome send:", e.message || e);
  }
}

function loadDesktopLayoutFixCss() {
  try {
    return fs.readFileSync(path.join(__dirname, "chat-layout-fix.css"), "utf8");
  } catch (e) {
    console.warn("[desktop] chat-layout-fix.css:", e.message || e);
    return "";
  }
}

const DESKTOP_LAYOUT_FIX_CSS = loadDesktopLayoutFixCss();

function pushDesktopLayoutFixToWebContents(wc) {
  if (!wc || wc.isDestroyed()) return;
  let url = "";
  try {
    url = wc.getURL() || "";
  } catch {
    return;
  }
  if (!isChatUiUrl(url)) return;
  try {
    wc.send("desktop:layout-css", DESKTOP_LAYOUT_FIX_CSS);
  } catch (e) {
    console.warn("[desktop] layout-css send:", e.message || e);
  }
}

async function applyDesktopResponsiveUi(wc) {
  pushDesktopLayoutFixToWebContents(wc);
  if (!wc || wc.isDestroyed() || !DESKTOP_LAYOUT_FIX_CSS) return;
  let url = "";
  try {
    url = wc.getURL() || "";
  } catch {
    return;
  }
  if (!isChatUiUrl(url)) return;
  try {
    await wc.executeJavaScript(
      `(function(){var id='vf-desktop-layout-fix';var el=document.getElementById(id);if(!el){el=document.createElement('style');el.id=id;(document.head||document.documentElement).appendChild(el);}el.textContent=${JSON.stringify(DESKTOP_LAYOUT_FIX_CSS)};document.documentElement.setAttribute('data-vf-layout','${UI_CACHE_REV}');})();`,
      true
    );
  } catch (e) {
    console.warn("[desktop] layout-fix inject:", e.message || e);
  }
}

function chatLoadUrl() {
  const raw = chatUrl();
  try {
    const u = new URL(raw);
    u.searchParams.set("vf_desktop", String(pkg.version || "1"));
    u.searchParams.set("vf_ui", UI_CACHE_REV);
    u.searchParams.set("vf_layout", UI_CACHE_REV);
    return u.toString();
  } catch {
    const sep = raw.includes("?") ? "&" : "?";
    return `${raw}${sep}vf_desktop=${encodeURIComponent(String(pkg.version || "1"))}&vf_ui=${encodeURIComponent(UI_CACHE_REV)}`;
  }
}

/** Совпадает с backend _is_anonymous_client_id / проверкой во frontend. */
function isDesktopAnonymousUserId(id) {
  const s = String(id == null ? "" : id)
    .trim()
    .toLowerCase();
  return !s || s === "anonymous" || s.startsWith("anonymous_");
}

/**
 * Куда грузить первый экран: удалённый чат или локальный login.html (без деплоя на хост).
 * @returns {{ kind: "remote"; url: string } | { kind: "loginFile"; redirect: string }}
 */
async function resolveDesktopInitialLoad(win) {
  const start = chatLoadUrl();
  let u;
  try {
    u = new URL(start);
  } catch {
    return { kind: "remote", url: start };
  }
  const trial = (u.searchParams.get("trial_session") || "").trim();
  if (trial) {
    return { kind: "remote", url: start };
  }

  const meUrl = new URL("/api/auth/me", u.origin).href;
  const redirectBack = `${u.pathname}${u.search}` || "/ui";

  try {
    const r = await desktopSessionFetch(win.webContents.session, meUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!r.ok) {
      return { kind: "loginFile", redirect: redirectBack };
    }
    const d = await r.json().catch(() => null);
    const rid = d && d.id != null ? String(d.id).trim() : "";
    if (!d || isDesktopAnonymousUserId(rid)) {
      return { kind: "loginFile", redirect: redirectBack };
    }
  } catch (e) {
    console.warn("[desktop] auth gate /api/auth/me:", e.message || e);
    return { kind: "loginFile", redirect: redirectBack };
  }
  return { kind: "remote", url: start };
}

function createWindow() {
  const startUrl = chatLoadUrl();

  const icon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: DESKTOP_WIN_MIN_WIDTH,
    minHeight: DESKTOP_WIN_MIN_HEIGHT,
    resizable: true,
    /** Без системной белой полосы (min/max/close). Ресайз — через preload. */
    thickFrame: false,
    frame: false,
    /**
     * transparent:true обязателен на Windows/Linux для режима «Скрыть окно» (сквозной фон HWND).
     * В обычном режиме фон непрозрачный (#ff0a0e1a). На Windows возможна тонкая полоса title bar —
     * перекрывается кастомным header в /ui.
     */
    transparent: DESKTOP_WIN_NATIVE_TRANSPARENT,
    backgroundColor: DESKTOP_WIN_NATIVE_TRANSPARENT ? "#ff0a0e1a" : "#0a0e1a",
    ...(process.platform === "win32" ? { roundedCorners: false } : {}),
    title: "Voice Translator",
    ...(icon ? { icon } : {}),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      /** Отдельная persistent-сессия: не тянем старые cookies из «дефолтного» профиля Electron (иначе чат думает, что вы уже в ЛК). При необходимости сброса всех клиентов — поменяйте суффикс (v2, v3…). */
      partition: "persist:voiceflow-translator-desktop-v1",
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachWebContentsHandlers(mainWindow);

  function broadcastWindowMaximizedState() {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send("desktop:window-maximized-changed", mainWindow.isMaximized());
    } catch (_) {
      /* ignore */
    }
  }
  mainWindow.on("maximize", broadcastWindowMaximizedState);
  mainWindow.on("unmaximize", broadcastWindowMaximizedState);

  mainWindow.on("minimize", () => {
    if (bypassStealthMinimizeRestore) {
      bypassStealthMinimizeRestore = false;
      return;
    }
    if (!stealthMode || !mainWindow || mainWindow.isDestroyed()) return;
    setImmediate(() => {
      if (!mainWindow || mainWindow.isDestroyed() || !stealthMode) return;
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
        mainWindow.show();
      }
    });
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow.isDestroyed()) return;
    try {
      mainWindow.maximize();
    } catch (e) {
      console.warn("[desktop] maximize on start:", e.message || e);
    }
    mainWindow.show();
    broadcastWindowMaximizedState();
  });

  const ua = `${mainWindow.webContents.getUserAgent() || ""} VoiceTranslatorDesktop/1.0.1`;
  try {
    mainWindow.webContents.setUserAgent(ua);
  } catch (_) {
    /* ignore */
  }
  void (async () => {
    let spec = { kind: "remote", url: startUrl };
    try {
      spec = await resolveDesktopInitialLoad(mainWindow);
    } catch (e) {
      console.warn("[desktop] resolveDesktopInitialLoad:", e.message || e);
    }
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      await mainWindow.webContents.session.clearCache();
    } catch (e) {
      console.warn("[desktop] clearCache:", e.message || e);
    }
    if (spec.kind === "loginFile") {
      const p = loginPageDiskPath();
      try {
        if (!fs.existsSync(p)) {
          throw new Error(`login page not found: ${p}`);
        }
        await mainWindow.loadFile(p, { query: { redirect: spec.redirect } });
      } catch (e) {
        console.warn("[desktop] loadFile login, fallback to URL:", e.message || e);
        let u;
        try {
          u = new URL(chatLoadUrl());
        } catch {
          u = new URL("http://localhost:8000/ui");
        }
        const fallback = new URL(
          `/login?redirect=${encodeURIComponent(spec.redirect)}`,
          u.origin
        ).href;
        mainWindow.loadURL(fallback, { userAgent: ua });
      }
    } else {
      await mainWindow.loadURL(spec.url, { userAgent: ua });
    }
    await applyDesktopResponsiveUi(mainWindow.webContents);
  })();

  mainWindow.webContents.on("did-finish-load", () => {
    const wc = mainWindow && mainWindow.webContents;
    void ensureDesktopLocalAppJsLoaded(wc);
    void applyDesktopResponsiveUi(wc);
    if (stealthMode && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("stealth:state", stealthMode);
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url) => {
    console.error("[desktop] did-fail-load", code, desc, url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  wireElectronMediaPermissions(session.defaultSession);
  wireDesktopPersistentSession();
  Menu.setApplicationMenu(null);
  console.log(`[desktop] VoiceFlow ${pkg.version || "?"} layout=${UI_CACHE_REV}`);
  console.log("[desktop] DevTools: F12 или Ctrl+Shift+I");
  registerDevToolsGlobalShortcuts();
  uiohookLeftCtrlHookOk = setupAiRegionLeftCtrlGlobalHook();
  createWindow();
  configureManualUpdater();
  refreshAiRegionShortcut();

  ipcMain.handle("stealth:get-state", () => stealthMode);
  ipcMain.handle("stealth:toggle", () => {
    stealthMode = !stealthMode;
    applyStealthState();
    return stealthMode;
  });
  ipcMain.handle("stealth:disable", () => {
    stealthMode = false;
    applyStealthState();
    return stealthMode;
  });
  ipcMain.handle("stealth:set", (_event, enabled) => {
    stealthMode = Boolean(enabled);
    applyStealthState();
    return stealthMode;
  });

  /** Пока stealth: true = клики проходят «сквозь» окно; false = окно принимает клики (наведение на UI). */
  ipcMain.handle("stealth:set-mouse-passthrough", (_event, passThrough) => {
    if (!mainWindow || mainWindow.isDestroyed() || !stealthMode) return;
    if (passThrough) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.handle("desktop:set-ai-region-enabled", (_event, v) => {
    aiRegionAnalysisEnabled = Boolean(v);
    refreshAiRegionShortcut();
    return aiRegionAnalysisEnabled;
  });
  ipcMain.handle("desktop:get-ai-region-enabled", () => aiRegionAnalysisEnabled);
  ipcMain.handle("desktop:start-ai-region-select", async () => {
    try {
      return await startAiRegionSelectFlow();
    } catch (e) {
      console.error("[desktop] start-ai-region-select", e);
      return { ok: false, error: String(e.message || e) };
    }
  });

  ipcMain.handle("desktop:region-insight", async (_event, body) => {
    try {
      const png = body && typeof body.pngBase64 === "string" ? body.pngBase64.trim() : "";
      const locale = body && body.locale != null ? String(body.locale) : "ru";
      if (!png || png.length < 100) {
        return { ok: false, error: "Пустое изображение" };
      }
      const key = (process.env.AITUNNEL_API_KEY || "").trim();
      let hints = "";
      if (app.isPackaged || !key || key.startsWith("ваш_")) {
        hints = await serverDesktopRegionInsight(png, locale);
      } else {
        try {
          hints = await aitunnelDesktopRegionInsight(png, locale);
        } catch (localErr) {
          console.warn("[desktop] local region insight failed, server fallback:", localErr.message || localErr);
          hints = await serverDesktopRegionInsight(png, locale);
        }
      }
      return { ok: true, hints: hints || "—" };
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }
  });

  ipcMain.handle("desktop:open-chat", async () => {
    await shell.openExternal(chatUrl());
    return true;
  });

  /** Кабинет / тарифы / checkout — во внутреннем окне с кнопками − □ ×. */
  ipcMain.handle("desktop:open-cabinet", async (_event, url) => {
    try {
      return await openCabinetPage(String(url || "").trim());
    } catch (e) {
      console.warn("[desktop] open-cabinet", e);
      return false;
    }
  });

  /** Открыть URL во внешнем браузере (только тот же origin, что и чат). */
  ipcMain.handle("desktop:open-external", async (_event, url) => {
    const s = String(url || "").trim();
    if (!s) return false;
    try {
      const u = new URL(s);
      if ((u.protocol !== "http:" && u.protocol !== "https:") || u.origin !== chatOrigin()) {
        console.warn("[desktop] open-external blocked:", s);
        return false;
      }
      if (isCabinetPageUrl(s)) {
        return await openCabinetPage(s);
      }
      await shell.openExternal(s);
      return true;
    } catch (e) {
      console.warn("[desktop] open-external", e);
      return false;
    }
  });

  ipcMain.handle("desktop:get-chat-url", () => chatLoadUrl());
  ipcMain.handle("desktop:get-layout-css", () => DESKTOP_LAYOUT_FIX_CSS);
  ipcMain.handle("desktop:get-local-ui-script", (_event, name) => readDesktopLocalUiScript(name));
  ipcMain.handle("desktop:get-site-chrome-css", () => DESKTOP_SITE_CHROME_CSS);
  ipcMain.handle("desktop:reload-ui", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    try {
      await mainWindow.webContents.session.clearCache();
      await mainWindow.webContents.reloadIgnoringCache();
      await applyDesktopResponsiveUi(mainWindow.webContents);
      return true;
    } catch (e) {
      console.warn("[desktop] reload-ui:", e.message || e);
      return false;
    }
  });

  ipcMain.handle("desktop:toggle-devtools", () => {
    toggleMainWindowDevTools();
    return mainWindow && !mainWindow.isDestroyed()
      ? mainWindow.webContents.isDevToolsOpened()
      : false;
  });
  ipcMain.handle("desktop:get-chat-origin", () => {
    try {
      return chatOrigin();
    } catch {
      return "";
    }
  });
  ipcMain.handle("desktop:get-app-version", () => pkg.version || "");
  ipcMain.handle("desktop:update-state", () => desktopUpdateState);
  ipcMain.handle("desktop:update-check", async () => {
    if (!autoUpdater || !desktopUpdateState.supported) return desktopUpdateState;
    return checkDesktopUpdatesOnce();
  });
  ipcMain.handle("desktop:update-download", async () => {
    if (!autoUpdater || !desktopUpdateState.supported) return desktopUpdateState;
    return downloadDesktopUpdateOnce();
  });
  ipcMain.handle("desktop:update-install", () => {
    if (!autoUpdater || !desktopUpdateState.supported) return false;
    return quitForDesktopUpdate();
  });

  /** Google OAuth во внешнем браузере + cookie в session Electron. */
  ipcMain.handle("desktop:google-oauth", async (_event, payload) => {
    try {
      const redirect = payload && payload.redirect != null ? String(payload.redirect) : "/ui";
      return await runDesktopGoogleOAuth(redirect);
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }
  });

  /** POST /api/auth/login от имени session окна (для login с file://). */
  ipcMain.handle("desktop:auth-login", async (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, status: 0, error: "no_window" };
    }
    const origin = String(chatOrigin() || "")
      .trim()
      .replace(/\/$/, "");
    const url = `${origin}/api/auth/login`;
    const email = payload && payload.email != null ? String(payload.email).trim() : "";
    const password = payload && payload.password != null ? String(payload.password) : "";
    try {
      const r = await desktopSessionFetch(mainWindow.webContents.session, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const text = await r.text();
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
      if (r.ok && body && body.user_id != null) {
        try {
          await setElectronAuthCookie(mainWindow.webContents.session, body.user_id);
        } catch (cookieErr) {
          console.warn("[desktop] auth-login cookie:", cookieErr.message || cookieErr);
        }
      }
      return { ok: r.ok, status: r.status, body };
    } catch (e) {
      return { ok: false, status: 0, error: String(e.message || e) };
    }
  });

  /** Выйти из ЛК в этом окне: очистить cookies/storage для origin чата и открыть login.html. */
  ipcMain.handle("desktop:logout-to-login", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const start = chatLoadUrl();
    let u;
    try {
      u = new URL(start);
    } catch {
      return false;
    }
    const ses = mainWindow.webContents.session;
    const baseUrl = `${u.protocol}//${u.host}/`;
    try {
      await clearElectronAuthCookies(ses);
      const list = await ses.cookies.get({ url: baseUrl });
      for (const c of list) {
        try {
          await ses.cookies.remove(baseUrl, c.name);
        } catch (_) {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("[desktop] logout cookies:", e.message || e);
    }
    try {
      await ses.clearStorageData({ origin: u.origin });
    } catch (e) {
      console.warn("[desktop] logout storage:", e.message || e);
    }
    const back = `${u.pathname}${u.search}` || "/ui";
    const ua = `${mainWindow.webContents.getUserAgent() || ""} VoiceTranslatorDesktop/1.0.1`;
    try {
      mainWindow.webContents.setUserAgent(ua);
    } catch (_) {
      /* ignore */
    }
    const loginPath = loginPageDiskPath();
    try {
      if (fs.existsSync(loginPath)) {
        await mainWindow.loadFile(loginPath, { query: { redirect: back } });
        return true;
      }
    } catch (e) {
      console.warn("[desktop] logout loadFile login:", e.message || e);
    }
    const loginUrl = new URL(`/login?redirect=${encodeURIComponent(back)}`, u.origin).href;
    await mainWindow.loadURL(loginUrl, { userAgent: ua });
    return true;
  });

  ipcMain.handle("desktop:window-minimize", (event) => {
    const win = browserWindowFromIpc(event);
    if (!win) return false;
    if (win === mainWindow) {
      bypassStealthMinimizeRestore = true;
      setTimeout(() => {
        bypassStealthMinimizeRestore = false;
      }, 600);
    }
    win.minimize();
    return true;
  });

  ipcMain.handle("desktop:window-close", (event) => {
    const win = browserWindowFromIpc(event);
    if (!win) return false;
    win.close();
    return true;
  });

  ipcMain.handle("desktop:window-is-maximized", (event) => {
    const win = browserWindowFromIpc(event);
    if (!win) return false;
    return win.isMaximized();
  });

  ipcMain.handle("desktop:window-maximize-toggle", (event) => {
    const win = browserWindowFromIpc(event);
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });

  ipcMain.handle("desktop:window-resize-start", (event, edge) => {
    const win = browserWindowFromIpc(event);
    if (!win) return false;
    const e = String(edge || "e");
    if (win.isMaximized()) win.unmaximize();
    desktopResizeSession = { edge: e, startBounds: win.getBounds(), win };
    return true;
  });

  ipcMain.handle("desktop:window-resize-move", (_event, payload) => {
    const win =
      desktopResizeSession && desktopResizeSession.win && !desktopResizeSession.win.isDestroyed()
        ? desktopResizeSession.win
        : null;
    if (!desktopResizeSession || !win) return false;
    const dx = Number(payload && payload.dx) || 0;
    const dy = Number(payload && payload.dy) || 0;
    const edge = desktopResizeSession.edge;
    const b0 = desktopResizeSession.startBounds;
    let x = b0.x;
    let y = b0.y;
    let width = b0.width;
    let height = b0.height;
    if (edge.includes("e")) width = b0.width + dx;
    if (edge.includes("w")) {
      width = b0.width - dx;
      x = b0.x + dx;
    }
    if (edge.includes("s")) height = b0.height + dy;
    if (edge.includes("n")) {
      height = b0.height - dy;
      y = b0.y + dy;
    }
    if (width < DESKTOP_WIN_MIN_WIDTH) {
      if (edge.includes("w")) x += width - DESKTOP_WIN_MIN_WIDTH;
      width = DESKTOP_WIN_MIN_WIDTH;
    }
    if (height < DESKTOP_WIN_MIN_HEIGHT) {
      if (edge.includes("n")) y += height - DESKTOP_WIN_MIN_HEIGHT;
      height = DESKTOP_WIN_MIN_HEIGHT;
    }
    win.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });
    return true;
  });

  ipcMain.handle("desktop:window-resize-end", () => {
    desktopResizeSession = null;
    return true;
  });

  globalShortcut.register("CommandOrControl+Shift+X", () => {
    stealthMode = !stealthMode;
    applyStealthState();
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
