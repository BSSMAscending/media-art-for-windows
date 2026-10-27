const { canShowPixelValues } = require('../../src/renderer/modes/valueView');

describe('canShowPixelValues', () => {
  it('offers per-pixel numbers for every brightness level view', () => {
    expect(canShowPixelValues('levels', 'N')).toBe(true);
  });

  it('offers them for a single RGB light but not the combined colour', () => {
    for (const channel of ['R', 'G', 'B']) expect(canShowPixelValues('rgb', channel)).toBe(true);
    expect(canShowPixelValues('rgb', 'N')).toBe(false);
  });

  it('keeps the media art silhouette without a value view', () => {
    expect(canShowPixelValues('original', 'R')).toBe(false);
  });
});
