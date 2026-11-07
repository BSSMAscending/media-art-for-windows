const {
  modeExplanations,
  getModeExplanation,
  getRule,
} = require('../src/renderer/data/modeExplanations');
const {
  MATH_EXAMPLE,
  UNSHARP_ROW,
  formatMathOperator,
  formatFunction,
  stepPath,
} = require('../src/renderer/ui/explainAnimations');
const { applyImageMath } = require('../src/renderer/core/imageMath');
const { formatGridMetric, getCellColor } = require('../src/renderer/ui/cellCard');

const VIEWS = [
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
  it.each(VIEWS)('gives %s (%s) a title, one rule and a picture', (mode, option) => {
    const explanation = getModeExplanation(mode, option);
    expect(Object.keys(explanation).sort()).toEqual(
      expect.arrayContaining(['rule', 'title', 'visual'])
    );
    for (const text of [explanation.title, getRule(explanation, 2)]) {
      expect(text.ko).toBeTruthy();
      expect(text.en).toBeTruthy();
    }
    // The card above the controls is narrow: the rule stays one or two short lines.
    expect(getRule(explanation, 120).ko.length).toBeLessThanOrEqual(40);
    expect(explanation.visual.type).toBeTruthy();
  });

  it('writes the lever value into each calculation', () => {
    const rule = (option, value) => getRule(getModeExplanation('math', option), value);
    expect(rule('brightness', 60).ko).toBe('새 값 = 값 + 60');
    expect(rule('brightness', -40).en).toBe('new = value − 40');
    expect(rule('contrast', 1.5).ko).toBe('새 값 = (값 − 128) × 1.5 + 128');
    expect(rule('blur', 2).ko).toBe('새 값 = 주변 5×5칸의 가중 평균');
    expect(rule('sharpen', 3).ko).toBe('새 값 = 값 + (값 − 블러) × 3');
    expect(rule('sharpen', 3).en).toBe('new = value + (value − blur) × 3');
    expect(getRule(getModeExplanation('levels', 2), 90).ko).toBe('밝기가 90 이상이면 1, 아니면 0');
  });

  it('explains 선명 as unsharp masking: blur, subtract, add back', () => {
    const sharpen = getModeExplanation('math', 'sharpen');
    expect(sharpen.title.ko).toBe('선명: 언샤프 마스킹');
    expect(sharpen.visual).toEqual({ type: 'unsharp-profile' });
    expect(getModeExplanation('math', 'blur').title.ko).toBe('블러: 가중 평균');
  });

  it('matches each level view to its own step count', () => {
    for (const levels of [2, 10, 256]) {
      expect(getModeExplanation('levels', levels).visual).toEqual({ type: 'level-steps', levels });
    }
  });

  it('names the selected light in each channel view', () => {
    expect(getRule(getModeExplanation('rgb', 'R')).ko).toContain('빨간');
    expect(getRule(getModeExplanation('rgb', 'G')).en).toContain('green');
    expect(getModeExplanation('rgb', 'B').title.en).toContain('blue');
  });

  it('returns null for modes without a card', () => {
    expect(getModeExplanation('busan')).toBeNull();
    expect(getModeExplanation('rgb', 'X')).toBeNull();
    expect(getModeExplanation('original')).toBeNull();
    expect(Object.keys(modeExplanations)).toEqual(['rgb', 'levels', 'math']);
  });
});

describe('explanation helpers', () => {
  it('crosses one edge in the unsharp picture, so the result overshoots both sides', () => {
    const width = UNSHARP_ROW.length;
    const sharp = applyImageMath(
      'sharpen',
      1.5,
      UNSHARP_ROW,
      new Uint8ClampedArray(width),
      width,
      1
    );
    const edge = UNSHARP_ROW.findIndex((value) => value !== UNSHARP_ROW[0]);
    expect(sharp[edge - 1]).toBeLessThan(UNSHARP_ROW[edge - 1]);
    expect(sharp[edge]).toBeGreaterThan(UNSHARP_ROW[edge]);
    expect(sharp[0]).toBe(UNSHARP_ROW[0]);
    expect(stepPath(Uint8ClampedArray.from([255, 0]))).toBe('M 0 6 V 6 H 20 V 70 H 40');
  });

  it('names each calculation the way its lever reads', () => {
    expect(formatMathOperator('brightness', 60)).toBe('+ 60');
    expect(formatMathOperator('brightness', -40)).toBe('− 40');
    expect(formatMathOperator('contrast', 2)).toBe('× 2');
    expect(formatMathOperator('blur', 2)).toBe('5×5 가중 평균');
    expect(formatMathOperator('sharpen', 1.5)).toBe('마스크 × 1.5');
    expect(MATH_EXAMPLE).toHaveLength(9);
  });

  it('writes brightness and contrast as linear functions of x', () => {
    expect(formatFunction('brightness', 60)).toBe('y = x + 60');
    expect(formatFunction('brightness', -80)).toBe('y = x − 80');
    expect(formatFunction('contrast', 2)).toBe('y = 2(x − 128) + 128');
    expect(getModeExplanation('math', 'contrast').visual).toEqual({
      type: 'math-graph',
      effect: 'contrast',
    });
  });

  it('paints the card swatch the colour the marked cell has on screen', () => {
    const cell = { kind: 'rgb', r: 230, g: 124, b: 17 };
    expect(getCellColor({ ...cell, channel: 'N' })).toBe('rgb(230, 124, 17)');
    expect(getCellColor({ ...cell, channel: 'G' })).toBe('rgb(0, 124, 0)');
    expect(getCellColor({ kind: 'levels', levels: 10, level: 5 })).toBe('rgb(142, 142, 142)');
    expect(getCellColor({ kind: 'math', result: 236 })).toBe('rgb(236, 236, 236)');
  });

  it('reports the live grid as a cell count', () => {
    expect(formatGridMetric(74, 41, 'ko')).toBe('지금 화면 = 가로 74칸 × 세로 41칸 = 3,034칸');
    expect(formatGridMetric(74, 41, 'en')).toBe('Now: 74 × 41 cells = 3,034 cells');
  });
});
