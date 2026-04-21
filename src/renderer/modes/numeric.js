const { getLuminance, getMirroredMaskIndex } = require('../utils');

const LUMINANCE_BUCKETS = [
  [0.1, '1'],
  [0.2, '7'],
  [0.3, '0'],
  [0.4, '3'],
  [0.5, '2'],
  [0.6, '5'],
  [0.7, '4'],
  [0.8, '6'],
  [0.9, '9'],
];

function getLuminanceChar(luminance) {
  for (const [threshold, char] of LUMINANCE_BUCKETS) {
    if (luminance < threshold) return char;
  }
  return '8';
}

function renderNumeric(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const luminance = getLuminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      const char = getLuminanceChar(luminance);

      ctx.fillText(char, x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
}

module.exports = { renderNumeric, getLuminanceChar };
