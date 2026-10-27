const { getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');

/**
 * Draws the computed grey values: each cell's grey goes into `output` for the GPU
 * layer and its 0-255 number on top, so visitors watch the numbers change as the
 * calculation does.
 */
function renderMath(ctx, grid, values, output) {
  const { cols, rows, cellSize, x: originX, y: originY } = grid;
  const fontSize = getDigitFontSize(cellSize, 3);
  const showDigits = fontSize >= MIN_DIGIT_FONT_SIZE;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = y * cols + x;
      const value = values[cell];
      const i = cell * 4;
      output[i] = value;
      output[i + 1] = value;
      output[i + 2] = value;
      output[i + 3] = 255;
      if (!showDigits) continue;

      ctx.fillStyle = value >= 128 ? '#000000' : '#ffffff';
      ctx.fillText(String(value), originX + (x + 0.5) * cellSize, originY + (y + 0.5) * cellSize);
    }
  }
}

module.exports = { renderMath };
