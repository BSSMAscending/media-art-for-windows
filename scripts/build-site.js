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

/** The version index and one article per entry; an empty Unreleased section is left out. */
function renderPatchNotes(entries) {
  const shown = entries.filter((entry) => entry.version || entry.body);
  const id = (entry) => (entry.version ? `v${entry.version}` : 'upcoming');
  const index = shown
    .map(
      (entry) => `<a href="#${id(entry)}">${entry.version ? `v${entry.version}` : '다음 버전'}</a>`
    )
    .join('\n');
  const notes = shown
    .map((entry) => {
      const upcoming = !entry.version;
      const label = upcoming ? '다음 버전' : `v${entry.version}`;
      const title = upcoming ? '준비 중' : entry.title || '';
      const date = entry.date
        ? `<time datetime="${entry.date}">${formatDate(entry.date)}</time>`
        : '<span class="release-note">아직 전시 PC에 배포되지 않은 변경입니다</span>';
      return `<article class="release${upcoming ? ' is-upcoming' : ''}" id="${id(entry)}">
  <header class="release-head">
    <span class="release-version">${label}</span>
    <h2 class="release-title">${escapeHtml(title)}</h2>
    ${date}
  </header>
  <div class="release-body">
${renderMarkdown(entry.body)}
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
  const entries = parseChangelog(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'));
  const { index, notes } = renderPatchNotes(entries);
  const upcoming = entries.some((entry) => !entry.version && entry.body);
  const values = {
    '{{VERSION}}': escapeHtml(version),
    '{{DOWNLOAD_URL}}': `${RELEASES_URL}/latest`,
    '{{UPCOMING_NOTE}}': upcoming
      ? '다음 버전 준비 중 · <a href="patch-notes.html#upcoming">무엇이 바뀌나요?</a>'
      : '<a href="patch-notes.html">패치노트</a>',
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

module.exports = { renderMarkdown, renderPatchNotes, build };
