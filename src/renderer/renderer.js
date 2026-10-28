const { ipcRenderer } = require('electron');
const { openCameraStream } = require('./core/camera');
const { loadModel } = require('./core/segmentation');
const { createFrameLoop } = require('./core/frameLoop');
const { createMathPanel } = require('./ui/mathPanel');
const { createCellCard } = require('./ui/cellCard');
const { createCellPicker } = require('./ui/cellPicker');
const { getArtworkArea } = require('./core/renderGeometry');
const { createSlider, createSliderHint } = require('./ui/modeSliders');
const { createMagnifier } = require('./ui/magnifier');
const { t, getLanguage, setLanguage, onLanguageChange } = require('./i18n');
const {
  MODE_OPTIONS,
  MODE_SUB_OPTIONS,
  MODE_HINTS,
  CELL_SIZE_SLIDER,
  MATH_START_AMOUNTS,
  getCellSizeFloor,
  MODE_SLIDER_HINTS,
  getModeSlider,
  getMathSettings,
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
  mathEffect: 'none',
  ...MATH_START_AMOUNTS,
  cellSize: FONT_SIZE,
  bgMode: 'off',
  loop: null,
  magnifier: null,
};

const MODES = [
  'original',
  'rgb',
  'levels',
  'math',
  'busan',
  'pixelvalue',
  'colorrgb',
  'grayscale8bit',
  'color4k',
];

const ERRORS = {
  modelFailed: { ko: 'AI 모델 로딩 실패: ', en: 'Could not load the AI model: ' },
  modelLoading: {
    ko: 'AI 모델이 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.',
    en: 'The AI model is still loading. Please try again shortly.',
  },
  camera: {
    ko: '카메라에 접근할 수 없습니다. 카메라 권한을 확인해보세요.',
    en: 'Cannot open the camera. Please check the camera permission.',
  },
};

// Text that lives in index.html, keyed by selector; `attr` targets an attribute.
const STATIC_TEXT = [
  {
    selector: '#modeCue',
    text: { ko: '모드를 골라보세요', en: 'Choose a mode' },
  },
  {
    selector: '.magnifier-hint',
    text: {
      ko: '화면을 꾹 누르면 크게 보이고 그 칸을 계산해요',
      en: 'Press and hold to zoom in and work out that cell',
    },
  },
  { selector: '#restartUpdateButton', text: { ko: '지금 재시작', en: 'Restart now' } },
  { selector: '#laterUpdateButton', text: { ko: '나중에', en: 'Later' } },
  { selector: '#languageToggle', attr: 'aria-label', text: { ko: '언어', en: 'Language' } },
  {
    selector: '#liveModeButtons',
    attr: 'aria-label',
    text: { ko: '미디어 아트 모드 선택', en: 'Choose a mode' },
  },
  { selector: '.mode-sliders', attr: 'aria-label', text: { ko: '레버', en: 'Levers' } },
  {
    selector: '#panelCards',
    attr: 'aria-label',
    text: { ko: '미디어 아트 안내 카드', en: 'About this view' },
  },
  {
    selector: '#modeControls',
    attr: 'aria-label',
    text: { ko: '미디어 아트 모드 컨트롤', en: 'Controls' },
  },
  {
    selector: '#detailCard',
    attr: 'aria-label',
    text: { ko: '표시한 칸의 계산', en: "The marked cell's math" },
  },
];

function applyStaticText() {
  for (const { selector, attr, text } of STATIC_TEXT) {
    const el = document.querySelector(selector);
    if (!el) continue;
    if (attr) el.setAttribute(attr, t(text));
    else el.textContent = t(text);
  }
}

let lastError = null;

function showError(message, detail = '') {
  lastError = { message, detail };
  const el = document.getElementById('errorText');
  el.textContent = t(message) + detail;
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

function getStageArtworkArea(canvasEl) {
  return getArtworkArea(
    canvasEl.clientWidth,
    canvasEl.clientHeight,
    document.getElementById('sideColumn').getBoundingClientRect()
  );
}

// The magnifier's touch area covers exactly the artwork, never the side column.
function layoutMagnifierArea(canvasEl) {
  const area = getStageArtworkArea(canvasEl);
  const el = document.getElementById('magnifierArea');
  el.style.left = `${area.x}px`;
  el.style.top = `${area.y}px`;
  el.style.width = `${area.width}px`;
  el.style.height = `${area.height}px`;
}

function renderModeButtons(container, onSelect) {
  container.replaceChildren();
  MODE_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-button';
    button.dataset.mode = option.key;
    button.innerHTML = `<span>${t(option.label)}</span><small>${t(option.caption)}</small>`;
    button.addEventListener('click', () => onSelect(option.key));
    container.appendChild(button);
  });
}

function getModeOption() {
  const subOptions = MODE_SUB_OPTIONS[state.selectedVersion];
  return subOptions ? state[subOptions.stateKey] : undefined;
}

// The right lever's value, which the explanation's rule is written with.
function getLeverValue() {
  const spec = getModeSlider(state);
  return spec ? state[spec.stateKey] : undefined;
}

function renderModeOptions(onSelect) {
  const container = document.getElementById('modeOptions');
  const label = document.getElementById('modeOptionsLabel');
  const grid = document.getElementById('modeOptionButtons');
  const subOptions = MODE_SUB_OPTIONS[state.selectedVersion];
  grid.replaceChildren();
  container.classList.toggle('has-options', Boolean(subOptions));
  if (!subOptions) {
    label.textContent = t(MODE_HINTS[state.selectedVersion]) || '';
    return;
  }

  label.textContent = t(subOptions.label);
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
    button.innerHTML = `<span>${t(option.label)}</span><small>${t(option.caption)}</small>`;
    button.addEventListener('click', () => onSelect(subOptions, option.value));
    grid.appendChild(button);
  });
}

let cellSizeLever = null;

// The right lever slot follows the view; the cell size lever on the left never moves.
function renderModeSlider(mathPanel) {
  const slot = document.getElementById('modeSlider');
  const spec = getModeSlider(state);
  slot.replaceChildren(
    spec
      ? createSlider(spec, state, (value) => mathPanel.updateAmount(value))
      : createSliderHint(t(MODE_SLIDER_HINTS[state.selectedVersion]) || '')
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
  renderModeSlider(mathPanel);
  mathPanel.updateMode(state.selectedVersion, getModeOption(), getLeverValue());
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

  let lastUpdate = null;
  function render() {
    if (!lastUpdate) return;
    const version = lastUpdate.version ? ` ${lastUpdate.version}` : '';
    notice.style.display = 'block';

    if (lastUpdate.status === 'downloading') {
      title.textContent = t({
        ko: `새 버전${version} 다운로드 중입니다`,
        en: `Downloading new version${version}`,
      });
      detail.textContent = t({
        ko: '작품은 계속 사용할 수 있습니다.',
        en: 'You can keep using the artwork.',
      });
      actions.style.display = 'none';
      return;
    }

    if (lastUpdate.status === 'downloaded') {
      title.textContent = t({
        ko: `새 버전${version} 다운로드가 완료되었습니다`,
        en: `New version${version} is ready`,
      });
      detail.textContent = t({
        ko: '지금 재시작하면 업데이트가 적용됩니다.',
        en: 'Restart now to apply the update.',
      });
      actions.style.display = 'flex';
    }
  }

  ipcRenderer.on('update-status', (_event, update) => {
    lastUpdate = update;
    render();
  });
  return { render };
}

// 한국어 / English buttons in the centred control block.
function renderLanguageToggle() {
  document.querySelectorAll('#languageToggle [data-lang]').forEach((button) => {
    const isSelected = button.dataset.lang === getLanguage();
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const videoEl = document.getElementById('videoElement');
  const canvasEl = document.getElementById('binaryCanvas');
  const hiddenCanvasEl = document.getElementById('hiddenCanvas');
  const bgCanvasEl = document.getElementById('bgCanvas');

  const mathPanel = createMathPanel(document.getElementById('panelCards'));
  const cellCard = createCellCard(document.getElementById('detailCard'));
  const cellPicker = createCellPicker({
    marker: document.getElementById('cellMarker'),
    getViewKey: () => `${getModeOption()}:${getLeverValue()}`,
    onReading: (reading, frame) => cellCard.update(reading, frame),
  });
  // 손하트 안내 패널은 필요할 때 아래 코드를 다시 활성화해 복원할 수 있습니다.
  // const heartOverlay = createHeartOverlay();

  const updateNotice = setupUpdateNotice();

  const onModeSelect = (mode) => {
    selectMode(state, mode);
    updateModeUI(mathPanel);
  };
  const renderControls = () => {
    renderModeButtons(document.getElementById('liveModeButtons'), onModeSelect);
    cellSizeLever = createSlider(CELL_SIZE_SLIDER, state);
    document.getElementById('cellSizeSlider').replaceChildren(cellSizeLever);
    updateModeUI(mathPanel);
    applyStaticText();
    renderLanguageToggle();
  };
  document.querySelectorAll('#languageToggle [data-lang]').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
  // The view, its options and lever values stay; only the words change.
  onLanguageChange(() => {
    renderControls();
    cellCard.render();
    updateNotice.render();
    if (lastError) showError(lastError.message, lastError.detail);
  });
  renderControls();
  document.getElementById('modeControls').style.display = 'block';
  resizeCanvases(canvasEl, bgCanvasEl);

  const magnifierArea = document.getElementById('magnifierArea');
  canvasEl.dataset.smooth = 'true';
  state.magnifier = createMagnifier({
    area: magnifierArea,
    getLayers: () =>
      [document.querySelector('#visualStage .channel-overlay'), canvasEl].filter(Boolean),
    getArtworkRect: () => magnifierArea.getBoundingClientRect(),
    onPoint: (point) => cellPicker.pick(point),
  });
  layoutMagnifierArea(canvasEl);

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
    layoutMagnifierArea(canvasEl);
  });

  try {
    state.model = await loadModel();
    await startCamera(videoEl, canvasEl, hiddenCanvasEl, mathPanel, (frame) => {
      state.magnifier?.render();
      cellPicker.update(frame);
    });
  } catch (err) {
    console.error('Failed to load model:', err);
    showError(ERRORS.modelFailed, String(err.message || err));
  }
});

// `onDrawn` runs right after each frame is drawn, with the frame loop's `frame`.
async function startCamera(videoEl, canvasEl, hiddenCanvasEl, mathPanel, onDrawn) {
  if (!state.model) {
    showError(ERRORS.modelLoading);
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
    mathPanel.updateMode(state.selectedVersion, getModeOption(), getLeverValue());
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
      getMathSettings: () => getMathSettings(state),
      getArtworkArea: () => getStageArtworkArea(canvasEl),
      getCellSize: () => state.cellSize,
      onDrawn,
      // 손하트 감지 및 안내 패널 호출은 현재 비활성화했습니다.
      // onGesture: () => heartOverlay.show(),
    });
    state.loop.start();
  } catch (err) {
    console.error('Camera access failed:', err);
    showError(ERRORS.camera);
  }
}
