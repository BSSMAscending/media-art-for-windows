const { applyImageMath, getGaussianWeights } = require('../core/imageMath');
const { t } = require('../i18n');

// Small looping illustrations for the mode explanation card. Each builder returns
// a DOM element animated purely by CSS; its un-animated styles are the meaningful
// still picture shown when reduced motion is on.

// 9×11 pixel person: '#' cells are where the AI finds a person (1).
const PERSON_BITMAP = [
  '...###...',
  '...###...',
  '....#....',
  '.#######.',
  '#.#####.#',
  '#.#####.#',
  '..#####..',
  '..##.##..',
  '..##.##..',
  '..##.##..',
  '.###.###.',
];

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createScanPerson() {
  const root = element('div', 'explain-scan');
  const grid = element('div', 'explain-scan-grid');
  grid.style.setProperty('--cols', PERSON_BITMAP[0].length);
  PERSON_BITMAP.forEach((line, row) => {
    [...line].forEach((cell) => {
      const bit = element('span', `explain-bit${cell === '#' ? ' is-person' : ''}`);
      bit.style.setProperty('--row', row);
      grid.appendChild(bit);
    });
  });
  grid.appendChild(element('span', 'explain-scan-line'));
  root.appendChild(grid);
  return root;
}

function createLightMix() {
  const root = element('div', 'explain-light-mix');
  for (const [key, label] of [
    ['r', 'R'],
    ['g', 'G'],
    ['b', 'B'],
  ]) {
    root.appendChild(element('span', `explain-light explain-light--${key}`, label));
  }
  return root;
}

function createChannelDimmer(color) {
  const root = element('div', 'explain-dimmer');
  root.style.setProperty('--channel-color', color);
  root.appendChild(element('span', 'explain-dimmer-lamp'));
  const track = element('div', 'explain-dimmer-track');
  track.appendChild(element('span', 'explain-dimmer-knob'));
  root.appendChild(track);
  const scale = element('div', 'explain-dimmer-scale');
  for (const value of [0, 64, 128, 192, 255]) scale.appendChild(element('span', '', value));
  root.appendChild(scale);
  return root;
}

function createLevelSteps(levels) {
  const root = element('div', 'explain-levels');
  root.style.setProperty('--levels', levels);
  root.style.setProperty('--mid-step', Math.floor(levels / 2));

  root.appendChild(
    element('div', 'explain-levels-label', t({ ko: '진짜 밝기', en: 'Real brightness' }))
  );
  const smooth = element('div', 'explain-levels-bar explain-levels-bar--smooth');
  smooth.appendChild(element('span', 'explain-levels-marker'));
  root.appendChild(smooth);

  const stepsLabel = {
    ko: `컴퓨터가 고른 색 · ${levels}단계`,
    en: `Computer's colors · ${levels} steps`,
  };
  root.appendChild(element('div', 'explain-levels-label', t(stepsLabel)));
  const steps = element('div', 'explain-levels-bar');
  const showDigits = levels <= 10;
  for (let level = 0; level < levels; level++) {
    const gray = Math.round((level * 255) / (levels - 1));
    const swatch = element('span', 'explain-levels-step', showDigits ? level : undefined);
    swatch.style.background = `rgb(${gray}, ${gray}, ${gray})`;
    swatch.style.color = level / (levels - 1) >= 0.5 ? '#000' : '#fff';
    steps.appendChild(swatch);
  }
  steps.appendChild(element('span', 'explain-levels-cursor'));
  root.appendChild(steps);

  if (!showDigits) {
    const ends = element('div', 'explain-levels-ends');
    ends.append(element('span', '', '0'), element('span', '', String(levels - 1)));
    root.appendChild(ends);
  }
  return root;
}

// 3×3 numbers the 수학 처리 card calculates with, using the live view's own maths.
const MATH_EXAMPLE = Uint8ClampedArray.from([60, 90, 120, 80, 140, 200, 100, 170, 230]);

function formatMathOperator(effect, amount) {
  if (effect === 'brightness') return amount < 0 ? `− ${-amount}` : `+ ${amount}`;
  if (effect === 'contrast') return `× ${amount}`;
  const size = `${amount * 2 + 1}×${amount * 2 + 1}`;
  if (effect === 'blur') return t({ ko: `${size} 무게 평균`, en: `${size} weighted avg` });
  if (effect === 'sharpen') return t({ ko: `차이 × ${amount}`, en: `diff × ${amount}` });
  return t({ ko: '그대로', en: 'unchanged' });
}

function paintMathCell(cell, value) {
  cell.textContent = value;
  cell.style.background = `rgb(${value}, ${value}, ${value})`;
  cell.style.color = value >= 128 ? '#000' : '#fff';
}

// `weights` (3×3, optional) are shown as small ×n badges on the cells.
function createMathGrid(values, className, weights) {
  const grid = element('div', `explain-math-grid ${className}`);
  values.forEach((value, index) => {
    const cell = element('span', `explain-math-cell${index === 4 ? ' is-center' : ''}`);
    cell.style.setProperty('--order', index);
    if (weights) cell.dataset.weight = `×${weights[index]}`;
    paintMathCell(cell, value);
    grid.appendChild(cell);
  });
  return grid;
}

// Before → calculation → after on a 3×3 example. `updateAmount` refreshes the
// numbers in place as the lever moves, without restarting the animation.
function createMathOp(effect, amount) {
  const root = element('div', `explain-math explain-math--${effect}`);
  // Blur and sharpen weigh the neighbours: corner 1, side 2, centre 4 (3×3 Gaussian).
  const weights = ['blur', 'sharpen'].includes(effect) ? getGaussianWeights(1).flat() : null;
  const before = createMathGrid([...MATH_EXAMPLE], 'is-before', weights);
  const operator = element('span', 'explain-math-op');
  const after = createMathGrid([...MATH_EXAMPLE], 'is-after');
  root.append(before, operator, after);

  const output = new Uint8ClampedArray(9);
  root.updateAmount = (value) => {
    applyImageMath(effect, value, MATH_EXAMPLE, output, 3, 3);
    after.querySelectorAll('.explain-math-cell').forEach((cell, index) => {
      paintMathCell(cell, output[index]);
    });
    operator.textContent = formatMathOperator(effect, value);
  };
  root.updateAmount(amount);
  return root;
}

function createExplainAnimation(spec) {
  if (spec?.type === 'scan-person') return createScanPerson();
  if (spec?.type === 'light-mix') return createLightMix();
  if (spec?.type === 'channel-dimmer') return createChannelDimmer(spec.color);
  if (spec?.type === 'level-steps') return createLevelSteps(spec.levels);
  if (spec?.type === 'math-op') return createMathOp(spec.effect, spec.amount ?? 0);
  return null;
}

module.exports = { createExplainAnimation, formatMathOperator, PERSON_BITMAP, MATH_EXAMPLE };
