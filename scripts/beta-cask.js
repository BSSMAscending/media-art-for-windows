// Homebrew cask for one beta. The beta workflow fills the version and hashes
// and commits the result into the tap repository.
// Usage: node scripts/beta-cask.js <version> <arm64-sha256> <x64-sha256>
const { betaRepository, caskName, appBundle } = require('./channels');

const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+-beta\.[0-9]+$/;
const SHA256 = /^[a-f0-9]{64}$/;

function renderBetaCask({ version, armSha256, intelSha256 }) {
  if (!VERSION.test(version)) throw new Error(`Beta version must look like 1.1.0-beta.1: ${version}`);
  for (const sha of [armSha256, intelSha256]) {
    if (!SHA256.test(sha)) throw new Error(`Not a sha256: ${sha}`);
  }
  const asset = (arch) =>
    `https://github.com/${betaRepository}/releases/download/v#{version}/media-art-for-windows-darwin-${arch}-#{version}.zip`;
  return `cask "${caskName}" do
  version "${version}"

  on_arm do
    sha256 "${armSha256}"
    url "${asset('arm64')}"
  end
  on_intel do
    sha256 "${intelSha256}"
    url "${asset('x64')}"
  end

  name "Binary Media Art Beta"
  desc "Unsigned beta of the exhibit. Not the Windows release used on the floor."
  homepage "https://bssmascending.github.io/media-art-for-windows/#beta"

  app "${appBundle}"

  caveats <<~EOS
    This is a beta, not the Windows exhibit release.
    It is not notarized. If macOS blocks it, Control-click the app and choose Open.
    It does not update itself. The next beta is \`brew upgrade --cask ${caskName}\`.
  EOS
end
`;
}

if (require.main === module) {
  const [version, armSha256, intelSha256] = process.argv.slice(2);
  process.stdout.write(renderBetaCask({ version, armSha256, intelSha256 }));
}

module.exports = { renderBetaCask, VERSION };
