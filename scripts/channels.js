// Where installers are published. The stable repository is the only feed baked
// into exhibit builds. Beta builds retarget the updater before packaging.
module.exports = {
  stableRepository: 'BSSMAscending/media-art-for-windows-releases',
  betaRepository: 'BSSMAscending/media-art-beta',
  // `brew tap BSSMAscending/tap` clones this repository.
  homebrewTap: 'BSSMAscending/homebrew-tap',
  caskName: 'binary-media-art-beta',
  appBundle: 'media-art-for-windows.app',
};
