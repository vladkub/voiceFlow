const { app, dialog } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const BLACKHOLE_VERSION = "0.6.1";

function shouldEnforceBlackHole() {
  if (process.platform !== "darwin") return false;
  if (process.env.VF_SKIP_BLACKHOLE === "1") return false;
  return true;
}

function listHalDrivers(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^BlackHole/i.test(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function isBlackHoleInstalled() {
  const system = listHalDrivers("/Library/Audio/Plug-Ins/HAL");
  if (system.length) return true;
  const user = listHalDrivers(path.join(app.getPath("home"), "Library/Audio/Plug-Ins/HAL"));
  return user.length > 0;
}

function bootstrapScriptPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "blackhole-bootstrap.sh");
  }
  return path.join(__dirname, "build", "blackhole-bootstrap.sh");
}

function bundledPkgPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "BlackHole2ch.pkg");
  }
  return path.join(__dirname, "build", `BlackHole2ch-${BLACKHOLE_VERSION}.pkg`);
}

async function runBlackHoleBootstrap() {
  const script = bootstrapScriptPath();
  if (!fs.existsSync(script)) {
    throw new Error(`BlackHole bootstrap script not found: ${script}`);
  }
  const env = {
    ...process.env,
    BLACKHOLE_VERSION,
    BLACKHOLE_PKG_URL: `https://existential.audio/downloads/BlackHole2ch-${BLACKHOLE_VERSION}.pkg`,
  };
  const pkg = bundledPkgPath();
  if (fs.existsSync(pkg)) {
    env.BLACKHOLE_PKG_PATH = pkg;
  }
  await execFileAsync("/bin/bash", [script], {
    env,
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function ensureBlackHoleInstalled() {
  if (!shouldEnforceBlackHole()) return true;
  if (isBlackHoleInstalled()) return true;

  while (true) {
    const { response } = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Install BlackHole", "Quit"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: "BlackHole required",
      message: "TalkPilot requires the BlackHole virtual audio driver.",
      detail:
        "BlackHole is not installed on this Mac. It is required for conference audio routing (Zoom, Teams, etc.).\n\n" +
        "Click «Install BlackHole» and enter your administrator password. TalkPilot cannot start without BlackHole.",
    });

    if (response !== 0) {
      app.quit();
      return false;
    }

    try {
      await runBlackHoleBootstrap();
    } catch (e) {
      const detail = String((e && (e.stderr || e.message)) || e || "Unknown error");
      await dialog.showMessageBox({
        type: "error",
        buttons: ["Retry", "Quit"],
        defaultId: 0,
        cancelId: 1,
        title: "BlackHole installation failed",
        message: "Could not install BlackHole.",
        detail,
      });
      continue;
    }

    if (isBlackHoleInstalled()) {
      await dialog.showMessageBox({
        type: "info",
        buttons: ["Continue"],
        title: "BlackHole installed",
        message: "BlackHole was installed successfully.",
        detail:
          "If audio devices do not appear, allow the driver in System Settings → Privacy & Security, " +
          "then restart TalkPilot. A system restart may be required on some macOS versions.",
      });
      return true;
    }

    const { response: again } = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Retry install", "Quit"],
      defaultId: 0,
      cancelId: 1,
      title: "BlackHole not detected",
      message: "The installer finished but BlackHole is still not detected.",
      detail: "Try again or restart your Mac, then launch TalkPilot.",
    });
    if (again !== 0) {
      app.quit();
      return false;
    }
  }
}

module.exports = {
  shouldEnforceBlackHole,
  isBlackHoleInstalled,
  ensureBlackHoleInstalled,
};
