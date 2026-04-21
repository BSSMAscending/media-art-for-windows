const { BUSAN_CHARS } = require('../config');
const { getLuminance, getMirroredMaskIndex } = require('../utils');

const BUSAN_THRESHOLDS = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84];

function getBusanChar(luminance) {
  for (let i = 0; i < BUSAN_THRESHOLDS.length; i++) {
    if (luminance < BUSAN_THRESHOLDS[i]) return BUSAN_CHARS[i];
  }
  return BUSAN_CHARS[BUSAN_CHARS.length - 1];
}

function renderBusan(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const luminance = getLuminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      const char = getBusanChar(luminance);

      ctx.fillText(char, x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
}

module.exports = { renderBusan, getBusanChar };
