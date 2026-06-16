const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("regionSelectApi", {
  complete: (payload) => ipcRenderer.send("region-select-completed", payload),
});
