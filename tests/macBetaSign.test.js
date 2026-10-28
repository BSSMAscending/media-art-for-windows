const path = require('node:path');
const { appBundle } = require('../scripts/channels');
const { macBetaSignArgs, signMacBetaApps } = require('../scripts/mac-beta-sign');

const SHA1 = 'c'.repeat(40);
const KEYCHAIN = '/tmp/runner/mac-beta-signing.keychain-db';

describe('Mac beta signing', () => {
  it('signs deeply with the certificate hash and its keychain, without the hardened runtime', () => {
    expect(macBetaSignArgs({ identity: SHA1, keychain: KEYCHAIN }, '/out/app.app')).toEqual([
      '--force',
      '--deep',
      '--sign',
      SHA1,
      '--keychain',
      KEYCHAIN,
      '/out/app.app',
    ]);
    const args = macBetaSignArgs({ identity: SHA1 }, '/out/app.app');
    expect(args).toEqual(['--force', '--deep', '--sign', SHA1, '/out/app.app']);
    expect(args).not.toContain('--options');
    expect(args).not.toContain('--entitlements');
  });

  it('signs the app in every packaged output directory', () => {
    const run = vi.fn();
    const outputPaths = ['/out/media-art-for-windows-darwin-arm64', '/out/media-art-for-windows-darwin-x64'];
    const signed = signMacBetaApps({
      platform: 'darwin',
      outputPaths,
      env: { MAC_BETA_SIGN_IDENTITY: SHA1, MAC_BETA_SIGN_KEYCHAIN: KEYCHAIN },
      run,
    });

    expect(signed).toEqual(outputPaths.map((dir) => path.join(dir, appBundle)));
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(
      1,
      '/usr/bin/codesign',
      macBetaSignArgs({ identity: SHA1, keychain: KEYCHAIN }, signed[0]),
      { stdio: 'inherit' }
    );
  });

  it('leaves the build alone without an identity or off macOS', () => {
    const run = vi.fn();
    const outputPaths = ['/out/media-art-for-windows-darwin-arm64'];
    const sign = (platform, env) => signMacBetaApps({ platform, outputPaths, env, run });

    expect(sign('darwin', {})).toEqual([]);
    expect(sign('darwin', { MAC_BETA_SIGN_IDENTITY: '' })).toEqual([]);
    expect(sign('win32', { MAC_BETA_SIGN_IDENTITY: SHA1 })).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('is a postPackage hook in forge.config.js, so it runs after the Fuses plugin re-signs', () => {
    const forgeConfig = require('../forge.config');
    expect(forgeConfig.hooks.postPackage).toBeTypeOf('function');
  });
});
