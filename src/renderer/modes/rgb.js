const { getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');

const CHANNELS = ['R', 'G', 'B'];

// White digits read on every red and blue cell; bright green cells need black ones.
function isDarkChannelText(channelIndex, value) {
  return channelIndex === 1 && value > 160;
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
 * The full colour (`channel` 'N') is the camera picture itself at the camera's own
 * resolution (`photo`, a canvas), with no cells or numbers. Picking R, G or B turns
 * it into the numbered pixel cells the lights split into.
 */
function renderRgb(ctx, overlay, grid, pixels, channel, layers, photo) {
  if (channel === 'N' && photo) overlay.renderLayers(grid, photo, layers);
  else overlay.renderLayers(grid, pixels, layers);
  // Numbers appear only after the layers have settled into place.
  if (layers.active || channel === 'N') return;
  drawChannelValues(ctx, grid, pixels, channel);
}

module.exports = { renderRgb, drawChannelValues, isDarkChannelText, CHANNELS };
