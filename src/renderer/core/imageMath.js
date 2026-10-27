/**
 * Grey cell arithmetic for the 수학 처리 mode, adapted from BusanMathVision's
 * filters. Blur and sharpen use Gaussian weights, the standard blur. Every function reads one 0-255 value per cell from `input` and writes
 * the result to `output`; results are rounded and kept within 0-255.
 */

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// One brightness number per cell, the same weights the levels mode uses.
function toGrey(pixels, output) {
  for (let i = 0; i < output.length; i++) {
    const p = i * 4;
    output[i] = clampByte(0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2]);
  }
  return output;
}

// 밝기: add the same amount to every cell.
function addBrightness(input, output, amount) {
  for (let i = 0; i < input.length; i++) output[i] = clampByte(input[i] + amount);
  return output;
}

// 대비: stretch each cell's distance from the middle grey 128.
function scaleContrast(input, output, gain) {
  for (let i = 0; i < input.length; i++) output[i] = clampByte((input[i] - 128) * gain + 128);
  return output;
}

// Gaussian weights for a radius: a row of Pascal's triangle multiplied by itself, so
// 3×3 is corner 1 · side 2 · centre 4 out of 16. It is the standard blur's shape.
const GAUSSIAN_ROWS = { 1: [1, 2, 1], 2: [1, 4, 6, 4, 1], 3: [1, 6, 15, 20, 15, 6, 1] };

function getGaussianWeights(radius) {
  const row = GAUSSIAN_ROWS[radius];
  return row.map((a) => row.map((b) => a * b));
}

// Weighted average of the cells around (x, y), unrounded; off-grid cells reuse the edge.
function gaussianAt(input, cols, rows, x, y, radius) {
  const row = GAUSSIAN_ROWS[radius];
  const total = row.reduce((sum, weight) => sum + weight, 0) ** 2;
  let sum = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    const offset = Math.max(0, Math.min(rows - 1, y + dy)) * cols;
    for (let dx = -radius; dx <= radius; dx++) {
      const weight = row[dy + radius] * row[dx + radius];
      sum += weight * input[offset + Math.max(0, Math.min(cols - 1, x + dx))];
    }
  }
  return sum / total;
}

// 블러: each cell becomes the Gaussian weighted average of its neighbours.
function gaussianBlur(input, output, cols, rows, radius) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      output[y * cols + x] = clampByte(gaussianAt(input, cols, rows, x, y, radius));
    }
  }
  return output;
}

// 선명 (unsharp mask): push each cell away from its 3×3 Gaussian average by
// `amount` times the difference.
function sharpen(input, output, cols, rows, amount) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const average = gaussianAt(input, cols, rows, x, y, 1);
      output[i] = clampByte(input[i] + amount * (input[i] - average));
    }
  }
  return output;
}

/** Runs one effect; 'none' copies the input so the original numbers stay visible. */
function applyImageMath(effect, amount, input, output, cols, rows) {
  if (effect === 'brightness') return addBrightness(input, output, amount);
  if (effect === 'contrast') return scaleContrast(input, output, amount);
  if (effect === 'blur') return gaussianBlur(input, output, cols, rows, amount);
  if (effect === 'sharpen') return sharpen(input, output, cols, rows, amount);
  output.set(input);
  return output;
}

module.exports = {
  clampByte,
  toGrey,
  addBrightness,
  scaleContrast,
  getGaussianWeights,
  gaussianBlur,
  sharpen,
  applyImageMath,
};
