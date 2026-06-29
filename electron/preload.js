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

  onCheckForUpdate: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
});
