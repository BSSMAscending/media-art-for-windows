const { BODY_PIX_CONFIG, SEGMENTATION_OPTIONS } = require('../config');

async function loadModel() {
  const tf = window.tf;
  const bodyPix = window.bodyPix;

  await tf.ready();
  const model = await bodyPix.load(BODY_PIX_CONFIG);
  return model;
}

async function runSegmentation(model, videoEl) {
  return model.segmentPerson(videoEl, SEGMENTATION_OPTIONS);
}

module.exports = { loadModel, runSegmentation };
