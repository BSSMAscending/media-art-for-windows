const fs = require('node:fs');
const path = require('node:path');
const { readReleaseNotes, parseChangelog, DEFAULT_TITLE } = require('../scripts/changelog');

const CHANGELOG = `# 변경 기록

## [Unreleased]

- 아직 배포 전

## [1.1.0] - 2026-10-28 - 설명 모드 개편

### 새 기능

- 색 RGB 모드

## [1.0.3] - 2026-10-20

### 고친 점
- 버튼 위치

## [1.0.2]

## [1.0.1] - 2026-08-27
- 마지막 항목
`;

describe('release notes from CHANGELOG.md', () => {
  it('uses the entry body up to the next version heading', () => {
    expect(readReleaseNotes(CHANGELOG, '1.0.3')).toEqual({
      title: `v1.0.3 ${DEFAULT_TITLE}`,
      body: '### 고친 점\n- 버튼 위치',
    });
  });

  it('takes the release title from the heading when one is given', () => {
    expect(readReleaseNotes(CHANGELOG, '1.1.0')).toEqual({
      title: 'v1.1.0 설명 모드 개편',
      body: '### 새 기능\n\n- 색 RGB 모드',
    });
  });

  it('reads the last entry to the end of the file', () => {
    expect(readReleaseNotes(CHANGELOG, '1.0.1').body).toBe('- 마지막 항목');
  });

  it('rejects a missing or empty entry', () => {
    expect(() => readReleaseNotes(CHANGELOG, '1.0.4')).toThrow('no "## [1.0.4]" entry');
    expect(() => readReleaseNotes(CHANGELOG, '1.0.2')).toThrow('entry for 1.0.2 is empty');
  });

  it('does not match a version that only shares a prefix', () => {
    expect(() => readReleaseNotes(CHANGELOG, '1.0')).toThrow('no "## [1.0]" entry');
  });

  it('has an entry for the current package version', () => {
    const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
    const { version } = require('../package.json');
    expect(() => readReleaseNotes(changelog, version)).not.toThrow();
  });
});

describe('beta notes share the changelog', () => {
  const mixed = `## [1.0.2] - 2026-10-28
- 정식

## [2.0.0-beta.1] - 2026-10-29 - 첫 시험
- 베타

## [1.0.1]
- 이전
`;

  it('keeps a beta heading beside the stable entries', () => {
    const entries = parseChangelog(mixed);
    expect(entries.map((entry) => entry.version)).toEqual(['1.0.2', '2.0.0-beta.1', '1.0.1']);
    expect(entries[0]).toMatchObject({ beta: false, body: '- 정식' });
    expect(entries[1]).toMatchObject({ beta: true, title: '첫 시험', body: '- 베타' });
    expect(entries[2].body).toBe('- 이전');
  });

  it('does not publish a beta heading as the exhibit release', () => {
    expect(readReleaseNotes(mixed, '1.0.2')).toEqual({
      title: `v1.0.2 ${DEFAULT_TITLE}`,
      body: '- 정식',
    });
    expect(() => readReleaseNotes(mixed, '2.0.0-beta.1')).toThrow('no "## [2.0.0-beta.1]" entry');
  });

  it('accepts any beta number', () => {
    const notes = `## [2.0.0-beta.12] - 2026-11-02 - 열두 번째
- 더 감

## [2.0.0]
- 정식이 되면

## [2.0.0-beta.2]
- 둘째
`;
    expect(parseChangelog(notes).map((entry) => entry.version)).toEqual([
      '2.0.0-beta.12',
      '2.0.0',
      '2.0.0-beta.2',
    ]);
  });

  it('rejects a heading that looks like a version but is not a valid one', () => {
    for (const heading of [
      '## [2.0.0-beta.01]',
      '## [2.0.0-beta.0]',
      '## [2.0.0-beta1]',
      '## [2.0.0-Beta.1]',
      '## [2.0.0-beta.1]2026-10-29',
      '## [2.0.0-rc.1]',
      '## [2.0.0]2026-10-29',
    ]) {
      expect(() => parseChangelog(`${heading}\n- 사라질 뻔한 내용\n`), heading).toThrow(
        /must look like "## \[1\.2\.3\]" or "## \[2\.0\.0-beta\.1\]"/
      );
    }
  });

  it('rejects a version or the Unreleased section listed twice', () => {
    expect(() => parseChangelog('## [1.0.1]\n- 하나\n\n## [1.0.1] - 2026-08-27\n- 둘\n')).toThrow(
      'more than one "## [1.0.1]"'
    );
    expect(() =>
      parseChangelog('## [2.0.0-beta.2]\n- 하나\n\n## [2.0.0-beta.2]\n- 둘\n')
    ).toThrow('more than one "## [2.0.0-beta.2]"');
    expect(() => parseChangelog('## [Unreleased]\n- 하나\n\n## [unreleased]\n- 둘\n')).toThrow(
      'more than one "## [Unreleased]"'
    );
  });

  it('skips headings that are not versions', () => {
    const notes = '## 참고\n- 버전 아님\n\n## [1.0.1]\n- 정식\n';
    expect(parseChangelog(notes).map((entry) => entry.version)).toEqual(['1.0.1']);
  });

  it('keeps the betas of an earlier line once the next line starts', () => {
    const notes = `## [2.1.0-beta.1] - 2027-02-01
- 다음 줄 시험

## [2.0.0] - 2026-12-01
- 정식

## [2.0.0-beta.2] - 2026-11-02
- 지난 줄 둘째

## [2.0.0-beta.1] - 2026-10-29
- 지난 줄 첫째
`;
    const entries = parseChangelog(notes);
    expect(entries.map((entry) => entry.version)).toEqual([
      '2.1.0-beta.1',
      '2.0.0',
      '2.0.0-beta.2',
      '2.0.0-beta.1',
    ]);
    expect(entries.map((entry) => entry.beta)).toEqual([true, false, true, true]);
    expect(entries[3].body).toBe('- 지난 줄 첫째');
  });
});
