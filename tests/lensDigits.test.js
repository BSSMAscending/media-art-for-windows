const {
  getCellLabels,
  getLensZoom,
  drawLensDigits,
  LENS_DIGIT_FONT_SIZE,
  MAX_ZOOM,
} = require('../src/renderer/ui/lensDigits');
const { ZOOM } = require('../src/renderer/ui/magnifier');
const { getDigitFontSize } = require('../src/renderer/utils');
const { getColorValueFontSize } = require('../src/renderer/modes/rgb');

// Two cells: a dark one and a light one.
const PIXELS = Uint8ClampedArray.from([20, 20, 20, 255, 240, 240, 240, 255]);

function frame(mode, cellSize, extra = {}) {
  return { mode, grid: { cols: 2, rows: 1, cellSize, x: 100, y: 50 }, pixels: PIXELS, ...extra };
}

function createRecordingContext() {
  return {
    draws: [],
    save() {},
    restore() {},
    fillText(text, x, y) {
      this.draws.push({ text, x, y, color: this.fillStyle, font: this.font });
    },
  };
}

describe('lens digits', () => {
  it('numbers cells the way each view does', () => {
    const levels = getCellLabels(frame('levels', 8, { levels: 10 }));
    expect([levels.lines(0, 0), levels.lines(1, 0)]).toEqual([
      [{ text: '0', color: '#ffffff' }],
      [{ text: '9', color: '#000000' }],
    ]);

    const math = getCellLabels(frame('math', 8, { output: Uint8ClampedArray.from([30, 200]) }));
    expect(math.lines(1, 0)).toEqual([{ text: '200', color: '#000000' }]);

    const green = getCellLabels(frame('rgb', 8, { channel: 'G' }));
    expect(green.lines(1, 0)).toEqual([{ text: '240', color: '#000000' }]);
  });

  it('writes R, G and B as three tinted lines in the full colour', () => {
    const colour = getCellLabels(frame('rgb', 24, { channel: 'N' }));
    expect(colour.lines(0, 0)).toEqual([
      { text: '20', color: '#ff9d9d' },
      { text: '20', color: '#9dff9d' },
      { text: '20', color: '#9dc4ff' },
    ]);
    expect(colour.lines(1, 0).map(({ color }) => color)).toEqual(['#7a0000', '#005c00', '#00287a']);
    // The screen never writes them, at any cell size.
    expect(colour.onScreen(48)).toBe(false);
  });

  it('has nothing to write while the RGB layers move', () => {
    expect(getCellLabels(frame('rgb', 8, { channel: 'R', moving: true }))).toBeNull();
    expect(getCellLabels(frame('rgb', 8, { channel: 'N', moving: true }))).toBeNull();
    expect(getCellLabels(null)).toBeNull();
  });

  it('keeps the usual zoom while the screen writes the numbers', () => {
    expect(getLensZoom(frame('math', 24, { output: new Uint8ClampedArray(2) }))).toBe(ZOOM);
    expect(getLensZoom(frame('rgb', 24, { channel: 'N' }))).toBe(ZOOM);
  });

  it('zooms the full colour until R, G and B fit, up to the limit', () => {
    for (const cellSize of [4, 8, 12, 24]) {
      const zoom = getLensZoom(frame('rgb', cellSize, { channel: 'N' }));
      expect(getColorValueFontSize(cellSize * zoom)).toBeGreaterThanOrEqual(LENS_DIGIT_FONT_SIZE);
    }
    expect(getLensZoom(frame('rgb', 2, { channel: 'N' }))).toBe(MAX_ZOOM);
  });

  it('zooms in until small cells have room for readable numbers', () => {
    for (const cellSize of [2, 4, 8, 12]) {
      const zoom = getLensZoom(frame('math', cellSize, { output: new Uint8ClampedArray(2) }));
      expect(zoom).toBeGreaterThanOrEqual(ZOOM);
      expect(getDigitFontSize(cellSize * zoom, 3)).toBeGreaterThanOrEqual(LENS_DIGIT_FONT_SIZE);
    }
    expect(getLensZoom(frame('math', 2, { output: new Uint8ClampedArray(2) }))).toBe(16);
    // One-digit steps need less room than three-digit values.
    expect(getLensZoom(frame('levels', 2, { levels: 2, threshold: 128 }))).toBe(11);
  });

  it('writes each small cell inside the lens at its magnified centre', () => {
    const ctx = createRecordingContext();
    const scale = 12;
    const region = { left: 100, top: 50, size: 4 };
    const toLens = (x, y) => [(x - region.left) * scale, (y - region.top) * scale];
    drawLensDigits(ctx, toLens, scale, region, frame('levels', 2, { levels: 10 }));
    expect(ctx.draws.map(({ text, x, y, color }) => [text, x, y, color])).toEqual([
      ['0', 12, 12, '#ffffff'],
      ['9', 36, 12, '#000000'],
    ]);
    expect(ctx.draws[0].font).toBe("bold 18px 'Courier New', monospace");
  });

  it('stacks the three colour lines around the magnified centre', () => {
    const ctx = createRecordingContext();
    const scale = 10;
    const region = { left: 100, top: 50, size: 4 };
    const toLens = (x, y) => [(x - region.left) * scale, (y - region.top) * scale];
    drawLensDigits(ctx, toLens, scale, region, frame('rgb', 4, { channel: 'N' }));
    expect(ctx.draws.slice(0, 3).map(({ text, x, y }) => [text, x, y])).toEqual([
      ['20', 20, 8],
      ['20', 20, 20],
      ['20', 20, 32],
    ]);
    expect(ctx.draws[0].font).toBe("bold 12px 'Courier New', monospace");
  });

  it('leaves the lens alone when the screen already shows the numbers', () => {
    const ctx = createRecordingContext();
    const region = { left: 100, top: 50, size: 48 };
    drawLensDigits(ctx, (x, y) => [x, y], 3, region, frame('levels', 24, { levels: 10 }));
    expect(ctx.draws).toEqual([]);
  });
});
