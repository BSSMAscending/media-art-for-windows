// Where installers are published and which version numbers belong to which
// channel. The stable repository is the only feed baked into exhibit builds.
// Beta builds retarget the updater before packaging.
const upcomingRelease = '2.0.0';

// The version grammar, written once. Regular expression sources, so the changelog
// (scripts/changelog.js) builds its heading rules from the same text as the
// release guard, the cask and the Squirrel version below.
const VERSION_CORE = '[0-9]+\\.[0-9]+\\.[0-9]+';
// N of 2.0.0-beta.N is 1 to 999 with no leading zero: the line may stop at
// beta.3 or continue past beta.10. The cap keeps squirrelVersion's padding true,
// and a heading above it could never be published, so every rule shares it.
const BETA_NUMBER = '[1-9][0-9]{0,2}';
const betaSource = (core) => `${core}-beta\\.(${BETA_NUMBER})`;

// Exhibit releases are X.Y.Z only: update.electronjs.org offers the newest one
// to every installed exhibit.
const STABLE_VERSION = new RegExp(`^${VERSION_CORE}$`);

if (!STABLE_VERSION.test(upcomingRelease)) {
  throw new Error(`The next stable version must look like 2.0.0: ${upcomingRelease}`);
}

// Prereleases of the next stable version, 2.0.0-beta.N: this line only.
// Group 1 is N.
const BETA_VERSION = new RegExp(`^${betaSource(upcomingRelease.replaceAll('.', '\\.'))}$`);

// The same rules as unanchored sources for the changelog, which keeps the notes
// of every line: STABLE_SOURCE captures X.Y.Z, BETA_SOURCE captures the line
// X.Y.Z and then N, so 2.0.0-beta.N stays valid there after upcomingRelease
// moves on.
const STABLE_SOURCE = `(${VERSION_CORE})`;
const BETA_SOURCE = betaSource(STABLE_SOURCE);

// The version Squirrel.Windows sees. NuGet (SemVer 1.0) compares the text after
// the dash as one string, and electron-winstaller drops the dot from `beta.10`,
// so `beta10` would sort before `beta9` and testers on beta.9 would never be
// offered beta.10. Padding N to three digits keeps string order equal to number
// order. The app's own version and the tag stay 2.0.0-beta.N.
function squirrelVersion(version) {
  const beta = BETA_VERSION.exec(version);
  return beta ? `${upcomingRelease}-beta${beta[1].padStart(3, '0')}` : version;
}

module.exports = {
  stableRepository: 'BSSMAscending/media-art-for-windows-releases',
  betaRepository: 'BSSMAscending/media-art-beta',
  // `brew tap BSSMAscending/tap` clones this repository.
  homebrewTap: 'BSSMAscending/homebrew-tap',
  caskName: 'binary-media-art-beta',
  appBundle: 'media-art-for-windows.app',
  // Shipping this version on the exhibit repository is what ends the beta line,
  // whenever that happens. Windows betas stay on the beta feed: testers reinstall
  // the stable release (docs/windows-distribution.md).
  upcomingRelease,
  STABLE_VERSION,
  BETA_VERSION,
  STABLE_SOURCE,
  BETA_SOURCE,
  squirrelVersion,
};
