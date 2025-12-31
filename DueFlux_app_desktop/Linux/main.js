const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow = null;

function sendUpdateStatus(status, payload = {}) {
  if (!mainWindow || !mainWindow.webContents) return;
  mainWindow.webContents.send("update:status", { status, ...payload });
}

function initAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = "info";

  autoUpdater.on("checking-for-update", () => sendUpdateStatus("checking"));
  autoUpdater.on("update-available", (info) =>
    sendUpdateStatus("available", { version: info.version })
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
    sendUpdateStatus("downloaded", { version: info.version })
  );
  autoUpdater.on("error", (err) =>
    sendUpdateStatus("error", {
      message: err ? err.message : "Update error.",
    })
  );
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#020617",
    title: "DueFlux",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow = win;

  // Daca vrei DevTools:
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();

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
ipcMain.handle("update:check", async () => {
  if (!app.isPackaged) {
    sendUpdateStatus("error", {
      message: "Updates are available only in packaged builds.",
    });
    return null;
  }
  return autoUpdater.checkForUpdates();
});
ipcMain.handle("update:download", async () => {
  if (!app.isPackaged) {
    sendUpdateStatus("error", {
      message: "Updates are available only in packaged builds.",
    });
    return null;
  }
  return autoUpdater.downloadUpdate();
});
ipcMain.handle("update:install", () => {
  autoUpdater.quitAndInstall();
});
