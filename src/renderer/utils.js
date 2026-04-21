function getLuminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getMirroredMaskIndex(x, y, cols, rows, segmentation) {
  const maskX = Math.floor((x / cols) * segmentation.width);
  const maskY = Math.floor((y / rows) * segmentation.height);
  const mirroredX = segmentation.width - 1 - maskX;
  return maskY * segmentation.width + mirroredX;
}

module.exports = { getLuminance, getMirroredMaskIndex };
