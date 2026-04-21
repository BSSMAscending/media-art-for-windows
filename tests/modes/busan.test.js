const { getBusanChar } = require('../../src/renderer/modes/busan');

describe('getBusanChar', () => {
  it('returns "부" for darkest (luminance < 0.14)', () => {
    expect(getBusanChar(0.1)).toBe('부');
  });

  it('returns "산" for very dark (0.14 <= luminance < 0.28)', () => {
    expect(getBusanChar(0.2)).toBe('산');
  });

  it('returns "관" for brightest (luminance >= 0.84)', () => {
    expect(getBusanChar(0.9)).toBe('관');
    expect(getBusanChar(1.0)).toBe('관');
  });

  it('maps all 7 characters correctly', () => {
    const cases = [
      [0.07, '부'],
      [0.21, '산'],
      [0.35, '수'],
      [0.49, '학'],
      [0.63, '문'],
      [0.77, '화'],
      [0.92, '관'],
    ];
    cases.forEach(([lum, char]) => {
      expect(getBusanChar(lum)).toBe(char);
    });
  });
});
