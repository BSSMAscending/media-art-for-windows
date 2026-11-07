const { t, getLanguage } = require('../i18n');
const { formatCellMath } = require('../core/cellReadout');

function formatGridMetric(cols, rows, language = getLanguage()) {
  const number = (value) => value.toLocaleString(language === 'en' ? 'en-US' : 'ko-KR');
  if (language === 'en') {
    return `Now: ${number(cols)} × ${number(rows)} cells = ${number(cols * rows)} cells`;
  }
  const count = (value) => `${number(value)}칸`;
  return `지금 화면 = 가로 ${count(cols)} × 세로 ${count(rows)} = ${count(cols * rows)}`;
}

// The colour the marked cell is painted with on screen, for the card's swatch.
function getCellColor(reading) {
  if (reading.kind === 'rgb') {
    const { channel, r, g, b } = reading;
    if (channel === 'R') return `rgb(${r}, 0, 0)`;
    if (channel === 'G') return `rgb(0, ${g}, 0)`;
    if (channel === 'B') return `rgb(0, 0, ${b})`;
    return `rgb(${r}, ${g}, ${b})`;
  }
  const grey =
    reading.kind === 'levels'
      ? Math.round((reading.level * 255) / (reading.levels - 1))
      : reading.result;
  return `rgb(${grey}, ${grey}, ${grey})`;
}

const TEXT = {
  cell: { ko: '표시한 칸', en: 'Marked cell' },
  pick: { ko: '화면을 누르면 다른 칸', en: 'Press the picture to pick' },
};

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * The card under the controls, right below the levers: the marked cell's own
 * numbers put into the view's rule ("(140 − 128) × 2 + 128 = 152"), so moving a
 * lever shows the calculation change. The last line is the grid the cell size lever
 * sets.
 */
function createCellCard(container) {
  const card = element('div', 'cell-card');
  const head = element('div', 'cell-card-head');
  const swatch = element('span', 'cell-card-swatch');
  const title = element('span', 'cell-card-title');
  const hint = element('span', 'cell-card-hint');
  head.append(swatch, title, hint);
  // Not a live region: the numbers follow the camera several times a second.
  const math = element('div', 'cell-card-math');
  const metric = element('div', 'math-metric');
  card.append(head, math, metric);
  container.appendChild(card);

  let reading = null;
  let grid = null;

  function render() {
    card.classList.toggle('is-empty', !reading);
    swatch.hidden = !reading;
    if (reading) swatch.style.background = getCellColor(reading);
    title.textContent = reading ? t(TEXT.cell) : '';
    hint.textContent = reading ? t(TEXT.pick) : '';
    math.textContent = reading ? t(formatCellMath(reading)) : '';
    metric.textContent = grid ? formatGridMetric(grid.cols, grid.rows) : '';
  }

  /** Shows a reading from cellReadout.js (null for views without one). */
  function update(nextReading, frame) {
    reading = nextReading;
    grid = frame?.grid ? { cols: frame.grid.cols, rows: frame.grid.rows } : grid;
    render();
  }

  return { update, render };
}

module.exports = { createCellCard, formatGridMetric, getCellColor };
