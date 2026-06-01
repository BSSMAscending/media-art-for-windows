const { mathDescriptions } = require('../data/mathDescriptions');

function createEducationalOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'eduOverlay';
  overlay.className = 'edu-overlay';
  overlay.style.display = 'none';

  const mainText =
    '우리가 움직이는 모든 모습은 수학이라는 돋보기를 통해 바둑판 모양의 행렬 위에 놓인 숫자 데이터로 바뀌어 컴퓨터 속으로 들어갑니다.<br>' +
    '카메라가 포착한 장면을 아주 작은 칸들로 나눈 뒤, 각 칸의 밝기 변화를 계산하여 내 몸의 테두리를 찾아내는 것이 바로 수학의 힘입니다.<br>' +
    '이렇게 찾아낸 형상을 <b>\'내 몸이 있는 곳은 1, 없는 곳은 0\'</b>이라는 이진법 규칙으로 약속하면,<br>' +
    '복잡한 세상의 움직임도 컴퓨터가 이해할 수 있는 정교한 정보로 변신하게 됩니다.<br>' +
    '결국 우리가 보는 마법 같은 반응형 프로그램은 수만 개의 숫자가 수학적 규칙에 따라 일사불란하게 움직인 결과입니다.';

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
