// The exhibit updates itself from one repository. A beta must never be published
// there: update.electronjs.org would offer it to every installed 1.0.2.
// Usage:
//   node scripts/release-target.js stable <owner/repo> <X.Y.Z>
//   node scripts/release-target.js beta <X.Y.Z-beta.N>
const { betaRepository, homebrewTap, stableRepository } = require('./channels');
const { VERSION } = require('./beta-cask');

const STABLE_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function assertRepositoriesStaySplit() {
  const names = [stableRepository, betaRepository, homebrewTap];
  if (new Set(names).size !== names.length) {
    throw new Error(
      'Refusing to publish: the exhibit repository, the beta repository and the Homebrew tap must be three different repositories.'
    );
  }
  if (betaRepository.includes('media-art-for-windows-releases') || homebrewTap.includes('media-art-for-windows-releases')) {
    throw new Error('Refusing to publish a beta into the exhibit release repository.');
  }
}

function assertStableTarget(repository, version) {
  assertRepositoriesStaySplit();
  if (repository !== stableRepository) {
    throw new Error(`Refusing to publish a stable release to ${repository}.`);
  }
  if (!STABLE_VERSION.test(version)) {
    throw new Error(
      `Refusing to publish "${version}" to the exhibit. Stable releases are X.Y.Z only, so a beta cannot ride this workflow.`
    );
  }
}

function assertBetaVersion(version) {
  assertRepositoriesStaySplit();
  if (!VERSION.test(version)) {
    throw new Error(
      `Refusing to publish "${version}". A beta must look like 1.1.0-beta.1 and is never a stable X.Y.Z.`
    );
  }
  return `v${version}`;
}

function betaPublishArgs(version, extra) {
  const tag = assertBetaVersion(version);
  return ['--repo', betaRepository, tag, ...extra];
}

if (require.main === module) {
  const [channel, first, second] = process.argv.slice(2);
  if (channel === 'stable') assertStableTarget(first, second);
  else if (channel === 'beta') assertBetaVersion(first);
  else {
    console.error('Usage: node scripts/release-target.js <stable|beta> ...');
    process.exit(1);
  }
}

module.exports = { assertStableTarget, assertBetaVersion, betaPublishArgs };
