const { mathDescriptions } = require('../data/mathDescriptions');
const { getModeExplanation } = require('../data/modeExplanations');
const { createExplainAnimation } = require('./explainAnimations');
const { t, getLanguage } = require('../i18n');

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

// The picture half (title, metaphor, animation) goes above the centred controls and
// the reading half (sentence, terms, live size) below them.
function createMathPanel(container = document.body, detailContainer = container) {
  const panel = element('div', 'math-panel');
  panel.id = 'mathPanel';
  const content = element('div', 'explain-content');
  content.setAttribute('aria-live', 'polite');
  panel.appendChild(content);
  container.appendChild(panel);

  const details = element('div', 'explain-details');
  const text = element('div', 'explain-text');
  text.setAttribute('aria-live', 'polite');
  const metric = element('div', 'math-metric');
  details.append(text, metric);
  detailContainer.appendChild(details);

  let currentKey = null;
  let currentMode = null;
  let fallbackMetric = '';
  let animation = null;

  // Rebuilds the card only when the view changes so the animation keeps looping.
  // `amount` is the 수학 처리 lever value its example calculates with.
  function updateMode(modeKey, option, amount) {
    const key = `${modeKey}:${option}:${getLanguage()}`;
    if (key === currentKey) return;
    currentKey = key;
    currentMode = modeKey;

    const explanation = getModeExplanation(modeKey, option);
    if (!explanation) {
      const desc = mathDescriptions[modeKey] || {};
      fallbackMetric = t(desc.metric || desc.colorDepth || '');
      content.replaceChildren(element('div', 'explain-title', t(desc.title) || modeKey));
      text.replaceChildren(element('p', 'explain-body', t(desc.shortDesc || desc.desc || '')));
      metric.textContent = fallbackMetric;
      return;
    }

    fallbackMetric = '';
    const visual = element('div', 'explain-visual');
    visual.setAttribute('aria-hidden', 'true');
    animation = createExplainAnimation({ ...explanation.animation, amount });
    if (animation) visual.appendChild(animation);
    const terms = element('div', 'explain-terms');
    explanation.terms.forEach((term) =>
      terms.appendChild(element('span', 'explain-term', t(term)))
    );
    content.replaceChildren(
      element('div', 'explain-title', t(explanation.title)),
      element('div', 'explain-headline', t(explanation.headline)),
      visual
    );
    text.replaceChildren(element('p', 'explain-body', t(explanation.body)), terms);
    metric.textContent = '';
  }

  function update(stats) {
    if (stats.mode !== currentMode || !stats.cols || !stats.rows) return;
    const grid = formatGridMetric(stats.cols, stats.rows);
    metric.textContent = fallbackMetric ? `${fallbackMetric} · ${grid}` : grid;
  }

  // Moving a lever only refreshes the example's numbers.
  function updateAmount(amount) {
    animation?.updateAmount?.(amount);
  }

  return {
    updateMode,
    updateAmount,
    update,
  };
}

module.exports = { createMathPanel, formatGridMetric };
