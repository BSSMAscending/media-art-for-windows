const UPDATE_CHECK_DELAY_MS = 5000;
const UPDATE_REPOSITORY = 'BSSMAscending/media-art-for-windows-releases';

function isSquirrelEvent(argv) {
  return argv.some((argument) => argument.startsWith('--squirrel-'));
}

function canCheckForUpdates({ isPackaged, platform, argv }) {
  return isPackaged && platform === 'win32' && !isSquirrelEvent(argv);
}

function createUpdateController({
  app,
  autoUpdater,
  sendStatus,
  logger = console,
  platform = process.platform,
  argv = process.argv,
  setTimeoutFn = setTimeout,
}) {
  let downloaded = false;

  const reportError = (error) => {
    logger.error('자동 업데이트를 확인하지 못했습니다.', error);
  };

  autoUpdater.on('update-available', (_event, _releaseNotes, releaseName) => {
    sendStatus({ status: 'downloading', version: releaseName });
  });

  autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName) => {
    downloaded = true;
    sendStatus({ status: 'downloaded', version: releaseName });
  });

  autoUpdater.on('error', reportError);

  return {
    start() {
      if (!canCheckForUpdates({ isPackaged: app.isPackaged, platform, argv })) {
        return false;
      }

      try {
        autoUpdater.setFeedURL({
          url: `https://update.electronjs.org/${UPDATE_REPOSITORY}/win32-x64/${app.getVersion()}`,
        });
      } catch (error) {
        reportError(error);
        return false;
      }

      setTimeoutFn(() => {
        try {
          const check = autoUpdater.checkForUpdates();
          check?.catch(reportError);
        } catch (error) {
          reportError(error);
        }
      }, UPDATE_CHECK_DELAY_MS);

      return true;
    },

    quitAndInstall() {
      if (!downloaded) {
        return false;
      }

      autoUpdater.quitAndInstall();
      return true;
    },
  };
}

module.exports = {
  UPDATE_CHECK_DELAY_MS,
  UPDATE_REPOSITORY,
  canCheckForUpdates,
  createUpdateController,
  isSquirrelEvent,
};
