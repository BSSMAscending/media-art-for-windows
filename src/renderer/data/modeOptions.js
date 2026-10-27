const { CELL_SIZES } = require('../config');
const { getColorValueFontSize } = require('../modes/rgb');
const { MIN_DIGIT_FONT_SIZE } = require('../utils');

const MODE_OPTIONS = [
  { key: 'original', label: '미디어 아트', caption: '0 / 1 실루엣' },
  { key: 'rgb', label: '색 RGB', caption: '빛의 삼원색' },
  { key: 'levels', label: '밝기 단계', caption: '2·10·256' },
  { key: 'math', label: '수학 처리', caption: '+ − × ÷' },
];

// Second row of touch buttons, shown under the mode buttons for modes that have them.
// `noneValue` lets a second tap on the selected option clear it back to that view.
const MODE_SUB_OPTIONS = {
  rgb: {
    stateKey: 'rgbChannel',
    label: '빛을 하나 골라보세요 (다시 누르면 전체 색)',
    noneValue: 'N',
    options: [
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
  math: {
    stateKey: 'mathEffect',
    label: '계산을 하나 골라보세요 (다시 누르면 원본)',
    noneValue: 'none',
    options: [
      { value: 'brightness', label: '밝기', caption: '더하기' },
      { value: 'contrast', label: '대비', caption: '곱하기' },
      { value: 'blur', label: '블러', caption: '무게 평균' },
      { value: 'sharpen', label: '선명', caption: '차이 키우기' },
    ],
  },
};

const MODE_HINTS = {
  original: '화면 앞에 서면 내가 있는 칸이 1로 켜져요',
};

// Left lever: the cell size, shared by every mode.
const CELL_SIZE_SLIDER = {
  stateKey: 'cellSize',
  label: '칸 크기',
  values: CELL_SIZES,
  format: (size) => `${size}px`,
  ends: ['작게', '크게'],
};

// The combined RGB view needs room for three stacked numbers per cell, so its
// lever stops at the first size where they are readable (24px).
const COLOR_VALUE_CELL_SIZE = CELL_SIZES.find(
  (size) => getColorValueFontSize(size) >= MIN_DIGIT_FONT_SIZE
);

function getCellSizeFloor(state) {
  if (state.selectedVersion === 'rgb' && state.rgbChannel === 'N') {
    return { size: COLOR_VALUE_CELL_SIZE, note: `전체 색은 ${COLOR_VALUE_CELL_SIZE}px부터` };
  }
  return { size: CELL_SIZES[0], note: null };
}

// Right lever: the current view's own setting, or this hint when it has none.
const THRESHOLD_SLIDER = {
  stateKey: 'threshold',
  label: '흑백 경계값',
  min: 0,
  max: 255,
  step: 1,
  format: (value) => String(value),
  ends: ['0', '255'],
};

// How strongly the chosen 수학 처리 calculation is applied. Each starts away from
// "no change" so tapping a calculation shows its effect right away.
const MATH_SLIDERS = {
  brightness: {
    stateKey: 'mathBrightness',
    label: '더할 수',
    min: -120,
    max: 120,
    step: 10,
    format: (value) => (value > 0 ? `+${value}` : String(value)),
    ends: ['어둡게', '밝게'],
  },
  contrast: {
    stateKey: 'mathContrast',
    label: '곱할 수',
    values: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    format: (value) => `× ${value}`,
    ends: ['흐리게', '또렷하게'],
  },
  blur: {
    stateKey: 'mathBlur',
    label: '흐림 범위',
    values: [1, 2, 3],
    format: (radius) => `${radius * 2 + 1}×${radius * 2 + 1}칸`,
    ends: ['조금', '많이'],
  },
  sharpen: {
    stateKey: 'mathSharpen',
    label: '차이 키우기',
    values: [0, 0.5, 1, 1.5, 2, 3],
    format: (value) => `× ${value}`,
    ends: ['그대로', '강하게'],
  },
};

const MATH_START_AMOUNTS = {
  mathBrightness: 60,
  mathContrast: 2,
  mathBlur: 1,
  mathSharpen: 1.5,
};

const MODE_SLIDER_HINTS = {
  original: '칸이 작을수록 내 모습이 또렷해져요',
  rgb: '칸을 키우면 숫자가 더 잘 보여요',
  levels: '2단계를 고르면 흑백 경계값을 옮길 수 있어요',
  math: '계산을 고르면 세기를 바꿀 수 있어요',
};

function getModeSlider(state) {
  if (state.selectedVersion === 'levels' && state.levels === 2) return THRESHOLD_SLIDER;
  if (state.selectedVersion === 'math') return MATH_SLIDERS[state.mathEffect] ?? null;
  return null;
}

function getMathSettings(state) {
  const slider = MATH_SLIDERS[state.mathEffect];
  return {
    effect: slider ? state.mathEffect : 'none',
    amount: slider ? state[slider.stateKey] : 0,
  };
}

// Pressing a mode button opens its starting view; RGB always starts on the full colour.
const MODE_START_STATE = {
  rgb: { rgbChannel: 'N' },
  math: { mathEffect: 'none' },
};

function selectMode(state, mode) {
  state.selectedVersion = mode;
  Object.assign(state, MODE_START_STATE[mode]);
}

function selectModeOption(state, subOptions, value) {
  const { stateKey, noneValue } = subOptions;
  const clearsSelection = noneValue !== undefined && state[stateKey] === value;
  state[stateKey] = clearsSelection ? noneValue : value;
}

module.exports = {
  MODE_OPTIONS,
  MODE_SUB_OPTIONS,
  MODE_HINTS,
  CELL_SIZE_SLIDER,
  COLOR_VALUE_CELL_SIZE,
  getCellSizeFloor,
  THRESHOLD_SLIDER,
  MATH_SLIDERS,
  MATH_START_AMOUNTS,
  MODE_SLIDER_HINTS,
  getModeSlider,
  getMathSettings,
  selectMode,
  selectModeOption,
};
