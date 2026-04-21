const config = require('../src/renderer/config');

describe('config constants', () => {
  it('FONT_SIZE is 8', () => {
    expect(config.FONT_SIZE).toBe(8);
  });

  it('BUSAN_CHARS has 7 characters', () => {
    expect(config.BUSAN_CHARS).toHaveLength(7);
  });

  it('BODY_PIX_CONFIG has required fields', () => {
    expect(config.BODY_PIX_CONFIG).toHaveProperty('architecture');
    expect(config.BODY_PIX_CONFIG).toHaveProperty('outputStride');
    expect(config.BODY_PIX_CONFIG).toHaveProperty('quantBytes');
  });

  it('LUMINANCE_THRESHOLD is between 0 and 1', () => {
    expect(config.LUMINANCE_THRESHOLD).toBeGreaterThan(0);
    expect(config.LUMINANCE_THRESHOLD).toBeLessThan(1);
  });
});
