// Points a packaged build at a release repository. The source tree stays on the
// stable repository; the beta workflow rewrites the constant only in CI.
// Usage: node scripts/set-update-repository.js <owner/repo>
const fs = require('node:fs');
const path = require('node:path');
const { stableRepository } = require('./channels');

const UPDATER = path.join(__dirname, '..', 'src', 'main', 'updater.js');
const DECLARATION = `const UPDATE_REPOSITORY = '${stableRepository}'`;

function setUpdateRepository(source, repository) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Not an owner/repo name: ${repository}`);
  }
  if (!source.includes(DECLARATION)) {
    throw new Error('updater.js is not pinned to the stable release repository.');
  }
  const next = source.replaceAll(DECLARATION, `const UPDATE_REPOSITORY = '${repository}'`);
  if (repository !== stableRepository && next.includes(stableRepository)) {
    throw new Error('The stable release repository is still in updater.js.');
  }
  return next;
}

function writeUpdateRepository(repository, file = UPDATER) {
  fs.writeFileSync(file, setUpdateRepository(fs.readFileSync(file, 'utf8'), repository));
}

if (require.main === module) {
  const repository = process.argv[2];
  if (!repository) {
    console.error('Usage: node scripts/set-update-repository.js <owner/repo>');
    process.exit(1);
  }
  writeUpdateRepository(repository);
}

module.exports = { setUpdateRepository, DECLARATION };
