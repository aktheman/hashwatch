const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'HashWatch',
    icon: path.join(__dirname, '..', 'assets', 'favicon.png'),
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  const iconPath = path.join(__dirname, '..', 'assets', 'favicon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('HashWatch');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => mainWindow.show());

  ipcMain.handle('dialog:showSave', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: options.defaultPath,
      filters: options.filters || [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!result.canceled && result.filePath && options.content) {
      fs.writeFileSync(result.filePath, options.content, 'utf-8');
    }
    return { canceled: result.canceled, filePath: result.filePath };
  });

  ipcMain.handle('dialog:showOpen', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options.filters || [{ name: 'JSON', extensions: ['json'] }],
    });
    let content = '';
    if (!result.canceled && result.filePaths.length > 0) {
      content = fs.readFileSync(result.filePaths[0], 'utf-8');
    }
    return { canceled: result.canceled, filePaths: result.filePaths, content };
  });

  ipcMain.on('notification:show', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: iconPath }).show();
    }
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});
