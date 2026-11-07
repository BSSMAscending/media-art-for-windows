const {
  getCellLabels,
  getLensZoom,
  drawLensDigits,
  LENS_DIGIT_FONT_SIZE,
} = require('../src/renderer/ui/lensDigits');
const { ZOOM } = require('../src/renderer/ui/magnifier');
const { getDigitFontSize } = require('../src/renderer/utils');

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
    expect(levels.digits).toBe(1);
    expect([levels.label(0, 0), levels.label(1, 0)]).toEqual([
      { text: '0', dark: false },
      { text: '9', dark: true },
    ]);

    const math = getCellLabels(frame('math', 8, { output: Uint8ClampedArray.from([30, 200]) }));
    expect([math.digits, math.label(1, 0)]).toEqual([3, { text: '200', dark: true }]);

    const green = getCellLabels(frame('rgb', 8, { channel: 'G' }));
    expect(green.label(1, 0)).toEqual({ text: '240', dark: true });
  });

  it('has nothing to write for the full colour or moving RGB layers', () => {
    expect(getCellLabels(frame('rgb', 8, { channel: 'N' }))).toBeNull();
    expect(getCellLabels(frame('rgb', 8, { channel: 'R', moving: true }))).toBeNull();
    expect(getCellLabels(null)).toBeNull();
  });

  it('keeps the usual zoom while the screen writes the numbers', () => {
    expect(getLensZoom(frame('math', 24, { output: new Uint8ClampedArray(2) }))).toBe(ZOOM);
    expect(getLensZoom(frame('rgb', 2, { channel: 'N' }))).toBe(ZOOM);
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

  it('leaves the lens alone when the screen already shows the numbers', () => {
    const ctx = createRecordingContext();
    const region = { left: 100, top: 50, size: 48 };
    drawLensDigits(ctx, (x, y) => [x, y], 3, region, frame('levels', 24, { levels: 10 }));
    expect(ctx.draws).toEqual([]);
  });
});
