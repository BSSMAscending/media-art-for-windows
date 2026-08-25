const { FONT_SIZE, RENDERING_CONFIG } = require('../config');
const { runSegmentation } = require('./segmentation');
const { getCoverCrop, upsampleCoverMaskToGrid, mapLandmarksToCover } = require('./coverCrop');
const { applyBrightness, applyGaussianBlur, applySharpen, applySobelEdge } = require('./filters');
const { cleanMask, removeSmallRegions } = require('./morphology');
const { reinforceGridHandMask } = require('./handRefinement');
const { FrameBuffers } = require('./frameBuffers');
const { renderOriginal } = require('../modes/original');
const { createBlackWhiteRenderer } = require('../modes/blackwhite');
const { renderBinary } = require('../modes/binary');
const { renderNumeric } = require('../modes/numeric');
const { renderBusan } = require('../modes/busan');
const { renderPixelValue } = require('../modes/pixelvalue');
const { renderColorRgb } = require('../modes/colorrgb');
const { renderGrayscale8bit } = require('../modes/grayscale8bit');
const { renderColor4k } = require('../modes/color4k');

function computePixelStats(pixels, segGrid, cols, rows) {
  let sum = 0,
    min = 255,
    max = 0,
    count = 0;
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

function hasActivePixels(data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 1) return true;
  }
  return false;
}

function createFrameLoop({
  videoEl,
  canvasEl,
  hiddenCanvasEl,
  model,
  getMode,
  getFontSize,
  getFilters,
  onStats,
}) {
  let rafId = null;
  let isRunning = false;
  let segmentationInFlight = false;
  let lastSegmentation = null;
  let lastSegmentationTime = Number.NEGATIVE_INFINITY;
  let lastRenderTime = Number.NEGATIVE_INFINITY;
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let ctx = null;
  let hiddenCtx = null;
  const buffers = new FrameBuffers();
  const renderBlackWhite = createBlackWhiteRenderer();
  const renderInterval = 1000 / RENDERING_CONFIG.targetFps;
  const segmentationInterval = 1000 / RENDERING_CONFIG.segmentationFps;

  function updateSegmentation() {
    if (segmentationInFlight) return;
    segmentationInFlight = true;
    runSegmentation(model, videoEl)
      .then((segmentation) => {
        if (!isRunning) return;
        lastSegmentation = segmentation;
        lastSegmentationTime = performance.now();
      })
      .catch(() => {
        // Avoid retrying on every animation callback after a transient failure.
        lastSegmentationTime = performance.now();
      })
      .finally(() => {
        segmentationInFlight = false;
      });
  }

  function scheduleNextFrame() {
    if (isRunning) rafId = requestAnimationFrame(drawFrame);
  }

  function drawFrame(now) {
    if (!isRunning) return;

    if (
      !videoEl ||
      !canvasEl ||
      !hiddenCanvasEl ||
      videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA
    ) {
      scheduleNextFrame();
      return;
    }

    ctx ||= canvasEl.getContext('2d', { alpha: true });
    hiddenCtx ||= hiddenCanvasEl.getContext('2d', { willReadFrequently: true });
    if (!ctx || !hiddenCtx) {
      scheduleNextFrame();
      return;
    }

    if (!segmentationInFlight && now - lastSegmentationTime >= segmentationInterval) {
      updateSegmentation();
    }

    if (now - lastRenderTime < renderInterval) {
      scheduleNextFrame();
      return;
    }
    lastRenderTime = now;

    const displayWidth = Math.max(1, Math.floor(canvasEl.clientWidth || window.innerWidth));
    const displayHeight = Math.max(1, Math.floor(canvasEl.clientHeight || window.innerHeight));
    if (canvasEl.width !== displayWidth || canvasEl.height !== displayHeight) {
      canvasEl.width = displayWidth;
      canvasEl.height = displayHeight;
    }
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const fontSz = getFontSize ? getFontSize() : FONT_SIZE;
    const cols = Math.floor(canvasEl.width / fontSz);
    const rows = Math.floor(canvasEl.height / fontSz);
    if (hiddenCanvasEl.width !== cols || hiddenCanvasEl.height !== rows) {
      hiddenCanvasEl.width = cols;
      hiddenCanvasEl.height = rows;
    }
    buffers.ensure(cols, rows);

    if (!lastSegmentation || !lastSegmentation.width || !lastSegmentation.height) {
      scheduleNextFrame();
      return;
    }

    const sourceWidth = videoEl.videoWidth;
    const sourceHeight = videoEl.videoHeight;
    const crop = getCoverCrop(sourceWidth, sourceHeight, cols, rows);
    if (!crop) {
      scheduleNextFrame();
      return;
    }

    try {
      hiddenCtx.save();
      hiddenCtx.scale(-1, 1);
      hiddenCtx.drawImage(videoEl, crop.x, crop.y, crop.width, crop.height, -cols, 0, cols, rows);
      hiddenCtx.restore();

      const imgData = hiddenCtx.getImageData(0, 0, cols, rows);
      const filters = getFilters
        ? getFilters()
        : { brightness: 0, blur: 0, sharpen: 0, edgeOverlay: false, maskClean: false };
      const filtersActive = filters.brightness !== 0 || filters.blur > 0 || filters.sharpen > 0;
      const pixels = filtersActive ? buffers.copyPixels(imgData.data) : imgData.data;

      if (filtersActive) {
        if (filters.brightness !== 0) applyBrightness(pixels, cols, rows, filters.brightness);
        if (filters.blur > 0)
          applyGaussianBlur(pixels, cols, rows, filters.blur, buffers.filterScratch);
        if (filters.sharpen > 0)
          applySharpen(pixels, cols, rows, filters.sharpen, buffers.filterScratch);
      }

      const edgeData = filters.edgeOverlay
        ? applySobelEdge(pixels, cols, rows, buffers.edgeData)
        : null;
      const segmentation = {
        data: lastSegmentation.data,
        width: lastSegmentation.width,
        height: lastSegmentation.height,
      };
      let gridData = upsampleCoverMaskToGrid(
        segmentation,
        crop,
        sourceWidth,
        sourceHeight,
        cols,
        rows,
        buffers.gridRaw
      );
      gridData = removeSmallRegions(
        gridData,
        cols,
        rows,
        0.008,
        buffers.gridFiltered,
        buffers.regionVisited,
        buffers.regionQueue
      );

      if (filters.maskClean) {
        gridData = cleanMask(
          gridData,
          cols,
          rows,
          buffers.morphologyOutput,
          buffers.morphologyScratch
        );
      }

      if (lastSegmentation.handLandmarks?.length > 0) {
        reinforceGridHandMask(
          gridData,
          cols,
          rows,
          mapLandmarksToCover(lastSegmentation.handLandmarks, crop, sourceWidth, sourceHeight)
        );
      }

      if (!hasActivePixels(gridData)) {
        frameCount++;
        scheduleNextFrame();
        return;
      }

      const activeSeg = { data: gridData, width: cols, height: rows };
      const mode = getMode();
      if (mode === 'blackwhite') {
        renderBlackWhite(ctx, canvasEl, activeSeg);
      } else {
        ctx.font = `bold ${fontSz}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (mode === 'original') renderOriginal(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
        else if (mode === 'binary') renderBinary(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
        else if (mode === 'numeric')
          renderNumeric(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
        else if (mode === 'busan') renderBusan(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
        else if (mode === 'pixelvalue')
          renderPixelValue(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
        else if (mode === 'colorrgb')
          renderColorRgb(ctx, cols, rows, fontSz, activeSeg, pixels, cols, edgeData);
        else if (mode === 'grayscale8bit')
          renderGrayscale8bit(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
        else if (mode === 'color4k')
          renderColor4k(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
      }

      const fps = Math.round(1000 / (now - lastFrameTime));
      lastFrameTime = now;
      if (onStats && frameCount % 15 === 0) {
        onStats({
          mode,
          fontSz,
          cols,
          rows,
          fps,
          filters,
          pixelStats: computePixelStats(pixels, gridData, cols, rows),
        });
      }
    } catch (err) {
      console.error('Error in drawFrame:', err);
    }

    frameCount++;
    scheduleNextFrame();
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      lastFrameTime = performance.now();
      scheduleNextFrame();
    },
    stop() {
      isRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}

module.exports = { createFrameLoop };
