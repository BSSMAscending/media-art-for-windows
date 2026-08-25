function getCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return null;
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
  }

  const height = sourceWidth / targetAspect;
  return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

function upsampleCoverMaskToGrid(
  segmentation,
  crop,
  sourceWidth,
  sourceHeight,
  cols,
  rows,
  output
) {
  const grid = output && output.length === cols * rows ? output : new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    const sourceY = crop.y + ((y + 0.5) / rows) * crop.height;
    const maskY = Math.min(
      segmentation.height - 1,
      Math.floor((sourceY / sourceHeight) * segmentation.height)
    );
    for (let x = 0; x < cols; x++) {
      const sourceX = crop.x + ((x + 0.5) / cols) * crop.width;
      const maskX = Math.min(
        segmentation.width - 1,
        Math.floor((sourceX / sourceWidth) * segmentation.width)
      );
      grid[y * cols + x] = segmentation.data[maskY * segmentation.width + maskX];
    }
  }
  return grid;
}

function mapLandmarksToCover(handLandmarks, crop, sourceWidth, sourceHeight) {
  return handLandmarks.map((landmarks) =>
    landmarks.map((landmark) => ({
      ...landmark,
      x: (landmark.x * sourceWidth - crop.x) / crop.width,
      y: (landmark.y * sourceHeight - crop.y) / crop.height,
    }))
  );
}

module.exports = { getCoverCrop, upsampleCoverMaskToGrid, mapLandmarksToCover };
