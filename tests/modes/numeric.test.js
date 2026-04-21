const { getLuminanceChar } = require('../../src/renderer/modes/numeric');

describe('getLuminanceChar', () => {
  it('returns "1" for very dark (luminance < 0.1)', () => {
    expect(getLuminanceChar(0.05)).toBe('1');
  });

  it('returns "7" for dark (0.1 <= luminance < 0.2)', () => {
    expect(getLuminanceChar(0.15)).toBe('7');
  });

  it('returns "8" for brightest (luminance >= 0.9)', () => {
    expect(getLuminanceChar(0.95)).toBe('8');
    expect(getLuminanceChar(1.0)).toBe('8');
  });

  it('returns "6" for bright (0.7 <= luminance < 0.8)', () => {
    expect(getLuminanceChar(0.75)).toBe('6');
  });

  it('covers all 10 buckets without gaps', () => {
    const thresholds = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
    const expected = ['1', '7', '0', '3', '2', '5', '4', '6', '9', '8'];
    thresholds.forEach((t, i) => {
      expect(getLuminanceChar(t)).toBe(expected[i]);
    });
  });
});
