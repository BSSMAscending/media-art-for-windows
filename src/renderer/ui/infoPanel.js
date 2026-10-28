const { t, onLanguageChange } = require('../i18n');

// How every mode is made, in four steps that light up in turn.
const PIPELINE_STEPS = [
  { ko: '카메라', en: 'Camera' },
  { ko: '칸 나누기', en: 'Split into cells' },
  { ko: '숫자로 바꾸기', en: 'Turn into numbers' },
  { ko: '다시 그리기', en: 'Draw again' },
];
const TITLE = { ko: '컴퓨터가 보는 내 모습', en: 'How the computer sees you' };

function createInfoPanel(container = document.body) {
  const panel = document.createElement('aside');
  panel.id = 'infoPanel';
  panel.className = 'info-panel';
  const title = document.createElement('div');
  title.className = 'info-mode';
  const pipeline = document.createElement('ol');
  pipeline.className = 'info-pipeline';
  const items = PIPELINE_STEPS.map((step, index) => {
    const item = document.createElement('li');
    item.style.setProperty('--step', index);
    pipeline.appendChild(item);
    return item;
  });
  panel.append(title, pipeline);
  container.appendChild(panel);

  // Only the text changes, so the steps keep lighting up in rhythm.
  function render() {
    panel.setAttribute(
      'aria-label',
      t({ ko: '화면이 만들어지는 순서', en: 'How the screen is made' })
    );
    title.textContent = t(TITLE);
    items.forEach((item, index) => {
      item.textContent = t(PIPELINE_STEPS[index]);
    });
  }
  render();
  onLanguageChange(render);
}

module.exports = { createInfoPanel };
