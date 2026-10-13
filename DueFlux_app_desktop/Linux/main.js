const { app, BrowserWindow, ipcMain, shell, safeStorage, powerMonitor } = require("electron");
const path = require("path");
const log = require("electron-log");
if (process.argv.includes('--smoke-test')) {
  const testDirectory = path.join(app.getPath('temp'), 'dueflux-smoke-' + require('node:crypto').randomUUID());
  require('node:fs').mkdirSync(testDirectory, { recursive: true });
  app.setPath('userData', testDirectory);
}

let mainWindow = null;
let autoUpdater = null;
let localVault;
const requireLocalSender = event => {
  if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow?.webContents.mainFrame || !event.senderFrame?.url.startsWith('file://')) throw new Error('Invalid sender');
};

function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (!["https:", "mailto:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return shell.openExternal(parsed.href);
  } catch (_) { return null; }
}

function sendUpdateStatus(status, payload = {}) {
  if (!mainWindow || !mainWindow.webContents) return;
  mainWindow.webContents.send("update:status", { status, ...payload });
}

function normalizeReleaseNotes(notes) {
  if (!notes) return "";
  if (Array.isArray(notes)) {
    return notes
      .map((entry) => {
        if (!entry) return "";
        if (typeof entry === "string") return entry;
        if (typeof entry.note === "string") return entry.note;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  if (typeof notes === "string") return notes;
  return "";
}

function cleanReleaseNotes(notes) {
  if (!notes) return "";
  return String(notes)
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractUpdateSize(info) {
  if (!info || !Array.isArray(info.files)) return null;
  for (const file of info.files) {
    if (file && Number.isFinite(file.size) && file.size > 0) {
      return file.size;
    }
  }
  return null;
}

function initAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }

  if (!autoUpdater) {
    try {
      ({ autoUpdater } = require("electron-updater"));
    } catch (err) {
      log.error("autoUpdater: failed to load", err);
      return;
    }
  }

  autoUpdater.autoDownload = false;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = "info";

  autoUpdater.on("checking-for-update", () => sendUpdateStatus("checking"));
  autoUpdater.on("update-available", (info) =>
    sendUpdateStatus("available", {
      version: info.version,
      notes: cleanReleaseNotes(normalizeReleaseNotes(info.releaseNotes)),
      releaseDate: info.releaseDate || "",
      bytes: extractUpdateSize(info),
    })
  );
  autoUpdater.on("update-not-available", (info) =>
    sendUpdateStatus("none", { version: info.version })
  );
  autoUpdater.on("download-progress", (progress) =>
    sendUpdateStatus("downloading", {
      percent: Math.round(progress.percent || 0),
    })
  );
  autoUpdater.on("update-downloaded", (info) =>
    sendUpdateStatus("downloaded", {
      version: info.version,
      notes: cleanReleaseNotes(normalizeReleaseNotes(info.releaseNotes)),
      releaseDate: info.releaseDate || "",
      bytes: extractUpdateSize(info),
    })
  );
  autoUpdater.on("error", (err) =>
    sendUpdateStatus("error", {
      message: err ? err.message : "Update error.",
    })
  );
}

function createWindow() {
  const win = new BrowserWindow({
    show: !process.argv.includes("--smoke-test"),
    width: 1400,
    height: 900,
    minWidth: 760,
    minHeight: 540,
    backgroundColor: "#020617",
    title: "DueFlux",
    icon: path.join(__dirname, "renderer", "assets", "app-icon.png"),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    // The renderer stays local; external content never inherits the preload bridge.
    event.preventDefault();
    void openExternal(url);
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow = win;

  // Daca vrei DevTools:
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  localVault = require('./local-vault.cjs').createVault({ directory: path.join(app.getPath('userData'), 'protected-vault'), safeStorage });
  createWindow();
  initAutoUpdater();
  powerMonitor.on('lock-screen', () => {
    localVault.lock();
    mainWindow?.webContents.send('vault:locked');
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle('vault:status', event => { requireLocalSender(event); return localVault.status(); });
ipcMain.handle('vault:unlock', (event, password) => { requireLocalSender(event); return localVault.unlock(password); });
ipcMain.handle('vault:get', (event, key) => { requireLocalSender(event); return localVault.get(key); });
ipcMain.handle('vault:put', (event, key, value) => { requireLocalSender(event); return localVault.put(key, value); });
ipcMain.handle('vault:lock', event => { requireLocalSender(event); localVault.lock(); });
ipcMain.handle("reports:pdf", async (event, html) => {
  if (event.sender !== mainWindow?.webContents || typeof html !== "string" || html.length > 2 * 1024 * 1024) {
    throw new Error("Invalid report");
  }
  const reportWindow = new BrowserWindow({ show: false, webPreferences: {
    contextIsolation: true, nodeIntegration: false, sandbox: true, javascript: false,
  } });
  reportWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  try {
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">';
    const document = html.replace("<head>", "<head>" + csp);
    await reportWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(document));
    const bytes = await reportWindow.webContents.printToPDF({ printBackground: true, pageSize: "A4" });
    return bytes.toString("base64");
  } finally { reportWindow.destroy(); }
});
ipcMain.handle("app:openExternal", (_event, url) => {
  return openExternal(url);
});
ipcMain.handle("update:check", async () => {
  if (!app.isPackaged || !autoUpdater) {
    sendUpdateStatus("error", {
      message: "Updates are available only in packaged builds.",
    });
    return null;
  }
  return autoUpdater.checkForUpdates();
});
ipcMain.handle("update:download", async () => {
  if (!app.isPackaged || !autoUpdater) {
    sendUpdateStatus("error", {
      message: "Updates are available only in packaged builds.",
    });
    return null;
  }
  return autoUpdater.downloadUpdate();
});
ipcMain.handle("update:install", () => {
  if (!autoUpdater) return null;
  autoUpdater.quitAndInstall();
  return null;
});
