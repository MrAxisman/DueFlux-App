const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld('DueFluxVault', {
  status: () => ipcRenderer.invoke('vault:status'),
  unlock: password => ipcRenderer.invoke('vault:unlock', password),
  get: key => ipcRenderer.invoke('vault:get', key),
  put: (key, value) => ipcRenderer.invoke('vault:put', key, value),
  lock: () => ipcRenderer.invoke('vault:lock'),
  onLock: handler => {
    const listener = () => handler();
    ipcRenderer.on('vault:locked', listener);
    return () => ipcRenderer.removeListener('vault:locked', listener);
  },
});

contextBridge.exposeInMainWorld("DueFlux", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  printReportPdf: (html) => ipcRenderer.invoke("reports:pdf", html),
});

contextBridge.exposeInMainWorld("DueFluxUpdater", {
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onStatus: (handler) => {
    if (typeof handler !== "function") return () => {};
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("update:status", listener);
    return () => ipcRenderer.removeListener("update:status", listener);
  },
});
