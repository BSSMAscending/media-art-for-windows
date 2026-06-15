const { ipcRenderer } = require('electron');
const { getCameraDevices, openCameraStream } = require('./core/camera');
const { loadModel } = require('./core/segmentation');
const { createFrameLoop } = require('./core/frameLoop');
const { createBackgroundEffects } = require('./ui/backgroundEffects');
const { createInfoPanel } = require('./ui/infoPanel');
const { createEducationalOverlay } = require('./ui/educationalText');
const { createMathPanel } = require('./ui/mathPanel');

const state = {
  model: null,
  stream: null,
  selectedCameraId: null,
  selectedVersion: 'original',
  currentFontSize: 8,
  bgMode: 'off',
  filters: { brightness: 0, blur: 0, sharpen: 0, edgeOverlay: false, maskClean: false },
  loop: null,
  filterPanelVisible: false,
  infoPanelVisible: false,
  eduVisible: false,
  mathPanelVisible: false,
};

const MODES = [
  'original', 'blackwhite', 'binary', 'numeric', 'busan',
  'pixelvalue', 'colorrgb', 'grayscale8bit', 'color4k',
];

function showError(message) {
  const el = document.getElementById('errorText');
  el.textContent = message;
  el.style.display = 'block';
}

function updatePixelSizeHud(size) {
  document.getElementById('pxSlider').value = size;
  document.getElementById('pxDisplay').textContent = size + 'px';
}

document.addEventListener('DOMContentLoaded', async () => {
  const videoEl = document.getElementById('videoElement');
  const canvasEl = document.getElementById('binaryCanvas');
  const hiddenCanvasEl = document.getElementById('hiddenCanvas');
  const bgCanvasEl = document.getElementById('bgCanvas');
  const titleEl = document.getElementById('titleText');

  const bgEffects = createBackgroundEffects(bgCanvasEl);
  const infoPanel = createInfoPanel();
  const eduOverlay = createEducationalOverlay();
  const mathPanel = createMathPanel();

  document.getElementById('startButton').addEventListener('click', () =>
    startCamera(videoEl, canvasEl, hiddenCanvasEl, infoPanel, mathPanel)
  );

  document.getElementById('cameraSelect').addEventListener('change', (e) => {
    state.selectedCameraId = e.target.value;
  });

  document.getElementById('versionSelect').addEventListener('change', (e) => {
    state.selectedVersion = e.target.value;
    if (state.eduVisible) eduOverlay.show(e.target.value);
  });

  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValueEl = document.getElementById('fontSizeValue');
  fontSizeSlider.addEventListener('input', (e) => {
    state.currentFontSize = parseInt(e.target.value);
    fontSizeValueEl.textContent = state.currentFontSize;
  });

  document.getElementById('bgSelect').addEventListener('change', (e) => {
    state.bgMode = e.target.value;
    bgEffects.setMode(e.target.value);
  });

  document.getElementById('brightnessSlider').addEventListener('input', (e) => {
    state.filters.brightness = parseFloat(e.target.value);
    document.getElementById('brightnessValue').textContent = e.target.value;
  });
  document.getElementById('blurSlider').addEventListener('input', (e) => {
    state.filters.blur = parseInt(e.target.value);
    document.getElementById('blurValue').textContent = e.target.value;
  });
  document.getElementById('sharpenSlider').addEventListener('input', (e) => {
    state.filters.sharpen = parseFloat(e.target.value);
    document.getElementById('sharpenValue').textContent = parseFloat(e.target.value).toFixed(1);
  });
  document.getElementById('edgeOverlayCheck').addEventListener('change', (e) => {
    state.filters.edgeOverlay = e.target.checked;
  });
  document.getElementById('maskCleanCheck').addEventListener('change', (e) => {
    state.filters.maskClean = e.target.checked;
  });

  document.getElementById('pxSlider').addEventListener('input', (e) => {
    state.currentFontSize = parseInt(e.target.value);
    document.getElementById('pxDisplay').textContent = state.currentFontSize + 'px';
  });
  document.getElementById('pxDecrease').addEventListener('click', () => {
    state.currentFontSize = Math.max(4, state.currentFontSize - 2);
    updatePixelSizeHud(state.currentFontSize);
  });
  document.getElementById('pxIncrease').addEventListener('click', () => {
    state.currentFontSize = Math.min(32, state.currentFontSize + 2);
    updatePixelSizeHud(state.currentFontSize);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.loop) {
        stopCamera(videoEl, canvasEl, mathPanel, eduOverlay);
      } else {
        ipcRenderer.send('quit-app');
      }
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && state.loop) {
      const mode = MODES[num - 1];
      if (mode) {
        state.selectedVersion = mode;
        document.getElementById('versionSelect').value = mode;
        if (state.eduVisible) eduOverlay.show(mode);
      }
      return;
    }

    if (e.key === '[' && state.loop) {
      state.currentFontSize = Math.max(4, state.currentFontSize - 2);
      updatePixelSizeHud(state.currentFontSize);
    }
    if (e.key === ']' && state.loop) {
      state.currentFontSize = Math.min(32, state.currentFontSize + 2);
      updatePixelSizeHud(state.currentFontSize);
    }

    if (e.key === 'f' || e.key === 'F') {
      state.filterPanelVisible = !state.filterPanelVisible;
      document.getElementById('filterPanel').style.display = state.filterPanelVisible ? 'block' : 'none';
    }
    if (e.key === 'i' || e.key === 'I') {
      state.infoPanelVisible = !state.infoPanelVisible;
      document.getElementById('infoPanel').style.display = state.infoPanelVisible ? 'block' : 'none';
    }
    if (e.key === 'e' || e.key === 'E') {
      state.eduVisible = !state.eduVisible;
      if (state.eduVisible) {
        eduOverlay.show(state.selectedVersion);
      } else {
        eduOverlay.hide();
      }
    }
    if (e.key === 'm' || e.key === 'M') {
      state.mathPanelVisible = !state.mathPanelVisible;
      mathPanel.toggle();
    }
  });

  window.addEventListener('resize', () => {
    if (canvasEl) {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    }
    if (bgCanvasEl) {
      bgCanvasEl.width = window.innerWidth;
      bgCanvasEl.height = window.innerHeight;
    }
  });

  await getCameraDevices(document.getElementById('cameraSelect'));

  try {
    titleEl.textContent = 'AI 모델 로딩 중...';
    state.model = await loadModel((stage) => {
      titleEl.textContent = stage;
    });
    titleEl.textContent = 'BINARY MEDIA ART';
  } catch (err) {
    console.error('Failed to load model:', err);
    showError('AI 모델 로딩 실패: ' + (err.message || err));
  }
});

async function startCamera(videoEl, canvasEl, hiddenCanvasEl, infoPanel, mathPanel) {
  if (!state.model) {
    showError('AI 모델이 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  try {
    if (state.loop) {
      state.loop.stop();
      state.loop = null;
    }

    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }

    const stream = await openCameraStream(state.selectedCameraId);
    state.stream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();

    document.getElementById('overlayUI').style.display = 'none';
    document.getElementById('cameraHud').style.display = 'block';
    document.getElementById('pixelSizeHud').style.display = 'flex';
    updatePixelSizeHud(state.currentFontSize);
    canvasEl.style.display = 'block';

    state.loop = createFrameLoop({
      videoEl,
      canvasEl,
      hiddenCanvasEl,
      model: state.model,
      getMode: () => state.selectedVersion,
      getFontSize: () => state.currentFontSize,
      getFilters: () => state.filters,
      getBgMode: () => state.bgMode,
      onStats: (stats) => {
        if (state.infoPanelVisible) infoPanel.update(stats);
        mathPanel.update(stats);
      },
    });
    state.loop.start();
  } catch (err) {
    console.error('Camera access failed:', err);
    showError('선택한 카메라에 접근할 수 없습니다. 다른 카메라를 선택해보세요.');
  }
}

function stopCamera(videoEl, canvasEl, mathPanel, eduOverlay) {
  if (state.loop) {
    state.loop.stop();
    state.loop = null;
  }
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  videoEl.srcObject = null;
  canvasEl.style.display = 'none';
  document.getElementById('cameraHud').style.display = 'none';
  document.getElementById('pixelSizeHud').style.display = 'none';
  document.getElementById('overlayUI').style.display = '';

  if (state.mathPanelVisible) {
    mathPanel.toggle();
    state.mathPanelVisible = false;
  }
  if (state.eduVisible) {
    eduOverlay.hide();
    state.eduVisible = false;
  }
  if (state.infoPanelVisible) {
    document.getElementById('infoPanel').style.display = 'none';
    state.infoPanelVisible = false;
  }
  if (state.filterPanelVisible) {
    document.getElementById('filterPanel').style.display = 'none';
    state.filterPanelVisible = false;
  }
}
