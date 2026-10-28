const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renderMarkdown, renderPatchNotes, bilingual, build } = require('../scripts/build-site');
const { parseChangelog } = require('../scripts/changelog');

describe('site Markdown', () => {
  it('renders headings, lists and paragraphs', () => {
    expect(renderMarkdown('### 새 기능\n\n- 하나\n- 둘\n\n한 줄\n이어서')).toBe(
      '<h3>새 기능</h3>\n<ul><li>하나</li><li>둘</li></ul>\n<p>한 줄 이어서</p>'
    );
  });

  it('formats inline code, bold and web links, and escapes HTML', () => {
    expect(renderMarkdown('`R` **굵게** [링크](https://example.com) <b>&')).toBe(
      '<p><code>R</code> <strong>굵게</strong> <a href="https://example.com">링크</a> &lt;b&gt;&amp;</p>'
    );
  });

  it('leaves non-web links as text', () => {
    expect(renderMarkdown('[문서](docs/a.md)')).toBe('<p>[문서](docs/a.md)</p>');
  });
});

describe('patch notes', () => {
  const changelog = `# 변경 기록

## [Unreleased]

- 준비 중인 변경

## [1.1.0] - 2026-10-28 - 새 모드

### 새 기능

- 수학 처리

## [1.0.0] - 2026-08-25
- 첫 버전
`;

  it('lists every version newest first, with its title, in the side list', () => {
    const { index, notes } = renderPatchNotes(parseChangelog(changelog));
    expect(index.match(/href="#[^"]+"/g)).toEqual([
      'href="#upcoming"',
      'href="#v1.1.0"',
      'href="#v1.0.0"',
    ]);
    expect(index).toContain(
      `<li><a href="#v1.1.0"><span class="toc-version">v1.1.0</span><span class="toc-title">${bilingual('새 모드', '새 모드')}</span></a></li>`
    );
    expect(index).toContain(`<a href="#upcoming" class="is-pending is-upcoming">`);
    expect(notes).toContain('<article class="release" id="v1.1.0">');
    expect(notes).toContain('<span data-l="ko">새 모드</span>');
    expect(notes).toContain('<time datetime="2026-10-28">2026. 10. 28.</time>');
  });

  it('shows the English notes for a version, or its Korean notes with a note', () => {
    const english = parseChangelog('## [1.1.0] - 2026-10-28 - New mode\n\n- Image math\n');
    const { notes } = renderPatchNotes(parseChangelog(changelog), english);
    const v110 = notes.slice(notes.indexOf('id="v1.1.0"'), notes.indexOf('id="v1.0.0"'));
    expect(v110).toContain('<span data-l="en">New mode</span>');
    expect(v110).toContain('<li>Image math</li>');
    const v100 = notes.slice(notes.indexOf('id="v1.0.0"'));
    expect(v100).toContain('Notes for this version are in Korean.');
    expect(v100.match(/<li>첫 버전<\/li>/g)).toHaveLength(2);
  });

  it('places betas between the stable release and the one before it', () => {
    const mixed = `## [1.0.2] - 2026-10-28
- 지금

## [2.0.0-beta.2] - 2026-11-02 - 둘째
- 시험

## [2.0.0] - 2026-12-01 - 정식
- 나중

## [2.0.0-beta.12] - 2026-11-20 - 열둘
- 더 나중 시험
`;
    const english = `## [2.0.0-beta.12] - 2026-11-20 - Twelfth\n\n- Later trial\n`;
    const { index, notes } = renderPatchNotes(parseChangelog(mixed), parseChangelog(english));
    expect(index.match(/href="#[^"]+"/g)).toEqual([
      'href="#v2.0.0"',
      'href="#v2.0.0-beta.12"',
      'href="#v2.0.0-beta.2"',
      'href="#v1.0.2"',
    ]);
    expect(index).toContain('href="#v2.0.0-beta.12" class="is-pending is-beta"');
    expect(notes).toContain('<article class="release is-pending is-beta" id="v2.0.0-beta.12">');
    expect(notes).toContain('전시 PC에는 나가지 않습니다');
    expect(notes).toContain('<span data-l="en">Twelfth</span>');
    const at = (id) => notes.indexOf(`id="${id}"`);
    expect(at('v2.0.0')).toBeLessThan(at('v2.0.0-beta.12'));
    expect(at('v2.0.0-beta.12')).toBeLessThan(at('v2.0.0-beta.2'));
    expect(at('v2.0.0-beta.2')).toBeLessThan(at('v1.0.2'));
    const withoutStable = mixed.replace('## [2.0.0] - 2026-12-01 - 정식\n- 나중\n', '');
    const parked = renderPatchNotes(parseChangelog(withoutStable)).index;
    expect(parked.match(/href="#[^"]+"/g)).toEqual([
      'href="#v2.0.0-beta.12"',
      'href="#v2.0.0-beta.2"',
      'href="#v1.0.2"',
    ]);
  });

  it('marks the Unreleased section as not yet deployed, and hides it when empty', () => {
    const { notes } = renderPatchNotes(parseChangelog(changelog));
    expect(notes).toContain('<article class="release is-pending is-upcoming" id="upcoming">');
    expect(notes).toContain('아직 전시 PC에 배포되지 않은 변경입니다');
    const empty = renderPatchNotes(parseChangelog(changelog.replace('- 준비 중인 변경', '')));
    expect(empty.index).not.toContain('upcoming');
  });

  it('builds the real site with every placeholder filled', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
    build(out);
    const pages = fs.readdirSync(out).filter((name) => name.endsWith('.html'));
    expect(pages).toEqual(
      expect.arrayContaining(['index.html', 'patch-notes.html', 'credits.html'])
    );
    for (const page of pages) {
      const html = fs.readFileSync(path.join(out, page), 'utf8');
      expect(html).not.toMatch(/\{\{|PATCH_NOTES/);
      // Every page links every other page from its menu.
      for (const other of pages)
        expect(html).toContain(`href="${other === 'index.html' ? './' : other}`);
      for (const [, src] of html.matchAll(/src="((?:images|assets)\/[^"]+)"/g)) {
        expect(fs.existsSync(path.join(out, src))).toBe(true);
      }
      expect(html).toContain('<link rel="icon" href="favicon.ico" sizes="32x32" />');
      expect(html).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml" />');
    }
    const icon = fs.readFileSync(path.join(out, 'favicon.svg'), 'utf8');
    expect(icon).toContain('viewBox="0 0 22 22"');
    expect(icon).toContain('#00e5e5');
    expect(icon).toContain('#007c87');
    const rects = [...icon.matchAll(/<rect\b([^>]*)\/?>/g)].map((match) => match[1]);
    expect(rects).toHaveLength(9);
    expect(rects.filter((attrs) => attrs.includes('class="dim"'))).toHaveLength(4);
    const ico = fs.readFileSync(path.join(out, 'favicon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt8(6)).toBe(32);
    expect(ico.readUInt8(7)).toBe(32);
    const imageOffset = ico.readUInt32LE(18);
    expect(ico.subarray(imageOffset, imageOffset + 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(ico.readUInt32BE(imageOffset + 16)).toBe(32);
    expect(ico.readUInt32BE(imageOffset + 20)).toBe(32);
    const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    expect(home).toContain(
      'https://github.com/BSSMAscending/media-art-for-windows-releases/releases/latest'
    );
    expect(home.match(/https:\/\/github.com\/BSSMAscending\/media-art-beta\/releases\/latest/g)).toHaveLength(2);
    expect(home).toContain('Windows 베타 받기');
    expect(home).toContain('brew tap BSSMAscending/tap');
    expect(home).toContain('Mac 베타 받기');
    expect(home).toContain('2.0.0-beta.1');
    expect(home).toContain('brew install --cask binary-media-art-beta');
    expect(home).toContain('quarantine');
    expect(home).not.toContain('Control-click');
    const notesPage = fs.readFileSync(path.join(out, 'patch-notes.html'), 'utf8');
    expect(notesPage).toContain('id="v0.1.0"');
    expect(notesPage).toContain('id="v1.0.2"');
    // Whatever CHANGELOG.md holds (betas included), each version is listed once
    // in the side list and has its own article.
    const listed = [...notesPage.matchAll(/<a href="#([^"]+)"[^>]*><span class="toc-version"/g)];
    const articles = [...notesPage.matchAll(/<article class="release[^"]*" id="([^"]+)"/g)];
    expect(articles.length).toBeGreaterThan(0);
    expect(new Set(articles.map(([, id]) => id)).size).toBe(articles.length);
    expect(listed.map(([, id]) => id)).toEqual(articles.map(([, id]) => id));
    // The 3D opening loads its pictures by path; they must ship with the site.
    const hero = fs.readFileSync(path.join(out, 'hero.js'), 'utf8');
    const assets = [...hero.matchAll(/'(assets\/[^']+)'/g)].map(([, file]) => file);
    expect(assets).toEqual(['assets/scene-64x48.png', 'assets/person-64x48.png']);
    for (const file of assets) expect(fs.existsSync(path.join(out, file))).toBe(true);
    fs.rmSync(out, { recursive: true, force: true });
  });
});
