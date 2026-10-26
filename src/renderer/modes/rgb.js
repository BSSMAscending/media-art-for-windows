const { getDigitFontSize } = require('../utils');

const CHANNELS = ['R', 'G', 'B'];

// Writes the selected channel's 0-255 value into every cell of the full-frame grid.
function drawChannelValues(ctx, grid, pixels, channel) {
  const c = CHANNELS.indexOf(channel);
  if (c < 0) return;

  const { cols, rows, cellSize, x: originX, y: originY } = grid;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${getDigitFontSize(cellSize, 3)}px 'Courier New', monospace`;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = pixels[(y * cols + x) * 4 + c];
      ctx.fillStyle = c === 1 && value > 160 ? '#000000' : '#ffffff';
      ctx.fillText(String(value), originX + (x + 0.5) * cellSize, originY + (y + 0.5) * cellSize);
    }
  }
}

function renderRgb(ctx, overlay, grid, pixels, channel, layers) {
  overlay.renderLayers(grid, pixels, layers);
  // Numbers appear only after the selected layer has settled into place.
  if (!layers.active) drawChannelValues(ctx, grid, pixels, channel);
}

module.exports = { renderRgb, drawChannelValues };
