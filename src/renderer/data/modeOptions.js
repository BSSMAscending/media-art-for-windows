const { CELL_SIZES } = require('../config');
const { getDigitFontSize, MIN_DIGIT_FONT_SIZE } = require('../utils');

// Visible text is a { ko, en } pair (see i18n.js); digits and symbols are plain strings.
// The buttons sit in two columns: 밝기 단계 over 색 RGB on the left, 수학 처리 the
// full height of the right column (index.css), so this order is also the keys 1-3.
const MODE_OPTIONS = [
  { key: 'levels', label: { ko: '밝기 단계', en: 'Brightness' }, caption: '2·10·256' },
  {
    key: 'rgb',
    label: { ko: '색 RGB', en: 'RGB Color' },
    caption: { ko: '빛의 삼원색', en: 'R · G · B' },
  },
  { key: 'math', label: { ko: '수학 처리', en: 'Image Math' }, caption: '+ − × ÷' },
];

// The view the exhibit opens on.
const START_MODE = MODE_OPTIONS[0].key;

// Second row of touch buttons, shown under the mode buttons for modes that have them.
// Tapping the selected button again keeps it; RGB returns to the full colour with
// its own 원본 button. `label` names the row for screen readers only.
const MODE_SUB_OPTIONS = {
  rgb: {
    stateKey: 'rgbChannel',
    label: { ko: '빛 고르기', en: 'Pick a light' },
    options: [
      {
        value: 'N',
        label: { ko: '원본', en: 'Original' },
        caption: 'R+G+B',
        swatch: 'conic-gradient(#ff3b3b 0 33%, #36ff6b 0 67%, #3b8bff 0)',
      },
      { value: 'R', label: 'R', caption: { ko: '빨강', en: 'Red' }, swatch: '#ff3b3b' },
      { value: 'G', label: 'G', caption: { ko: '초록', en: 'Green' }, swatch: '#36ff6b' },
      { value: 'B', label: 'B', caption: { ko: '파랑', en: 'Blue' }, swatch: '#3b8bff' },
    ],
  },
  levels: {
    stateKey: 'levels',
    label: { ko: '밝기 단계 수', en: 'Brightness steps' },
    options: [
      { value: 2, label: { ko: '2단계', en: '2 steps' }, caption: '0 · 1' },
      { value: 10, label: { ko: '10단계', en: '10 steps' }, caption: '0 ~ 9' },
      { value: 256, label: { ko: '256단계', en: '256 steps' }, caption: '0 ~ 255' },
    ],
  },
  math: {
    stateKey: 'mathEffect',
    label: { ko: '계산 고르기', en: 'Pick a calculation' },
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
        caption: { ko: '가중 평균', en: 'Weighted' },
      },
      {
        value: 'sharpen',
        label: { ko: '선명', en: 'Sharpen' },
        caption: { ko: '언샤프', en: 'Unsharp' },
      },
    ],
  },
};

// Top lever: the cell size, shared by every mode.
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

// At the starting cell size the digits hide what 블러 does. Up to this size cells are
// plain colour (the 수학 처리 view drops digits below MIN_DIGIT_FONT_SIZE), so the
// blur shows as a blur. Picking 블러 brings up a tip that walks through shrinking the
// cells to it and then changing the blur size.
const BLUR_CELL_SIZE = CELL_SIZES.filter(
  (size) => getDigitFontSize(size, 3) < MIN_DIGIT_FONT_SIZE
).at(-1);

const BLUR_TIP = {
  title: { ko: '블러를 잘 보려면', en: 'To see the blur' },
  steps: [
    { ko: `칸 크기를 ${BLUR_CELL_SIZE}px까지 줄이고`, en: `Shrink cells to ${BLUR_CELL_SIZE}px` },
    { ko: '흐림 범위를 바꿔 보세요', en: 'Then change the blur size' },
  ],
};

/** The tip's step for this view: 1 shrink the cells, 2 change the blur size, 0 no tip. */
function getBlurTipStep(state) {
  if (state.selectedVersion !== 'math' || state.mathEffect !== 'blur') return 0;
  return state.cellSize <= BLUR_CELL_SIZE ? 2 : 1;
}

// Bottom lever: the current view's own setting, or a hint (getModeSliderHint) when it has none.
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
    label: { ko: '곱할 수', en: 'Multiply' },
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
      return { ko: `${size}칸`, en: size };
    },
    ends: [
      { ko: '조금', en: 'Less' },
      { ko: '많이', en: 'More' },
    ],
  },
  sharpen: {
    stateKey: 'mathSharpen',
    label: { ko: '마스크 세기', en: 'Mask amount' },
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
  rgb: {
    ko: '칸을 키우면 숫자가 더 잘 보여요',
    en: 'Bigger cells make the numbers easier to read',
  },
  // The full colour writes no numbers on screen; the magnifier shows each cell's three.
  rgbFull: {
    ko: '꾹 누르면 돋보기에 R·G·B 숫자가 보여요',
    en: 'Press and hold to see R, G, B up close',
  },
  levels: {
    ko: '2단계를 고르면 흑백 경계값을 옮길 수 있어요',
    en: 'Pick 2 steps to move the threshold',
  },
};

/** What the right lever slot says when the view has no lever of its own. */
function getModeSliderHint(state) {
  if (state.selectedVersion === 'rgb' && state.rgbChannel === 'N') return MODE_SLIDER_HINTS.rgbFull;
  return MODE_SLIDER_HINTS[state.selectedVersion] ?? null;
}

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

// Pressing a mode button opens its starting view: RGB on the full colour, 수학 처리 on
// its first calculation (밝기).
const MODE_START_STATE = {
  rgb: { rgbChannel: 'N' },
  math: { mathEffect: MODE_SUB_OPTIONS.math.options[0].value },
};

function selectMode(state, mode) {
  state.selectedVersion = mode;
  Object.assign(state, MODE_START_STATE[mode]);
}

function selectModeOption(state, subOptions, value) {
  state[subOptions.stateKey] = value;
}

module.exports = {
  MODE_OPTIONS,
  START_MODE,
  MODE_SUB_OPTIONS,
  MODE_START_STATE,
  CELL_SIZE_SLIDER,
  BLUR_CELL_SIZE,
  BLUR_TIP,
  getBlurTipStep,
  THRESHOLD_SLIDER,
  MATH_SLIDERS,
  MATH_START_AMOUNTS,
  MODE_SLIDER_HINTS,
  getModeSliderHint,
  getModeSlider,
  getMathSettings,
  selectMode,
  selectModeOption,
};
