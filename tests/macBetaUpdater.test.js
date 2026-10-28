const { execFileSync } = require('node:child_process');
const { caskName } = require('../scripts/channels');
const {
  DETACHED_UPGRADE_SCRIPT,
  MAC_BETA_CASK,
  MAC_BETA_CHECK_INTERVAL_MS,
  UPDATE_CHECK_DELAY_MS,
  UPDATE_REPOSITORY,
  appBundlePath,
  canCheckForMacBetaUpdates,
  compareVersions,
  createMacBetaUpdateController,
  isTrustedReleaseUrl,
} = require('../src/main/updater');

describe('version order', () => {
  it('orders betas by number, not by text', () => {
    expect(compareVersions('2.0.0-beta.2', '2.0.0-beta.1')).toBe(1);
    expect(compareVersions('2.0.0-beta.10', '2.0.0-beta.9')).toBe(1);
    expect(compareVersions('2.0.0-beta.9', '2.0.0-beta.10')).toBe(-1);
    expect(compareVersions('2.0.0-beta.3', '2.0.0-beta.3')).toBe(0);
  });

  it('puts a stable version above its betas and a higher line above a lower one', () => {
    expect(compareVersions('2.0.0', '2.0.0-beta.999')).toBe(1);
    expect(compareVersions('2.0.0-beta.1', '2.0.0')).toBe(-1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
    expect(compareVersions('2.1.0-beta.1', '2.0.0')).toBe(1);
    expect(compareVersions('1.0.2', '2.0.0-beta.1')).toBe(-1);
    expect(compareVersions('10.0.0', '9.9.9')).toBe(1);
  });

  it('rejects anything that is not X.Y.Z or X.Y.Z-beta.N', () => {
    const notVersions = ['v2.0.0', '2.0', '2.0.0-beta', '2.0.0-beta.0', '2.0.0-beta.01', '2.0.0-rc.1', ''];
    for (const bad of notVersions) {
      expect(compareVersions(bad, '2.0.0')).toBeNull();
      expect(compareVersions('2.0.0', bad)).toBeNull();
    }
    expect(compareVersions(undefined, '2.0.0')).toBeNull();
    expect(compareVersions(null, '2.0.0')).toBeNull();
  });
});

describe('Mac beta update guards', () => {
  it('only checks packaged Mac builds that are betas', () => {
    const beta = { isPackaged: true, platform: 'darwin', version: '2.0.0-beta.1' };
    expect(canCheckForMacBetaUpdates(beta)).toBe(true);
    expect(canCheckForMacBetaUpdates({ ...beta, isPackaged: false })).toBe(false);
    expect(canCheckForMacBetaUpdates({ ...beta, platform: 'win32' })).toBe(false);
    expect(canCheckForMacBetaUpdates({ ...beta, version: '2.0.0' })).toBe(false);
    expect(canCheckForMacBetaUpdates({ ...beta, version: '1.0.2' })).toBe(false);
  });

  it('accepts release pages on github.com only', () => {
    expect(isTrustedReleaseUrl('https://github.com/BSSMAscending/media-art-beta/releases/tag/v2.0.0-beta.2')).toBe(true);
    expect(isTrustedReleaseUrl('http://github.com/x/y')).toBe(false);
    expect(isTrustedReleaseUrl('https://github.com.evil.example/x/y')).toBe(false);
    expect(isTrustedReleaseUrl('https://evil.example/github.com/x')).toBe(false);
    expect(isTrustedReleaseUrl('javascript:alert(1)')).toBe(false);
    expect(isTrustedReleaseUrl('file:///Applications')).toBe(false);
    expect(isTrustedReleaseUrl(undefined)).toBe(false);
  });

  it('finds the app bundle from the executable path', () => {
    expect(appBundlePath('/Applications/media-art-for-windows.app/Contents/MacOS/media-art-for-windows')).toBe(
      '/Applications/media-art-for-windows.app'
    );
    expect(appBundlePath('/opt/electron/Electron')).toBeNull();
  });

  it('names the same cask as the beta channel, which the packaged app cannot import', () => {
    expect(MAC_BETA_CASK).toBe(caskName);
  });
});

describe('Mac beta update controller', () => {
  const NEWER = 'https://github.com/BSSMAscending/media-art-beta/releases/tag/v2.0.0-beta.2';
  const NEWEST = 'https://github.com/BSSMAscending/media-art-beta/releases/tag/v2.0.0-beta.3';
  const EXECUTABLE = '/Applications/media-art-for-windows.app/Contents/MacOS/media-art-for-windows';
  const LOGS = '/Users/test/Library/Logs/media-art-for-windows';

  function release(tag = 'v2.0.0-beta.2', htmlUrl = NEWER) {
    return { ok: true, status: 200, json: async () => ({ tag_name: tag, html_url: htmlUrl }) };
  }

  // `brewAt` lists the brew paths whose `list --cask` succeeds; the others fail like a missing file.
  function createController({
    isPackaged = true,
    platform = 'darwin',
    version = '2.0.0-beta.1',
    brewAt = ['/opt/homebrew/bin/brew'],
    fetchFn = vi.fn(async () => release()),
  } = {}) {
    const timers = [];
    const app = {
      isPackaged,
      getVersion: () => version,
      getPath: (name) => ({ exe: EXECUTABLE, logs: LOGS })[name],
      quit: vi.fn(),
    };
    const child = { on: vi.fn(), unref: vi.fn() };
    const execFile = vi.fn((file, args, options, callback) => {
      callback(brewAt.includes(file) ? null : new Error(`spawn ${file} ENOENT`));
    });
    const spawn = vi.fn(() => child);
    const shell = { openExternal: vi.fn(async () => {}) };
    const fs = { mkdirSync: vi.fn(), openSync: vi.fn(() => 42), closeSync: vi.fn() };
    const sendStatus = vi.fn();
    const logger = { error: vi.fn() };
    const controller = createMacBetaUpdateController({
      app,
      sendStatus,
      shell,
      fetchFn,
      execFile,
      spawn,
      fs,
      logger,
      platform,
      pid: 4321,
      setTimeoutFn: (callback, delay) => timers.push({ callback, delay }),
    });

    // Runs the next scheduled check to the end.
    const runCheck = () => timers.shift().callback();

    return { app, child, controller, execFile, fetchFn, fs, logger, runCheck, sendStatus, shell, spawn, timers };
  }

  it('checks 5 seconds after start, then every 6 hours', async () => {
    const { controller, runCheck, timers } = createController();

    expect(controller.start()).toBe(true);
    expect(timers.map((timer) => timer.delay)).toEqual([UPDATE_CHECK_DELAY_MS]);

    await runCheck();
    expect(timers.map((timer) => timer.delay)).toEqual([MAC_BETA_CHECK_INTERVAL_MS]);
    expect(MAC_BETA_CHECK_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
    await runCheck();
    expect(timers.map((timer) => timer.delay)).toEqual([MAC_BETA_CHECK_INTERVAL_MS]);
  });

  it('does not start for stable, unpackaged or non-Mac builds', () => {
    for (const options of [{ version: '2.0.0' }, { version: '1.0.2' }, { isPackaged: false }, { platform: 'win32' }]) {
      const { controller, fetchFn, timers } = createController(options);
      expect(controller.start()).toBe(false);
      expect(timers).toHaveLength(0);
      expect(fetchFn).not.toHaveBeenCalled();
    }
  });

  it('reads the latest release of the update repository', async () => {
    const { controller, fetchFn, runCheck } = createController();
    controller.start();
    await runCheck();

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0][0]).toBe(`https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`);
    expect(fetchFn.mock.calls[0][1].headers.Accept).toBe('application/vnd.github+json');
  });

  it('offers a newer beta through brew when the cask is installed', async () => {
    const { controller, execFile, runCheck, sendStatus } = createController();
    controller.start();
    await runCheck();

    expect(execFile.mock.calls[0].slice(0, 3)).toEqual([
      '/opt/homebrew/bin/brew',
      ['list', '--cask', 'binary-media-art-beta'],
      expect.objectContaining({ timeout: expect.any(Number) }),
    ]);
    expect(sendStatus).toHaveBeenCalledOnce();
    expect(sendStatus).toHaveBeenCalledWith({ status: 'available', version: '2.0.0-beta.2', via: 'brew' });
  });

  it('falls back to the Intel brew path, then to the release page', async () => {
    const intel = createController({ brewAt: ['/usr/local/bin/brew'] });
    intel.controller.start();
    await intel.runCheck();
    expect(intel.execFile.mock.calls.map((call) => call[0])).toEqual(['/opt/homebrew/bin/brew', '/usr/local/bin/brew']);
    expect(intel.sendStatus).toHaveBeenCalledWith({ status: 'available', version: '2.0.0-beta.2', via: 'brew' });

    const none = createController({ brewAt: [] });
    none.controller.start();
    await none.runCheck();
    expect(none.sendStatus).toHaveBeenCalledWith({ status: 'available', version: '2.0.0-beta.2', via: 'page' });
  });

  it('offers a stable release above the beta too', async () => {
    const page = 'https://github.com/BSSMAscending/media-art-beta/releases/tag/v2.0.0';
    const { controller, runCheck, sendStatus } = createController({
      fetchFn: vi.fn(async () => release('v2.0.0', page)),
    });
    controller.start();
    await runCheck();
    expect(sendStatus).toHaveBeenCalledWith({ status: 'available', version: '2.0.0', via: 'brew' });
  });

  it('sends a version once, and the next one when it appears', async () => {
    const fetchFn = vi.fn(async () => release());
    const { controller, runCheck, sendStatus } = createController({ fetchFn });
    controller.start();
    await runCheck();
    await runCheck();
    await runCheck();
    expect(sendStatus).toHaveBeenCalledOnce();

    fetchFn.mockImplementation(async () => release('v2.0.0-beta.3', NEWEST));
    await runCheck();
    expect(sendStatus).toHaveBeenCalledTimes(2);
    expect(sendStatus).toHaveBeenLastCalledWith({ status: 'available', version: '2.0.0-beta.3', via: 'brew' });
  });

  it('says nothing when the release is the same or older', async () => {
    for (const tag of ['v2.0.0-beta.1', 'v1.9.0']) {
      const { controller, execFile, logger, runCheck, sendStatus } = createController({
        fetchFn: vi.fn(async () => release(tag)),
      });
      controller.start();
      await runCheck();
      expect(sendStatus).not.toHaveBeenCalled();
      expect(execFile).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    }
  });

  it('logs a failed check and keeps checking', async () => {
    const failures = [
      vi.fn(async () => {
        throw new Error('offline');
      }),
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })),
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      })),
      vi.fn(async () => ({ ok: true, status: 200, json: async () => null })),
      vi.fn(async () => release('latest')),
    ];

    for (const fetchFn of failures) {
      const { controller, logger, runCheck, sendStatus, timers } = createController({ fetchFn });
      controller.start();
      await expect(runCheck()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledOnce();
      expect(sendStatus).not.toHaveBeenCalled();
      expect(timers.map((timer) => timer.delay)).toEqual([MAC_BETA_CHECK_INTERVAL_MS]);
    }
  });

  it('ignores a release whose page is not on github.com', async () => {
    for (const url of ['http://github.com/x/y', 'https://example.com/x/y', 'javascript:alert(1)', null]) {
      const { controller, execFile, logger, runCheck, sendStatus } = createController({
        fetchFn: vi.fn(async () => release('v2.0.0-beta.2', url)),
      });
      controller.start();
      await runCheck();
      expect(sendStatus).not.toHaveBeenCalled();
      expect(execFile).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledOnce();
    }
  });

  describe('quitAndInstall', () => {
    it('does nothing before a newer beta is found', () => {
      const { app, controller, spawn } = createController();
      expect(controller.quitAndInstall()).toBe(false);
      expect(spawn).not.toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('starts the detached brew upgrade with positional arguments and quits', async () => {
      const { app, child, controller, fs, runCheck, spawn } = createController();
      controller.start();
      await runCheck();

      expect(controller.quitAndInstall()).toBe(true);

      expect(fs.mkdirSync).toHaveBeenCalledWith(LOGS, { recursive: true });
      expect(fs.openSync).toHaveBeenCalledWith(`${LOGS}/mac-beta-update.log`, 'a');
      expect(spawn).toHaveBeenCalledOnce();
      expect(spawn).toHaveBeenCalledWith(
        '/bin/sh',
        ['-c', DETACHED_UPGRADE_SCRIPT, 'sh', '/opt/homebrew/bin/brew', '/Applications/media-art-for-windows.app', '4321'],
        { detached: true, stdio: ['ignore', 42, 42] }
      );
      expect(fs.closeSync).toHaveBeenCalledWith(42);
      expect(child.unref).toHaveBeenCalledOnce();
      expect(app.quit).toHaveBeenCalledOnce();
    });

    it('does not start a second upgrade on another click', async () => {
      const { app, controller, runCheck, spawn } = createController();
      controller.start();
      await runCheck();

      expect(controller.quitAndInstall()).toBe(true);
      expect(controller.quitAndInstall()).toBe(true);
      expect(spawn).toHaveBeenCalledOnce();
      expect(app.quit).toHaveBeenCalledOnce();
    });

    it('stays open and logs when the script cannot start', async () => {
      const { app, controller, fs, logger, runCheck, spawn } = createController();
      spawn.mockImplementation(() => {
        throw new Error('spawn /bin/sh EAGAIN');
      });
      controller.start();
      await runCheck();

      expect(controller.quitAndInstall()).toBe(false);
      expect(logger.error).toHaveBeenCalledOnce();
      expect(fs.closeSync).toHaveBeenCalledWith(42);
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('opens the release page when brew did not install the app', async () => {
      const { app, controller, runCheck, shell, spawn } = createController({ brewAt: [] });
      controller.start();
      await runCheck();

      expect(controller.quitAndInstall()).toBe(true);
      expect(shell.openExternal).toHaveBeenCalledWith(NEWER);
      expect(spawn).not.toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
    });
  });
});

describe('the detached upgrade script', () => {
  it('upgrades the beta cask from positional arguments only', () => {
    expect(DETACHED_UPGRADE_SCRIPT).toContain('"$1" update; "$1" upgrade --cask binary-media-art-beta');
    expect(DETACHED_UPGRADE_SCRIPT).toContain('kill -0 "$3"');
    expect(DETACHED_UPGRADE_SCRIPT).toContain('open "$2"');
    // Nothing the app computes is pasted into the script text.
    expect(DETACHED_UPGRADE_SCRIPT).not.toContain('${');
    expect(DETACHED_UPGRADE_SCRIPT).not.toContain('/Applications');
  });

  it.skipIf(process.platform === 'win32')('is valid shell', () => {
    expect(() => execFileSync('/bin/sh', ['-n', '-c', DETACHED_UPGRADE_SCRIPT], { stdio: 'pipe' })).not.toThrow();
  });
});
