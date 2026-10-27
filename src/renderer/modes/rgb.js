const { getLuminance, getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');

const CHANNELS = ['R', 'G', 'B'];
// Light and dark tints of each light, so every line stays readable on any cell colour.
const LIGHT_TINTS = ['#ff9d9d', '#9dff9d', '#9dc4ff'];
const DARK_TINTS = ['#7a0000', '#005c00', '#00287a'];

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
      ctx.fillStyle = c === 1 && value > 160 ? '#000000' : '#ffffff';
      ctx.fillText(String(value), originX + (x + 0.5) * cellSize, originY + (y + 0.5) * cellSize);
    }
  }
}

// Three stacked lines need a third of the cell's height each.
function getColorValueFontSize(cellSize) {
  return Math.floor(Math.min(cellSize * 0.3, (cellSize * 0.92) / (3 * 0.6)));
}

// Writes each cell's R, G and B values as three lines tinted by their light.
function drawColorValues(ctx, grid, pixels) {
  const { cols, rows, cellSize, x: originX, y: originY } = grid;
  const fontSize = getColorValueFontSize(cellSize);
  if (fontSize < MIN_DIGIT_FONT_SIZE) return;
  const lineHeight = cellSize * 0.3;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const tints =
        getLuminance(pixels[i], pixels[i + 1], pixels[i + 2]) >= 0.5 ? DARK_TINTS : LIGHT_TINTS;
      const centerX = originX + (x + 0.5) * cellSize;
      const centerY = originY + (y + 0.5) * cellSize;
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = tints[c];
        ctx.fillText(String(pixels[i + c]), centerX, centerY + (c - 1) * lineHeight);
      }
    }
  }
}

function renderRgb(ctx, overlay, grid, pixels, channel, layers) {
  overlay.renderLayers(grid, { pixels }, layers);
  // Numbers appear only after the layers have settled into place.
  if (layers.active) return;
  if (channel === 'N') drawColorValues(ctx, grid, pixels);
  else drawChannelValues(ctx, grid, pixels, channel);
}

module.exports = { renderRgb, drawChannelValues, drawColorValues, getColorValueFontSize };
