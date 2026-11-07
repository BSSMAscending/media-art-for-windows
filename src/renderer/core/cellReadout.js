const { greyOf, gaussianAt, getGaussianTotal } = require('./imageMath');
const { getLevel } = require('../modes/levels');

/**
 * Reads one cell back from the frame that was just drawn (see frameLoop.js) and
 * works out its calculation with the same functions the frame used, so the numbers
 * shown for a cell always match what is written in it. (x, y) is the cell as the
 * visitor sees it, counted from the top left of the mirrored picture.
 */

// The 3×3 block around (x, y), row by row; cells past the edge reuse the edge cell,
// as the blur does.
function getNeighbourhood(values, cols, rows, x, y) {
  const block = [];
  for (let dy = -1; dy <= 1; dy++) {
    const row = Math.max(0, Math.min(rows - 1, y + dy));
    for (let dx = -1; dx <= 1; dx++) {
      block.push(values[row * cols + Math.max(0, Math.min(cols - 1, x + dx))]);
    }
  }
  return block;
}

function readMath(frame, x, y) {
  const { cols, rows } = frame.grid;
  const { effect, amount } = frame.math;
  const reading = {
    kind: 'math',
    effect,
    amount,
    value: frame.grey[y * cols + x],
    result: frame.output[y * cols + x],
    before: getNeighbourhood(frame.grey, cols, rows, x, y),
    after: getNeighbourhood(frame.output, cols, rows, x, y),
  };
  if (effect === 'blur' || effect === 'sharpen') {
    const radius = effect === 'blur' ? amount : 1;
    reading.radius = radius;
    reading.total = getGaussianTotal(radius);
    reading.average = gaussianAt(frame.grey, cols, rows, x, y, radius);
    reading.sum = Math.round(reading.average * reading.total);
  }
  return reading;
}

function readCell(frame, x, y) {
  const { mode, grid } = frame;
  if (!grid || x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return null;
  const p = (y * grid.cols + x) * 4;
  if (mode === 'rgb' && frame.pixels) {
    const [r, g, b] = [frame.pixels[p], frame.pixels[p + 1], frame.pixels[p + 2]];
    return { kind: 'rgb', channel: frame.channel, r, g, b };
  }
  if (mode === 'levels' && frame.pixels) {
    const grey = greyOf(frame.pixels[p], frame.pixels[p + 1], frame.pixels[p + 2]);
    const { levels, threshold } = frame;
    return { kind: 'levels', levels, threshold, grey, level: getLevel(grey, levels, threshold) };
  }
  if (mode === 'math' && frame.grey) return readMath(frame, x, y);
  return null;
}

// --- Writing a reading out as one line of arithmetic ------------------------------

const number = (value) => value.toLocaleString('en-US');
// Negative numbers use the same minus sign as the formulas: −20, not -20.
const signedNumber = (value) => (value < 0 ? `−${number(-value)}` : number(value));
// Whole numbers stay whole; anything else shows one decimal place.
const decimal = (value) =>
  Number.isInteger(value) ? signedNumber(value) : signedNumber(Math.round(value * 10) / 10);
const operand = (value) => (value < 0 ? `− ${number(-value)}` : `+ ${number(value)}`);
const percent = (part, whole) => (part * 100) / whole;

// "= 290 → 255": the exact result, then what the cell keeps when it had to be
// rounded or kept within 0-255.
function settle(raw, result) {
  return raw === result ? `= ${number(result)}` : `= ${decimal(raw)} → ${number(result)}`;
}

function percentText(part, whole) {
  const value = percent(part, whole);
  return Number.isInteger(value) ? `= ${value}%` : `≈ ${Math.round(value)}%`;
}

const CHANNEL_NAMES = {
  R: { ko: '빨간 빛', en: 'red light' },
  G: { ko: '초록 빛', en: 'green light' },
  B: { ko: '파란 빛', en: 'blue light' },
};

function describeMath(reading) {
  const { effect, amount, value, result } = reading;
  if (effect === 'brightness') {
    const text = `${value} ${operand(amount)} ${settle(value + amount, result)}`;
    return { ko: text, en: text };
  }
  if (effect === 'contrast') {
    const raw = (value - 128) * amount + 128;
    const text = `(${value} − 128) × ${amount} + 128 ${settle(raw, result)}`;
    return { ko: text, en: text };
  }
  if (effect === 'blur') {
    const rest = `${number(reading.sum)} ÷ ${number(reading.total)} ${settle(reading.average, result)}`;
    return { ko: `가중치×값의 합 ${rest}`, en: `sum of weight × value ${rest}` };
  }
  // Unsharp masking: the cell minus its blurred value is the mask, added back × amount.
  if (effect === 'sharpen') {
    const raw = value + (value - reading.average) * amount;
    const rest = `${decimal(reading.average)}) × ${amount} ${settle(raw, result)}`;
    return {
      ko: `${value} + (${value} − 블러 ${rest}`,
      en: `${value} + (${value} − blur ${rest}`,
    };
  }
  return { ko: `밝기 = ${value}`, en: `brightness = ${value}` };
}

function describeLevels({ levels, threshold, grey, level }) {
  if (levels === 2 && threshold !== undefined) {
    const compare = grey >= threshold ? '≥' : '<';
    const text = `${grey} ${compare} ${threshold} → ${level}`;
    return { ko: `밝기 ${text}`, en: `brightness ${text}` };
  }
  if (levels === 256) return { ko: `밝기 ${grey} → ${level}`, en: `brightness ${grey} → ${level}` };
  // Step width 255 ÷ levels; the quotient is cut (not rounded) to one decimal so it
  // never reads as the next step.
  const width = 255 / levels;
  const quotient = Math.floor(((grey * levels) / 255) * 10) / 10;
  const top = (grey * levels) / 255 >= levels ? { ko: ' (마지막 계단)', en: ' (top step)' } : null;
  const text = `${grey} ÷ ${width} = ${quotient.toFixed(1)} → ${level}`;
  return { ko: `밝기 ${text}${top ? top.ko : ''}`, en: `brightness ${text}${top ? top.en : ''}` };
}

/** The reading's calculation as one line of arithmetic, a { ko, en } pair. */
function formatCellMath(reading) {
  if (!reading) return null;
  if (reading.kind === 'math') return describeMath(reading);
  if (reading.kind === 'levels') return describeLevels(reading);
  const { channel, r, g, b } = reading;
  if (channel === 'N') {
    const text = `(R, G, B) = (${r}, ${g}, ${b})`;
    return { ko: text, en: text };
  }
  const value = { R: r, G: g, B: b }[channel];
  const name = CHANNEL_NAMES[channel];
  const text = `${value} ÷ 255 ${percentText(value, 255)}`;
  return { ko: `${name.ko} ${text}`, en: `${name.en} ${text}` };
}

module.exports = {
  readCell,
  getNeighbourhood,
  formatCellMath,
};
