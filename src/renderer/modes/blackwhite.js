function renderBlackWhite(ctx, canvasEl, segmentation) {
  const maskData = new ImageData(segmentation.width, segmentation.height);
  for (let i = 0; i < segmentation.data.length; i++) {
    const base = i * 4;
    if (segmentation.data[i] === 1) {
      maskData.data[base] = 255;
      maskData.data[base + 1] = 255;
      maskData.data[base + 2] = 255;
      maskData.data[base + 3] = 255;
    } else {
      maskData.data[base + 3] = 0;
    }
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = segmentation.width;
  tempCanvas.height = segmentation.height;
  tempCanvas.getContext('2d').putImageData(maskData, 0, 0);

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(tempCanvas, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
  ctx.restore();
}

module.exports = { renderBlackWhite };
