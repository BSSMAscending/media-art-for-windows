const {
  MODE_OPTIONS,
  START_MODE,
  MODE_SUB_OPTIONS,
  CELL_SIZE_SLIDER,
  BLUR_CELL_SIZE,
  BLUR_TIP,
  getBlurTipStep,
  THRESHOLD_SLIDER,
  MATH_SLIDERS,
  MATH_START_AMOUNTS,
  MODE_SLIDER_HINTS,
  getModeSliderHint,
  getModeSlider,
  getMathSettings,
  selectMode,
  selectModeOption,
} = require('../src/renderer/data/modeOptions');
const { FONT_SIZE } = require('../src/renderer/config');
const { getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../src/renderer/utils');

describe('mode buttons', () => {
  it('offers the three exhibition modes, 밝기 단계 first', () => {
    expect(MODE_OPTIONS.map(({ key, label }) => [key, label.ko])).toEqual([
      ['levels', '밝기 단계'],
      ['rgb', '색 RGB'],
      ['math', '수학 처리'],
    ]);
    expect(START_MODE).toBe('levels');
  });

  it('names blur and sharpen by what they compute', () => {
    const captions = Object.fromEntries(
      MODE_SUB_OPTIONS.math.options.map(({ value, caption }) => [value, caption.ko])
    );
    expect(captions).toMatchObject({ blur: '가중 평균', sharpen: '언샤프' });
  });

  it('opens 수학 처리 on 밝기 and keeps a calculation selected when tapped again', () => {
    const state = { mathEffect: 'blur' };
    selectMode(state, 'math');
    expect(state.mathEffect).toBe('brightness');
    selectModeOption(state, MODE_SUB_OPTIONS.math, 'blur');
    expect(state.mathEffect).toBe('blur');
    selectModeOption(state, MODE_SUB_OPTIONS.math, 'blur');
    expect(state.mathEffect).toBe('blur');
  });

  it('opens RGB on the full colour, even when a light was picked before', () => {
    const state = { selectedVersion: 'levels', rgbChannel: 'G', levels: 256 };
    selectMode(state, 'rgb');
    expect(state).toMatchObject({ selectedVersion: 'rgb', rgbChannel: 'N', levels: 256 });

    state.rgbChannel = 'B';
    selectMode(state, 'rgb');
    expect(state.rgbChannel).toBe('N');
  });

  it('keeps the chosen brightness steps when switching modes', () => {
    const state = { selectedVersion: 'rgb', rgbChannel: 'R', levels: 2 };
    selectMode(state, 'levels');
    expect(state).toMatchObject({ selectedVersion: 'levels', levels: 2, rgbChannel: 'R' });
  });
});

describe('mode option buttons', () => {
  it('offers the full colour (원본) before the single R, G and B lights', () => {
    expect(MODE_SUB_OPTIONS.rgb.options.map(({ value }) => value)).toEqual(['N', 'R', 'G', 'B']);
    expect(MODE_SUB_OPTIONS.rgb.options[0].label.ko).toBe('원본');
  });

  it('picks a light, switches between lights, keeps it on a second tap, and 원본 returns', () => {
    const state = { rgbChannel: 'N' };
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'R');
    expect(state.rgbChannel).toBe('R');
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'G');
    expect(state.rgbChannel).toBe('G');
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'G');
    expect(state.rgbChannel).toBe('G');
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'N');
    expect(state.rgbChannel).toBe('N');
  });

  it('keeps a brightness step selected when it is tapped again', () => {
    const state = { levels: 10 };
    selectModeOption(state, MODE_SUB_OPTIONS.levels, 10);
    expect(state.levels).toBe(10);
    selectModeOption(state, MODE_SUB_OPTIONS.levels, 2);
    expect(state.levels).toBe(2);
  });
});

describe('levers', () => {
  it('steps the cell size from fine to coarse and starts on the default size', () => {
    const sizes = CELL_SIZE_SLIDER.values;
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(sizes).toContain(FONT_SIZE);
    expect(CELL_SIZE_SLIDER.format(24)).toBe('24px');
  });

  it('shrinks the cells down to 2px', () => {
    expect(CELL_SIZE_SLIDER.values.slice(0, 3)).toEqual([2, 4, 8]);
  });

  it('offers the threshold lever only in two-level black and white', () => {
    expect(getModeSlider({ selectedVersion: 'levels', levels: 2 })).toBe(THRESHOLD_SLIDER);
    expect(getModeSlider({ selectedVersion: 'levels', levels: 10 })).toBeNull();
    expect(getModeSlider({ selectedVersion: 'rgb', levels: 2 })).toBeNull();
    expect([THRESHOLD_SLIDER.min, THRESHOLD_SLIDER.max]).toEqual([0, 255]);
  });

  it('gives each calculation a strength lever that starts away from no change', () => {
    for (const option of MODE_SUB_OPTIONS.math.options) {
      const slider = MATH_SLIDERS[option.value];
      const state = { selectedVersion: 'math', mathEffect: option.value, ...MATH_START_AMOUNTS };
      expect(getModeSlider(state)).toBe(slider);
      const { effect, amount } = getMathSettings(state);
      expect(effect).toBe(option.value);
      expect(amount).toBe(MATH_START_AMOUNTS[slider.stateKey]);
      if (slider.values) expect(slider.values).toContain(amount);
      else expect(amount).toBeGreaterThanOrEqual(slider.min);
    }
    expect(MATH_START_AMOUNTS).toMatchObject({ mathBrightness: 60, mathContrast: 2 });
  });

  it('applies nothing to the original numbers in 수학 처리', () => {
    const state = { selectedVersion: 'math', mathEffect: 'none', ...MATH_START_AMOUNTS };
    expect(getModeSlider(state)).toBeNull();
    expect(getMathSettings(state)).toEqual({ effect: 'none', amount: 0 });
  });

  it('starts at a size where every view shows its numbers', () => {
    expect(getDigitFontSize(FONT_SIZE, 3)).toBeGreaterThanOrEqual(MIN_DIGIT_FONT_SIZE);
  });

  it('asks for cells small enough to drop the digits before the blur size', () => {
    expect(BLUR_CELL_SIZE).toBe(12);
    expect(getDigitFontSize(BLUR_CELL_SIZE, 3)).toBeLessThan(MIN_DIGIT_FONT_SIZE);
    const next = CELL_SIZE_SLIDER.values[CELL_SIZE_SLIDER.values.indexOf(BLUR_CELL_SIZE) + 1];
    expect(getDigitFontSize(next, 3)).toBeGreaterThanOrEqual(MIN_DIGIT_FONT_SIZE);
    expect(BLUR_TIP.steps[0].ko).toBe('칸 크기를 12px까지 줄이고');

    const blur = { selectedVersion: 'math', mathEffect: 'blur' };
    expect(getBlurTipStep({ ...blur, cellSize: FONT_SIZE })).toBe(1);
    expect(getBlurTipStep({ ...blur, cellSize: 16 })).toBe(1);
    expect(getBlurTipStep({ ...blur, cellSize: 12 })).toBe(2);
    expect(getBlurTipStep({ ...blur, cellSize: 8 })).toBe(2);
    expect(getBlurTipStep({ ...blur, mathEffect: 'sharpen', cellSize: 24 })).toBe(0);
    expect(getBlurTipStep({ ...blur, selectedVersion: 'levels', cellSize: 24 })).toBe(0);
  });

  it('gives every view without a lever of its own a hint for that slot', () => {
    const views = [
      { selectedVersion: 'levels', levels: 10 },
      { selectedVersion: 'rgb', rgbChannel: 'N' },
      { selectedVersion: 'rgb', rgbChannel: 'B' },
    ];
    for (const view of views) {
      expect(getModeSlider(view)).toBeNull();
      expect(getModeSliderHint(view)).toBeTruthy();
    }
    // 수학 처리 always has a calculation, so always a lever.
    for (const { value } of MODE_SUB_OPTIONS.math.options) {
      expect(getModeSlider({ selectedVersion: 'math', mathEffect: value })).toBeTruthy();
    }
  });

  it('tells the RGB full colour that a light brings the pixel numbers', () => {
    expect(getModeSliderHint({ selectedVersion: 'rgb', rgbChannel: 'N' })).toBe(
      MODE_SLIDER_HINTS.rgbFull
    );
    expect(getModeSliderHint({ selectedVersion: 'rgb', rgbChannel: 'R' })).toBe(
      MODE_SLIDER_HINTS.rgb
    );
    expect(getModeSliderHint({ selectedVersion: 'busan' })).toBeNull();
  });
});
