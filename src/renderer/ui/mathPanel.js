const { mathDescriptions } = require('../data/mathDescriptions');

const COLOR_STAGES = [
  { label: '원본 컬러', bits: '24bit', colors: '16,777,216색', key: 'colorrgb' },
  { label: '4천 컬러', bits: '12bit', colors: '4,096색', key: 'color4k' },
  { label: '8bit 흑백', bits: '8bit', colors: '256단계', key: 'grayscale8bit' },
  { label: '픽셀 수치', bits: '8bit', colors: '0~255', key: 'pixelvalue' },
  { label: '0~9 계조', bits: '4bit', colors: '10단계', key: 'numeric' },
  { label: '이진 (0/1)', bits: '1bit', colors: '2색', key: 'binary' },
];

function createMathPanel() {
  const panel = document.createElement('div');
  panel.id = 'mathPanel';
  panel.className = 'math-panel';
  panel.style.display = 'none';
  document.body.appendChild(panel);

  let framesSinceUpdate = 0;

  function renderKernel(kernel) {
    return kernel.map((row) => row.map((v) => String(v).padStart(3)).join(' ')).join('\n');
  }

  function update(stats) {
    framesSinceUpdate++;
    if (framesSinceUpdate < 10) return;
    framesSinceUpdate = 0;

    const desc = mathDescriptions[stats.mode] || {};
    const activeFilter =
      stats.filters.blur > 0 ? 'gaussian'
      : stats.filters.sharpen > 0 ? 'sharpen'
      : stats.filters.edgeOverlay ? 'sobel'
      : null;
    const filterDesc = activeFilter ? mathDescriptions[activeFilter] : null;

    const stagesHtml = COLOR_STAGES.map((s) => {
      const isCurrent = s.key === stats.mode;
      return `<tr class="${isCurrent ? 'math-stage-active' : ''}">
        <td>${s.label}</td><td>${s.bits}</td><td>${s.colors}</td>
      </tr>`;
    }).join('');

    let kernelHtml = '';
    if (filterDesc && filterDesc.kernel) {
      kernelHtml = `
        <div class="math-section">
          <div class="math-section-title">필터 커널 행렬</div>
          <pre class="math-kernel">${renderKernel(filterDesc.kernel)}</pre>
          <div class="math-kernel-label">${filterDesc.title}: ${filterDesc.desc}</div>
        </div>`;
    }

    let pixelHtml = '';
    if (stats.pixelStats) {
      const { avg, min, max } = stats.pixelStats;
      const pct = ((avg / 255) * 100).toFixed(0);
      pixelHtml = `
        <div class="math-section">
          <div class="math-section-title">실시간 픽셀 밝기값</div>
          <div class="math-pixel-stats">
            <span>평균 <b>${avg}</b></span>
            <span>최소 <b>${min}</b></span>
            <span>최대 <b>${max}</b></span>
          </div>
          <div class="math-pixel-bar-wrap">
            <div class="math-pixel-bar">
              <div class="math-pixel-fill" style="width:${pct}%"></div>
            </div>
            <span class="math-pixel-pct">${pct}%</span>
          </div>
          <div class="math-pixel-label">L = 0.299R + 0.587G + 0.114B</div>
        </div>`;
    }

    panel.innerHTML = `
      <div class="math-panel-title">수학 정보</div>
      <div class="math-section">
        <div class="math-section-title">현재 모드</div>
        <div class="math-mode-name">${desc.title || stats.mode}</div>
        <div class="math-formula">${desc.formula || ''}</div>
        <div class="math-desc">${desc.desc || ''}</div>
      </div>
      ${pixelHtml}
      <div class="math-section">
        <div class="math-section-title">색상 단계 (색&amp;숫자의 관계)</div>
        <table class="math-stage-table">
          <tr><th>표현 방식</th><th>비트</th><th>색수</th></tr>
          ${stagesHtml}
        </table>
      </div>
      ${kernelHtml}
      <div class="math-hint">[M] 닫기</div>
    `;
  }

  return {
    show() { panel.style.display = 'block'; },
    hide() { panel.style.display = 'none'; },
    toggle() {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },
    update,
  };
}

module.exports = { createMathPanel };
