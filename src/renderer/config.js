const FONT_SIZE = 8;
const BODY_PIX_CONFIG = {
  architecture: 'ResNet50',
  outputStride: 16,
  quantBytes: 4,
};
const SEGMENTATION_OPTIONS = {
  flipHorizontal: false,
  internalResolution: 'high',
  segmentationThreshold: 0.5,
  maxDetections: 1,
  scoreThreshold: 0.5,
  nmsRadius: 20,
};
const COLORS = {
  cyan: '#00ffff',
  darkBg: '#020205',
  binaryBg: '#0a0a0a',
  black: '#000000',
  white: '#ffffff',
};
const LUMINANCE_THRESHOLD = 0.4;
const LUMINANCE_GLOW_THRESHOLD = 0.7;
const CYAN_INFLUENCE = 0.8;
const BUSAN_CHARS = ['부', '산', '수', '학', '문', '화', '관'];

module.exports = {
  FONT_SIZE,
  BODY_PIX_CONFIG,
  SEGMENTATION_OPTIONS,
  COLORS,
  LUMINANCE_THRESHOLD,
  LUMINANCE_GLOW_THRESHOLD,
  CYAN_INFLUENCE,
  BUSAN_CHARS,
};
