const { getCameraDevices, openCameraStream } = require('./core/camera');
const { loadModel } = require('./core/segmentation');
const { createFrameLoop } = require('./core/frameLoop');

const state = {
  model: null,
  selectedCameraId: null,
  selectedVersion: 'original',
  loop: null,
};

function showError(message) {
  const el = document.getElementById('errorText');
  el.textContent = message;
  el.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', async () => {
  const videoEl = document.getElementById('videoElement');
  const canvasEl = document.getElementById('binaryCanvas');
  const hiddenCanvasEl = document.getElementById('hiddenCanvas');
  const titleEl = document.getElementById('titleText');

  document.getElementById('startButton').addEventListener('click', () =>
    startCamera(videoEl, canvasEl, hiddenCanvasEl)
  );
  document.getElementById('cameraSelect').addEventListener('change', (e) => {
    state.selectedCameraId = e.target.value;
  });
  document.getElementById('versionSelect').addEventListener('change', (e) => {
    state.selectedVersion = e.target.value;
  });

  window.addEventListener('resize', () => {
    if (canvasEl) {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    }
  });

  await getCameraDevices(document.getElementById('cameraSelect'));

  try {
    titleEl.textContent = 'AI 모델 로딩 중...';
    state.model = await loadModel();
    titleEl.textContent = 'BINARY MEDIA ART';
  } catch (err) {
    console.error('Failed to load model:', err);
    showError('AI 모델을 불러오지 못했습니다.');
  }
});

async function startCamera(videoEl, canvasEl, hiddenCanvasEl) {
  if (!state.model) {
    showError('AI 모델이 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  try {
    const stream = await openCameraStream(state.selectedCameraId);
    videoEl.srcObject = stream;
    await videoEl.play();

    document.getElementById('overlayUI').style.display = 'none';
    canvasEl.style.display = 'block';

    state.loop = createFrameLoop({
      videoEl,
      canvasEl,
      hiddenCanvasEl,
      model: state.model,
      getMode: () => state.selectedVersion,
    });
    state.loop.start();
  } catch (err) {
    console.error('Camera access failed:', err);
    showError('선택한 카메라에 접근할 수 없습니다. 다른 카메라를 선택해보세요.');
  }
}
