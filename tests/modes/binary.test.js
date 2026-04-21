const { getLuminance } = require('../../src/renderer/utils');

describe('binary mode - character selection', () => {
  it('returns "1" when luminance > 0.4', () => {
    const luminance = getLuminance(200, 200, 200);
    expect(luminance).toBeGreaterThan(0.4);
    const char = luminance > 0.4 ? '1' : '0';
    expect(char).toBe('1');
  });

  it('returns "0" when luminance <= 0.4', () => {
    const luminance = getLuminance(80, 80, 80);
    expect(luminance).toBeLessThanOrEqual(0.4);
    const char = luminance > 0.4 ? '1' : '0';
    expect(char).toBe('0');
  });
});
