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

// Splits the file at "## " headings. `accept` returns an entry, or null to skip
// that heading and the lines under it. Text before the first entry is skipped.
function parseEntries(changelog, accept) {
  const entries = [];
  let current = null;
  for (const line of changelog.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      current = accept(line);
      if (current) entries.push(current);
      continue;
    }
    current?.lines.push(line);
  }
  return entries.map(({ lines, ...entry }) => ({ ...entry, body: lines.join('\n').trim() }));
}

// "## [2.0.0-beta.12]". N is 1 or more with no leading zero.
const BETA_HEADING =
  /^## \[(\d+\.\d+\.\d+)-beta\.([1-9]\d*)\](?: - (\d{4}-\d{2}-\d{2}))?(?: - (.+?))?\s*$/;

// A heading that starts like a version but is neither a stable version nor a
// valid beta ("-beta1", "-Beta.1", "-beta.01", "-rc.1", text glued after the "]").
// It is a typo, so it is rejected instead of dropping its notes from the page.
const VERSION_LIKE_HEADING = /^## \[\d+\.\d+\.\d+/;

// The Unreleased section, every "## [X.Y.Z]" version, and every
// "## [X.Y.Z-beta.N]". A beta stays in this file; readReleaseNotes still ignores
// it. Which beta line is current is up to whoever publishes a beta, so the notes
// of an earlier line survive when the next one starts.
function parseChangelog(changelog) {
  return parseEntries(changelog, (line) => {
    const match = VERSION_HEADING.exec(line);
    const unreleased = /^## \[Unreleased\]/i.test(line);
    if (match || unreleased) {
      return {
        version: match ? match[1] : null,
        date: match?.[2] ?? null,
        title: match?.[3] ?? null,
        beta: false,
        lines: [],
      };
    }
    const beta = BETA_HEADING.exec(line);
    if (!beta) {
      if (VERSION_LIKE_HEADING.test(line)) {
        throw new Error(
          `A changelog heading must look like "## [1.2.3]" or "## [2.0.0-beta.1]" (beta numbers start at 1, no leading zero): ${line}`
        );
      }
      return null;
    }
    return {
      version: `${beta[1]}-beta.${beta[2]}`,
      date: beta[3] ?? null,
      title: beta[4] ?? null,
      beta: true,
      lines: [],
    };
  });
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

module.exports = { readReleaseNotes, parseChangelog, DEFAULT_TITLE };
