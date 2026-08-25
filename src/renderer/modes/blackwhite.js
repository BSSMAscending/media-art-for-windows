function createBlackWhiteRenderer() {
  let sourceCanvas = null;
  let sourceCtx = null;
  let maskImageData = null;
  let width = 0;
  let height = 0;

  function ensureBuffer(nextWidth, nextHeight) {
    if (width === nextWidth && height === nextHeight) return;

    width = nextWidth;
    height = nextHeight;
    sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceCtx = sourceCanvas.getContext('2d');
    maskImageData = sourceCtx.createImageData(width, height);
  }

  return function renderBlackWhite(ctx, canvasEl, segmentation) {
    ensureBuffer(segmentation.width, segmentation.height);

    const data = maskImageData.data;
    data.fill(0);
    for (let i = 0; i < segmentation.data.length; i++) {
      if (segmentation.data[i] !== 1) continue;
      const base = i * 4;
      data[base] = 255;
      data[base + 1] = 255;
      data[base + 2] = 255;
      data[base + 3] = 255;
    }
    sourceCtx.putImageData(maskImageData, 0, 0);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(sourceCanvas, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
    ctx.restore();
  };
}

// Keep the original function export for callers outside the frame loop.
const renderBlackWhite = createBlackWhiteRenderer();

module.exports = { createBlackWhiteRenderer, renderBlackWhite };
