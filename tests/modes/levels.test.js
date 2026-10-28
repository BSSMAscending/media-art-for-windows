const { getLevel, renderLevels } = require('../../src/renderer/modes/levels');

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
  it('numbers ten equal brightness steps 0 through 9, each 25.5 wide, rounding down', () => {
    expect(
      [0, 25, 26, 127, 128, 152, 153, 229, 230, 254].map((grey) => getLevel(grey, 10))
    ).toEqual([0, 0, 1, 4, 5, 5, 6, 8, 9, 9]);
    expect(getLevel(255, 10)).toBe(9);
  });

  it('splits two levels at the middle of the brightness range', () => {
    expect(getLevel(127, 2)).toBe(0);
    expect(getLevel(128, 2)).toBe(1);
  });

  it('splits two levels at a chosen threshold, inclusive', () => {
    expect(getLevel(99, 2, 100)).toBe(0);
    expect(getLevel(100, 2, 100)).toBe(1);
    expect(getLevel(200, 2, 220)).toBe(0);
    expect(getLevel(255, 2, 255)).toBe(1);
    expect(getLevel(0, 2, 0)).toBe(1);
  });

  it('ignores the threshold for more than two levels', () => {
    expect(getLevel(242, 10, 250)).toBe(9);
  });

  it('matches the 8-bit grey value exactly at 256 levels', () => {
    for (const value of [0, 1, 64, 127, 128, 200, 254, 255]) {
      expect(getLevel(value, 256)).toBe(value);
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
    expect(digits).toEqual(values.map((value) => getLevel(value, levels)));
    expect(digits[0]).toBe(0);
    expect(digits[3]).toBe(levels - 1);
    digits.forEach((level, cell) => {
      const gray = Math.round((level * 255) / (levels - 1));
      expect([...output.slice(cell * 4, cell * 4 + 4)]).toEqual([gray, gray, gray, 255]);
    });
  });

  it('steps the same whole-number brightness the other views show', () => {
    // 0.299·153 + 0.587·153 + 0.114·152 = 152.9, shown as 153: step 6, not 5.
    const ctx = createRecordingContext();
    const pixels = Uint8ClampedArray.from([153, 153, 152, 255]);
    renderLevels(ctx, { ...grid, cols: 1 }, pixels, 10, new Uint8ClampedArray(4));
    expect(ctx.draws[0].char).toBe('6');
  });

  it('draws two levels from the threshold', () => {
    const ctx = createRecordingContext();
    const output = new Uint8ClampedArray(16);
    renderLevels(ctx, grid, grayPixels([50, 100, 150, 200]), 2, output, 160);
    expect(ctx.draws.map(({ char }) => char)).toEqual(['0', '0', '0', '1']);
    expect(output[12]).toBe(255);
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
