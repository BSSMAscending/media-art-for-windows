const {
  readCell,
  getNeighbourhood,
  formatCellMath,
  formatScreenShare,
  countOnes,
} = require('../src/renderer/core/cellReadout');
const { applyImageMath, toGrey } = require('../src/renderer/core/imageMath');

const ko = (reading) => formatCellMath(reading).ko;
const en = (reading) => formatCellMath(reading).en;

// A 3×3 grey picture with the readme example numbers, as RGBA pixels.
const GREYS = [60, 90, 120, 80, 140, 200, 100, 170, 230];
const PIXELS = Uint8ClampedArray.from(GREYS.flatMap((value) => [value, value, value, 255]));
const GRID = { cols: 3, rows: 3 };

function mathFrame(effect, amount) {
  const grey = toGrey(PIXELS, new Uint8ClampedArray(9));
  const output = applyImageMath(effect, amount, grey, new Uint8ClampedArray(9), 3, 3);
  return { mode: 'math', grid: GRID, pixels: PIXELS, grey, output, math: { effect, amount } };
}

describe('reading a cell back', () => {
  it('reads the three lights of a colour cell', () => {
    const pixels = Uint8ClampedArray.from([230, 120, 40, 255]);
    const frame = { mode: 'rgb', grid: { cols: 1, rows: 1 }, pixels, channel: 'N' };
    expect(readCell(frame, 0, 0)).toEqual({ kind: 'rgb', channel: 'N', r: 230, g: 120, b: 40 });
    expect(readCell(frame, 1, 0)).toBeNull();
  });

  it('steps a cell with the same brightness and rule the levels view draws', () => {
    const frame = { mode: 'levels', grid: GRID, pixels: PIXELS, levels: 10, threshold: 128 };
    expect(readCell(frame, 2, 2)).toMatchObject({ grey: 230, level: 9 });
    expect(readCell(frame, 1, 1)).toMatchObject({ grey: 140, level: 5 });
  });

  it('reads the calculation input, result and neighbours from the drawn buffers', () => {
    const reading = readCell(mathFrame('contrast', 2), 1, 1);
    expect(reading).toMatchObject({ kind: 'math', value: 140, result: 152 });
    expect(reading.before).toEqual(GREYS);
    expect(reading.after[4]).toBe(152);
  });

  it('reads back the weighted sum the blur divided', () => {
    const reading = readCell(mathFrame('blur', 1), 1, 1);
    // 60 + 2·90 + 120 + 2·80 + 4·140 + 2·200 + 100 + 2·170 + 230 = 2,150
    expect(reading).toMatchObject({ sum: 2150, total: 16, result: 134 });
    expect(reading.average).toBe(134.375);
  });

  it('repeats the edge cell past the border, as the blur does', () => {
    expect(getNeighbourhood(GREYS, 3, 3, 0, 0)).toEqual([60, 60, 90, 60, 60, 90, 80, 80, 140]);
  });

  it('reads a person cell from the camera-side mask, mirrored like the picture', () => {
    // The mask is stored the camera's way round: column 0 is the visitor's right.
    const mask = Uint8Array.from([1, 0]);
    const segmentation = { width: 2, height: 1, probability: Uint8Array.from([230, 20]) };
    const person = {
      mask,
      raw: mask,
      segmentation,
      crop: { x: 0, y: 0, width: 2, height: 1 },
      sourceWidth: 2,
      sourceHeight: 1,
    };
    const frame = { mode: 'original', grid: { cols: 2, rows: 1 }, person };
    expect(readCell(frame, 1, 0)).toMatchObject({ bit: 1, probability: 230 });
    expect(readCell(frame, 0, 0)).toMatchObject({ bit: 0, probability: 20 });
    expect(readCell({ ...frame, person: null }, 0, 0)).toMatchObject({ bit: 0, probability: null });
  });
});

describe('writing a cell as arithmetic', () => {
  it('adds, and keeps the result within 0-255', () => {
    expect(ko(readCell(mathFrame('brightness', 60), 1, 1))).toBe('140 + 60 = 200');
    expect(ko(readCell(mathFrame('brightness', 60), 2, 2))).toBe('230 + 60 = 290 → 255');
    expect(ko(readCell(mathFrame('brightness', -80), 0, 0))).toBe('60 − 80 = −20 → 0');
  });

  it('multiplies around 128 and shows the rounding', () => {
    expect(ko(readCell(mathFrame('contrast', 2), 1, 1))).toBe('(140 − 128) × 2 + 128 = 152');
    expect(ko(readCell(mathFrame('contrast', 1.5), 1, 2))).toBe('(170 − 128) × 1.5 + 128 = 191');
    expect(ko(readCell(mathFrame('contrast', 2), 0, 0))).toBe('(60 − 128) × 2 + 128 = −8 → 0');
    expect(ko(readCell(mathFrame('contrast', 0.5), 0, 1))).toBe('(80 − 128) × 0.5 + 128 = 104');
  });

  it('divides the weighted sum by the total weight', () => {
    const reading = readCell(mathFrame('blur', 1), 1, 1);
    expect(ko(reading)).toBe('무게×값의 합 2,150 ÷ 16 = 134.4 → 134');
    expect(en(reading)).toBe('sum of weight × value 2,150 ÷ 16 = 134.4 → 134');
  });

  it('pushes a cell away from its average when sharpening', () => {
    expect(ko(readCell(mathFrame('sharpen', 1.5), 1, 1))).toBe(
      '140 + (140 − 134.4) × 1.5 = 148.4 → 148'
    );
  });

  it('names the brightness of an untouched cell', () => {
    expect(ko(readCell(mathFrame('none', 0), 1, 1))).toBe('밝기 = 140');
  });

  it('compares, divides or copies the brightness for each level count', () => {
    const levels = (count, threshold) => ({
      kind: 'levels',
      levels: count,
      threshold,
      grey: 183,
      level: count === 2 ? 1 : count === 10 ? 7 : 183,
    });
    expect(ko(levels(2, 128))).toBe('밝기 183 ≥ 128 → 1');
    expect(ko({ ...levels(2, 200), level: 0 })).toBe('밝기 183 < 200 → 0');
    expect(ko(levels(10))).toBe('밝기 183 ÷ 25.5 = 7.1 → 7');
    expect(ko(levels(256))).toBe('밝기 183 → 183');
    expect(ko({ ...levels(10), grey: 255, level: 9 })).toBe(
      '밝기 255 ÷ 25.5 = 10.0 → 9 (마지막 계단)'
    );
  });

  it('never shows a step quotient that reads as the next step', () => {
    // 178 ÷ 25.5 = 6.98: cut to 6.9, so it still reads as step 6.
    expect(ko({ kind: 'levels', levels: 10, grey: 178, level: 6 })).toBe(
      '밝기 178 ÷ 25.5 = 6.9 → 6'
    );
  });

  it('writes a colour as its three numbers, or one light as a share of 255', () => {
    const cell = { kind: 'rgb', r: 230, g: 255, b: 0 };
    expect(ko({ ...cell, channel: 'N' })).toBe('(R, G, B) = (230, 255, 0)');
    expect(ko({ ...cell, channel: 'R' })).toBe('빨간 빛 230 ÷ 255 ≈ 90%');
    expect(en({ ...cell, channel: 'G' })).toBe('green light 255 ÷ 255 = 100%');
    expect(ko({ ...cell, channel: 'B' })).toBe('파란 빛 0 ÷ 255 = 0%');
  });

  it("compares the AI's person probability with its 63% threshold", () => {
    const person = (probability, bit, raw = bit) => ({ kind: 'person', probability, bit, raw });
    expect(ko(person(230, 1))).toBe('사람일 확률 90% ≥ 63% → 1');
    expect(en(person(20, 0))).toBe('person 8% < 63% → 0');
    expect(ko(person(159, 0))).toBe('사람일 확률 62% < 63% → 0');
    expect(ko(person(160, 1))).toBe('사람일 확률 63% ≥ 63% → 1');
    expect(ko(person(100, 1, 0))).toBe('사람일 확률 39% < 63%, 손 보정 → 1');
    expect(ko(person(200, 0, 1))).toBe('사람일 확률 78% ≥ 63%, 작은 조각 → 0');
    expect(ko(person(null, 0))).toBe('사람 없음 → 0');
  });

  it('shows how much of the screen is 1', () => {
    expect(countOnes(Uint8Array.from([1, 0, 1, 1]))).toBe(3);
    expect(formatScreenShare(412, 2255).ko).toBe('1인 칸 412 ÷ 2,255 ≈ 18%');
    expect(formatScreenShare(0, 2255).en).toBe('cells that are 1: 0 ÷ 2,255 = 0%');
  });
});
