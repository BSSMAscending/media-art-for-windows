const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renderMarkdown, renderPatchNotes, build } = require('../scripts/build-site');
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

  it('lists every version newest first with an anchor', () => {
    const { index, notes } = renderPatchNotes(parseChangelog(changelog));
    expect(index).toBe(
      '<a href="#upcoming">다음 버전</a>\n<a href="#v1.1.0">v1.1.0</a>\n<a href="#v1.0.0">v1.0.0</a>'
    );
    expect(notes).toContain('<article class="release" id="v1.1.0">');
    expect(notes).toContain('<h2 class="release-title">새 모드</h2>');
    expect(notes).toContain('<time datetime="2026-10-28">2026. 10. 28.</time>');
  });

  it('marks the Unreleased section as not yet deployed, and hides it when empty', () => {
    const { notes } = renderPatchNotes(parseChangelog(changelog));
    expect(notes).toContain('<article class="release is-upcoming" id="upcoming">');
    expect(notes).toContain('아직 전시 PC에 배포되지 않은 변경입니다');
    const empty = renderPatchNotes(parseChangelog(changelog.replace('- 준비 중인 변경', '')));
    expect(empty.index).not.toContain('upcoming');
  });

  it('builds the real site with every placeholder filled', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
    build(out);
    const pages = fs.readdirSync(out).filter((name) => name.endsWith('.html'));
    expect(pages).toEqual(expect.arrayContaining(['index.html', 'patch-notes.html']));
    for (const page of pages) {
      const html = fs.readFileSync(path.join(out, page), 'utf8');
      expect(html).not.toMatch(/\{\{|PATCH_NOTES/);
      for (const [, src] of html.matchAll(/src="(images\/[^"]+)"/g)) {
        expect(fs.existsSync(path.join(out, src))).toBe(true);
      }
    }
    expect(fs.readFileSync(path.join(out, 'patch-notes.html'), 'utf8')).toContain('id="v0.1.0"');
    fs.rmSync(out, { recursive: true, force: true });
  });
});
