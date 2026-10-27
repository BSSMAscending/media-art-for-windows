// Per-pixel numbers only make sense for one light or one grey scale, not mixed colour.
function canShowPixelValues(mode, rgbChannel) {
  return mode === 'levels' || (mode === 'rgb' && rgbChannel !== 'N');
}

module.exports = { canShowPixelValues };
