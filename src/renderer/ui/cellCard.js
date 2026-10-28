const { getLanguage } = require('../i18n');

function formatGridMetric(cols, rows, language = getLanguage()) {
  const number = (value) => value.toLocaleString(language === 'en' ? 'en-US' : 'ko-KR');
  if (language === 'en') {
    return `Now: ${number(cols)} × ${number(rows)} cells = ${number(cols * rows)} cells`;
  }
  const count = (value) => `${number(value)}칸`;
  return `지금 화면 = 가로 ${count(cols)} × 세로 ${count(rows)} = ${count(cols * rows)}`;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// The card under the controls, right below the levers: how many cells the screen
// is cut into, which the cell size lever changes.
function createCellCard(container) {
  const card = element('div', 'cell-card');
  const metric = element('div', 'math-metric');
  card.append(metric);
  container.appendChild(card);

  let grid = null;

  function render() {
    metric.textContent = grid ? formatGridMetric(grid.cols, grid.rows) : '';
  }

  // Called with every frame's grid; the text changes only when the size does.
  function updateGrid(cols, rows) {
    if (grid && grid.cols === cols && grid.rows === rows) return;
    grid = { cols, rows };
    render();
  }

  return { updateGrid, render };
}

module.exports = { createCellCard, formatGridMetric };
