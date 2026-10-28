const UPDATE_CHECK_DELAY_MS = 5000;
const UPDATE_REPOSITORY = 'BSSMAscending/media-art-for-windows-releases';

// The Mac beta checks GitHub itself and updates through Homebrew: Squirrel.Mac would need
// an Apple Developer ID signature, which the self-signed beta does not have.
const MAC_BETA_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAC_BETA_REQUEST_TIMEOUT_MS = 15000;
const BREW_LIST_TIMEOUT_MS = 10000;
const BREW_PATHS = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
// Packaged builds have no scripts/ folder, so this repeats channels.caskName; a test
// keeps the two equal.
const MAC_BETA_CASK = 'binary-media-art-beta';
const MAC_BETA_LOG_NAME = 'mac-beta-update.log';

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

// X.Y.Z or X.Y.Z-beta.N, no leading zeros. Anything else is not a version we order.
const VERSION_PATTERN =
  /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})(?:-beta\.([1-9]\d{0,8}))?$/;

function parseVersion(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) return null;
  return {
    core: [match[1], match[2], match[3]].map(Number),
    beta: match[4] === undefined ? null : Number(match[4]),
  };
}

// -1, 0 or 1 like a sort comparator; null when either side is not a version.
// 2.0.0-beta.10 is above 2.0.0-beta.2, and 2.0.0 is above every 2.0.0-beta.N.
function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i += 1) {
    if (left.core[i] !== right.core[i]) return left.core[i] < right.core[i] ? -1 : 1;
  }
  if (left.beta === right.beta) return 0;
  if (left.beta === null) return 1;
  if (right.beta === null) return -1;
  return left.beta < right.beta ? -1 : 1;
}

function canCheckForMacBetaUpdates({ isPackaged, platform, version }) {
  return isPackaged && platform === 'darwin' && parseVersion(version)?.beta != null;
}

// The release page is opened and linked from the app, so it must be on GitHub.
function isTrustedReleaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com';
  } catch {
    return false;
  }
}

function appBundlePath(executablePath) {
  return /^(.+\.app)\/Contents\/MacOS\/[^/]+$/.exec(executablePath)?.[1] ?? null;
}

// Runs detached after the app quits. $1 is brew, $2 the app bundle, $3 the app's pid:
// they are positional arguments, never part of the script text.
// - Wait (up to 20s) for the app to exit, so brew does not replace a running bundle.
// - `brew update` first: a stale local tap would make `brew upgrade` do nothing.
// - brew runs in the background under a 300s watchdog, so a hung brew cannot keep the
//   app closed. Then reopen, retrying while LaunchServices catches up.
const DETACHED_UPGRADE_SCRIPT = `for i in $(seq 1 40); do kill -0 "$3" 2>/dev/null || break; sleep 0.5; done
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "$(date '+%F %T') brew upgrade --cask ${MAC_BETA_CASK}"
( "$1" update; "$1" upgrade --cask ${MAC_BETA_CASK} ) &
brew_pid=$!
for i in $(seq 1 300); do kill -0 "$brew_pid" 2>/dev/null || break; sleep 1; done
pkill -P "$brew_pid" 2>/dev/null
kill "$brew_pid" 2>/dev/null
for i in $(seq 1 15); do
  open "$2" 2>/dev/null && break
  sleep 1
done
`;

function createMacBetaUpdateController({
  app,
  sendStatus,
  shell,
  fetchFn,
  execFile,
  spawn,
  fs,
  logger = console,
  platform = process.platform,
  pid = process.pid,
  setTimeoutFn = setTimeout,
}) {
  // The newest release shown to the user: its page and the brew that can install it.
  let offered = null;
  let upgrading = false;

  const reportError = (error) => {
    logger.error('Mac 베타 업데이트를 확인하지 못했습니다.', error);
  };

  const findBrew = async () => {
    for (const brew of BREW_PATHS) {
      try {
        await new Promise((resolve, reject) => {
          execFile(
            brew,
            ['list', '--cask', MAC_BETA_CASK],
            { timeout: BREW_LIST_TIMEOUT_MS },
            (error) => (error ? reject(error) : resolve())
          );
        });
        return brew;
      } catch {
        // Not installed under this brew, or this brew is not here.
      }
    }
    return null;
  };

  const fetchLatestRelease = async () => {
    const response = await fetchFn(
      `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(MAC_BETA_REQUEST_TIMEOUT_MS),
      }
    );
    if (!response.ok) {
      throw new Error(`GitHub answered ${response.status}`);
    }
    return response.json();
  };

  const check = async () => {
    try {
      const release = await fetchLatestRelease();
      const tag = release?.tag_name;
      const version = typeof tag === 'string' && tag.startsWith('v') ? tag.slice(1) : tag;
      const order = compareVersions(version, app.getVersion());
      if (order === null) {
        throw new Error(`Not a version this app orders: ${tag}`);
      }
      if (order <= 0 || version === offered?.version) {
        return;
      }
      if (!isTrustedReleaseUrl(release.html_url)) {
        throw new Error(`The release page is not on github.com: ${release.html_url}`);
      }

      const brew = await findBrew();
      offered = { version, url: release.html_url, brew };
      sendStatus({ status: 'available', version, via: brew ? 'brew' : 'page' });
    } catch (error) {
      reportError(error);
    }
  };

  const launchBrewUpgrade = () => {
    const bundlePath = appBundlePath(app.getPath('exe'));
    if (!bundlePath) {
      reportError(new Error(`Not inside an app bundle: ${app.getPath('exe')}`));
      return false;
    }

    let log;
    try {
      const logDirectory = app.getPath('logs');
      fs.mkdirSync(logDirectory, { recursive: true });
      log = fs.openSync(`${logDirectory}/${MAC_BETA_LOG_NAME}`, 'a');
      const child = spawn(
        '/bin/sh',
        ['-c', DETACHED_UPGRADE_SCRIPT, 'sh', offered.brew, bundlePath, String(pid)],
        { detached: true, stdio: ['ignore', log, log] }
      );
      child.on('error', reportError);
      child.unref();
    } catch (error) {
      reportError(error);
      return false;
    } finally {
      if (log !== undefined) fs.closeSync(log);
    }
    return true;
  };

  return {
    start() {
      if (
        !canCheckForMacBetaUpdates({
          isPackaged: app.isPackaged,
          platform,
          version: app.getVersion(),
        })
      ) {
        return false;
      }

      const schedule = (delay) => {
        setTimeoutFn(async () => {
          await check();
          schedule(MAC_BETA_CHECK_INTERVAL_MS);
        }, delay);
      };
      schedule(UPDATE_CHECK_DELAY_MS);

      return true;
    },

    // The notice's button: update through brew and reopen, or show the release page.
    quitAndInstall() {
      if (!offered) {
        return false;
      }
      if (!offered.brew) {
        Promise.resolve(shell.openExternal(offered.url)).catch(reportError);
        return true;
      }
      if (upgrading) {
        return true;
      }
      if (!launchBrewUpgrade()) {
        return false;
      }

      upgrading = true;
      app.quit();
      return true;
    },
  };
}

module.exports = {
  DETACHED_UPGRADE_SCRIPT,
  MAC_BETA_CASK,
  MAC_BETA_CHECK_INTERVAL_MS,
  UPDATE_CHECK_DELAY_MS,
  UPDATE_REPOSITORY,
  appBundlePath,
  canCheckForMacBetaUpdates,
  canCheckForUpdates,
  compareVersions,
  createMacBetaUpdateController,
  createUpdateController,
  isSquirrelEvent,
  isTrustedReleaseUrl,
};
