const { modeExplanations, getModeExplanation } = require('../src/renderer/data/modeExplanations');
const {
  PERSON_BITMAP,
  MATH_EXAMPLE,
  formatMathOperator,
} = require('../src/renderer/ui/explainAnimations');
const { formatGridMetric } = require('../src/renderer/ui/mathPanel');

const VIEWS = [
  ['original', undefined],
  ['rgb', 'N'],
  ['rgb', 'R'],
  ['rgb', 'G'],
  ['rgb', 'B'],
  ['levels', 2],
  ['levels', 10],
  ['levels', 256],
  ['math', 'none'],
  ['math', 'brightness'],
  ['math', 'contrast'],
  ['math', 'blur'],
  ['math', 'sharpen'],
];

describe('mode explanations', () => {
  it.each(VIEWS)(
    'gives %s (%s) a headline, one short line, terms and an animation in both languages',
    (mode, option) => {
      const explanation = getModeExplanation(mode, option);
      for (const field of ['title', 'headline', 'body']) {
        expect(explanation[field].ko).toBeTruthy();
        expect(explanation[field].en).toBeTruthy();
      }
      // Visitors take this in at a glance, so the copy stays one short line.
      expect(explanation.body.ko.length).toBeLessThanOrEqual(45);
      expect(explanation.body.en.length).toBeLessThanOrEqual(64);
      expect(explanation.terms.length).toBeGreaterThan(0);
      expect(explanation.animation.type).toBeTruthy();
    }
  );

  it('matches each level view to its own step count', () => {
    for (const levels of [2, 10, 256]) {
      expect(getModeExplanation('levels', levels).animation).toEqual({
        type: 'level-steps',
        levels,
      });
    }
  });

  it('names the selected light in each channel view', () => {
    expect(getModeExplanation('rgb', 'R').headline).toMatchObject({
      ko: expect.stringContaining('빨간'),
    });
    expect(getModeExplanation('rgb', 'G').headline.en).toContain('green');
    expect(getModeExplanation('rgb', 'B').headline.en).toContain('blue');
  });

  it('returns null for modes without a metaphor card', () => {
    expect(getModeExplanation('busan')).toBeNull();
    expect(getModeExplanation('rgb', 'X')).toBeNull();
    expect(Object.keys(modeExplanations)).toEqual(['original', 'rgb', 'levels', 'math']);
  });
});

describe('explanation helpers', () => {
  it('draws the scan person on a rectangular bitmap', () => {
    const width = PERSON_BITMAP[0].length;
    expect(PERSON_BITMAP.every((row) => row.length === width)).toBe(true);
    expect(PERSON_BITMAP.join('')).toMatch(/^[.#]+$/);
  });

  it('names each calculation the way its lever reads', () => {
    expect(formatMathOperator('brightness', 60)).toBe('+ 60');
    expect(formatMathOperator('brightness', -40)).toBe('− 40');
    expect(formatMathOperator('contrast', 2)).toBe('× 2');
    expect(formatMathOperator('blur', 2)).toBe('5×5 무게 평균');
    expect(formatMathOperator('sharpen', 1.5)).toBe('차이 × 1.5');
    expect(MATH_EXAMPLE).toHaveLength(9);
  });

  it('reports the live grid as a cell count', () => {
    expect(formatGridMetric(74, 41, 'ko')).toBe('지금 화면 = 가로 74칸 × 세로 41칸 = 3,034칸');
    expect(formatGridMetric(74, 41, 'en')).toBe('Now: 74 × 41 cells = 3,034 cells');
  });
});
