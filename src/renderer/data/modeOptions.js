const { CELL_SIZES } = require('../config');
const { getColorValueFontSize } = require('../modes/rgb');
const { MIN_DIGIT_FONT_SIZE } = require('../utils');

// Visible text is a { ko, en } pair (see i18n.js); digits and symbols are plain strings.
const MODE_OPTIONS = [
  {
    key: 'original',
    label: { ko: '미디어 아트', en: 'Media Art' },
    caption: { ko: '0 / 1 실루엣', en: '0 / 1 shape' },
  },
  {
    key: 'rgb',
    label: { ko: '색 RGB', en: 'RGB Color' },
    caption: { ko: '빛의 삼원색', en: 'R · G · B' },
  },
  { key: 'levels', label: { ko: '밝기 단계', en: 'Brightness' }, caption: '2·10·256' },
  { key: 'math', label: { ko: '수학 처리', en: 'Image Math' }, caption: '+ − × ÷' },
];

// Second row of touch buttons, shown under the mode buttons for modes that have them.
// `noneValue` lets a second tap on the selected option clear it back to that view.
const MODE_SUB_OPTIONS = {
  rgb: {
    stateKey: 'rgbChannel',
    label: {
      ko: '빛을 하나 골라보세요 (다시 누르면 전체 색)',
      en: 'Pick a light (tap again to undo)',
    },
    noneValue: 'N',
    options: [
      { value: 'R', label: 'R', caption: { ko: '빨강', en: 'Red' }, swatch: '#ff3b3b' },
      { value: 'G', label: 'G', caption: { ko: '초록', en: 'Green' }, swatch: '#36ff6b' },
      { value: 'B', label: 'B', caption: { ko: '파랑', en: 'Blue' }, swatch: '#3b8bff' },
    ],
  },
  levels: {
    stateKey: 'levels',
    label: { ko: '밝기를 몇 단계로 나눌까요?', en: 'How many brightness steps?' },
    options: [
      { value: 2, label: { ko: '2단계', en: '2 steps' }, caption: '0 · 1' },
      { value: 10, label: { ko: '10단계', en: '10 steps' }, caption: '0 ~ 9' },
      { value: 256, label: { ko: '256단계', en: '256 steps' }, caption: '0 ~ 255' },
    ],
  },
  math: {
    stateKey: 'mathEffect',
    label: {
      ko: '계산을 하나 골라보세요 (다시 누르면 원본)',
      en: 'Pick a calculation (tap again to undo)',
    },
    noneValue: 'none',
    options: [
      {
        value: 'brightness',
        label: { ko: '밝기', en: 'Brighten' },
        caption: { ko: '더하기', en: 'Add' },
      },
      {
        value: 'contrast',
        label: { ko: '대비', en: 'Contrast' },
        caption: { ko: '곱하기', en: 'Multiply' },
      },
      {
        value: 'blur',
        label: { ko: '블러', en: 'Blur' },
        caption: { ko: '무게 평균', en: 'Weighted' },
      },
      {
        value: 'sharpen',
        label: { ko: '선명', en: 'Sharpen' },
        caption: { ko: '차이 키우기', en: 'Boost edges' },
      },
    ],
  },
};

const MODE_HINTS = {
  original: {
    ko: '화면 앞에 서면 내가 있는 칸이 1로 켜져요',
    en: 'Stand in front of the screen and your cells turn into 1',
  },
};

// Left lever: the cell size, shared by every mode.
const CELL_SIZE_SLIDER = {
  stateKey: 'cellSize',
  label: { ko: '칸 크기', en: 'Cell size' },
  values: CELL_SIZES,
  format: (size) => `${size}px`,
  ends: [
    { ko: '작게', en: 'Small' },
    { ko: '크게', en: 'Large' },
  ],
};

// The combined RGB view needs room for three stacked numbers per cell, so its
// lever stops at the first size where they are readable (24px).
const COLOR_VALUE_CELL_SIZE = CELL_SIZES.find(
  (size) => getColorValueFontSize(size) >= MIN_DIGIT_FONT_SIZE
);

function getCellSizeFloor(state) {
  if (state.selectedVersion === 'rgb' && state.rgbChannel === 'N') {
    return {
      size: COLOR_VALUE_CELL_SIZE,
      note: {
        ko: `${COLOR_VALUE_CELL_SIZE}px부터`,
        en: `From ${COLOR_VALUE_CELL_SIZE}px`,
      },
    };
  }
  return { size: CELL_SIZES[0], note: null };
}

// Right lever: the current view's own setting, or this hint when it has none.
const THRESHOLD_SLIDER = {
  stateKey: 'threshold',
  label: { ko: '흑백 경계값', en: 'Threshold' },
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
    label: { ko: '더할 수', en: 'Add' },
    min: -120,
    max: 120,
    step: 10,
    format: (value) => (value > 0 ? `+${value}` : String(value)),
    ends: [
      { ko: '어둡게', en: 'Darker' },
      { ko: '밝게', en: 'Brighter' },
    ],
  },
  contrast: {
    stateKey: 'mathContrast',
    label: { ko: '곱할 수', en: 'Multiply by' },
    values: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    format: (value) => `× ${value}`,
    ends: [
      { ko: '흐리게', en: 'Flatter' },
      { ko: '또렷하게', en: 'Punchier' },
    ],
  },
  blur: {
    stateKey: 'mathBlur',
    label: { ko: '흐림 범위', en: 'Blur size' },
    values: [1, 2, 3],
    format: (radius) => {
      const size = `${radius * 2 + 1}×${radius * 2 + 1}`;
      return { ko: `${size}칸`, en: `${size} cells` };
    },
    ends: [
      { ko: '조금', en: 'Less' },
      { ko: '많이', en: 'More' },
    ],
  },
  sharpen: {
    stateKey: 'mathSharpen',
    label: { ko: '차이 키우기', en: 'Edge boost' },
    values: [0, 0.5, 1, 1.5, 2, 3],
    format: (value) => `× ${value}`,
    ends: [
      { ko: '그대로', en: 'None' },
      { ko: '강하게', en: 'Strong' },
    ],
  },
};

const MATH_START_AMOUNTS = {
  mathBrightness: 60,
  mathContrast: 2,
  mathBlur: 1,
  mathSharpen: 1.5,
};

const MODE_SLIDER_HINTS = {
  original: { ko: '칸이 작을수록 내 모습이 또렷해져요', en: 'Smaller cells show you more clearly' },
  rgb: {
    ko: '칸을 키우면 숫자가 더 잘 보여요',
    en: 'Bigger cells make the numbers easier to read',
  },
  levels: {
    ko: '2단계를 고르면 흑백 경계값을 옮길 수 있어요',
    en: 'Pick 2 steps to move the threshold',
  },
  math: { ko: '계산을 고르면 세기를 바꿀 수 있어요', en: 'Pick a calculation to set its strength' },
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
