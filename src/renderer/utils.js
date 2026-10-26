function getLuminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getMirroredMaskIndex(x, y, cols, rows, segmentation) {
  const maskX = Math.floor((x / cols) * segmentation.width);
  const maskY = Math.floor((y / rows) * segmentation.height);
  const mirroredX = segmentation.width - 1 - maskX;
  return maskY * segmentation.width + mirroredX;
}

// Largest bold Courier size that fits `digits` characters inside one square cell.
function getDigitFontSize(cellSize, digits) {
  const widthLimited = (cellSize * 0.92) / (digits * 0.6);
  return Math.max(4, Math.floor(Math.min(cellSize * 0.75, widthLimited)));
}

module.exports = { getLuminance, getMirroredMaskIndex, getDigitFontSize };
