/**
 * Grey cell arithmetic for the 수학 처리 mode, adapted from BusanMathVision's
 * filters. Blur and sharpen use Gaussian weights, the standard blur. Every function reads one 0-255 value per cell from `input` and writes
 * the result to `output`; results are rounded and kept within 0-255.
 */

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// A cell's brightness as the whole number 0-255 that the levels and math views show.
function greyOf(r, g, b) {
  return clampByte(0.299 * r + 0.587 * g + 0.114 * b);
}

// One brightness number per cell.
function toGrey(pixels, output) {
  for (let i = 0; i < output.length; i++) {
    const p = i * 4;
    output[i] = greyOf(pixels[p], pixels[p + 1], pixels[p + 2]);
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

// Sum of all the weights: 16 for 3×3, 256 for 5×5, 4,096 for 7×7. Powers of two, so
// dividing by it is exact and the weighted sum can be read back as average × total.
function getGaussianTotal(radius) {
  return GAUSSIAN_ROWS[radius].reduce((sum, weight) => sum + weight, 0) ** 2;
}

// Weighted average of the cells around (x, y), unrounded; off-grid cells reuse the edge.
function gaussianAt(input, cols, rows, x, y, radius) {
  const row = GAUSSIAN_ROWS[radius];
  const total = getGaussianTotal(radius);
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

// Scratch rows for gaussianAverages, grown when the grid grows.
let rowSums = new Float64Array(0);
let averages = new Float64Array(0);

/**
 * The unrounded Gaussian average of every cell, the same numbers gaussianAt gives,
 * worked out a row then a column at a time: the weights are a row times a column
 * (Pascal's triangle), so summing across and then down adds up the same products in
 * (2r + 1) × 2 steps per cell instead of (2r + 1)². The sums are whole numbers well
 * inside a double's exact range, so no rounding creeps in.
 */
function gaussianAverages(input, cols, rows, radius) {
  const count = cols * rows;
  if (rowSums.length < count) {
    rowSums = new Float64Array(count);
    averages = new Float64Array(count);
  }
  const row = GAUSSIAN_ROWS[radius];
  const total = getGaussianTotal(radius);
  for (let y = 0; y < rows; y++) {
    const offset = y * cols;
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += row[d + radius] * input[offset + Math.max(0, Math.min(cols - 1, x + d))];
      }
      rowSums[offset + x] = sum;
    }
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += row[d + radius] * rowSums[Math.max(0, Math.min(rows - 1, y + d)) * cols + x];
      }
      averages[y * cols + x] = sum / total;
    }
  }
  return averages;
}

// 블러: each cell becomes the Gaussian weighted average of its neighbours.
function gaussianBlur(input, output, cols, rows, radius) {
  const average = gaussianAverages(input, cols, rows, radius);
  for (let i = 0; i < cols * rows; i++) output[i] = clampByte(average[i]);
  return output;
}

// 선명 (unsharp masking): blur a copy (the 3×3 Gaussian average), take the mask,
// cell − blur, which only lives at edges, and add it back `amount` times.
function sharpen(input, output, cols, rows, amount) {
  const average = gaussianAverages(input, cols, rows, 1);
  for (let i = 0; i < cols * rows; i++) {
    output[i] = clampByte(input[i] + amount * (input[i] - average[i]));
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
  greyOf,
  toGrey,
  addBrightness,
  scaleContrast,
  getGaussianWeights,
  getGaussianTotal,
  gaussianAt,
  gaussianBlur,
  sharpen,
  applyImageMath,
};
