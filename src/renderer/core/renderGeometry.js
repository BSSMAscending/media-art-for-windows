/**
 * Returns the part of the stage that full-frame modes may draw into: everything
 * the side column leaves free, keeping the column's own outer margin.
 */
function getArtworkArea(stageWidth, stageHeight, columnRect) {
  const inset = Math.max(0, stageWidth - columnRect.right);
  if (columnRect.left > stageWidth / 2) {
    return {
      x: inset,
      y: inset,
      width: Math.max(1, columnRect.left - inset * 2),
      height: Math.max(1, stageHeight - inset * 2),
    };
  }
  return {
    x: inset,
    y: inset,
    width: Math.max(1, stageWidth - inset * 2),
    height: Math.max(1, columnRect.top - inset * 2),
  };
}

/**
 * Fits the whole camera frame inside the artwork area, snapped to whole cells and
 * centered, so every cell holds real camera pixels instead of letterbox bars.
 */
function getFullFrameGrid(area, sourceWidth, sourceHeight, cellSize, grid = {}) {
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  const scale = Math.min(area.width / sourceWidth, area.height / sourceHeight);
  grid.cellSize = cellSize;
  grid.cols = Math.max(1, Math.floor((sourceWidth * scale) / cellSize));
  grid.rows = Math.max(1, Math.floor((sourceHeight * scale) / cellSize));
  grid.x = Math.round(area.x + (area.width - grid.cols * cellSize) / 2);
  grid.y = Math.round(area.y + (area.height - grid.rows * cellSize) / 2);
  return grid;
}

/**
 * Computes the shared perspective camera for the RGB layers: `near` keeps every
 * corner at w >= 1 (no zoom) and `fit` shrinks the scene so no layer is clipped.
 */
function getProjectionBounds(layers, bounds) {
  let near = 0;
  let fit = 1;
  for (let c = 0; c < 3; c++) {
    const sine = Math.abs(Math.sin(layers.angle[c]));
    const cosine = Math.abs(Math.cos(layers.angle[c]));
    const scale = layers.scale[c];
    const depth = Math.abs(layers.depth[c]);
    const offset = Math.abs(layers.offset[c]);
    near = Math.max(near, sine * scale + cosine * depth);
    fit = Math.max(fit, cosine * scale + sine * depth + offset, scale + offset * 0.3);
  }
  bounds[0] = near;
  bounds[1] = fit;
}

/**
 * Where a screen point falls on the drawn grid, as fractions 0-1 of its width and
 * height. A spot kept this way stays on the same part of the picture when the cell
 * size (and so the grid) changes.
 */
function getGridSpot(grid, point) {
  const fraction = (value, start, size) => Math.max(0, Math.min(1, (value - start) / size));
  return {
    u: fraction(point.x, grid.x, grid.cols * grid.cellSize),
    v: fraction(point.y, grid.y, grid.rows * grid.cellSize),
  };
}

/** The cell (column x, row y) under a spot from getGridSpot. */
function getSpotCell(grid, spot) {
  return {
    x: Math.min(grid.cols - 1, Math.floor(spot.u * grid.cols)),
    y: Math.min(grid.rows - 1, Math.floor(spot.v * grid.rows)),
  };
}

module.exports = {
  getArtworkArea,
  getFullFrameGrid,
  getProjectionBounds,
  getGridSpot,
  getSpotCell,
};
