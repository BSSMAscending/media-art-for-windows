const { ipcRenderer } = require('electron');
const { openCameraStream } = require('./core/camera');
const { loadModel } = require('./core/segmentation');
const { createFrameLoop } = require('./core/frameLoop');
const { createInfoPanel } = require('./ui/infoPanel');
const { createMathPanel } = require('./ui/mathPanel');
const { getArtworkArea } = require('./core/renderGeometry');
// 손하트 안내 패널 기능은 일시적으로 비활성화했습니다.
// const { createHeartOverlay } = require('./ui/heartOverlay');
const { FONT_SIZE } = require('./config');

const MODE_OPTIONS = [
  { key: 'original', label: '원본', caption: '0 / 1 실루엣' },
  { key: 'rgb', label: '색 RGB', caption: '빨강 · 초록 · 파랑' },
  { key: 'levels', label: '밝기 단계', caption: '2 · 10 · 256' },
];

// Second row of touch buttons, shown under the mode buttons for modes that have them.
const MODE_SUB_OPTIONS = {
  rgb: {
    stateKey: 'rgbChannel',
    label: '보고 싶은 빛을 골라보세요',
    options: [
      { value: 'N', label: '전체', caption: 'R + G + B' },
      { value: 'R', label: 'R', caption: '빨강', swatch: '#ff3b3b' },
      { value: 'G', label: 'G', caption: '초록', swatch: '#36ff6b' },
      { value: 'B', label: 'B', caption: '파랑', swatch: '#3b8bff' },
    ],
  },
  levels: {
    stateKey: 'levels',
    label: '밝기를 몇 단계로 나눌까요?',
    options: [
      { value: 2, label: '2단계', caption: '0 · 1' },
      { value: 10, label: '10단계', caption: '0 ~ 9' },
      { value: 256, label: '256단계', caption: '0 ~ 255' },
    ],
  },
};
const MODE_HINTS = {
  original: '화면 앞에 서면 내 모습이 0과 1로 바뀌어요',
};

const state = {
  model: null,
  stream: null,
  selectedVersion: 'original',
  rgbChannel: 'N',
  levels: 10,
  currentFontSize: FONT_SIZE,
  bgMode: 'off',
  filters: { brightness: 0, blur: 0, sharpen: 0, edgeOverlay: false, maskClean: false },
  loop: null,
  filterPanelVisible: false,
};

const MODES = [
  'original',
  'rgb',
  'levels',
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

function renderModeOptions(onSelect) {
  const container = document.getElementById('modeOptions');
  const label = document.getElementById('modeOptionsLabel');
  const grid = document.getElementById('modeOptionButtons');
  const subOptions = MODE_SUB_OPTIONS[state.selectedVersion];
  grid.replaceChildren();
  container.classList.toggle('has-options', Boolean(subOptions));
  if (!subOptions) {
    label.textContent = MODE_HINTS[state.selectedVersion] || '';
    return;
  }

  label.textContent = subOptions.label;
  subOptions.options.forEach((option) => {
    const button = document.createElement('button');
    const isSelected = state[subOptions.stateKey] === option.value;
    button.type = 'button';
    button.className = 'mode-button mode-option-button';
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
    if (option.swatch) {
      button.classList.add('has-swatch');
      button.style.setProperty('--option-swatch', option.swatch);
    }
    button.innerHTML = `<span>${option.label}</span><small>${option.caption}</small>`;
    button.addEventListener('click', () => onSelect(subOptions.stateKey, option.value));
    grid.appendChild(button);
  });
}

function updateModeUI(mathPanel) {
  document.querySelectorAll('.mode-button[data-mode]').forEach((button) => {
    const isSelected = button.dataset.mode === state.selectedVersion;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  renderModeOptions((stateKey, value) => {
    state[stateKey] = value;
    updateModeUI(mathPanel);
  });
  mathPanel.updateMode(state.selectedVersion);
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

  const panelCards = document.getElementById('panelCards');
  createInfoPanel(panelCards);
  const mathPanel = createMathPanel(panelCards);
  // 손하트 안내 패널은 필요할 때 아래 코드를 다시 활성화해 복원할 수 있습니다.
  // const heartOverlay = createHeartOverlay();

  setupUpdateNotice();

  renderModeButtons(document.getElementById('liveModeButtons'), (mode) => {
    state.selectedVersion = mode;
    updateModeUI(mathPanel);
  });
  updateModeUI(mathPanel);
  document.getElementById('modeControls').style.display = 'block';
  resizeCanvases(canvasEl, bgCanvasEl);

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

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ipcRenderer.send('quit-app');
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && state.loop) {
      const mode = MODES[num - 1];
      if (mode) {
        state.selectedVersion = mode;
        updateModeUI(mathPanel);
      }
      return;
    }

    if (e.key === 'f' || e.key === 'F') {
      state.filterPanelVisible = !state.filterPanelVisible;
      document.getElementById('filterPanel').style.display = state.filterPanelVisible
        ? 'block'
        : 'none';
    }
  });

  window.addEventListener('resize', () => {
    resizeCanvases(canvasEl, bgCanvasEl);
  });

  try {
    state.model = await loadModel();
    await startCamera(videoEl, canvasEl, hiddenCanvasEl, mathPanel);
  } catch (err) {
    console.error('Failed to load model:', err);
    showError('AI 모델 로딩 실패: ' + (err.message || err));
  }
});

async function startCamera(videoEl, canvasEl, hiddenCanvasEl, mathPanel) {
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

    const stream = await openCameraStream();
    state.stream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();

    document.getElementById('modeControls').style.display = 'block';
    canvasEl.style.display = 'block';
    resizeCanvases(canvasEl, document.getElementById('bgCanvas'));
    mathPanel.updateMode(state.selectedVersion);
    canvasEl.style.display = 'block';

    state.loop = createFrameLoop({
      videoEl,
      canvasEl,
      hiddenCanvasEl,
      model: state.model,
      getMode: () => state.selectedVersion,
      getRgbChannel: () => state.rgbChannel,
      getLevels: () => state.levels,
      getArtworkArea: () =>
        getArtworkArea(
          canvasEl.clientWidth,
          canvasEl.clientHeight,
          document.getElementById('sideColumn').getBoundingClientRect()
        ),
      getFontSize: () => state.currentFontSize,
      getFilters: () => state.filters,
      onStats: (stats) => {
        mathPanel.update(stats);
      },
      // 손하트 감지 및 안내 패널 호출은 현재 비활성화했습니다.
      // onGesture: () => heartOverlay.show(),
    });
    state.loop.start();
  } catch (err) {
    console.error('Camera access failed:', err);
    showError('카메라에 접근할 수 없습니다. 카메라 권한을 확인해보세요.');
  }
}
