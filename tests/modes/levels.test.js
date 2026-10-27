const { getLevel, renderLevels } = require('../../src/renderer/modes/levels');
const { getLuminance } = require('../../src/renderer/utils');

function createRecordingContext() {
  return {
    draws: [],
    fillText(char, x, y) {
      this.draws.push({ char, x, y, color: this.fillStyle });
    },
  };
}

function grayPixels(values) {
  return new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255]));
}

describe('getLevel', () => {
  it('numbers ten equal brightness steps 0 through 9 in order', () => {
    for (let level = 0; level < 10; level++) {
      expect(getLevel(level / 10, 10)).toBe(level);
      expect(getLevel((level + 0.5) / 10, 10)).toBe(level);
    }
    expect(getLevel(1, 10)).toBe(9);
  });

  it('splits two levels at the middle of the brightness range', () => {
    expect(getLevel(getLuminance(127, 127, 127), 2)).toBe(0);
    expect(getLevel(getLuminance(128, 128, 128), 2)).toBe(1);
  });

  it('matches the 8-bit grey value exactly at 256 levels', () => {
    for (const value of [0, 1, 64, 127, 128, 200, 254, 255]) {
      expect(getLevel(getLuminance(value, value, value), 256)).toBe(value);
    }
  });
});

describe('renderLevels', () => {
  const grid = { cols: 4, rows: 1, cellSize: 16, x: 10, y: 20 };

  it.each([2, 10, 256])('writes matching digits and greys for %i levels', (levels) => {
    const ctx = createRecordingContext();
    const values = [0, 127, 128, 255];
    const output = new Uint8ClampedArray(values.length * 4);
    renderLevels(ctx, grid, grayPixels(values), levels, output);

    const digits = ctx.draws.map(({ char }) => Number(char));
    expect(digits).toEqual(values.map((value) => getLevel(value / 255, levels)));
    expect(digits[0]).toBe(0);
    expect(digits[3]).toBe(levels - 1);
    digits.forEach((level, cell) => {
      const gray = Math.round((level * 255) / (levels - 1));
      expect([...output.slice(cell * 4, cell * 4 + 4)]).toEqual([gray, gray, gray, 255]);
    });
  });

  it('places digits at the grid origin with contrast against their grey', () => {
    const ctx = createRecordingContext();
    renderLevels(ctx, grid, grayPixels([0, 255, 0, 255]), 2, new Uint8ClampedArray(16));
    expect(ctx.draws).toEqual([
      { char: '0', x: 18, y: 28, color: '#ffffff' },
      { char: '1', x: 34, y: 28, color: '#000000' },
      { char: '0', x: 50, y: 28, color: '#ffffff' },
      { char: '1', x: 66, y: 28, color: '#000000' },
    ]);
  });

  it('keeps the greys but skips digits in cells too small to read', () => {
    const ctx = createRecordingContext();
    const output = new Uint8ClampedArray(16);
    renderLevels(ctx, { ...grid, cellSize: 8 }, grayPixels([0, 255, 0, 255]), 256, output);
    expect(ctx.draws).toEqual([]);
    expect([...output.slice(4, 8)]).toEqual([255, 255, 255, 255]);
  });

  it('sizes digits so the longest step number fits in a cell', () => {
    const ctx = createRecordingContext();
    renderLevels(ctx, grid, grayPixels([0, 0, 0, 0]), 10, new Uint8ClampedArray(16));
    expect(ctx.font).toBe("bold 12px 'Courier New', monospace");
    renderLevels(ctx, grid, grayPixels([0, 0, 0, 0]), 256, new Uint8ClampedArray(16));
    expect(ctx.font).toBe("bold 8px 'Courier New', monospace");
  });
});
