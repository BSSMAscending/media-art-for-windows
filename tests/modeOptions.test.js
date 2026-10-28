const {
  MODE_OPTIONS,
  MODE_SUB_OPTIONS,
  CELL_SIZE_SLIDER,
  COLOR_VALUE_CELL_SIZE,
  getCellSizeFloor,
  THRESHOLD_SLIDER,
  MATH_SLIDERS,
  MATH_START_AMOUNTS,
  MODE_SLIDER_HINTS,
  getModeSlider,
  getMathSettings,
  selectMode,
  selectModeOption,
} = require('../src/renderer/data/modeOptions');
const { FONT_SIZE } = require('../src/renderer/config');

describe('mode buttons', () => {
  it('offers the four exhibition modes', () => {
    expect(MODE_OPTIONS.map(({ key, label }) => [key, label.ko])).toEqual([
      ['original', '미디어 아트'],
      ['rgb', '색 RGB'],
      ['levels', '밝기 단계'],
      ['math', '수학 처리'],
    ]);
  });

  it('opens 수학 처리 on the original numbers and clears a calculation on a second tap', () => {
    const state = { mathEffect: 'blur' };
    selectMode(state, 'math');
    expect(state.mathEffect).toBe('none');
    selectModeOption(state, MODE_SUB_OPTIONS.math, 'blur');
    expect(state.mathEffect).toBe('blur');
    selectModeOption(state, MODE_SUB_OPTIONS.math, 'blur');
    expect(state.mathEffect).toBe('none');
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
  it('lists only the single R, G and B lights for RGB', () => {
    expect(MODE_SUB_OPTIONS.rgb.options.map(({ value }) => value)).toEqual(['R', 'G', 'B']);
  });

  it('picks a light, switches between lights, and clears on a second tap', () => {
    const state = { rgbChannel: 'N' };
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'R');
    expect(state.rgbChannel).toBe('R');
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'G');
    expect(state.rgbChannel).toBe('G');
    selectModeOption(state, MODE_SUB_OPTIONS.rgb, 'G');
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

  it('keeps the combined RGB view at sizes where three numbers fit', () => {
    expect(COLOR_VALUE_CELL_SIZE).toBe(24);
    expect(getCellSizeFloor({ selectedVersion: 'rgb', rgbChannel: 'N' })).toEqual({
      size: 24,
      note: { ko: '전체 색은 24px부터', en: 'From 24px' },
    });
    for (const view of [
      { selectedVersion: 'rgb', rgbChannel: 'R' },
      { selectedVersion: 'levels', rgbChannel: 'N' },
      { selectedVersion: 'original', rgbChannel: 'N' },
    ]) {
      expect(getCellSizeFloor(view)).toEqual({ size: CELL_SIZE_SLIDER.values[0], note: null });
    }
  });

  it('starts at a size where every view shows its numbers', () => {
    expect(FONT_SIZE).toBeGreaterThanOrEqual(COLOR_VALUE_CELL_SIZE);
  });

  it('gives every mode a hint for the lever slot it does not use', () => {
    for (const { key } of MODE_OPTIONS) expect(MODE_SLIDER_HINTS[key]).toBeTruthy();
  });
});
