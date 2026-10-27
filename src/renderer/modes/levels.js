const { getLuminance, getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');

// Splits brightness 0..1 into `levels` equal steps numbered 0..levels-1.
function getLevel(luminance, levels) {
  return Math.min(levels - 1, Math.floor(luminance * levels));
}

/**
 * Quantizes every cell's brightness, writes the matching grey into `output` for
 * the GPU layer, and labels the cell with its step number. Computing both here
 * keeps each digit and the grey behind it from ever disagreeing.
 */
function renderLevels(ctx, grid, pixels, levels, output) {
  const { cols, rows, cellSize, x: originX, y: originY } = grid;
  const maxLevel = levels - 1;
  const fontSize = getDigitFontSize(cellSize, String(maxLevel).length);
  const showDigits = fontSize >= MIN_DIGIT_FONT_SIZE;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const level = getLevel(getLuminance(pixels[i], pixels[i + 1], pixels[i + 2]), levels);
      const gray = Math.round((level * 255) / maxLevel);
      output[i] = gray;
      output[i + 1] = gray;
      output[i + 2] = gray;
      output[i + 3] = 255;
      if (!showDigits) continue;

      ctx.fillStyle = level / maxLevel >= 0.5 ? '#000000' : '#ffffff';
      ctx.fillText(String(level), originX + (x + 0.5) * cellSize, originY + (y + 0.5) * cellSize);
    }
  }
}

module.exports = { getLevel, renderLevels };
