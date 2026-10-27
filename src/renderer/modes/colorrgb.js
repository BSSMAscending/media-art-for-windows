const { getLuminance, getMirroredMaskIndex } = require('../utils');
const { getLevel } = require('./levels');

function renderColorRgb(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
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

      ctx.fillStyle = `rgb(${r},${g},${b})`;

      ctx.fillText(
        String(getLevel(luminance, 10)),
        x * fontSz + fontSz / 2,
        y * fontSz + fontSz / 2
      );
    }
  }
}

module.exports = { renderColorRgb };
