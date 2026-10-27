// Reads one version's entry from CHANGELOG.md for its GitHub Release.
// Usage: node scripts/changelog.js <version> [notesFile]
// Prints the release title and writes the entry body to notesFile.
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_TITLE = 'Busan Mathematical Culture Center – Media Art';

// "## [1.2.3]", optionally followed by " - 2026-10-28" and/or " - 제목".
const VERSION_HEADING = /^## \[(\d+\.\d+\.\d+)\](?: - (\d{4}-\d{2}-\d{2}))?(?: - (.+?))?\s*$/;

function readReleaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => VERSION_HEADING.exec(line)?.[1] === version);
  if (start === -1) {
    throw new Error(`CHANGELOG.md has no "## [${version}]" entry.`);
  }
  const next = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const body = lines
    .slice(start + 1, next === -1 ? undefined : next)
    .join('\n')
    .trim();
  if (!body) {
    throw new Error(`CHANGELOG.md entry for ${version} is empty.`);
  }
  const customTitle = VERSION_HEADING.exec(lines[start])[3];
  return { title: `v${version} ${customTitle || DEFAULT_TITLE}`, body };
}

if (require.main === module) {
  const [version, notesFile] = process.argv.slice(2);
  try {
    const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
    const { title, body } = readReleaseNotes(changelog, version);
    if (notesFile) fs.writeFileSync(notesFile, `${body}\n`);
    process.stdout.write(title);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { readReleaseNotes, DEFAULT_TITLE };
