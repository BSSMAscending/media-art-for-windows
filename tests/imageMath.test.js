const {
  clampByte,
  toGrey,
  addBrightness,
  scaleContrast,
  boxBlur,
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

  it('adds brightness to every cell and stops at 255', () => {
    expect(run(addBrightness, 60)).toEqual([120, 150, 180, 140, 200, 255, 160, 230, 255]);
    expect(run(addBrightness, -100)).toEqual([0, 0, 20, 0, 40, 100, 0, 70, 130]);
  });

  it('stretches contrast around the middle grey 128', () => {
    expect(run(scaleContrast, 2)).toEqual([0, 52, 112, 32, 152, 255, 72, 212, 255]);
    expect(run(scaleContrast, 1)).toEqual([...grid]);
    expect(new Set(run(scaleContrast, 0))).toEqual(new Set([128]));
  });

  it('averages the 3×3 neighbourhood, reusing edge cells off the grid', () => {
    const blurred = run(boxBlur, 3, 3, 1);
    expect(blurred[4]).toBe(Math.round(1190 / 9));
    // Top-left: rows/cols 0,0,1 → (60+60+90)·2 + (80+80+140) = 720.
    expect(blurred[0]).toBe(80);
  });

  it('sharpens by adding the difference from the 3×3 average', () => {
    const scratch = new Uint8ClampedArray(9);
    const result = [...sharpen(grid, new Uint8ClampedArray(9), 3, 3, 1.5, scratch)];
    expect(result[4]).toBe(Math.round(140 + 1.5 * (140 - 132)));
    expect([...sharpen(grid, new Uint8ClampedArray(9), 3, 3, 0, scratch)]).toEqual([...grid]);
  });

  it('dispatches each effect and copies the input for none', () => {
    const output = new Uint8ClampedArray(9);
    const scratch = new Uint8ClampedArray(9);
    expect([...applyImageMath('none', 0, grid, output, 3, 3, scratch)]).toEqual([...grid]);
    expect(applyImageMath('brightness', 10, grid, output, 3, 3, scratch)[0]).toBe(70);
    expect(applyImageMath('contrast', 2, grid, output, 3, 3, scratch)[4]).toBe(152);
    expect(applyImageMath('blur', 1, grid, output, 3, 3, scratch)[4]).toBe(132);
    expect(applyImageMath('sharpen', 1.5, grid, output, 3, 3, scratch)[4]).toBe(152);
  });
});
