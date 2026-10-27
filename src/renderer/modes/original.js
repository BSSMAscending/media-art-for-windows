const { COLORS, LUMINANCE_GLOW_THRESHOLD, CYAN_INFLUENCE } = require('../config');
const { getLuminance, getMirroredMaskIndex } = require('../utils');

// Dim enough that the person's 1s stand out, bright enough to read the 0s up close.
const ZERO_COLOR = 'rgba(0, 255, 255, 0.18)';

/**
 * 미디어 아트: every cell on the screen is one bit. Cells where the AI found a person
 * are 1, lit in their camera colour pulled toward cyan (bright ones glow); every
 * other cell is a dim 0. `segmentation` is null while nobody is in view, which
 * leaves a screen of zeros.
 */
function renderOriginal(ctx, cols, rows, fontSz, segmentation, pixels, hiddenW) {
  const isPerson = (x, y) =>
    segmentation !== null &&
    segmentation.data[getMirroredMaskIndex(x, y, cols, rows, segmentation)] === 1;

  // All zeros first in one colour, so filling the whole screen stays cheap.
  ctx.shadowBlur = 0;
  ctx.fillStyle = ZERO_COLOR;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isPerson(x, y)) ctx.fillText('0', x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
  if (segmentation === null) return;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isPerson(x, y)) continue;

      const i = (y * hiddenW + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luminance = getLuminance(r, g, b);

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

      ctx.fillText('1', x * fontSz + fontSz / 2, y * fontSz + fontSz / 2);
    }
  }
  ctx.shadowBlur = 0;
}

module.exports = { renderOriginal, ZERO_COLOR };
