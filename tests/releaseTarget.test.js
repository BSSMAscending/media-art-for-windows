const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { convertVersion } = require('electron-winstaller');
const { betaRepository, homebrewTap, stableRepository, squirrelVersion } = require('../scripts/channels');
const {
  assertBetaVersion,
  assertNewerBeta,
  assertStableTarget,
  betaTarget,
} = require('../scripts/release-target');
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
    expect(assertBetaVersion('2.0.0-beta.999')).toBe('v2.0.0-beta.999');
    expect(betaTarget('2.0.0-beta.2')).toEqual({
      repository: betaRepository,
      tag: 'v2.0.0-beta.2',
      tap: homebrewTap,
    });
    expect(JSON.stringify(betaTarget('2.0.0-beta.2'))).not.toContain(stableRepository);
  });

  it('prints the repository, tag and tap for a workflow to read', () => {
    const output = execFileSync(process.execPath, [script, 'beta', '2.0.0-beta.2'], { encoding: 'utf8' });
    expect(output).toBe(`repository=${betaRepository}\ntag=v2.0.0-beta.2\ntap=${homebrewTap}\n`);
    expect(() => execFileSync(process.execPath, [script, 'beta', '2.0.0'], { stdio: 'pipe' })).toThrow();
    expect(() =>
      execFileSync(process.execPath, [script, 'stable', stableRepository, '2.0.0-beta.2'], { stdio: 'pipe' })
    ).toThrow();
  });

  it('refuses a stable number or a beta from another line', () => {
    expect(() => assertBetaVersion('2.0.0')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => assertBetaVersion('1.1.0-beta.1')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => assertBetaVersion('2.0.0-beta.01')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => assertBetaVersion('2.0.0-beta.1000')).toThrow(/2\.0\.0-beta\.1/);
    expect(() => betaTarget('2.0.0')).toThrow(/beta/);
  });
});

describe('beta numbers only go up', () => {
  it('accepts a beta above every published one, gaps included', () => {
    expect(() => assertNewerBeta('2.0.0-beta.1', [])).not.toThrow();
    expect(() => assertNewerBeta('2.0.0-beta.3', ['v2.0.0-beta.1', 'v2.0.0-beta.2'])).not.toThrow();
    expect(() => assertNewerBeta('2.0.0-beta.10', ['v2.0.0-beta.9', 'v2.0.0-beta.2'])).not.toThrow();
    expect(() => assertNewerBeta('2.0.0-beta.5', ['v2.0.0-beta.2'])).not.toThrow();
  });

  it('refuses a beta that is already published or numbered below one', () => {
    expect(() => assertNewerBeta('2.0.0-beta.2', ['v2.0.0-beta.2'])).toThrow(/already published/);
    expect(() => assertNewerBeta('2.0.0-beta.2', ['v2.0.0-beta.3', 'v2.0.0-beta.1'])).toThrow(/beta\.3/);
    expect(() => assertNewerBeta('2.0.0-beta.9', ['v2.0.0-beta.10'])).toThrow(/beta\.10/);
  });

  it('ignores tags that are not betas of this line', () => {
    const tags = ['v1.0.2', 'v1.0.3', 'v2.0.0', 'v1.1.0-beta.40', 'v0.9.0'];
    expect(() => assertNewerBeta('2.0.0-beta.1', tags)).not.toThrow();
  });

  it('reads the published tags from stdin in the CLI', () => {
    const run = (version, input) =>
      execFileSync(process.execPath, [script, 'beta-newer', version], { input, stdio: 'pipe' });
    expect(() => run('2.0.0-beta.4', 'v1.0.2\nv2.0.0-beta.3\n\n')).not.toThrow();
    expect(() => run('2.0.0-beta.3', 'v1.0.2\nv2.0.0-beta.3\n')).toThrow();
    expect(() => run('2.0.0-beta.1', '')).not.toThrow();
  });
});

describe('Squirrel version of a beta', () => {
  // Squirrel.Windows compares the text after the dash as one string.
  const ordinalOrder = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  it('is what electron-winstaller writes into the nupkg, dots and all', () => {
    expect(squirrelVersion('2.0.0-beta.1')).toBe('2.0.0-beta001');
    expect(squirrelVersion('2.0.0-beta.10')).toBe('2.0.0-beta010');
    expect(squirrelVersion('2.0.0-beta.999')).toBe('2.0.0-beta999');
    expect(convertVersion(squirrelVersion('2.0.0-beta.10'))).toBe('2.0.0-beta010');
  });

  it('keeps the unpadded number from sorting beta.10 before beta.9', () => {
    expect(ordinalOrder(convertVersion('2.0.0-beta.10'), convertVersion('2.0.0-beta.9'))).toBe(-1);
    expect(ordinalOrder(squirrelVersion('2.0.0-beta.10'), squirrelVersion('2.0.0-beta.9'))).toBe(1);
  });

  it('orders every beta number after the one before it', () => {
    for (let n = 1; n < 999; n += 1) {
      const lower = squirrelVersion(`2.0.0-beta.${n}`);
      const higher = squirrelVersion(`2.0.0-beta.${n + 1}`);
      expect(ordinalOrder(lower, higher)).toBe(-1);
    }
  });

  it('leaves a stable version alone, and the repository stays on one', () => {
    expect(squirrelVersion('1.0.2')).toBe('1.0.2');
    const { version } = require('../package.json');
    expect(squirrelVersion(version)).toBe(version);
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
