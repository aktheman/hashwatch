const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  showSaveDialog: (options) =>
    ipcRenderer.invoke('dialog:showSave', options),

  showOpenDialog: (options) =>
    ipcRenderer.invoke('dialog:showOpen', options),

  sendNotification: (title, body) =>
    ipcRenderer.send('notification:show', { title, body }),

  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  checkForUpdate: () => ipcRenderer.send('app:checkForUpdate'),

  installUpdate: () => ipcRenderer.send('app:installUpdate'),

  onCheckForUpdate: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },

  onUpdateDownloaded: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('update:downloaded', handler);
    return () => ipcRenderer.removeListener('update:downloaded', handler);
  },

  onNavigate: (callback) => {
    const handler = (_event, route) => callback(route);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
});
