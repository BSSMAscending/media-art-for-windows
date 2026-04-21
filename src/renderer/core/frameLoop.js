const { FONT_SIZE, COLORS } = require('../config');
const { runSegmentation } = require('./segmentation');
const { renderOriginal } = require('../modes/original');
const { renderBlackWhite } = require('../modes/blackwhite');
const { renderBinary } = require('../modes/binary');
const { renderNumeric } = require('../modes/numeric');
const { renderBusan } = require('../modes/busan');

function createFrameLoop({ videoEl, canvasEl, hiddenCanvasEl, model, getMode }) {
  let rafId = null;

  async function drawFrame() {
    if (!videoEl || !canvasEl || !hiddenCanvasEl) {
      rafId = requestAnimationFrame(drawFrame);
      return;
    }

    if (videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
      rafId = requestAnimationFrame(drawFrame);
      return;
    }

    const ctx = canvasEl.getContext('2d', { alpha: false });
    const hiddenCtx = hiddenCanvasEl.getContext('2d', { willReadFrequently: true });

    if (!ctx || !hiddenCtx) {
      rafId = requestAnimationFrame(drawFrame);
      return;
    }

    if (canvasEl.width !== window.innerWidth || canvasEl.height !== window.innerHeight) {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    }

    const cols = Math.floor(canvasEl.width / FONT_SIZE);
    const rows = Math.floor(canvasEl.height / FONT_SIZE);

    if (hiddenCanvasEl.width !== cols || hiddenCanvasEl.height !== rows) {
      hiddenCanvasEl.width = cols;
      hiddenCanvasEl.height = rows;
    }

    try {
      const segmentation = await runSegmentation(model, videoEl);

      hiddenCtx.save();
      hiddenCtx.scale(-1, 1);
      hiddenCtx.drawImage(
        videoEl,
        -hiddenCanvasEl.width,
        0,
        hiddenCanvasEl.width,
        hiddenCanvasEl.height
      );
      hiddenCtx.restore();

      const imgData = hiddenCtx.getImageData(0, 0, hiddenCanvasEl.width, hiddenCanvasEl.height);
      const pixels = imgData.data;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
      ctx.restore();

      const hasPerson = segmentation.data.some((v) => v === 1);
      if (!hasPerson) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      const mode = getMode();

      if (mode === 'blackwhite') {
        renderBlackWhite(ctx, canvasEl, segmentation);
      } else {
        ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (mode === 'binary' || mode === 'numeric' || mode === 'busan') {
          ctx.fillStyle = COLORS.binaryBg;
          ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        }

        if (mode === 'original') {
          renderOriginal(ctx, cols, rows, FONT_SIZE, segmentation, pixels, hiddenCanvasEl.width);
        } else if (mode === 'binary') {
          renderBinary(ctx, cols, rows, FONT_SIZE, segmentation, pixels, hiddenCanvasEl.width);
        } else if (mode === 'numeric') {
          renderNumeric(ctx, cols, rows, FONT_SIZE, segmentation, pixels, hiddenCanvasEl.width);
        } else if (mode === 'busan') {
          renderBusan(ctx, cols, rows, FONT_SIZE, segmentation, pixels, hiddenCanvasEl.width);
        }
      }
    } catch (err) {
      console.error('Error in drawFrame:', err);
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  return {
    start() {
      rafId = requestAnimationFrame(drawFrame);
    },
    stop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

module.exports = { createFrameLoop };
