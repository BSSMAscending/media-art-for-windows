const { t } = require('../i18n');

// Big touch levers for the centred control block. A spec either steps through a
// fixed list of `values` or spans `min`..`max` by `step`, and always writes the
// chosen value to `state[spec.stateKey]`.

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createSlider(spec, state, onChange) {
  const root = element('label', 'mode-slider');
  const output = element('output', 'mode-slider-value');
  const head = element('span', 'mode-slider-label', t(spec.label));
  head.appendChild(output);

  const input = element('input', 'mode-slider-input');
  input.type = 'range';
  const { values } = spec;
  input.min = String(values ? 0 : spec.min);
  input.max = String(values ? values.length - 1 : spec.max);
  input.step = String(values ? 1 : spec.step);
  const current = state[spec.stateKey];
  input.value = String(values ? Math.max(0, values.indexOf(current)) : current);

  const ends = element('span', 'mode-slider-ends');
  spec.ends.forEach((end) => ends.appendChild(element('span', '', t(end))));
  const lowEnd = ends.firstChild;
  let floor = Number(input.min);

  function read() {
    const position = Number(input.value);
    return values ? values[position] : position;
  }
  function show(value) {
    output.textContent = t(spec.format(value));
    input.setAttribute('aria-valuetext', output.textContent);
  }

  function commit() {
    const value = read();
    state[spec.stateKey] = value;
    show(value);
    onChange?.(value);
  }

  show(read());
  input.addEventListener('input', () => {
    // The thumb cannot pass below the floor; the track keeps its full length.
    if (Number(input.value) < floor) input.value = String(floor);
    commit();
  });
  root.append(head, input, ends);

  /**
   * Blocks the lever below `value` without shortening it, so the thumb keeps the
   * same place for the same value in every mode. `note` replaces the low end label.
   */
  root.setFloor = (value, note) => {
    floor = values ? Math.max(0, values.indexOf(value)) : value;
    const span = Number(input.max) - Number(input.min);
    root.style.setProperty('--floor', `${((floor - Number(input.min)) / span) * 100}%`);
    root.classList.toggle('has-floor', floor > Number(input.min));
    lowEnd.textContent = t(note || spec.ends[0]);
    if (Number(input.value) < floor) {
      input.value = String(floor);
      commit();
    }
  };
  return root;
}

// Keeps the slot's place (and every lever's position) when a view has no lever.
function createSliderHint(text) {
  const root = element('div', 'mode-slider is-empty');
  root.appendChild(element('span', 'mode-slider-hint', text));
  return root;
}

module.exports = { createSlider, createSliderHint };
