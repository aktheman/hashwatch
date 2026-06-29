const {
  app, BrowserWindow, Menu, Tray, nativeImage,
  ipcMain, dialog, Notification,
} = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;

const isDev = process.env.NODE_ENV === 'development';
const statePath = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // ignore corrupt state
  }
  return null;
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const bounds = mainWindow.getBounds();
    const maximized = mainWindow.isMaximized();
    fs.writeFileSync(statePath, JSON.stringify({ ...bounds, maximized }), 'utf-8');
  } catch {
    // best-effort
  }
}

function createWindow() {
  const saved = loadWindowState();
  const winOptions = {
    width: saved?.width || 1200,
    height: saved?.height || 800,
    x: saved?.x,
    y: saved?.y,
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
  };

  mainWindow = new BrowserWindow(winOptions);

  if (saved?.maximized) {
    mainWindow.maximize();
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('close', (e) => {
    saveWindowState();
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function buildAppMenu() {
  const template = [
    {
      label: 'HashWatch',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('navigate', 'Settings'),
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('navigate', 'ImportData'),
        },
        {
          label: 'Export Backup',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('navigate', 'ExportData'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HashWatch',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HashWatch',
              message: `HashWatch v${app.getVersion()}`,
              detail: 'Real-time BitAxe miner monitoring',
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildAppMenu();

    createWindow();

    const iconPath = path.join(__dirname, '..', 'assets', 'favicon.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('HashWatch');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show', click: () => mainWindow.show() },
      { type: 'separator' },
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

    ipcMain.on('app:checkForUpdate', () => {
      // Triggered from renderer; in production this would invoke auto-updater.
      // For now, simulate the event so preload listener fires.
      if (mainWindow) {
        mainWindow.webContents.send('update:available', {
          version: app.getVersion(),
          url: 'https://github.com/user/hashwatch/releases',
        });
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
    else mainWindow.show();
  });
}
