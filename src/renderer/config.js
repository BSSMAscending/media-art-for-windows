const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..', '..');

const localWasmDir = path.join(projectRoot, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const localSelfieDir = path.join(projectRoot, 'node_modules', '@mediapipe', 'selfie_segmentation');
const localHandModel = path.join(__dirname, 'assets', 'hand_landmarker.task');

function toFileURL(p) {
  return pathToFileURL(p).href;
}

const FONT_SIZE = 8;
const MIN_FONT_SIZE = 4;
const MAX_FONT_SIZE = 32;
const VISION_TASKS_CONFIG = {
  wasmPath: toFileURL(localWasmDir),
  selfieSolutionPath: toFileURL(localSelfieDir),
  handLandmarkerModelPath: toFileURL(localHandModel),
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
  HAND_REFINEMENT,
  HAND_GRID_REFINEMENT,
  COLORS,
  LUMINANCE_THRESHOLD,
  LUMINANCE_GLOW_THRESHOLD,
  CYAN_INFLUENCE,
  BUSAN_CHARS,
};
