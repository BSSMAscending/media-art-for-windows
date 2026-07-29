const { ipcRenderer } = require('electron');
const { getCameraDevices, openCameraStream } = require('./core/camera');
const { loadModel } = require('./core/segmentation');
const { createFrameLoop } = require('./core/frameLoop');
const { createBackgroundEffects } = require('./ui/backgroundEffects');
const { createInfoPanel } = require('./ui/infoPanel');
const { createEducationalOverlay } = require('./ui/educationalText');
const { createMathPanel } = require('./ui/mathPanel');
const { createHeartOverlay } = require('./ui/heartOverlay');
const { FONT_SIZE } = require('./config');

const MODE_OPTIONS = [
  { key: 'original', label: '원본', caption: '0 / 1 실루엣' },
  { key: 'blackwhite', label: '흑백', caption: '선명한 윤곽' },
  { key: 'binary', label: '바이너리', caption: '0 / 1 문자' },
  { key: 'numeric', label: '숫자', caption: '0 ~ 9 계조' },
];

const SIZE_OPTIONS = [
  { value: 8, label: '작게', caption: '8 px' },
  { value: 12, label: '기본', caption: '12 px' },
  { value: 16, label: '크게', caption: '16 px' },
];

const state = {
  model: null,
  stream: null,
  selectedCameraId: null,
  selectedVersion: 'original',
  currentFontSize: FONT_SIZE,
  bgMode: 'off',
  filters: { brightness: 0, blur: 0, sharpen: 0, edgeOverlay: false, maskClean: false },
  loop: null,
  filterPanelVisible: false,
  infoPanelVisible: false,
  eduVisible: false,
  mathPanelVisible: false,
};

const MODES = [
  'original',
  'blackwhite',
  'binary',
  'numeric',
  'busan',
  'pixelvalue',
  'colorrgb',
  'grayscale8bit',
  'color4k',
];

function showError(message) {
  const el = document.getElementById('errorText');
  el.textContent = message;
  el.style.display = 'block';
}

function resizeCanvases(canvasEl, bgCanvasEl) {
  const stage = document.getElementById('visualStage');
  const width = Math.max(1, Math.floor(stage?.clientWidth || window.innerWidth));
  const height = Math.max(1, Math.floor(stage?.clientHeight || window.innerHeight));

  canvasEl.width = width;
  canvasEl.height = height;
  bgCanvasEl.width = width;
  bgCanvasEl.height = height;
}

function renderModeButtons(container, onSelect) {
  MODE_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-button';
    button.dataset.mode = option.key;
    button.innerHTML = `<span>${option.label}</span><small>${option.caption}</small>`;
    button.addEventListener('click', () => onSelect(option.key));
    container.appendChild(button);
  });
}

function updateModeUI(mathPanel) {
  document.querySelectorAll('.mode-button').forEach((button) => {
    const isSelected = button.dataset.mode === state.selectedVersion;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  mathPanel.updateMode(state.selectedVersion);
}

function renderSizeButtons(container) {
  SIZE_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-button';
    button.dataset.size = String(option.value);
    button.innerHTML = `<span>${option.label}</span><small>${option.caption}</small>`;
    button.addEventListener('click', () => {
      state.currentFontSize = option.value;
      updateSizeUI();
    });
    container.appendChild(button);
  });
}

function updateSizeUI() {
  document.querySelectorAll('.size-button').forEach((button) => {
    const isSelected = Number(button.dataset.size) === state.currentFontSize;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function updatePixelSizeHud(size) {
  document.getElementById('pxSlider').value = size;
  document.getElementById('pxDisplay').textContent = size + 'px';
}

function setupUpdateNotice() {
  const notice = document.getElementById('updateNotice');
  const title = document.getElementById('updateNoticeTitle');
  const detail = document.getElementById('updateNoticeDetail');
  const actions = document.getElementById('updateNoticeActions');

  document.getElementById('restartUpdateButton').addEventListener('click', () => {
    ipcRenderer.invoke('restart-and-install-update');
  });
  document.getElementById('laterUpdateButton').addEventListener('click', () => {
    notice.style.display = 'none';
  });

  ipcRenderer.on('update-status', (_event, update) => {
    const version = update.version ? ` ${update.version}` : '';
    notice.style.display = 'block';

    if (update.status === 'downloading') {
      title.textContent = `새 버전${version} 다운로드 중입니다`;
      detail.textContent = '작품은 계속 사용할 수 있습니다.';
      actions.style.display = 'none';
      return;
    }

    if (update.status === 'downloaded') {
      title.textContent = `새 버전${version} 다운로드가 완료되었습니다`;
      detail.textContent = '지금 재시작하면 업데이트가 적용됩니다.';
      actions.style.display = 'flex';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const videoEl = document.getElementById('videoElement');
  const canvasEl = document.getElementById('binaryCanvas');
  const hiddenCanvasEl = document.getElementById('hiddenCanvas');
  const bgCanvasEl = document.getElementById('bgCanvas');
  const modelStatusEl = document.getElementById('modelStatus');

  const bgEffects = createBackgroundEffects(bgCanvasEl);
  const infoPanel = createInfoPanel();
  const eduOverlay = createEducationalOverlay();
  const mathPanel = createMathPanel();
  const heartOverlay = createHeartOverlay();

  setupUpdateNotice();

  renderModeButtons(document.getElementById('setupModeButtons'), (mode) => {
    state.selectedVersion = mode;
    updateModeUI(mathPanel);
  });
  renderModeButtons(document.getElementById('liveModeButtons'), (mode) => {
    state.selectedVersion = mode;
    updateModeUI(mathPanel);
  });
  renderSizeButtons(document.getElementById('setupSizeButtons'));
  renderSizeButtons(document.getElementById('liveSizeButtons'));
  updateModeUI(mathPanel);
  updateSizeUI();
  resizeCanvases(canvasEl, bgCanvasEl);

  document
    .getElementById('startButton')
    .addEventListener('click', () =>
      startCamera(videoEl, canvasEl, hiddenCanvasEl, infoPanel, mathPanel, heartOverlay)
    );

  const fullscreenButton = document.getElementById('toggleFullscreenButton');
  const updateFullscreenButton = (isFullscreen) => {
    fullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
    fullscreenButton.textContent = isFullscreen ? '창 모드로 전환' : '전체 화면으로 전환';
  };

  fullscreenButton.addEventListener('click', async () => {
    updateFullscreenButton(await ipcRenderer.invoke('toggle-fullscreen'));
  });
  ipcRenderer.on('fullscreen-changed', (_event, isFullscreen) => {
    updateFullscreenButton(isFullscreen);
  });
  updateFullscreenButton(await ipcRenderer.invoke('get-fullscreen-state'));

  document.getElementById('cameraSelect').addEventListener('change', (e) => {
    state.selectedCameraId = e.target.value;
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
        e.preventDefault();
        stopCamera(videoEl, canvasEl, mathPanel, eduOverlay, heartOverlay);
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
      document.getElementById('filterPanel').style.display = state.filterPanelVisible
        ? 'block'
        : 'none';
    }
    if (e.key === 'i' || e.key === 'I') {
      state.infoPanelVisible = !state.infoPanelVisible;
      document.getElementById('infoPanel').style.display = state.infoPanelVisible
        ? 'block'
        : 'none';
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
    resizeCanvases(canvasEl, bgCanvasEl);
  });

  await getCameraDevices(document.getElementById('cameraSelect'));

  try {
    modelStatusEl.textContent = 'AI 모델 로딩 중...';
    state.model = await loadModel((stage) => {
      modelStatusEl.textContent = stage;
    });
    modelStatusEl.textContent = 'AI 모델 준비 완료';
  } catch (err) {
    console.error('Failed to load model:', err);
    modelStatusEl.textContent = 'AI 모델을 불러오지 못했습니다.';
    showError('AI 모델 로딩 실패: ' + (err.message || err));
  }
});

async function startCamera(videoEl, canvasEl, hiddenCanvasEl, infoPanel, mathPanel, heartOverlay) {
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
    document.getElementById('modeControls').style.display = 'block';
    canvasEl.style.display = 'block';
    resizeCanvases(canvasEl, document.getElementById('bgCanvas'));
    state.infoPanelVisible = true;
    infoPanel.show();
    state.mathPanelVisible = true;
    mathPanel.show();
    mathPanel.updateMode(state.selectedVersion);
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
      onGesture: () => heartOverlay.show(),
    });
    state.loop.start();
  } catch (err) {
    console.error('Camera access failed:', err);
    showError('선택한 카메라에 접근할 수 없습니다. 다른 카메라를 선택해보세요.');
  }
}

function stopCamera(videoEl, canvasEl, mathPanel, eduOverlay, heartOverlay) {
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
  document.getElementById('modeControls').style.display = 'none';
  document.getElementById('cameraHud').style.display = 'none';
  document.getElementById('pixelSizeHud').style.display = 'none';
  document.getElementById('overlayUI').style.display = '';

  heartOverlay.hide();

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
