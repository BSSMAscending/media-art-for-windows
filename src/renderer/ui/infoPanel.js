const { mathDescriptions } = require('../data/mathDescriptions');

function createInfoPanel() {
  const panel = document.createElement('div');
  panel.id = 'infoPanel';
  panel.className = 'info-panel';
  panel.style.display = 'none';
  document.body.appendChild(panel);

  let framesSinceUpdate = 0;

  function renderKernel(kernel) {
    return kernel.map((row) => row.map((v) => String(v).padStart(3)).join(' ')).join('\n');
  }

  function update(stats) {
    framesSinceUpdate++;
    if (framesSinceUpdate < 15) return;
    framesSinceUpdate = 0;

    const desc = mathDescriptions[stats.mode] || {};
    const activeFilter =
      stats.filters.blur > 0 ? 'gaussian'
      : stats.filters.sharpen > 0 ? 'sharpen'
      : stats.filters.edgeOverlay ? 'sobel'
      : null;
    const filterDesc = activeFilter ? mathDescriptions[activeFilter] : null;

    let kernelHtml = '';
    if (filterDesc && filterDesc.kernel) {
      kernelHtml = `<div class="info-kernel"><pre>${renderKernel(filterDesc.kernel)}</pre><div class="info-kernel-label">${filterDesc.title}</div></div>`;
    }

    panel.innerHTML = `
      <div class="info-mode">${desc.title || stats.mode}</div>
      <div class="info-desc">${desc.desc || ''}</div>
      <div class="info-stats">
        <span>그리드: ${stats.cols}×${stats.rows}</span>
        <span>FPS: ${stats.fps}</span>
        <span>픽셀크기: ${stats.fontSz}px</span>
        <span>색심도: ${desc.colorDepth || '-'}</span>
      </div>
      ${kernelHtml}
      <div class="info-hint">[I] 패널 닫기</div>
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

module.exports = { createInfoPanel };
