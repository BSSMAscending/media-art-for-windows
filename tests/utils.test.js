const { getLuminance, getMirroredMaskIndex } = require('../src/renderer/utils');

describe('getLuminance', () => {
  it('returns 0 for black (0,0,0)', () => {
    expect(getLuminance(0, 0, 0)).toBe(0);
  });

  it('returns 1 for white (255,255,255)', () => {
    expect(getLuminance(255, 255, 255)).toBeCloseTo(1);
  });

  it('uses weighted RGB formula', () => {
    const result = getLuminance(255, 0, 0);
    expect(result).toBeCloseTo(0.299);
  });
});

describe('getMirroredMaskIndex', () => {
  const seg = { width: 10, height: 10 };

  it('mirrors x coordinate correctly', () => {
    // x=0, cols=10 → maskX=0 → mirroredX = 9
    const idx = getMirroredMaskIndex(0, 0, 10, 10, seg);
    expect(idx).toBe(9); // maskY=0, mirroredX=9 → 0*10+9=9
  });

  it('handles center x correctly', () => {
    // x=5, cols=10 → maskX=5 → mirroredX=4
    const idx = getMirroredMaskIndex(5, 0, 10, 10, seg);
    expect(idx).toBe(4);
  });
});
