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

  root.appendChild(element('div', 'explain-levels-label', '진짜 밝기'));
  const smooth = element('div', 'explain-levels-bar explain-levels-bar--smooth');
  smooth.appendChild(element('span', 'explain-levels-marker'));
  root.appendChild(smooth);

  root.appendChild(element('div', 'explain-levels-label', `컴퓨터가 고른 색 · ${levels}단계`));
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

function createExplainAnimation(spec) {
  if (spec?.type === 'scan-person') return createScanPerson();
  if (spec?.type === 'light-mix') return createLightMix();
  if (spec?.type === 'channel-dimmer') return createChannelDimmer(spec.color);
  if (spec?.type === 'level-steps') return createLevelSteps(spec.levels);
  return null;
}

module.exports = { createExplainAnimation, PERSON_BITMAP };
