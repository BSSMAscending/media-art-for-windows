const {
  COLORS,
  LUMINANCE_THRESHOLD,
  LUMINANCE_GLOW_THRESHOLD,
  CYAN_INFLUENCE,
} = require('../config');
const { getLuminance, getMirroredMaskIndex } = require('../utils');

function renderOriginal(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const maskIdx = getMirroredMaskIndex(x, y, cols, rows, segmentation);
      if (segmentation.data[maskIdx] !== 1) continue;

      const i = (y * hiddenW + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luminance = getLuminance(r, g, b);
      const char = luminance > LUMINANCE_THRESHOLD ? '1' : '0';

      ctx.fillStyle = COLORS.darkBg;
      ctx.fillRect(x * fontSz, y * fontSz, fontSz, fontSz);

      const outR = Math.floor(r * (1 - CYAN_INFLUENCE));
      const outG = Math.floor(g * (1 - CYAN_INFLUENCE) + 255 * CYAN_INFLUENCE);
      const outB = Math.floor(b * (1 - CYAN_INFLUENCE) + 255 * CYAN_INFLUENCE);
      const alpha = Math.max(0.4, luminance * 1.5);

      ctx.fillStyle = `rgba(${outR}, ${outG}, ${outB}, ${alpha})`;

      if (luminance > LUMINANCE_GLOW_THRESHOLD) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${outR}, ${outG}, ${outB}, 1)`;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillText(char, x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
}

module.exports = { renderOriginal };
