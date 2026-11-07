const { getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');

const CHANNELS = ['R', 'G', 'B'];
// Light and dark tints of each light, so every line stays readable on any cell colour.
const LIGHT_TINTS = ['#ff9d9d', '#9dff9d', '#9dc4ff'];
const DARK_TINTS = ['#7a0000', '#005c00', '#00287a'];

// White digits read on every red and blue cell; bright green cells need black ones.
function isDarkChannelText(channelIndex, value) {
  return channelIndex === 1 && value > 160;
}

// Three stacked lines need a third of the cell's height each.
function getColorValueFontSize(cellSize) {
  return Math.floor(Math.min(cellSize * 0.3, (cellSize * 0.92) / (3 * 0.6)));
}

// The tints for a cell's R, G and B lines: dark on bright cells, light on dark ones.
function getColorValueTints(luminance) {
  return luminance >= 0.5 ? DARK_TINTS : LIGHT_TINTS;
}

// Writes the selected channel's 0-255 value into every cell of the full-frame grid.
function drawChannelValues(ctx, grid, pixels, channel) {
  const c = CHANNELS.indexOf(channel);
  if (c < 0) return;

  const { cols, rows, cellSize, x: originX, y: originY } = grid;
  const fontSize = getDigitFontSize(cellSize, 3);
  if (fontSize < MIN_DIGIT_FONT_SIZE) return;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = pixels[(y * cols + x) * 4 + c];
      ctx.fillStyle = isDarkChannelText(c, value) ? '#000000' : '#ffffff';
      ctx.fillText(String(value), originX + (x + 0.5) * cellSize, originY + (y + 0.5) * cellSize);
    }
  }
}

/**
 * Draws the camera cells as additive R/G/B layers. The full colour (`channel` 'N')
 * is plain colour cells at the cell size lever's size, with no numbers on screen;
 * the magnifier writes each cell's R, G and B (lensDigits.js). Picking R, G or B
 * writes that light's value into every cell once the layers have settled.
 */
function renderRgb(ctx, overlay, grid, pixels, channel, layers) {
  overlay.renderLayers(grid, pixels, layers);
  if (layers.active || channel === 'N') return;
  drawChannelValues(ctx, grid, pixels, channel);
}

module.exports = {
  renderRgb,
  drawChannelValues,
  isDarkChannelText,
  getColorValueFontSize,
  getColorValueTints,
  CHANNELS,
};
