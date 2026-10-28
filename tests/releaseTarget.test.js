const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { betaRepository, stableRepository } = require('../scripts/channels');
const { assertBetaVersion, assertStableTarget, betaTarget } = require('../scripts/release-target');
const { renderBetaCask } = require('../scripts/beta-cask');
const { setUpdateRepository } = require('../scripts/set-update-repository');

const script = path.join(__dirname, '..', 'scripts', 'release-target.js');
const ARM = 'a'.repeat(64);
const INTEL = 'b'.repeat(64);

describe('release targets stay split', () => {
  it('publishes a stable X.Y.Z only to the exhibit repository', () => {
    expect(() => assertStableTarget(stableRepository, '1.0.3')).not.toThrow();
  });

  it('refuses a beta version on the exhibit workflow', () => {
    expect(() => assertStableTarget(stableRepository, '2.0.0-beta.1')).toThrow(/exhibit/);
    expect(() => assertStableTarget(betaRepository, '2.0.0')).toThrow(/Refusing/);
  });

  it('publishes a beta only as a beta tag on the beta repository', () => {
    expect(assertBetaVersion('2.0.0-beta.1')).toBe('v2.0.0-beta.1');
    expect(assertBetaVersion('2.0.0-beta.10')).toBe('v2.0.0-beta.10');
    expect(assertBetaVersion('2.0.0-beta.12')).toBe('v2.0.0-beta.12');
    expect(betaTarget('2.0.0-beta.2')).toEqual({ repository: betaRepository, tag: 'v2.0.0-beta.2' });
    expect(JSON.stringify(betaTarget('2.0.0-beta.2'))).not.toContain(stableRepository);
  });

  it('prints the repository and tag for a workflow to read', () => {
    const output = execFileSync(process.execPath, [script, 'beta', '2.0.0-beta.2'], { encoding: 'utf8' });
    expect(output).toBe(`repository=${betaRepository}\ntag=v2.0.0-beta.2\n`);
    expect(() => execFileSync(process.execPath, [script, 'beta', '2.0.0'], { stdio: 'pipe' })).toThrow();
    expect(() =>
      execFileSync(process.execPath, [script, 'stable', stableRepository, '2.0.0-beta.2'], { stdio: 'pipe' })
    ).toThrow();
  });

  it('refuses a stable number or a beta from another line', () => {
    expect(() => assertBetaVersion('2.0.0')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => assertBetaVersion('1.1.0-beta.1')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => assertBetaVersion('2.0.0-beta.01')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => betaTarget('2.0.0')).toThrow(/beta/);
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
    const cask = renderBetaCask({ version: '2.0.0-beta.1', armSha256: ARM, intelSha256: INTEL });
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
