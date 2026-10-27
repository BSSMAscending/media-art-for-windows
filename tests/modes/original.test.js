const { renderOriginal, ZERO_COLOR } = require('../../src/renderer/modes/original');

function createRecordingContext() {
  return {
    draws: [],
    fillRect() {},
    fillText(char, x, y) {
      this.draws.push({ char, x, y, color: this.fillStyle });
    },
  };
}

// 4×1 grid; the mask is mirrored against the sampled pixels, so mask cells 2 and 3
// are the person in screen cells 1 and 0.
const mask = { data: Uint8Array.from([0, 0, 1, 1]), width: 4, height: 1 };
const pixels = new Uint8ClampedArray(16).fill(200);

describe('renderOriginal (미디어 아트)', () => {
  it('writes 1 on every person cell and 0 on every other cell', () => {
    const ctx = createRecordingContext();
    renderOriginal(ctx, 4, 1, 10, mask, pixels, 4);
    const byCell = Object.fromEntries(ctx.draws.map(({ char, x }) => [(x - 5) / 10, char]));
    expect(byCell).toEqual({ 0: '1', 1: '1', 2: '0', 3: '0' });
  });

  it('draws the zeros dim and the ones in a cyan-tinted colour', () => {
    const ctx = createRecordingContext();
    renderOriginal(ctx, 4, 1, 10, mask, pixels, 4);
    expect(ctx.draws.filter(({ char }) => char === '0').every((d) => d.color === ZERO_COLOR)).toBe(
      true
    );
    expect(ctx.draws.filter(({ char }) => char === '1').map(({ color }) => color)).not.toContain(
      ZERO_COLOR
    );
  });

  it('fills the whole screen with zeros while nobody is in view', () => {
    const ctx = createRecordingContext();
    renderOriginal(ctx, 4, 2, 10, null, undefined, 4);
    expect(ctx.draws.map(({ char }) => char)).toEqual(Array(8).fill('0'));
  });
});
