const { getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');
const { greyOf } = require('../core/imageMath');
const { getLevel, isDarkLevelText } = require('../modes/levels');
const { isDarkGreyText } = require('../modes/math');
const { isDarkChannelText, CHANNELS } = require('../modes/rgb');
const { ZOOM } = require('./magnifier');

// Small cells are drawn without their numbers. The magnifier then zooms in far
// enough to write each cell's number at this size (CSS px) and writes them itself,
// so the numbers can always be read up close.
const LENS_DIGIT_FONT_SIZE = 16;
const MAX_ZOOM = 16;

/**
 * How the cells of the frame that was just drawn are numbered: how many digits the
 * largest number has, and `label(x, y)`, a cell's number and whether it is written
 * in black. The same numbers and colours as the views' own digits (modes/*.js).
 * Null for the RGB full colour, which has no numbers, and while the RGB layers move.
 */
function getCellLabels(frame) {
  if (!frame?.grid?.cols || frame.moving) return null;
  const { cols } = frame.grid;
  if (frame.mode === 'levels' && frame.pixels) {
    const { pixels, levels, threshold } = frame;
    const maxLevel = levels - 1;
    return {
      digits: String(maxLevel).length,
      label(x, y) {
        const p = (y * cols + x) * 4;
        const level = getLevel(greyOf(pixels[p], pixels[p + 1], pixels[p + 2]), levels, threshold);
        return { text: String(level), dark: isDarkLevelText(level, maxLevel) };
      },
    };
  }
  if (frame.mode === 'math' && frame.output) {
    const values = frame.output;
    return {
      digits: 3,
      label(x, y) {
        const value = values[y * cols + x];
        return { text: String(value), dark: isDarkGreyText(value) };
      },
    };
  }
  const c = CHANNELS.indexOf(frame.channel);
  if (frame.mode === 'rgb' && frame.pixels && c >= 0) {
    const { pixels } = frame;
    return {
      digits: 3,
      label(x, y) {
        const value = pixels[(y * cols + x) * 4 + c];
        return { text: String(value), dark: isDarkChannelText(c, value) };
      },
    };
  }
  return null;
}

/** Whether the screen itself writes numbers of `digits` digits into cells this size. */
function showsDigits(cellSize, digits) {
  return getDigitFontSize(cellSize, digits) >= MIN_DIGIT_FONT_SIZE;
}

/**
 * The lens zoom for the frame: ZOOM, or closer when the screen leaves the numbers
 * out, so each magnified cell has room for its number at LENS_DIGIT_FONT_SIZE.
 */
function getLensZoom(frame) {
  const labels = getCellLabels(frame);
  if (!labels) return ZOOM;
  const { cellSize } = frame.grid;
  if (showsDigits(cellSize, labels.digits)) return ZOOM;
  let lensCell = cellSize;
  while (getDigitFontSize(lensCell, labels.digits) < LENS_DIGIT_FONT_SIZE) lensCell++;
  return Math.min(MAX_ZOOM, Math.max(ZOOM, Math.ceil(lensCell / cellSize)));
}

/**
 * Writes the numbers of the cells inside the lens when the screen leaves them out.
 * `toLens`, `scale` and `region` come from the magnifier's decorate hook.
 */
function drawLensDigits(ctx, toLens, scale, region, frame) {
  const labels = getCellLabels(frame);
  if (!labels) return;
  const { cols, rows, cellSize, x: gridX, y: gridY } = frame.grid;
  if (showsDigits(cellSize, labels.digits)) return;
  const fontSize = getDigitFontSize(cellSize * scale, labels.digits);
  if (fontSize < MIN_DIGIT_FONT_SIZE) return;

  const first = (start) => Math.floor((start - 1) / cellSize);
  const last = (end) => Math.ceil((end + 1) / cellSize);
  const x0 = Math.max(0, first(region.left - gridX));
  const y0 = Math.max(0, first(region.top - gridY));
  const x1 = Math.min(cols, last(region.left + region.size - gridX));
  const y1 = Math.min(rows, last(region.top + region.size - gridY));

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const { text, dark } = labels.label(x, y);
      const [centerX, centerY] = toLens(gridX + (x + 0.5) * cellSize, gridY + (y + 0.5) * cellSize);
      ctx.fillStyle = dark ? '#000000' : '#ffffff';
      ctx.fillText(text, centerX, centerY);
    }
  }
  ctx.restore();
}

module.exports = {
  getCellLabels,
  getLensZoom,
  drawLensDigits,
  showsDigits,
  LENS_DIGIT_FONT_SIZE,
  MAX_ZOOM,
};
