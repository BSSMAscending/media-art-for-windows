const path = require('node:path');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { squirrelVersion } = require('./scripts/channels');
const { signMacBetaApps } = require('./scripts/mac-beta-sign');
const { version } = require('./package.json');

// A beta's NuGet version is zero-padded (2.0.0-beta.10 becomes 2.0.0-beta010) so
// Squirrel.Windows orders the betas by number. Stable versions are left as they are.
// Forge still lists the unpadded nupkg name in its make result; nothing here reads it.
const nugetVersion = squirrelVersion(version);

// The site's brand mark, drawn by scripts/build-app-icons.js. Packager adds .icns
// on macOS and .ico on Windows. Control Panel shows the installed app with
// iconUrl, which Squirrel downloads, so it points at the file on main.
const ICON = path.join(__dirname, 'assets', 'icon', 'icon');
const ICON_URL =
  'https://raw.githubusercontent.com/BSSMAscending/media-art-for-windows/main/assets/icon/icon.ico';

module.exports = {
  packagerConfig: {
    asar: true,
    icon: ICON,
    // Ship only what the app runs: docs, the project site, tests and dev tooling
    // stay out of the installer. Replacing Forge's ignore list drops its /out/ rule,
    // so it is listed again here.
    ignore: [
      /^\/out\//,
      // Root dot files and folders: git, CI, hooks, editor and tool settings.
      /^\/\.[^/]+/,
      /^\/(assets|docs|site|tests|scripts)(\/|$)/,
      /^\/[^/]+\.md$/,
      /^\/(eslint\.config\.js|vitest\.config\.mjs|forge\.config\.js)$/,
    ],
  },
  rebuildConfig: {},
  hooks: {
    // The Fuses plugin re-signs the app ad hoc while packaging, so the beta's stable
    // certificate has to go on afterwards. Only the beta workflow sets the identity.
    postPackage: async (_forgeConfig, { platform, outputPaths }) => {
      signMacBetaApps({ platform, outputPaths });
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: `${ICON}.ico`,
        iconUrl: ICON_URL,
        ...(nugetVersion === version ? {} : { version: nugetVersion }),
      },
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
