const {
    contextBridge,
    ipcRenderer
} = require("electron");
contextBridge.exposeInMainWorld("infNative", {
    selectFolder: () => ipcRenderer.invoke("select-folder"),
    scanFolder: (root) => ipcRenderer.invoke("scan-folder", root),
    selectFolders: () => ipcRenderer.invoke("select-folders"),
    scanFolders: (roots) => ipcRenderer.invoke("scan-folders", roots),
    selectFiles: () => ipcRenderer.invoke("select-files"),
    scanFiles: (files) => ipcRenderer.invoke("scan-files", files),
    togglePlaylist: (collapsed) => ipcRenderer.send("ui:togglePlaylist", collapsed),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
});