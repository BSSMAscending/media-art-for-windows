const { t } = require('../i18n');
const { BLUR_TIP, getBlurTipStep } = require('../data/modeOptions');

// The tip leaves on its own this long after it appears or moves to its next step.
const TIP_DURATION = 10000;
const STEP_MARKS = ['①', '②'];

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * A small card that floats right under the levers when 블러 is picked: first shrink
 * the cells, then change the blur size. It points at the lever to move next and
 * makes that lever glow (`levers` are the two lever slots, left then right). It
 * never takes touches and goes away by itself, once the blur size is changed with
 * small cells, or when the view changes.
 */
function createBlurTip({ container, levers }) {
  const tip = element('div', 'blur-tip');
  tip.hidden = true;
  tip.setAttribute('role', 'status');
  const title = element('div', 'blur-tip-title');
  const list = element('ol', 'blur-tip-steps');
  const steps = BLUR_TIP.steps.map(() => {
    const item = element('li', 'blur-tip-step');
    item.append(element('span', 'blur-tip-mark'), element('span', 'blur-tip-text'));
    return list.appendChild(item);
  });
  tip.append(title, list);
  container.appendChild(tip);

  let step = 0;
  let timer = null;

  function render() {
    title.textContent = t(BLUR_TIP.title);
    steps.forEach((item, index) => {
      const done = index + 1 < step;
      item.classList.toggle('is-active', index + 1 === step);
      item.classList.toggle('is-done', done);
      item.firstChild.textContent = done ? '✓' : STEP_MARKS[index];
      item.lastChild.textContent = t(BLUR_TIP.steps[index]);
    });
    tip.dataset.step = String(step);
    levers.forEach((lever, index) => {
      lever.classList.toggle('is-tip-target', !tip.hidden && index + 1 === step);
    });
  }

  function hide() {
    window.clearTimeout(timer);
    tip.hidden = true;
    render();
  }

  function restartTimer() {
    window.clearTimeout(timer);
    timer = window.setTimeout(hide, TIP_DURATION);
  }

  /** Call after any change to the view, the cell size or the language. */
  function sync(state) {
    const next = getBlurTipStep(state);
    if (!next) {
      step = 0;
      hide();
      return;
    }
    // Only picking 블러 opens the tip; later changes just move it along.
    if (!step) {
      tip.hidden = false;
      restartTimer();
    } else if (next !== step && !tip.hidden) {
      restartTimer();
    }
    step = next;
    render();
  }

  /** The blur size lever moved: with the cells already small, the tip is done. */
  function onBlurSize() {
    if (step === 2) hide();
  }

  return { sync, onBlurSize };
}

module.exports = { createBlurTip };
