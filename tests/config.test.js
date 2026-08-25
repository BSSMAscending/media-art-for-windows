const config = require('../src/renderer/config');

describe('config constants', () => {
  it('FONT_SIZE is 16', () => {
    expect(config.FONT_SIZE).toBe(16);
  });

  it('BUSAN_CHARS has 7 characters', () => {
    expect(config.BUSAN_CHARS).toHaveLength(7);
  });

  it('VISION_TASKS_CONFIG has required fields', () => {
    expect(config.VISION_TASKS_CONFIG).toHaveProperty('wasmPath');
    expect(config.VISION_TASKS_CONFIG).toHaveProperty('handLandmarkerModelPath');
  });

  it('BODY_SEGMENTATION_CONFIG has required fields', () => {
    expect(config.BODY_SEGMENTATION_CONFIG).toHaveProperty('modelType');
    expect(config.BODY_SEGMENTATION_CONFIG).toHaveProperty('personAlphaThreshold');
  });

  it('HAND_LANDMARKER_OPTIONS is tuned for video tracking', () => {
    expect(config.HAND_LANDMARKER_OPTIONS).toMatchObject({
      runningMode: 'VIDEO',
      numHands: 2,
    });
  });

  it('caps rendering and segmentation work independently', () => {
    expect(config.RENDERING_CONFIG).toMatchObject({
      targetFps: 30,
      segmentationFps: 12,
    });
  });

  it('LUMINANCE_THRESHOLD is between 0 and 1', () => {
    expect(config.LUMINANCE_THRESHOLD).toBeGreaterThan(0);
    expect(config.LUMINANCE_THRESHOLD).toBeLessThan(1);
  });
});
