const {
  UPDATE_CHECK_DELAY_MS,
  UPDATE_REPOSITORY,
  canCheckForUpdates,
  createUpdateController,
  isSquirrelEvent,
} = require('../src/main/updater');

function createAutoUpdater() {
  const listeners = new Map();

  return {
    on(event, callback) {
      listeners.set(event, callback);
    },
    emit(event, ...args) {
      listeners.get(event)?.(...args);
    },
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(),
    quitAndInstall: vi.fn(),
  };
}

describe('Squirrel update guards', () => {
  it('recognizes every Squirrel launch argument', () => {
    expect(isSquirrelEvent(['--squirrel-firstrun'])).toBe(true);
    expect(isSquirrelEvent(['--squirrel-install'])).toBe(true);
    expect(isSquirrelEvent(['--squirrel-updated'])).toBe(true);
    expect(isSquirrelEvent(['--squirrel-uninstall'])).toBe(true);
    expect(isSquirrelEvent(['--squirrel-obsolete'])).toBe(true);
  });

  it('only enables updates for packaged non-Squirrel Windows launches', () => {
    expect(canCheckForUpdates({ isPackaged: true, platform: 'win32', argv: [] })).toBe(true);
    expect(canCheckForUpdates({ isPackaged: false, platform: 'win32', argv: [] })).toBe(false);
    expect(
      canCheckForUpdates({ isPackaged: true, platform: 'win32', argv: ['--squirrel-firstrun'] })
    ).toBe(false);
    expect(canCheckForUpdates({ isPackaged: true, platform: 'darwin', argv: [] })).toBe(false);
  });
});

describe('update controller', () => {
  function createController({ isPackaged = true, argv = [], checkForUpdates } = {}) {
    const autoUpdater = createAutoUpdater();
    const sendStatus = vi.fn();
    const logger = { error: vi.fn() };
    const app = { isPackaged, getVersion: () => '1.2.3' };
    const controller = createUpdateController({
      app,
      autoUpdater,
      sendStatus,
      logger,
      platform: 'win32',
      argv,
      setTimeoutFn: (callback, delay) => {
        expect(delay).toBe(UPDATE_CHECK_DELAY_MS);
        checkForUpdates?.(callback);
      },
    });

    return { autoUpdater, controller, logger, sendStatus };
  }

  it('checks the public release repository after the background delay', () => {
    const { autoUpdater, controller } = createController({
      checkForUpdates: (callback) => callback(),
    });

    expect(controller.start()).toBe(true);
    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({
      url: `https://update.electronjs.org/${UPDATE_REPOSITORY}/win32-x64/1.2.3`,
    });
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
  });

  it('reports download states and only installs after a completed download', () => {
    const { autoUpdater, controller, sendStatus } = createController();

    autoUpdater.emit('update-available', {}, '', 'v1.2.4');
    expect(sendStatus).toHaveBeenLastCalledWith({ status: 'downloading', version: 'v1.2.4' });
    expect(controller.quitAndInstall()).toBe(false);

    autoUpdater.emit('update-downloaded', {}, '', 'v1.2.4');
    expect(sendStatus).toHaveBeenLastCalledWith({ status: 'downloaded', version: 'v1.2.4' });
    expect(controller.quitAndInstall()).toBe(true);
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it('does not start for Squirrel events and contains update check errors', () => {
    const { autoUpdater, controller, logger } = createController({
      argv: ['--squirrel-firstrun'],
      checkForUpdates: (callback) => callback(),
    });

    expect(controller.start()).toBe(false);
    expect(autoUpdater.setFeedURL).not.toHaveBeenCalled();

    autoUpdater.emit('error', new Error('offline'));
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('contains invalid feed configuration errors instead of blocking startup', () => {
    const { autoUpdater, controller, logger } = createController();
    autoUpdater.setFeedURL.mockImplementation(() => {
      throw new Error('invalid feed');
    });

    expect(controller.start()).toBe(false);
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
