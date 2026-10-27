const { ipcRenderer } = require('electron');
const { openCameraStream } = require('./core/camera');
const { loadModel } = require('./core/segmentation');
const { createFrameLoop } = require('./core/frameLoop');
const { createInfoPanel } = require('./ui/infoPanel');
const { createMathPanel } = require('./ui/mathPanel');
const { getArtworkArea } = require('./core/renderGeometry');
const { createSlider, createSliderHint } = require('./ui/modeSliders');
const {
  MODE_OPTIONS,
  MODE_SUB_OPTIONS,
  MODE_HINTS,
  CELL_SIZE_SLIDER,
  getCellSizeFloor,
  MODE_SLIDER_HINTS,
  getModeSlider,
  selectMode,
  selectModeOption,
} = require('./data/modeOptions');
// 손하트 안내 패널 기능은 일시적으로 비활성화했습니다.
// const { createHeartOverlay } = require('./ui/heartOverlay');
const { FONT_SIZE } = require('./config');

const state = {
  model: null,
  stream: null,
  selectedVersion: 'original',
  rgbChannel: 'N',
  levels: 10,
  threshold: 128,
  cellSize: FONT_SIZE,
  bgMode: 'off',
  loop: null,
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

function getModeOption() {
  const subOptions = MODE_SUB_OPTIONS[state.selectedVersion];
  return subOptions ? state[subOptions.stateKey] : undefined;
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
    button.addEventListener('click', () => onSelect(subOptions, option.value));
    grid.appendChild(button);
  });
}

let cellSizeLever = null;

// The right lever slot follows the view; the cell size lever on the left never moves.
function renderModeSlider() {
  const slot = document.getElementById('modeSlider');
  const spec = getModeSlider(state);
  slot.replaceChildren(
    spec
      ? createSlider(spec, state)
      : createSliderHint(MODE_SLIDER_HINTS[state.selectedVersion] || '')
  );
}

function updateModeUI(mathPanel) {
  document.querySelectorAll('.mode-button[data-mode]').forEach((button) => {
    const isSelected = button.dataset.mode === state.selectedVersion;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  renderModeOptions((subOptions, value) => {
    selectModeOption(state, subOptions, value);
    updateModeUI(mathPanel);
  });
  const floor = getCellSizeFloor(state);
  cellSizeLever?.setFloor(floor.size, floor.note);
  renderModeSlider();
  mathPanel.updateMode(state.selectedVersion, getModeOption());
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
  const detailCard = document.getElementById('detailCard');
  const mathPanel = createMathPanel(panelCards, detailCard);
  createInfoPanel(detailCard);
  // 손하트 안내 패널은 필요할 때 아래 코드를 다시 활성화해 복원할 수 있습니다.
  // const heartOverlay = createHeartOverlay();

  setupUpdateNotice();

  renderModeButtons(document.getElementById('liveModeButtons'), (mode) => {
    selectMode(state, mode);
    updateModeUI(mathPanel);
  });
  cellSizeLever = createSlider(CELL_SIZE_SLIDER, state);
  document.getElementById('cellSizeSlider').appendChild(cellSizeLever);
  updateModeUI(mathPanel);
  document.getElementById('modeControls').style.display = 'block';
  resizeCanvases(canvasEl, bgCanvasEl);

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
        selectMode(state, mode);
        updateModeUI(mathPanel);
      }
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
    mathPanel.updateMode(state.selectedVersion, getModeOption());
    canvasEl.style.display = 'block';

    state.loop = createFrameLoop({
      videoEl,
      canvasEl,
      hiddenCanvasEl,
      model: state.model,
      getMode: () => state.selectedVersion,
      getRgbChannel: () => state.rgbChannel,
      getLevels: () => state.levels,
      getThreshold: () => state.threshold,
      getArtworkArea: () =>
        getArtworkArea(
          canvasEl.clientWidth,
          canvasEl.clientHeight,
          document.getElementById('sideColumn').getBoundingClientRect()
        ),
      getCellSize: () => state.cellSize,
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
