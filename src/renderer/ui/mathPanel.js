const { mathDescriptions } = require('../data/mathDescriptions');

function createMathPanel(container = document.body) {
  const panel = document.createElement('div');
  panel.id = 'mathPanel';
  panel.className = 'math-panel';
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-label', '현재 선택한 미디어 아트 모드');
  container.appendChild(panel);

  function updateMode(modeKey, stats) {
    const desc = mathDescriptions[modeKey] || {};
    const liveMetric = stats ? ` · ${stats.cols}×${stats.rows}` : '';
    panel.innerHTML = `
      <div class="panel-eyebrow">CURRENT MODE</div>
      <div class="math-panel-title">선택한 미디어 아트</div>
      <div class="math-section">
        <div class="math-mode-name">${desc.title || modeKey}</div>
        <p class="math-desc">${desc.shortDesc || desc.desc || ''}</p>
        <div class="math-metric">${desc.metric || desc.colorDepth || ''}${liveMetric}</div>
      </div>
    `;
  }

  function update(stats) {
    updateMode(stats.mode, stats);
  }

  return {
    updateMode,
    update,
  };
}

module.exports = { createMathPanel };
