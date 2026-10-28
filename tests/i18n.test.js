const {
  LANGUAGES,
  getLanguage,
  setLanguage,
  onLanguageChange,
  t,
} = require('../src/renderer/i18n');
const modeOptions = require('../src/renderer/data/modeOptions');
const { modeExplanations } = require('../src/renderer/data/modeExplanations');
const { mathDescriptions } = require('../src/renderer/data/mathDescriptions');

afterEach(() => setLanguage('ko'));

describe('language switch', () => {
  it('starts in Korean and picks the current language from a pair', () => {
    expect(getLanguage()).toBe('ko');
    expect(t({ ko: '칸 크기', en: 'Cell size' })).toBe('칸 크기');
    setLanguage('en');
    expect(t({ ko: '칸 크기', en: 'Cell size' })).toBe('Cell size');
  });

  it('passes plain strings through and falls back to Korean', () => {
    setLanguage('en');
    expect(t('0 ~ 255')).toBe('0 ~ 255');
    expect(t({ ko: '한국어만' })).toBe('한국어만');
    expect(t(undefined)).toBeUndefined();
  });

  it('notifies listeners only on a real change to a known language', () => {
    const seen = [];
    const stop = onLanguageChange((language) => seen.push(language));
    setLanguage('en');
    setLanguage('en');
    setLanguage('fr');
    setLanguage('ko');
    stop();
    setLanguage('en');
    expect(seen).toEqual(['en', 'ko']);
    expect(LANGUAGES).toEqual(['ko', 'en']);
  });
});

// Every { ko, en } pair in the visible data must have both languages; lever
// `format` and explanation `rule` functions are sampled, other functions are logic.
function collectPairs(value, path, out) {
  if (typeof value === 'function') {
    if (path.endsWith('.format') || path.endsWith('.rule')) {
      for (const sample of [1, 24, 128]) collectPairs(value(sample), `${path}(${sample})`, out);
    }
  } else if (value && typeof value === 'object') {
    if ('ko' in value) out.push([path, value]);
    else
      for (const [key, child] of Object.entries(value)) collectPairs(child, `${path}.${key}`, out);
  }
  return out;
}

describe('translations', () => {
  const pairs = [
    ...collectPairs(modeOptions, 'modeOptions', []),
    ...collectPairs(modeExplanations, 'modeExplanations', []),
    ...collectPairs(mathDescriptions, 'mathDescriptions', []),
  ];

  it('covers the visible text', () => {
    expect(pairs.length).toBeGreaterThan(80);
  });

  it.each(pairs)('%s has Korean and English', (_path, pair) => {
    expect(typeof pair.ko).toBe('string');
    expect(typeof pair.en).toBe('string');
    expect(pair.en.length).toBeGreaterThan(0);
  });
});
