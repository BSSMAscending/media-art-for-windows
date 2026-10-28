// Where installers are published. The stable repository is the only feed baked
// into exhibit builds. Beta builds retarget the updater before packaging.
module.exports = {
  stableRepository: 'BSSMAscending/media-art-for-windows-releases',
  betaRepository: 'BSSMAscending/media-art-beta',
  // `brew tap BSSMAscending/tap` clones this repository.
  homebrewTap: 'BSSMAscending/homebrew-tap',
  caskName: 'binary-media-art-beta',
  appBundle: 'media-art-for-windows.app',
  // Prereleases of the next stable version. N is any integer ≥ 1 with no
  // leading zero: the line may stop at beta.3 or continue past beta.10.
  // 2.0.0-beta.10 still sorts after 2.0.0-beta.2. Shipping 2.0.0 on the
  // exhibit repository is what ends the line, whenever that happens.
  upcomingRelease: '2.0.0',
};
