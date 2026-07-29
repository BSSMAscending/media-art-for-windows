const { app, autoUpdater, BrowserWindow, protocol, net, ipcMain } = require('electron');
const path = require('node:path');
const { createUpdateController } = require('./updater');
const { createMainWindow, getFullscreenState, toggleFullscreen } = require('./window');

if (require('electron-squirrel-startup')) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-assets',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// GPU acceleration flags — must be set before app.ready
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const createWindow = () => {
  mainWindow = createMainWindow({
    BrowserWindow,
    htmlPath: path.join(__dirname, '../renderer/index.html'),
    preloadPath: path.join(__dirname, '../preload.js'),
    sendUpdateStatus: () => {
      if (latestUpdateStatus) {
        mainWindow.webContents.send('update-status', latestUpdateStatus);
      }
    },
  });
};

let mainWindow;
let latestUpdateStatus;

function sendUpdateStatus(status) {
  latestUpdateStatus = status;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', status);
  }
}

app.whenReady().then(() => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  protocol.handle('local-assets', (request) => {
    const urlPath = new URL(request.url).pathname;
    return net.fetch(`file://${path.join(projectRoot, urlPath)}`);
  });

  ipcMain.on('quit-app', () => app.quit());
  ipcMain.handle('restart-and-install-update', () => updateController?.quitAndInstall() ?? false);
  ipcMain.handle('get-fullscreen-state', () => getFullscreenState(mainWindow));
  ipcMain.handle('toggle-fullscreen', () => {
    const isFullscreen = toggleFullscreen(mainWindow);

    if (process.platform === 'darwin' && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-changed', isFullscreen);
    }

    return isFullscreen;
  });

  createWindow();

  updateController = createUpdateController({
    app,
    autoUpdater,
    sendStatus: sendUpdateStatus,
  });
  updateController.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let updateController;

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
