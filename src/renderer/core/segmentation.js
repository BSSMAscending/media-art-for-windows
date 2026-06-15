const { FilesetResolver, HandLandmarker } = require('@mediapipe/tasks-vision');

const {
  VISION_TASKS_CONFIG,
  BODY_SEGMENTATION_CONFIG,
  HAND_LANDMARKER_OPTIONS,
} = require('../config');
const { smoothHandLandmarks } = require('./handRefinement');

async function extractPersonMask(segmenter, videoEl) {
  const people = await segmenter.segmentPeople(videoEl, {
    flipHorizontal: false,
  });

  if (!people || people.length === 0) {
    return null;
  }

  const mask = people[0].mask;
  const imageData = await mask.toImageData();
  const { width, height, data } = imageData;

  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const alphaProbability = data[i * 4 + 3];
    binary[i] = alphaProbability >= BODY_SEGMENTATION_CONFIG.personAlphaThreshold ? 1 : 0;
  }

  return { data: binary, width, height };
}

async function loadModel(onProgress) {
  try {
    onProgress?.('WASM · 모델 준비 중...');
    const {
      SupportedModels,
      createSegmenter,
    } = require('@tensorflow-models/body-segmentation');

    const vision = await FilesetResolver.forVisionTasks(VISION_TASKS_CONFIG.wasmPath);

    const model = SupportedModels.MediaPipeSelfieSegmentation;

    onProgress?.('사람 인식 모델 로딩...');
    const segmenter = await createSegmenter(model, {
      runtime: 'mediapipe',
      solutionPath: VISION_TASKS_CONFIG.selfieSolutionPath,
      modelType: BODY_SEGMENTATION_CONFIG.modelType,
    });

    onProgress?.('손 인식 모델 로딩...');
    const handLandmarkerBaseOptions = {
      modelAssetPath: VISION_TASKS_CONFIG.handLandmarkerModelPath,
    };
    let handLandmarker;
    try {
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        ...HAND_LANDMARKER_OPTIONS,
        baseOptions: { ...handLandmarkerBaseOptions, delegate: 'GPU' },
      });
    } catch (gpuErr) {
      console.warn('HandLandmarker GPU delegate 실패, CPU로 폴백:', gpuErr.message);
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        ...HAND_LANDMARKER_OPTIONS,
        baseOptions: { ...handLandmarkerBaseOptions, delegate: 'CPU' },
      });
    }

    onProgress?.('완료!');
    return {
      segmenter,
      handLandmarker,
      previousHands: [],
    };
  } catch (err) {
    console.error('Failed to create vision pipeline:', err);
    throw err;
  }
}

async function runSegmentation(model, videoEl) {
  const timestamp = performance.now();

  const segmentation = await extractPersonMask(model.segmenter, videoEl);
  if (!segmentation) {
    return { data: new Uint8Array(0), width: 0, height: 0, handLandmarks: [] };
  }

  const handResult = model.handLandmarker.detectForVideo(videoEl, timestamp);
  const smoothedHands = smoothHandLandmarks(
    model.previousHands,
    handResult.landmarks,
    segmentation.width,
    segmentation.height
  );

  model.previousHands = smoothedHands;

  return { data: segmentation.data, width: segmentation.width, height: segmentation.height, handLandmarks: smoothedHands };
}

module.exports = { loadModel, runSegmentation };
