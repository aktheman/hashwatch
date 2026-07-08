interface ElectronAPI {
  platform: string;
  isElectron: true;
  showSaveDialog: (options: {
    defaultPath: string;
    content: string;
  }) => Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog: (options: {
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<{ canceled: boolean; filePaths: string[]; content: string }>;
  sendNotification: (title: string, body: string) => void;
  getAppVersion: () => Promise<string>;
  checkForUpdate: () => void;
  installUpdate: () => void;
  onCheckForUpdate: (callback: (info: { version: string; url: string }) => void) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;
  onNavigate: (callback: (route: string) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
