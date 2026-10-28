const { mathDescriptions } = require('../data/mathDescriptions');
const { getModeExplanation, getRule } = require('../data/modeExplanations');
const { createExplainAnimation } = require('./explainAnimations');
const { t, getLanguage } = require('../i18n');

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// The card above the controls: the view's title, its rule as one calculation with
// the right lever's value written in, a picture in the remaining height, and at
// most one short fact under it.
function createMathPanel(container = document.body) {
  const panel = element('div', 'math-panel');
  panel.id = 'mathPanel';
  const content = element('div', 'explain-content');
  content.setAttribute('aria-live', 'polite');
  panel.appendChild(content);
  container.appendChild(panel);

  let currentKey = null;
  let explanation = null;
  let rule = null;
  let animation = null;

  function showRule(value) {
    if (rule && explanation) rule.textContent = t(getRule(explanation, value));
  }

  // Rebuilds the card only when the view changes so the animation keeps looping.
  // `value` is the right lever's value, which the rule and the picture calculate with.
  function updateMode(modeKey, option, value) {
    const key = `${modeKey}:${option}:${getLanguage()}`;
    if (key === currentKey) {
      updateAmount(value);
      return;
    }
    currentKey = key;
    explanation = getModeExplanation(modeKey, option);
    animation = null;
    rule = null;

    if (!explanation) {
      // Legacy views (keys 5-9) keep their old one-line description.
      const desc = mathDescriptions[modeKey] || {};
      content.replaceChildren(
        element('div', 'explain-title', t(desc.title) || modeKey),
        element('p', 'explain-rule', t(desc.shortDesc || desc.desc || ''))
      );
      return;
    }

    rule = element('div', 'explain-rule');
    showRule(value);
    const visual = element('div', 'explain-visual');
    visual.setAttribute('aria-hidden', 'true');
    animation = createExplainAnimation({ ...explanation.visual, amount: value });
    if (animation) visual.appendChild(animation);
    content.replaceChildren(element('div', 'explain-title', t(explanation.title)), rule, visual);
    if (explanation.note) content.appendChild(element('div', 'explain-note', t(explanation.note)));
  }

  // Moving a lever only refreshes the rule's number and the picture's example.
  function updateAmount(value) {
    showRule(value);
    animation?.updateAmount?.(value);
  }

  // The marked cell (cellReadout.js) shows up in the calculation pictures.
  function updateCell(reading) {
    if (reading?.kind === 'math' && reading.effect === explanation?.visual.effect) {
      animation?.updateCell?.(reading);
    }
  }

  return { updateMode, updateAmount, updateCell };
}

module.exports = { createMathPanel };
