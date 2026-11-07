const { getDigitFontSize, MIN_DIGIT_FONT_SIZE, getLuminance } = require('../utils');
const { greyOf } = require('../core/imageMath');
const { getLevel, isDarkLevelText } = require('../modes/levels');
const { isDarkGreyText } = require('../modes/math');
const {
  isDarkChannelText,
  getColorValueFontSize,
  getColorValueTints,
  CHANNELS,
} = require('../modes/rgb');
const { ZOOM } = require('./magnifier');

// Small cells are drawn without their numbers, and the RGB full colour never writes
// them on screen. The magnifier then zooms in far enough to write each cell's
// numbers at this size (CSS px) and writes them itself, so they can always be read
// up close.
const LENS_DIGIT_FONT_SIZE = 16;
const MAX_ZOOM = 24;

// One number per cell, white or black like the view's own digits.
function singleNumber(digits, label) {
  const fontSize = (cellSize) => getDigitFontSize(cellSize, digits);
  return {
    fontSize,
    onScreen: (cellSize) => fontSize(cellSize) >= MIN_DIGIT_FONT_SIZE,
    lineHeight: 0,
    lines(x, y) {
      const { text, dark } = label(x, y);
      return [{ text, color: dark ? '#000000' : '#ffffff' }];
    },
  };
}

/**
 * How the cells of the frame that was just drawn are written in the lens:
 * `lines(x, y)` gives a cell's numbers, one per line with its colour; `fontSize`
 * and `lineHeight` size them for a cell of a given size; `onScreen` says whether
 * the screen already writes them at that cell size. The same numbers and colours
 * as the views' own digits (modes/*.js). The RGB full colour writes R, G and B as
 * three tinted lines. Null while the RGB layers move.
 */
function getCellLabels(frame) {
  if (!frame?.grid?.cols || frame.moving) return null;
  const { cols } = frame.grid;
  if (frame.mode === 'levels' && frame.pixels) {
    const { pixels, levels, threshold } = frame;
    const maxLevel = levels - 1;
    return singleNumber(String(maxLevel).length, (x, y) => {
      const p = (y * cols + x) * 4;
      const level = getLevel(greyOf(pixels[p], pixels[p + 1], pixels[p + 2]), levels, threshold);
      return { text: String(level), dark: isDarkLevelText(level, maxLevel) };
    });
  }
  if (frame.mode === 'math' && frame.output) {
    const values = frame.output;
    return singleNumber(3, (x, y) => {
      const value = values[y * cols + x];
      return { text: String(value), dark: isDarkGreyText(value) };
    });
  }
  if (frame.mode !== 'rgb' || !frame.pixels) return null;
  const { pixels } = frame;
  const c = CHANNELS.indexOf(frame.channel);
  if (c >= 0) {
    return singleNumber(3, (x, y) => {
      const value = pixels[(y * cols + x) * 4 + c];
      return { text: String(value), dark: isDarkChannelText(c, value) };
    });
  }
  return {
    fontSize: getColorValueFontSize,
    onScreen: () => false,
    lineHeight: 0.3,
    lines(x, y) {
      const p = (y * cols + x) * 4;
      const tints = getColorValueTints(getLuminance(pixels[p], pixels[p + 1], pixels[p + 2]));
      return tints.map((color, channel) => ({ text: String(pixels[p + channel]), color }));
    },
  };
}

/**
 * The lens zoom for the frame: ZOOM, or closer when the screen leaves the numbers
 * out, so each magnified cell has room for its numbers at LENS_DIGIT_FONT_SIZE.
 */
function getLensZoom(frame) {
  const labels = getCellLabels(frame);
  if (!labels) return ZOOM;
  const { cellSize } = frame.grid;
  if (labels.onScreen(cellSize)) return ZOOM;
  let lensCell = cellSize;
  while (labels.fontSize(lensCell) < LENS_DIGIT_FONT_SIZE) lensCell++;
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
  if (labels.onScreen(cellSize)) return;
  const lensCell = cellSize * scale;
  const fontSize = labels.fontSize(lensCell);
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
      const lines = labels.lines(x, y);
      const [centerX, centerY] = toLens(gridX + (x + 0.5) * cellSize, gridY + (y + 0.5) * cellSize);
      lines.forEach(({ text, color }, index) => {
        const offset = (index - (lines.length - 1) / 2) * labels.lineHeight * lensCell;
        ctx.fillStyle = color;
        ctx.fillText(text, centerX, centerY + offset);
      });
    }
  }
  ctx.restore();
}

module.exports = {
  getCellLabels,
  getLensZoom,
  drawLensDigits,
  LENS_DIGIT_FONT_SIZE,
  MAX_ZOOM,
};
