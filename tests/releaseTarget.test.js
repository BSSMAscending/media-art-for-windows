const { betaRepository, stableRepository } = require('../scripts/channels');
const { assertBetaVersion, assertStableTarget, betaPublishArgs } = require('../scripts/release-target');
const { renderBetaCask } = require('../scripts/beta-cask');
const { setUpdateRepository } = require('../scripts/set-update-repository');

const ARM = 'a'.repeat(64);
const INTEL = 'b'.repeat(64);

describe('release targets stay split', () => {
  it('publishes a stable X.Y.Z only to the exhibit repository', () => {
    expect(() => assertStableTarget(stableRepository, '1.0.3')).not.toThrow();
  });

  it('refuses a beta version on the exhibit workflow', () => {
    expect(() => assertStableTarget(stableRepository, '1.1.0-beta.1')).toThrow(/exhibit/);
    expect(() => assertStableTarget(betaRepository, '1.0.3')).toThrow(/Refusing/);
  });

  it('publishes a beta only as a beta tag on the beta repository', () => {
    expect(assertBetaVersion('1.1.0-beta.1')).toBe('v1.1.0-beta.1');
    expect(betaPublishArgs('1.1.0-beta.2', ['--title', 'beta'])).toEqual([
      '--repo',
      betaRepository,
      'v1.1.0-beta.2',
      '--title',
      'beta',
    ]);
    expect(betaPublishArgs('1.1.0-beta.2', [])).not.toContain('--prerelease');
    expect(betaPublishArgs('1.1.0-beta.2', []).join(' ')).not.toContain(stableRepository);
  });

  it('refuses to send a stable version number through the beta workflow', () => {
    expect(() => assertBetaVersion('1.0.3')).toThrow(/beta/);
    expect(() => betaPublishArgs('1.0.3', [])).toThrow(/beta/);
  });
});

describe('beta packaging', () => {
  const updater = "const UPDATE_REPOSITORY = 'BSSMAscending/media-art-for-windows-releases';\n";

  it('retargets a beta build away from the exhibit feed', () => {
    const next = setUpdateRepository(updater, betaRepository);
    expect(next).toContain(betaRepository);
    expect(next).not.toContain(stableRepository);
  });

  it('refuses to retarget a file that is not the stable default', () => {
    expect(() => setUpdateRepository(updater.replace(stableRepository, betaRepository), betaRepository)).toThrow(
      /stable/
    );
  });

  it('writes a Homebrew cask that downloads the beta repository only', () => {
    const cask = renderBetaCask({ version: '1.1.0-beta.1', armSha256: ARM, intelSha256: INTEL });
    expect(cask).toContain('cask "binary-media-art-beta"');
    expect(cask).toContain(`github.com/${betaRepository}/releases/download/v#{version}/`);
    expect(cask).toContain('media-art-for-windows-darwin-arm64-#{version}.zip');
    expect(cask).toContain('media-art-for-windows-darwin-x64-#{version}.zip');
    expect(cask).toContain('postflight_steps do');
    expect(cask).toContain('"/usr/bin/xattr"');
    expect(cask).toContain('"-dr", "com.apple.quarantine", "{{appdir}}/media-art-for-windows.app"');
    expect(cask).toContain('"/usr/bin/codesign"');
    expect(cask).toContain('"--force", "--deep", "-s", "-", "{{appdir}}/media-art-for-windows.app"');
    expect(cask).not.toMatch(/^\s*postflight do\s*$/m);
    expect(cask).not.toContain('Control-click');
    expect(cask).not.toContain(stableRepository);
    expect(() => renderBetaCask({ version: '1.0.3', armSha256: ARM, intelSha256: INTEL })).toThrow(/beta/);
  });
});
