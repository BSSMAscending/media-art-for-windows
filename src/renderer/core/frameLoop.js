const { FONT_SIZE, RENDERING_CONFIG } = require('../config');
const { runSegmentation } = require('./segmentation');
const { getCoverCrop, upsampleCoverMaskToGrid, mapLandmarksToCover } = require('./coverCrop');
const { removeSmallRegions } = require('./morphology');
const { reinforceGridHandMask } = require('./handRefinement');
const { FrameBuffers } = require('./frameBuffers');
const { createChannelOverlay } = require('./channelOverlay');
const { getFullFrameGrid } = require('./renderGeometry');
const { renderOriginal } = require('../modes/original');
const { renderBusan } = require('../modes/busan');
const { renderPixelValue } = require('../modes/pixelvalue');
const { renderColorRgb } = require('../modes/colorrgb');
const { renderGrayscale8bit } = require('../modes/grayscale8bit');
const { renderColor4k } = require('../modes/color4k');
const { renderRgb } = require('../modes/rgb');
const { renderLevels } = require('../modes/levels');
const { renderMath } = require('../modes/math');
const { toGrey, applyImageMath } = require('./imageMath');
const { createChannelTransition } = require('../modes/rgbTransition');

// Modes that show the whole camera frame instead of the segmented person.
const FULL_FRAME_MODES = new Set(['rgb', 'levels', 'math']);

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
  getRgbChannel,
  getLevels,
  getThreshold,
  getMathSettings,
  getArtworkArea,
  getCellSize,
  onStats,
  onDrawn,
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
  const updateChannelTransition = createChannelTransition();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const artworkGrid = {};
  let channelOverlay = null;
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

    const mode = getMode();
    const fullFrame = FULL_FRAME_MODES.has(mode);
    if (fullFrame) {
      // Full-frame modes pause segmentation; drop the old mask so returning to the
      // silhouette never flashes where the person stood minutes ago.
      lastSegmentation = null;
    } else if (!segmentationInFlight && now - lastSegmentationTime >= segmentationInterval) {
      updateSegmentation();
    }

    const layers =
      mode === 'rgb' ? updateChannelTransition(getRgbChannel(), now, reducedMotion.matches) : null;
    // Channel transitions render on every display frame so the motion stays smooth.
    if (!layers?.active && now - lastRenderTime < renderInterval) {
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

    const fontSz = getCellSize ? getCellSize() : FONT_SIZE;
    // Every mode draws into the same fixed screen beside the side column.
    const area = getArtworkArea
      ? getArtworkArea()
      : { x: 0, y: 0, width: canvasEl.width, height: canvasEl.height };
    const grid = getFullFrameGrid(
      area,
      videoEl.videoWidth,
      videoEl.videoHeight,
      fontSz,
      artworkGrid
    );
    if (!grid) {
      scheduleNextFrame();
      return;
    }

    try {
      if (!fullFrame) channelOverlay?.hide();
      const stats = fullFrame ? drawFullFrame(mode, grid, layers) : drawSilhouetteFrame(mode, grid);
      // Read the canvases now, before the browser presents and clears the WebGL frame.
      onDrawn?.();
      if (stats) {
        const fps = Math.round(1000 / (now - lastFrameTime));
        lastFrameTime = now;
        if (onStats && frameCount % 15 === 0) {
          onStats({ mode, fontSz, fps, ...stats });
        }
      }
    } catch (err) {
      console.error('Error in drawFrame:', err);
    }

    frameCount++;
    scheduleNextFrame();
  }

  function samplePixels(crop, cols, rows) {
    hiddenCtx.save();
    hiddenCtx.scale(-1, 1);
    hiddenCtx.drawImage(videoEl, crop.x, crop.y, crop.width, crop.height, -cols, 0, cols, rows);
    hiddenCtx.restore();
    return hiddenCtx.getImageData(0, 0, cols, rows).data;
  }

  function resizeSampling(cols, rows) {
    if (hiddenCanvasEl.width !== cols || hiddenCanvasEl.height !== rows) {
      hiddenCanvasEl.width = cols;
      hiddenCanvasEl.height = rows;
    }
    buffers.ensure(cols, rows);
  }

  function getChannelOverlay() {
    channelOverlay ||= createChannelOverlay(canvasEl.parentElement, canvasEl);
    channelOverlay.mount();
    return channelOverlay;
  }

  // Every cell is one sampled camera pixel labelled with its number, so the picture
  // and the numbers always describe the same thing.
  function drawFullFrame(mode, grid, layers) {
    const overlay = getChannelOverlay();
    const crop = getCoverCrop(videoEl.videoWidth, videoEl.videoHeight, grid.cols, grid.rows);
    resizeSampling(grid.cols, grid.rows);
    const pixels = samplePixels(crop, grid.cols, grid.rows);
    if (mode === 'rgb') {
      renderRgb(ctx, overlay, grid, pixels, getRgbChannel ? getRgbChannel() : 'N', layers);
    } else if (mode === 'levels') {
      renderLevels(ctx, grid, pixels, getLevels(), buffers.levelPixels, getThreshold?.());
      overlay.renderFlat(grid, buffers.levelPixels);
    } else if (mode === 'math') {
      const { effect, amount } = getMathSettings();
      toGrey(pixels, buffers.mathInput);
      applyImageMath(
        effect,
        amount,
        buffers.mathInput,
        buffers.mathOutput,
        grid.cols,
        grid.rows,
        buffers.mathScratch
      );
      renderMath(ctx, grid, buffers.mathOutput, buffers.levelPixels);
      overlay.renderFlat(grid, buffers.levelPixels);
    }

    return { cols: grid.cols, rows: grid.rows, pixelStats: null };
  }

  // Faint backdrop so the silhouette modes read as the same fixed screen as the
  // camera modes even when only a few cells are lit.
  function drawArtworkBackdrop(grid) {
    const width = grid.cols * grid.cellSize;
    const height = grid.rows * grid.cellSize;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.fillRect(grid.x, grid.y, width, height);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(grid.x - 0.5, grid.y - 0.5, width + 1, height + 1);
  }

  function drawSilhouetteFrame(mode, grid) {
    const { cols, rows, cellSize: fontSz } = grid;
    resizeSampling(cols, rows);
    drawArtworkBackdrop(grid);

    if (!lastSegmentation || !lastSegmentation.width || !lastSegmentation.height) {
      return null;
    }

    const sourceWidth = videoEl.videoWidth;
    const sourceHeight = videoEl.videoHeight;
    const crop = getCoverCrop(sourceWidth, sourceHeight, cols, rows);
    if (!crop) return null;

    const pixels = samplePixels(crop, cols, rows);
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

    if (lastSegmentation.handLandmarks?.length > 0) {
      reinforceGridHandMask(
        gridData,
        cols,
        rows,
        mapLandmarksToCover(lastSegmentation.handLandmarks, crop, sourceWidth, sourceHeight)
      );
    }

    if (!hasActivePixels(gridData)) return null;

    const activeSeg = { data: gridData, width: cols, height: rows };
    ctx.save();
    ctx.translate(grid.x, grid.y);
    ctx.font = `bold ${fontSz}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (mode === 'original') renderOriginal(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
    else if (mode === 'busan') renderBusan(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
    else if (mode === 'pixelvalue')
      renderPixelValue(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
    else if (mode === 'colorrgb') renderColorRgb(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
    else if (mode === 'grayscale8bit')
      renderGrayscale8bit(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
    else if (mode === 'color4k') renderColor4k(ctx, cols, rows, fontSz, activeSeg, pixels, cols);
    ctx.restore();

    return { cols, rows, pixelStats: computePixelStats(pixels, gridData, cols, rows) };
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
      channelOverlay?.remove();
    },
  };
}

module.exports = { createFrameLoop };
