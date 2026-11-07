const { applyImageMath, getGaussianWeights, gaussianAt } = require('../core/imageMath');
const { t } = require('../i18n');

// Small looping illustrations for the mode explanation card. Each builder returns
// a DOM element animated purely by CSS; its un-animated styles are the meaningful
// still picture shown when reduced motion is on.

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
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
  if (effect === 'blur') return t({ ko: `${size} 가중 평균`, en: `${size} weighted avg` });
  if (effect === 'sharpen') return t({ ko: `마스크 × ${amount}`, en: `mask × ${amount}` });
  return t({ ko: '그대로', en: 'unchanged' });
}

function paintMathCell(cell, value) {
  cell.textContent = value;
  cell.style.background = `rgb(${value}, ${value}, ${value})`;
  cell.style.color = value >= 128 ? '#000' : '#fff';
}

// `weights` (3×3, optional) are shown as small ×n badges on the cells while the
// example shows a 3×3 calculation (the `shows-weights` class).
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

function paintMathGrid(grid, values) {
  grid.querySelectorAll('.explain-math-cell').forEach((cell, index) => {
    paintMathCell(cell, values[index]);
  });
}

// Before → calculation → after on a 3×3 example chosen to show the change clearly.
// The visitor's own cells are calculated in the magnifier and the card under the
// controls. `updateAmount` refreshes the numbers in place as the lever moves,
// without restarting the animation.
function createMathOp(effect, amount) {
  const root = element('div', `explain-math explain-math--${effect}`);
  root.dataset.label = t({ ko: '예시', en: 'Example' });
  // Blur and sharpen weigh the neighbours: corner 1, side 2, centre 4 (3×3 Gaussian).
  const weights = ['blur', 'sharpen'].includes(effect) ? getGaussianWeights(1).flat() : null;
  const before = createMathGrid([...MATH_EXAMPLE], 'is-before', weights);
  const operator = element('span', 'explain-math-op');
  const after = createMathGrid([...MATH_EXAMPLE], 'is-after');
  root.append(before, operator, after);

  const output = new Uint8ClampedArray(9);
  root.updateAmount = (value) => {
    applyImageMath(effect, value, MATH_EXAMPLE, output, 3, 3);
    paintMathGrid(after, output);
    operator.textContent = formatMathOperator(effect, value);
    // A wider blur averages more cells than the 3×3 weights describe.
    root.classList.toggle(
      'shows-weights',
      effect === 'sharpen' || (effect === 'blur' && value === 1)
    );
  };
  root.updateAmount(amount);
  return root;
}

const SVG = 'http://www.w3.org/2000/svg';

function svgElement(tag, attributes) {
  const el = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  return el;
}

// The calculation written the way a linear function is: x is a cell's value, y its
// new value.
function formatFunction(effect, amount) {
  if (effect === 'brightness') return `y = x ${amount < 0 ? '−' : '+'} ${Math.abs(amount)}`;
  return `y = ${amount}(x − 128) + 128`;
}

// 밝기 · 대비 change every cell on its own, so the whole calculation is one graph:
// the new value y for every value x, drawn with the view's own maths, beside the
// plain y = x line. The marked cell is the dot (`updateCell`).
function createMathGraph(effect, amount) {
  const root = element('div', 'explain-graph');
  const plot = svgElement('svg', { class: 'explain-graph-plot', viewBox: '-6 -6 267 267' });
  const flip = (y) => 255 - y;
  plot.append(
    svgElement('rect', { class: 'graph-frame', x: 0, y: 0, width: 255, height: 255 }),
    svgElement('line', { class: 'graph-mid', x1: 128, y1: 0, x2: 128, y2: 255 }),
    svgElement('line', { class: 'graph-mid', x1: 0, y1: flip(128), x2: 255, y2: flip(128) }),
    svgElement('line', { class: 'graph-identity', x1: 0, y1: 255, x2: 255, y2: 0 })
  );
  const line = svgElement('polyline', { class: 'graph-line' });
  const guides = svgElement('path', { class: 'graph-guide' });
  const dot = svgElement('circle', { class: 'graph-dot', r: 13 });
  plot.append(line, guides, dot);

  const legend = element('div', 'explain-graph-legend');
  const formula = element('div', 'explain-graph-formula');
  const cell = element('div', 'explain-graph-cell');
  legend.append(
    formula,
    cell,
    element('div', 'explain-graph-axes', t({ ko: 'x = 값, y = 새 값', en: 'x = value, y = new' }))
  );
  root.append(plot, legend);

  const ramp = Uint8ClampedArray.from({ length: 256 }, (_, x) => x);
  const output = new Uint8ClampedArray(256);
  let marked = null;

  function showCell() {
    dot.style.display = marked ? '' : 'none';
    guides.style.display = marked ? '' : 'none';
    cell.textContent = marked ? `● ${marked.value} → ${output[marked.value]}` : '';
    if (!marked) return;
    const [x, y] = [marked.value, flip(output[marked.value])];
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    guides.setAttribute('d', `M ${x} 255 V ${y} H 0`);
  }

  root.updateAmount = (value) => {
    applyImageMath(effect, value, ramp, output, 256, 1);
    line.setAttribute('points', [...output].map((y, x) => `${x},${flip(y)}`).join(' '));
    formula.textContent = formatFunction(effect, value);
    showCell();
  };
  root.updateCell = (reading) => {
    marked = reading;
    showCell();
  };
  root.updateAmount(amount);
  return root;
}

// A row of cells across an edge, dark then light, for the unsharp mask picture.
const UNSHARP_ROW = Uint8ClampedArray.from([70, 70, 70, 70, 70, 180, 180, 180, 180, 180]);
const UNSHARP_CELL = 20;
const UNSHARP_PLOT_HEIGHT = 64;
const UNSHARP_MASK_BASE = 94;
// Mask bars use half the value scale of the plot, so ±27 fits under it.
const UNSHARP_MASK_SCALE = 0.6;

// A step line through the row: each cell is one flat stretch at its value.
function stepPath(values) {
  const y = (value) => 6 + ((255 - value) * UNSHARP_PLOT_HEIGHT) / 255;
  let d = `M 0 ${y(values[0])}`;
  values.forEach((value, index) => {
    d += ` V ${y(value)} H ${(index + 1) * UNSHARP_CELL}`;
  });
  return d;
}

// 선명 is unsharp masking. Along one row across an edge the picture shows, in turn:
// ① the blurred copy (the 3×3 weighted average), ② the mask, original − blur, which
// is zero on flat parts and only lives at the edge, ③ the result, original + mask ×
// the lever, which overshoots on both sides of the edge so it looks sharper. Every
// line is calculated with the view's own blur and sharpen.
function createUnsharpProfile(amount) {
  const width = UNSHARP_ROW.length * UNSHARP_CELL;
  const root = element('div', 'explain-graph explain-unsharp');
  const plot = svgElement('svg', {
    class: 'explain-graph-plot explain-unsharp-plot',
    viewBox: `-4 0 ${width + 8} 112`,
  });
  const blur = new Uint8ClampedArray(UNSHARP_ROW.length);
  // Unrounded blur, so the mask bars show the exact difference.
  const average = [...UNSHARP_ROW].map((_, x) =>
    gaussianAt(UNSHARP_ROW, UNSHARP_ROW.length, 1, x, 0, 1)
  );
  applyImageMath('blur', 1, UNSHARP_ROW, blur, UNSHARP_ROW.length, 1);

  const mask = svgElement('g', { class: 'unsharp-mask' });
  mask.appendChild(
    svgElement('line', {
      class: 'unsharp-mask-base',
      x1: 0,
      y1: UNSHARP_MASK_BASE,
      x2: width,
      y2: UNSHARP_MASK_BASE,
    })
  );
  UNSHARP_ROW.forEach((value, x) => {
    const difference = (value - average[x]) * UNSHARP_MASK_SCALE;
    if (!difference) return;
    mask.appendChild(
      svgElement('rect', {
        x: x * UNSHARP_CELL + 4,
        y: UNSHARP_MASK_BASE - Math.max(0, difference),
        width: UNSHARP_CELL - 8,
        height: Math.abs(difference),
      })
    );
  });
  const result = svgElement('path', { class: 'unsharp-line unsharp-result' });
  plot.append(
    svgElement('rect', {
      class: 'graph-frame',
      x: 0,
      y: 0,
      width,
      height: UNSHARP_PLOT_HEIGHT + 12,
    }),
    svgElement('path', { class: 'unsharp-line unsharp-original', d: stepPath(UNSHARP_ROW) }),
    svgElement('path', { class: 'unsharp-line unsharp-blur', d: stepPath(blur) }),
    mask,
    result
  );

  const legend = element('div', 'explain-graph-legend explain-unsharp-legend');
  const resultLabel = element('div', 'unsharp-key unsharp-key--result');
  legend.append(
    element('div', 'unsharp-key unsharp-key--original', t({ ko: '원본', en: 'original' })),
    element(
      'div',
      'unsharp-key unsharp-key--blur',
      t({ ko: '① 블러 (가중 평균)', en: '① blur (weighted avg)' })
    ),
    element(
      'div',
      'unsharp-key unsharp-key--mask',
      t({ ko: '② 마스크 = 원본 − 블러', en: '② mask = original − blur' })
    ),
    resultLabel
  );
  root.append(plot, legend);

  const output = new Uint8ClampedArray(UNSHARP_ROW.length);
  root.updateAmount = (value) => {
    applyImageMath('sharpen', value, UNSHARP_ROW, output, UNSHARP_ROW.length, 1);
    result.setAttribute('d', stepPath(output));
    resultLabel.textContent = t({
      ko: `③ 원본 + 마스크 × ${value}`,
      en: `③ original + mask × ${value}`,
    });
  };
  root.updateAmount(amount);
  return root;
}

function createExplainAnimation(spec) {
  if (spec?.type === 'light-mix') return createLightMix();
  if (spec?.type === 'channel-dimmer') return createChannelDimmer(spec.color);
  if (spec?.type === 'level-steps') return createLevelSteps(spec.levels);
  if (spec?.type === 'math-op') return createMathOp(spec.effect, spec.amount ?? 0);
  if (spec?.type === 'math-graph') return createMathGraph(spec.effect, spec.amount ?? 0);
  if (spec?.type === 'unsharp-profile') return createUnsharpProfile(spec.amount ?? 1);
  return null;
}

module.exports = {
  createExplainAnimation,
  formatMathOperator,
  formatFunction,
  stepPath,
  MATH_EXAMPLE,
  UNSHARP_ROW,
};
