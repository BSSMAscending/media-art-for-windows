const WASM_REL = 'node_modules/@mediapipe/tasks-vision/wasm';
const SELFIE_REL = 'node_modules/@mediapipe/selfie_segmentation';
const HAND_MODEL_REL = 'src/renderer/assets/hand_landmarker.task';

function toLocalURL(relPath) {
  return `local-assets:///${relPath}`;
}

// 기본 문자 크기(px). UI 선택기는 제거되었으므로 이 값을 코드에서 조절합니다.
const FONT_SIZE = 16;
const MIN_FONT_SIZE = 4;
const MAX_FONT_SIZE = 32;
const VISION_TASKS_CONFIG = {
  wasmPath: toLocalURL(WASM_REL),
  selfieSolutionPath: toLocalURL(SELFIE_REL),
  handLandmarkerModelPath: toLocalURL(HAND_MODEL_REL),
};
const BODY_SEGMENTATION_CONFIG = {
  modelType: 'general',
  personAlphaThreshold: 160,
};
const HAND_LANDMARKER_OPTIONS = {
  runningMode: 'VIDEO',
  numHands: 2,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};
const RENDERING_CONFIG = {
  // Keep visual feedback smooth while preventing continuous AI inference from
  // monopolising the renderer thread.
  targetFps: 30,
  segmentationFps: 12,
};
const HAND_REFINEMENT = {
  smoothing: 0.65,
  overlapAnchorRadius: 2,
  minOverlapAnchors: 2,
  connectorRadiusFactor: 0.04,
  palmRadiusFactor: 0.055,
  jointRadiusFactor: 0.045,
  fingertipRadiusFactor: 0.035,
  minRadius: 1,
  maxRadius: 6,
};

const HAND_GRID_REFINEMENT = {
  palmRadiusFactor: 0.045,
  jointRadiusFactor: 0.032,
  fingertipRadiusFactor: 0.022,
  connectorRadiusFactor: 0.025,
  fingertipExtensionFactor: 0.018,
  minRadius: 1,
  maxRadius: 8,
  minOverlapAnchors: 1,
  overlapAnchorRadius: 2,
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
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  VISION_TASKS_CONFIG,
  BODY_SEGMENTATION_CONFIG,
  HAND_LANDMARKER_OPTIONS,
  RENDERING_CONFIG,
  HAND_REFINEMENT,
  HAND_GRID_REFINEMENT,
  COLORS,
  LUMINANCE_THRESHOLD,
  LUMINANCE_GLOW_THRESHOLD,
  CYAN_INFLUENCE,
  BUSAN_CHARS,
};
