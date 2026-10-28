const {
  clampByte,
  greyOf,
  toGrey,
  addBrightness,
  scaleContrast,
  getGaussianWeights,
  gaussianBlur,
  sharpen,
  applyImageMath,
} = require('../src/renderer/core/imageMath');

const grid = Uint8ClampedArray.from([60, 90, 120, 80, 140, 200, 100, 170, 230]);
const run = (fn, ...args) => [...fn(grid, new Uint8ClampedArray(9), ...args)];

describe('image math on grey cells', () => {
  it('rounds and keeps every result within 0-255', () => {
    expect([clampByte(-3), clampByte(12.5), clampByte(300)]).toEqual([0, 13, 255]);
  });

  it('turns RGBA cells into one brightness number each', () => {
    const pixels = Uint8ClampedArray.from([255, 255, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
    expect([...toGrey(pixels, new Uint8ClampedArray(3))]).toEqual([255, 76, 29]);
  });

  it("rounds one cell's brightness to a whole number", () => {
    expect([greyOf(255, 255, 255), greyOf(153, 153, 152), greyOf(255, 0, 0)]).toEqual([
      255, 153, 76,
    ]);
  });

  it('adds brightness to every cell and stops at 255', () => {
    expect(run(addBrightness, 60)).toEqual([120, 150, 180, 140, 200, 255, 160, 230, 255]);
    expect(run(addBrightness, -100)).toEqual([0, 0, 20, 0, 40, 100, 0, 70, 130]);
  });

  it('stretches contrast around the middle grey 128', () => {
    expect(run(scaleContrast, 2)).toEqual([0, 52, 112, 32, 152, 255, 72, 212, 255]);
    expect(run(scaleContrast, 1)).toEqual([...grid]);
    expect(new Set(run(scaleContrast, 0))).toEqual(new Set([128]));
  });

  it('builds Gaussian weights from Pascal rows, heaviest in the middle', () => {
    expect(getGaussianWeights(1)).toEqual([
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ]);
    const five = getGaussianWeights(2);
    expect(five[2][2]).toBe(36);
    expect(five.flat().reduce((a, b) => a + b, 0)).toBe(256);
    expect(
      getGaussianWeights(3)
        .flat()
        .reduce((a, b) => a + b, 0)
    ).toBe(4096);
  });

  it('blurs with the 3×3 Gaussian weights, reusing edge cells off the grid', () => {
    const blurred = run(gaussianBlur, 3, 3, 1);
    // 60·1 + 90·2 + 120·1 + 80·2 + 140·4 + 200·2 + 100·1 + 170·2 + 230·1 = 2150.
    expect(blurred[4]).toBe(Math.round(2150 / 16));
    // Top-left: rows 0,0,1 and cols 0,0,1 → 270 + 540 + 380 = 1190.
    expect(blurred[0]).toBe(Math.round(1190 / 16));
  });

  it('keeps a flat area unchanged at every blur size', () => {
    const flat = new Uint8ClampedArray(25).fill(90);
    for (const radius of [1, 2, 3]) {
      expect(new Set(gaussianBlur(flat, new Uint8ClampedArray(25), 5, 5, radius))).toEqual(
        new Set([90])
      );
    }
  });

  it('sharpens by adding the difference from the 3×3 Gaussian average', () => {
    const result = [...sharpen(grid, new Uint8ClampedArray(9), 3, 3, 1.5)];
    expect(result[4]).toBe(Math.round(140 + 1.5 * (140 - 2150 / 16)));
    expect([...sharpen(grid, new Uint8ClampedArray(9), 3, 3, 0)]).toEqual([...grid]);
  });

  it('dispatches each effect and copies the input for none', () => {
    const output = new Uint8ClampedArray(9);
    expect([...applyImageMath('none', 0, grid, output, 3, 3)]).toEqual([...grid]);
    expect(applyImageMath('brightness', 10, grid, output, 3, 3)[0]).toBe(70);
    expect(applyImageMath('contrast', 2, grid, output, 3, 3)[4]).toBe(152);
    expect(applyImageMath('blur', 1, grid, output, 3, 3)[4]).toBe(134);
    expect(applyImageMath('sharpen', 1.5, grid, output, 3, 3)[4]).toBe(148);
  });
});
