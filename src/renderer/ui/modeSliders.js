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
  const head = element('span', 'mode-slider-label', spec.label);
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
  spec.ends.forEach((end) => ends.appendChild(element('span', '', end)));

  function read() {
    const position = Number(input.value);
    return values ? values[position] : position;
  }
  function show(value) {
    output.textContent = spec.format(value);
    input.setAttribute('aria-valuetext', output.textContent);
  }

  show(read());
  input.addEventListener('input', () => {
    const value = read();
    state[spec.stateKey] = value;
    show(value);
    onChange?.(value);
  });
  root.append(head, input, ends);
  return root;
}

// Keeps the slot's place (and every lever's position) when a view has no lever.
function createSliderHint(text) {
  const root = element('div', 'mode-slider is-empty');
  root.appendChild(element('span', 'mode-slider-hint', text));
  return root;
}

module.exports = { createSlider, createSliderHint };
