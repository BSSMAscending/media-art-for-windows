const { COLORS, FONT_SIZE } = require('../config');
const { runSegmentation } = require('./segmentation');
const { applyBrightness, applyGaussianBlur, applySharpen, applySobelEdge } = require('./filters');
const { cleanMask, removeSmallRegions } = require('./morphology');
const { reinforceGridHandMask } = require('./handRefinement');
const { createGestureDetector } = require('./gestureDetector');
const { renderOriginal } = require('../modes/original');
const { renderBlackWhite } = require('../modes/blackwhite');
const { renderBinary } = require('../modes/binary');
const { renderNumeric } = require('../modes/numeric');
const { renderBusan } = require('../modes/busan');
const { renderPixelValue } = require('../modes/pixelvalue');
const { renderColorRgb } = require('../modes/colorrgb');
const { renderGrayscale8bit } = require('../modes/grayscale8bit');
const { renderColor4k } = require('../modes/color4k');

const SEG_SKIP = 2;

function upsampleMaskToGrid(segmentation, cols, rows) {
  const grid = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    const maskY = Math.floor((y / rows) * segmentation.height);
    for (let x = 0; x < cols; x++) {
      const maskX = Math.floor((x / cols) * segmentation.width);
      grid[y * cols + x] = segmentation.data[maskY * segmentation.width + maskX];
    }
  }
  return grid;
}

function computePixelStats(pixels, segGrid, cols, rows) {
  let sum = 0, min = 255, max = 0, count = 0;
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      if (segGrid[y * cols + x] === 1) {
        const i = (y * cols + x) * 4;
        const lum = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
        sum += lum;
        if (lum < min) min = lum;
        if (lum > max) max = lum;
        count++;
      }
    }
  }
  if (count === 0) return null;
  return { avg: Math.round(sum / count), min, max };
}

function createFrameLoop({ videoEl, canvasEl, hiddenCanvasEl, model, getMode, getFontSize, getFilters, getBgMode, onStats, onGesture }) {
  let rafId = null;
  let lastSegmentation = null;
  let frameCount = 0;
  let lastFrameTime = performance.now();

  const gestureDetector = onGesture ? createGestureDetector(onGesture) : null;

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

    const displayWidth = Math.max(1, Math.floor(canvasEl.clientWidth || window.innerWidth));
    const displayHeight = Math.max(1, Math.floor(canvasEl.clientHeight || window.innerHeight));
    if (canvasEl.width !== displayWidth || canvasEl.height !== displayHeight) {
      canvasEl.width = displayWidth;
      canvasEl.height = displayHeight;
    }

    const fontSz = getFontSize ? getFontSize() : FONT_SIZE;

    const cols = Math.floor(canvasEl.width / fontSz);
    const rows = Math.floor(canvasEl.height / fontSz);

    if (hiddenCanvasEl.width !== cols || hiddenCanvasEl.height !== rows) {
      hiddenCanvasEl.width = cols;
      hiddenCanvasEl.height = rows;
    }

    try {
      if (frameCount % SEG_SKIP === 0 || !lastSegmentation) {
        lastSegmentation = await runSegmentation(model, videoEl);
      }
      const { data: segData, width: segW, height: segH, handLandmarks } = lastSegmentation;
      const segmentation = { data: segData, width: segW, height: segH };

      if (gestureDetector) gestureDetector.detect(handLandmarks);

      hiddenCtx.save();
      hiddenCtx.scale(-1, 1);
      hiddenCtx.drawImage(videoEl, -hiddenCanvasEl.width, 0, hiddenCanvasEl.width, hiddenCanvasEl.height);
      hiddenCtx.restore();

      const imgData = hiddenCtx.getImageData(0, 0, hiddenCanvasEl.width, hiddenCanvasEl.height);

      const filters = getFilters ? getFilters() : { brightness: 0, blur: 0, sharpen: 0, edgeOverlay: false, maskClean: false };
      const filtersActive = filters.brightness !== 0 || filters.blur > 0 || filters.sharpen > 0;
      const pixels = filtersActive ? new Uint8ClampedArray(imgData.data) : imgData.data;

      if (filtersActive) {
        if (filters.brightness !== 0) applyBrightness(pixels, cols, rows, filters.brightness);
        if (filters.blur > 0) applyGaussianBlur(pixels, cols, rows, filters.blur);
        if (filters.sharpen > 0) applySharpen(pixels, cols, rows, filters.sharpen);
      }

      let edgeData = null;
      if (filters.edgeOverlay) {
        edgeData = applySobelEdge(pixels, cols, rows);
      }

      let gridData = upsampleMaskToGrid(segmentation, cols, rows);

      gridData = removeSmallRegions(gridData, cols, rows, 0.008);

      if (filters.maskClean) {
        gridData = cleanMask(gridData, cols, rows);
      }

      if (handLandmarks && handLandmarks.length > 0) {
        reinforceGridHandMask(gridData, cols, rows, handLandmarks);
      }

      const activeSeg = { data: gridData, width: cols, height: rows };

      const bgMode = getBgMode ? getBgMode() : 'off';
      if (bgMode === 'blue') {
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      } else if (bgMode === 'off' || bgMode === 'matrix') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      }

      const hasPerson = activeSeg.data.some((v) => v === 1);
      if (!hasPerson) {
        frameCount++;
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      const mode = getMode();

      if (mode === 'blackwhite') {
        renderBlackWhite(ctx, canvasEl, activeSeg);
      } else {
        ctx.font = `bold ${fontSz}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (mode === 'binary' || mode === 'numeric' || mode === 'busan' || mode === 'pixelvalue' || mode === 'grayscale8bit' || mode === 'color4k') {
          ctx.fillStyle = COLORS.binaryBg;
          ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        }

        if (mode === 'original') {
          renderOriginal(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        } else if (mode === 'binary') {
          renderBinary(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        } else if (mode === 'numeric') {
          renderNumeric(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        } else if (mode === 'busan') {
          renderBusan(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        } else if (mode === 'pixelvalue') {
          renderPixelValue(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        } else if (mode === 'colorrgb') {
          renderColorRgb(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width, edgeData);
        } else if (mode === 'grayscale8bit') {
          renderGrayscale8bit(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        } else if (mode === 'color4k') {
          renderColor4k(ctx, cols, rows, fontSz, activeSeg, pixels, hiddenCanvasEl.width);
        }
      }

      if (onStats) {
        const now = performance.now();
        const fps = Math.round(1000 / (now - lastFrameTime));
        lastFrameTime = now;
        if (frameCount % 15 === 0) {
          const pixelStats = computePixelStats(pixels, activeSeg.data, cols, rows);
          onStats({ mode, fontSz, cols, rows, fps, filters, pixelStats });
        }
      }
    } catch (err) {
      console.error('Error in drawFrame:', err);
    }

    frameCount++;
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
