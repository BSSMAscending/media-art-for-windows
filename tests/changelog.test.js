const fs = require('node:fs');
const path = require('node:path');
const { readReleaseNotes, DEFAULT_TITLE } = require('../scripts/changelog');

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
