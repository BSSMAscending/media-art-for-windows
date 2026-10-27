/**
 * Grey cell arithmetic for the 수학 처리 mode, adapted from BusanMathVision's
 * filters. Every function reads one 0-255 value per cell from `input` and writes
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

// 블러: average of the (2r+1)×(2r+1) cells around each cell; off-grid cells reuse the edge.
function boxBlur(input, output, cols, rows, radius) {
  const size = (radius * 2 + 1) ** 2;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const row = Math.max(0, Math.min(rows - 1, y + dy)) * cols;
        for (let dx = -radius; dx <= radius; dx++) {
          sum += input[row + Math.max(0, Math.min(cols - 1, x + dx))];
        }
      }
      output[y * cols + x] = clampByte(sum / size);
    }
  }
  return output;
}

// 선명: push each cell further from its 3×3 average by `amount` times the difference.
function sharpen(input, output, cols, rows, amount, scratch) {
  boxBlur(input, scratch, cols, rows, 1);
  for (let i = 0; i < input.length; i++) {
    output[i] = clampByte(input[i] + amount * (input[i] - scratch[i]));
  }
  return output;
}

/** Runs one effect; 'none' copies the input so the original numbers stay visible. */
function applyImageMath(effect, amount, input, output, cols, rows, scratch) {
  if (effect === 'brightness') return addBrightness(input, output, amount);
  if (effect === 'contrast') return scaleContrast(input, output, amount);
  if (effect === 'blur') return boxBlur(input, output, cols, rows, amount);
  if (effect === 'sharpen') return sharpen(input, output, cols, rows, amount, scratch);
  output.set(input);
  return output;
}

module.exports = {
  clampByte,
  toGrey,
  addBrightness,
  scaleContrast,
  boxBlur,
  sharpen,
  applyImageMath,
};
