const {
  MODE_OPTIONS,
  MODE_SUB_OPTIONS,
  CELL_SIZE_SLIDER,
  MODE_SLIDER_HINTS,
  selectMode,
  selectModeOption,
} = require('../src/renderer/data/modeOptions');
const { FONT_SIZE } = require('../src/renderer/config');

describe('mode buttons', () => {
  it('offers the three exhibition modes', () => {
    expect(MODE_OPTIONS.map(({ key, label }) => [key, label])).toEqual([
      ['original', '미디어 아트'],
      ['rgb', '색 RGB'],
      ['levels', '밝기 단계'],
    ]);
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

  it('gives every mode a hint for the lever slot it does not use', () => {
    for (const { key } of MODE_OPTIONS) expect(MODE_SLIDER_HINTS[key]).toBeTruthy();
  });
});
