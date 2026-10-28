const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { squirrelVersion } = require('./scripts/channels');
const { version } = require('./package.json');

// A beta's NuGet version is zero-padded (2.0.0-beta.10 becomes 2.0.0-beta010) so
// Squirrel.Windows orders the betas by number. Stable versions are left as they are.
// Forge still lists the unpadded nupkg name in its make result; nothing here reads it.
const nugetVersion = squirrelVersion(version);

module.exports = {
  packagerConfig: {
    asar: true,
    // Ship only what the app runs: docs, the project site, tests and dev tooling
    // stay out of the installer. Replacing Forge's ignore list drops its /out/ rule,
    // so it is listed again here.
    ignore: [
      /^\/out\//,
      // Root dot files and folders: git, CI, hooks, editor and tool settings.
      /^\/\.[^/]+/,
      /^\/(docs|site|tests|scripts)(\/|$)/,
      /^\/[^/]+\.md$/,
      /^\/(eslint\.config\.js|vitest\.config\.mjs|forge\.config\.js)$/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: nugetVersion === version ? {} : { version: nugetVersion },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
