const { getMirroredMaskIndex } = require('../utils');

function renderColor4k(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  ctx.shadowBlur = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const r4 = Math.round((pixels[i] / 255) * 15);
      const g4 = Math.round((pixels[i + 1] / 255) * 15);
      const b4 = Math.round((pixels[i + 2] / 255) * 15);

      ctx.fillStyle = `rgb(${r4 * 17},${g4 * 17},${b4 * 17})`;

      const hex =
        r4.toString(16).toUpperCase() +
        g4.toString(16).toUpperCase() +
        b4.toString(16).toUpperCase();
      ctx.fillText(hex, x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
}

module.exports = { renderColor4k };
