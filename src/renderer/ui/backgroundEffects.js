function createBackgroundEffects(bgCanvasEl) {
  let rafId = null;
  let streams = [];
  let currentMode = 'off';
  let lastTime = 0;

  function initStreams() {
    const cols = Math.floor(bgCanvasEl.width / 14);
    streams = Array.from({ length: cols }, () => ({
      y: Math.random() * bgCanvasEl.height,
      speed: 8 + Math.random() * 12,
    }));
  }

  function drawMatrix(timestamp) {
    if (timestamp - lastTime < 66) {
      rafId = requestAnimationFrame(drawMatrix);
      return;
    }
    lastTime = timestamp;

    const ctx = bgCanvasEl.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 30, 0.15)';
    ctx.fillRect(0, 0, bgCanvasEl.width, bgCanvasEl.height);

    ctx.fillStyle = '#00ff41';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';

    streams.forEach((stream, i) => {
      const char = Math.random() > 0.5 ? '1' : '0';
      ctx.fillText(char, i * 14 + 7, stream.y);
      stream.y += stream.speed;
      if (stream.y > bgCanvasEl.height) {
        stream.y = -20;
        stream.speed = 8 + Math.random() * 12;
      }
    });

    rafId = requestAnimationFrame(drawMatrix);
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function setMode(mode) {
    stop();
    currentMode = mode;
    const ctx = bgCanvasEl.getContext('2d');

    if (mode === 'matrix') {
      if (streams.length === 0) initStreams();
      ctx.fillStyle = '#000014';
      ctx.fillRect(0, 0, bgCanvasEl.width, bgCanvasEl.height);
      rafId = requestAnimationFrame(drawMatrix);
    } else if (mode === 'blue') {
      ctx.fillStyle = '#000033';
      ctx.fillRect(0, 0, bgCanvasEl.width, bgCanvasEl.height);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, bgCanvasEl.width, bgCanvasEl.height);
    }
  }

  return {
    setMode,
    stop,
    getCurrentMode: () => currentMode,
  };
}

module.exports = { createBackgroundEffects };
