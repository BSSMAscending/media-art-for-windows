function createInfoPanel(container = document.body) {
  const panel = document.createElement('aside');
  panel.id = 'infoPanel';
  panel.className = 'info-panel';
  panel.setAttribute('aria-label', '미디어 아트 프로젝트 설명');
  panel.innerHTML = `
    <div class="panel-eyebrow">PROJECT NOTE</div>
    <div class="info-mode">컴퓨터가 보는 내 모습</div>
    <p class="info-desc">컴퓨터는 우리 얼굴을 구별할 때 '숫자'로 바꿔서 기억해요.</p>
    <p class="info-note">0부터 9까지의 숫자가 어떻게 내 얼굴을 만드는지 살펴보세요!</p>
  `;
  container.appendChild(panel);
}

module.exports = { createInfoPanel };
