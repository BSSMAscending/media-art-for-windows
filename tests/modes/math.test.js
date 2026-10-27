const { renderMath } = require('../../src/renderer/modes/math');

function createRecordingContext() {
  return {
    draws: [],
    fillText(char, x, y) {
      this.draws.push({ char, x, y, color: this.fillStyle });
    },
  };
}

describe('renderMath', () => {
  const grid = { cols: 3, rows: 1, cellSize: 16, x: 0, y: 0 };

  it('paints each computed value as grey and writes it on the cell', () => {
    const ctx = createRecordingContext();
    const output = new Uint8ClampedArray(12);
    renderMath(ctx, grid, Uint8ClampedArray.from([0, 128, 255]), output);
    expect([...output]).toEqual([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]);
    expect(ctx.draws).toEqual([
      { char: '0', x: 8, y: 8, color: '#ffffff' },
      { char: '128', x: 24, y: 8, color: '#000000' },
      { char: '255', x: 40, y: 8, color: '#000000' },
    ]);
  });

  it('keeps tiny cells as plain grey', () => {
    const ctx = createRecordingContext();
    const output = new Uint8ClampedArray(12);
    renderMath(ctx, { ...grid, cellSize: 8 }, Uint8ClampedArray.from([10, 20, 30]), output);
    expect(ctx.draws).toEqual([]);
    expect(output[4]).toBe(20);
  });
});
