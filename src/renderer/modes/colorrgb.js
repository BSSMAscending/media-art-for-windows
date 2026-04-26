const { getLuminance, getMirroredMaskIndex } = require('../utils');
const { getLuminanceChar } = require('./numeric');

function renderColorRgb(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW, edgeData) {
  ctx.shadowBlur = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luminance = getLuminance(r, g, b);

      if (edgeData && edgeData[y * hiddenW + x] > 0.3) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = 0;
      }

      ctx.fillText(getLuminanceChar(luminance), x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
}

module.exports = { renderColorRgb };
