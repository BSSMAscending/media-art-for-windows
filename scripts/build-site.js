// Builds the GitHub Pages site into _site/: the pages in site/, the README
// screenshots, and a patch notes page generated from CHANGELOG.md, so the site
// never disagrees with the release notes.
// Usage: node scripts/build-site.js [outDir]
const fs = require('node:fs');
const path = require('node:path');
const { parseChangelog } = require('./changelog');

const ROOT = path.join(__dirname, '..');
const RELEASES_URL = 'https://github.com/BSSMAscending/media-art-for-windows-releases/releases';

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

/**
 * The version list and one article per entry, newest first, in Korean and English.
 * `english` comes from CHANGELOG.en.md; a version missing there shows its Korean
 * notes in both. An empty Unreleased section is left out.
 */
function renderPatchNotes(entries, english = []) {
  const shown = entries.filter((entry) => entry.version || entry.body);
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
    .map(
      (entry) =>
        `<li><a href="#${id(entry)}"${entry.version ? '' : ' class="is-upcoming"'}><span class="toc-version">${
          entry.version ? `v${entry.version}` : bilingual('다음 버전', 'Next')
        }</span><span class="toc-title">${titleOf(entry)}</span></a></li>`
    )
    .join('\n');
  const notes = shown
    .map((entry) => {
      const upcoming = !entry.version;
      const translation = translationOf(entry);
      const label = upcoming ? bilingual('다음 버전', 'Next version') : `v${entry.version}`;
      const date = entry.date
        ? `<time datetime="${entry.date}">${formatDate(entry.date)}</time>`
        : `<span class="release-note">${bilingual(
            '아직 전시 PC에 배포되지 않은 변경입니다',
            'Not on the exhibit PCs yet'
          )}</span>`;
      const englishBody = translation?.body
        ? renderMarkdown(translation.body)
        : `<p class="release-note">Notes for this version are in Korean.</p>\n${renderMarkdown(entry.body)}`;
      return `<article class="release${upcoming ? ' is-upcoming' : ''}" id="${id(entry)}">
  <header class="release-head">
    <span class="release-version">${label}</span>
    <h2 class="release-title">${titleOf(entry)}</h2>
    ${date}
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
  const read = (file) =>
    fs.existsSync(path.join(ROOT, file))
      ? parseChangelog(fs.readFileSync(path.join(ROOT, file), 'utf8'))
      : [];
  const entries = read('CHANGELOG.md');
  const { index, notes } = renderPatchNotes(entries, read('CHANGELOG.en.md'));
  const upcoming = entries.some((entry) => !entry.version && entry.body);
  const values = {
    '{{VERSION}}': escapeHtml(version),
    '{{DOWNLOAD_URL}}': `${RELEASES_URL}/latest`,
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
