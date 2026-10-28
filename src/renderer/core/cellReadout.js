const { clampByte, greyOf, gaussianAt, getGaussianTotal } = require('./imageMath');
const { getCellMaskIndex } = require('./coverCrop');
const { getLevel } = require('../modes/levels');
const { BODY_SEGMENTATION_CONFIG } = require('../config');

/**
 * Reads one cell back from the frame that was just drawn (see frameLoop.js) and
 * works out its calculation with the same functions the frame used, so the numbers
 * shown for a cell always match what is written in it. (x, y) is the cell as the
 * visitor sees it, counted from the top left of the mirrored picture.
 */

const PERSON_THRESHOLD = BODY_SEGMENTATION_CONFIG.personAlphaThreshold;

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

// The visitor sees the camera mirrored; the mask is stored the camera's way round.
function readPerson(frame, x, y) {
  const { cols, rows } = frame.grid;
  const person = frame.person;
  const reading = { kind: 'person', bit: 0, raw: 0, probability: null };
  if (!person) return reading;
  const maskIndex = y * cols + (cols - 1 - x);
  reading.bit = person.mask[maskIndex];
  reading.raw = person.raw[maskIndex];
  const { segmentation } = person;
  if (segmentation?.probability) {
    const index = getCellMaskIndex(
      segmentation,
      person.crop,
      person.sourceWidth,
      person.sourceHeight,
      cols,
      rows,
      cols - 1 - x,
      y
    );
    reading.probability = segmentation.probability[index];
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
  if (mode === 'original') return readPerson(frame, x, y);
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
    return { ko: `무게×값의 합 ${rest}`, en: `sum of weight × value ${rest}` };
  }
  if (effect === 'sharpen') {
    const raw = value + (value - reading.average) * amount;
    const text = `${value} + (${value} − ${decimal(reading.average)}) × ${amount} ${settle(raw, result)}`;
    return { ko: text, en: text };
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

function describePerson({ bit, raw, probability }) {
  const threshold = Math.round(percent(PERSON_THRESHOLD, 255));
  if (probability === null) {
    return bit
      ? { ko: '사람 → 1', en: 'person → 1' }
      : { ko: '사람 없음 → 0', en: 'no person → 0' };
  }
  const chance = Math.round(percent(probability, 255));
  const compare = probability >= PERSON_THRESHOLD ? '≥' : '<';
  const decided = `${chance}% ${compare} ${threshold}%`;
  // Small specks are wiped and fingers are filled in after the AI decides.
  if (bit !== raw) {
    return bit
      ? { ko: `사람일 확률 ${decided}, 손 보정 → 1`, en: `person ${decided}, hand fix → 1` }
      : { ko: `사람일 확률 ${decided}, 작은 조각 → 0`, en: `person ${decided}, speck → 0` };
  }
  return { ko: `사람일 확률 ${decided} → ${bit}`, en: `person ${decided} → ${bit}` };
}

/** The reading's calculation as one line of arithmetic, a { ko, en } pair. */
function formatCellMath(reading) {
  if (!reading) return null;
  if (reading.kind === 'math') return describeMath(reading);
  if (reading.kind === 'levels') return describeLevels(reading);
  if (reading.kind === 'person') return describePerson(reading);
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

function countOnes(mask) {
  let ones = 0;
  for (let i = 0; i < mask.length; i++) ones += mask[i];
  return ones;
}

/** 미디어 아트: how much of the screen the visitor's 1s fill, a { ko, en } pair. */
function formatScreenShare(ones, total) {
  const text = `${number(ones)} ÷ ${number(total)} ${percentText(ones, total)}`;
  return { ko: `1인 칸 ${text}`, en: `cells that are 1: ${text}` };
}

module.exports = {
  readCell,
  getNeighbourhood,
  formatCellMath,
  formatScreenShare,
  countOnes,
};
