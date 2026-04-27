const { mathDescriptions } = require('../data/mathDescriptions');

function createEducationalOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'eduOverlay';
  overlay.className = 'edu-overlay';
  overlay.style.display = 'none';

  const mainText =
    '우리가 움직이는 모든 모습은 수학이라는 돋보기를 통해<br>' +
    '바둑판 모양의 행렬 위에 놓인 숫자 데이터로 바뀌어<br>' +
    '컴퓨터 속으로 들어갑니다.';

  overlay.innerHTML = `
    <div class="edu-main">${mainText}</div>
    <div class="edu-mode-desc" id="eduModeDesc"></div>
    <div class="edu-hint">[E] 닫기</div>
  `;
  document.body.appendChild(overlay);

  return {
    show(modeKey) {
      const desc = mathDescriptions[modeKey];
      const el = document.getElementById('eduModeDesc');
      if (el && desc) {
        el.textContent = `현재 모드: ${desc.title} — ${desc.desc}`;
      }
      overlay.style.display = 'block';
    },
    hide() {
      overlay.style.display = 'none';
    },
    toggle(modeKey) {
      if (overlay.style.display === 'none') this.show(modeKey);
      else this.hide();
    },
  };
}

module.exports = { createEducationalOverlay };
