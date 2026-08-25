function createInfoPanel() {
  const panel = document.createElement('aside');
  panel.id = 'infoPanel';
  panel.className = 'info-panel';
  panel.setAttribute('aria-label', '미디어 아트 프로젝트 설명');
  panel.innerHTML = `
    <div class="panel-eyebrow">PROJECT NOTE</div>
    <div class="info-mode">미디어 아트란?</div>
    <p class="info-desc">카메라로 포착한 움직임을 작은 픽셀 데이터로 바꾸고, 숫자와 색의 규칙으로 다시 그려내는 작업입니다.</p>
    <p class="info-note">움직임이 화면의 언어가 되는 순간을 천천히&nbsp;관찰해보세요.</p>
  `;
  document.body.appendChild(panel);
}

module.exports = { createInfoPanel };
