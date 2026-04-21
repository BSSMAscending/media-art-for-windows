const { LUMINANCE_THRESHOLD } = require('../config');
const { getLuminance, getMirroredMaskIndex } = require('../utils');

function renderBinary(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const luminance = getLuminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      const char = luminance > LUMINANCE_THRESHOLD ? '1' : '0';

      ctx.fillText(char, x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
}

module.exports = { renderBinary };
