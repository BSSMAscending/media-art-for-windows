function createMainWindow({ BrowserWindow, htmlPath, preloadPath, sendUpdateStatus }) {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    fullscreen: false,
    frame: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  mainWindow.webContents.on('did-finish-load', () => {
    sendUpdateStatus?.();
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.setFullScreen(false);
    mainWindow.show();
  });
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });
  mainWindow.loadFile(htmlPath);

  return mainWindow;
}

function toggleFullscreen(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  const isFullscreen = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(isFullscreen);
  return isFullscreen;
}

module.exports = { createMainWindow, toggleFullscreen };
