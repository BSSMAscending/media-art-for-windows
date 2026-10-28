// Builds the GitHub Pages site into _site/: the pages in site/, the README
// screenshots, and a patch notes page generated from CHANGELOG.md, so the site
// never disagrees with the release notes. Beta headings in that file stay in the
// same list, between the stable version they follow and the one they precede.
// Usage: node scripts/build-site.js [outDir]
const fs = require('node:fs');
const path = require('node:path');
const { parseChangelog } = require('./changelog');
const { betaRepository, stableRepository } = require('./channels');

const ROOT = path.join(__dirname, '..');
const RELEASES_URL = `https://github.com/${stableRepository}/releases`;
const BETA_URL = `https://github.com/${betaRepository}/releases/latest`;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// `code`, **bold** and [links](https://…) on already escaped text.
function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** Renders the small Markdown subset CHANGELOG.md uses: ### headings, - lists, paragraphs. */
function renderMarkdown(markdown) {
  const html = [];
  let list = null;
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list)
      html.push(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
    list = null;
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      html.push(`<h3>${renderInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('- ')) {
      flushParagraph();
      (list ||= []).push(line.slice(2));
    } else if (!line) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return html.join('\n');
}

function formatDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}. ${month}. ${day}.`;
}

// Both languages side by side; the page shows one by its data-lang (see site/app.js).
function bilingual(ko, en, tag = 'span') {
  return `<${tag} data-l="ko">${ko}</${tag}><${tag} data-l="en">${en}</${tag}>`;
}

// The note that tells a visitor why an entry is not on the exhibit PCs: a beta
// never ships there, and an undated change is not there yet.
function exhibitNote(entry) {
  const note = (ko, en) => `<span class="release-note">${bilingual(ko, en)}</span>`;
  if (entry.beta) return note('전시 PC에는 나가지 않습니다', 'Not shipped to the exhibit PCs');
  if (!entry.date) return note('아직 전시 PC에 배포되지 않은 변경입니다', 'Not on the exhibit PCs yet');
  return '';
}

// The classes that mark an entry the exhibit is not running: Unreleased, or a beta.
function stateClasses(entry) {
  if (!entry.version) return ['is-upcoming'];
  return entry.beta ? ['is-beta'] : [];
}

// Newest first; Unreleased on top. A beta sorts below the stable version it
// precedes and above the previous release, so a missing stable release leaves
// its betas directly above the one before.
function newestFirst(a, b) {
  if (!a.sortKey) return b.sortKey ? -1 : 0;
  if (!b.sortKey) return 1;
  for (let i = 0; i < a.sortKey.length; i += 1) {
    if (a.sortKey[i] !== b.sortKey[i]) return b.sortKey[i] < a.sortKey[i] ? -1 : 1;
  }
  return 0;
}

/**
 * The version list and one article per entry, newest first, in Korean and English.
 * `english` comes from CHANGELOG.en.md; a version missing there shows its Korean
 * notes in both. An empty Unreleased section is left out. Betas of the next
 * stable version sit between that version and the previous stable release.
 */
function renderPatchNotes(entries, english = []) {
  const shown = entries.filter((entry) => entry.version || entry.body).sort(newestFirst);
  const id = (entry) => (entry.version ? `v${entry.version}` : 'upcoming');
  const translationOf = (entry) => english.find((other) => other.version === entry.version);
  const titleOf = (entry) =>
    entry.version
      ? bilingual(
          escapeHtml(entry.title || ''),
          escapeHtml(translationOf(entry)?.title || entry.title || '')
        )
      : bilingual('준비 중', 'In progress');
  // The side list (a bar on narrow screens) the page keeps in view; see site/app.js.
  const index = shown
    .map((entry) => {
      const classes = stateClasses(entry).join(' ');
      return `<li><a href="#${id(entry)}"${classes ? ` class="${classes}"` : ''}><span class="toc-version">${
        entry.version ? `v${entry.version}` : bilingual('다음 버전', 'Next')
      }</span><span class="toc-title">${titleOf(entry)}</span></a></li>`;
    })
    .join('\n');
  const notes = shown
    .map((entry) => {
      const upcoming = !entry.version;
      const translation = translationOf(entry);
      const label = upcoming ? bilingual('다음 버전', 'Next version') : `v${entry.version}`;
      const when = entry.date ? `<time datetime="${entry.date}">${formatDate(entry.date)}</time>` : '';
      const englishBody = translation?.body
        ? renderMarkdown(translation.body)
        : `<p class="release-note">Notes for this version are in Korean.</p>\n${renderMarkdown(entry.body)}`;
      return `<article class="${['release', ...stateClasses(entry)].join(' ')}" id="${id(entry)}">
  <header class="release-head">
    <span class="release-version">${label}</span>
    <h2 class="release-title">${titleOf(entry)}</h2>
    ${when}${exhibitNote(entry)}
  </header>
  <div class="release-body" data-l="ko">
${renderMarkdown(entry.body)}
  </div>
  <div class="release-body" data-l="en">
${englishBody}
  </div>
</article>`;
    })
    .join('\n');
  return { index, notes };
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function build(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'site'), outDir);
  copyDir(path.join(ROOT, 'docs/images/readme'), path.join(outDir, 'images'));

  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const read = (file) => {
    const full = path.join(ROOT, file);
    return fs.existsSync(full) ? parseChangelog(fs.readFileSync(full, 'utf8')) : [];
  };
  const entries = read('CHANGELOG.md');
  const { index, notes } = renderPatchNotes(entries, read('CHANGELOG.en.md'));
  const upcoming = entries.some((entry) => !entry.version && entry.body);
  const values = {
    '{{VERSION}}': escapeHtml(version),
    '{{DOWNLOAD_URL}}': `${RELEASES_URL}/latest`,
    '{{BETA_URL}}': BETA_URL,
    '{{UPCOMING_NOTE}}': upcoming
      ? bilingual(
          '다음 버전 준비 중 · <a href="patch-notes.html#upcoming">무엇이 바뀌나요?</a>',
          'Next version in progress · <a href="patch-notes.html#upcoming">What changes?</a>'
        )
      : bilingual(
          '<a href="patch-notes.html">패치노트</a>',
          '<a href="patch-notes.html">Patch notes</a>'
        ),
    '<!-- PATCH_NOTES_INDEX -->': index,
    '<!-- PATCH_NOTES -->': notes,
  };
  for (const file of fs.readdirSync(outDir).filter((name) => name.endsWith('.html'))) {
    const target = path.join(outDir, file);
    let html = fs.readFileSync(target, 'utf8');
    for (const [placeholder, value] of Object.entries(values)) {
      html = html.split(placeholder).join(value);
    }
    fs.writeFileSync(target, html);
  }
  return outDir;
}

if (require.main === module) {
  const outDir = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
  console.log(`Site built in ${build(outDir)}`);
}

module.exports = { renderMarkdown, renderPatchNotes, bilingual, build };
