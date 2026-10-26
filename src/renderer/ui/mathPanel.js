const { mathDescriptions } = require('../data/mathDescriptions');
const { getModeExplanation } = require('../data/modeExplanations');
const { createExplainAnimation } = require('./explainAnimations');

function formatGridMetric(cols, rows) {
  return `지금 화면 = 가로 ${cols}칸 × 세로 ${rows}칸 = ${(cols * rows).toLocaleString('ko-KR')}칸`;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createMathPanel(container = document.body) {
  const panel = element('div', 'math-panel');
  panel.id = 'mathPanel';
  panel.setAttribute('aria-label', '현재 선택한 미디어 아트 모드');
  const content = element('div', 'explain-content');
  content.setAttribute('aria-live', 'polite');
  const metric = element('div', 'math-metric');
  panel.append(element('div', 'panel-eyebrow', 'CURRENT MODE'), content, metric);
  container.appendChild(panel);

  let currentKey = null;
  let currentMode = null;
  let fallbackMetric = '';

  // Rebuilds the card only when the view changes so the animation keeps looping.
  function updateMode(modeKey, option) {
    const key = `${modeKey}:${option}`;
    if (key === currentKey) return;
    currentKey = key;
    currentMode = modeKey;

    const explanation = getModeExplanation(modeKey, option);
    if (!explanation) {
      const desc = mathDescriptions[modeKey] || {};
      fallbackMetric = desc.metric || desc.colorDepth || '';
      content.replaceChildren(
        element('div', 'explain-title', desc.title || modeKey),
        element('p', 'explain-body', desc.shortDesc || desc.desc || '')
      );
      metric.textContent = fallbackMetric;
      return;
    }

    fallbackMetric = '';
    const visual = element('div', 'explain-visual');
    visual.setAttribute('aria-hidden', 'true');
    const animation = createExplainAnimation(explanation.animation);
    if (animation) visual.appendChild(animation);
    const terms = element('div', 'explain-terms');
    explanation.terms.forEach((term) => terms.appendChild(element('span', 'explain-term', term)));
    content.replaceChildren(
      element('div', 'explain-title', explanation.title),
      element('div', 'explain-headline', explanation.headline),
      visual,
      element('p', 'explain-body', explanation.body),
      terms
    );
    metric.textContent = '';
  }

  function update(stats) {
    if (stats.mode !== currentMode || !stats.cols || !stats.rows) return;
    const grid = formatGridMetric(stats.cols, stats.rows);
    metric.textContent = fallbackMetric ? `${fallbackMetric} · ${grid}` : grid;
  }

  return {
    updateMode,
    update,
  };
}

module.exports = { createMathPanel, formatGridMetric };
