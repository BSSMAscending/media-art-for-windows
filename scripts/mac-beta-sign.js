// Signs the packaged Mac beta with the one self-signed certificate kept in CI
// secrets (docs/windows-distribution.md). An ad-hoc signature's designated
// requirement is a cdhash that changes every build, so macOS forgot the camera
// permission after each update; a certificate-based requirement stays the same.
// No hardened runtime or entitlements: the app is not notarized, and the
// hardened runtime would need a camera entitlement.
// forge.config.js calls this from a postPackage hook, after the Fuses plugin's
// ad-hoc re-sign. It does nothing unless MAC_BETA_SIGN_IDENTITY is set.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { appBundle } = require('./channels');

const CODESIGN = '/usr/bin/codesign';

// identity is the certificate's SHA-1: codesign does not find an untrusted self-signed
// certificate by name. keychain is the temporary one the workflow imported it into.
function macBetaSignArgs({ identity, keychain }, appPath) {
  return ['--force', '--deep', '--sign', identity, ...(keychain ? ['--keychain', keychain] : []), appPath];
}

// Returns the apps it signed: none on other platforms or without an identity.
function signMacBetaApps({ platform, outputPaths, env = process.env, run = execFileSync }) {
  const identity = env.MAC_BETA_SIGN_IDENTITY;
  if (platform !== 'darwin' || !identity) return [];
  return outputPaths.map((outputPath) => {
    const appPath = path.join(outputPath, appBundle);
    run(CODESIGN, macBetaSignArgs({ identity, keychain: env.MAC_BETA_SIGN_KEYCHAIN }, appPath), {
      stdio: 'inherit',
    });
    return appPath;
  });
}

module.exports = { macBetaSignArgs, signMacBetaApps };
