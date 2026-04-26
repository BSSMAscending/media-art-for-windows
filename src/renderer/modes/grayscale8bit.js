const { getLuminance, getMirroredMaskIndex } = require('../utils');

function renderGrayscale8bit(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  ctx.shadowBlur = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const luminance = getLuminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      const grayValue = Math.round(luminance * 255);
      const brightness = Math.max(80, grayValue);

      ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;

      if (fontSz >= 16) {
        ctx.font = `bold ${Math.floor(fontSz * 0.45)}px 'Courier New', monospace`;
        ctx.fillText(String(grayValue), x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
      } else if (fontSz >= 8) {
        ctx.font = `bold ${fontSz}px 'Courier New', monospace`;
        const digit = Math.floor(luminance * 9);
        ctx.fillText(String(digit), x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
      } else {
        ctx.fillRect(x * fontSz + 1, y * fontSz + 1, fontSz - 2, fontSz - 2);
      }
    }
  }
}

module.exports = { renderGrayscale8bit };
