// How every mode is made, in four steps that light up in turn.
const PIPELINE_STEPS = ['카메라', '칸 나누기', '숫자로 바꾸기', '다시 그리기'];

function createInfoPanel(container = document.body) {
  const panel = document.createElement('aside');
  panel.id = 'infoPanel';
  panel.className = 'info-panel';
  panel.setAttribute('aria-label', '미디어 아트 프로젝트 설명');
  panel.innerHTML = `
    <div class="panel-eyebrow">PROJECT NOTE</div>
    <div class="info-mode">컴퓨터가 보는 내 모습</div>
    <p class="info-desc">컴퓨터는 화면을 작은 칸(픽셀)으로 나눠 숫자로 기억해요.</p>
    <ol class="info-pipeline" aria-label="화면이 만들어지는 순서"></ol>
  `;
  const pipeline = panel.querySelector('.info-pipeline');
  PIPELINE_STEPS.forEach((step, index) => {
    const item = document.createElement('li');
    item.textContent = step;
    item.style.setProperty('--step', index);
    pipeline.appendChild(item);
  });
  container.appendChild(panel);
}

module.exports = { createInfoPanel };
