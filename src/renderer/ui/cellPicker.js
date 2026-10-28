const { readCell } = require('../core/cellReadout');
const { getGridSpot, getSpotCell } = require('../core/renderGeometry');

// Views drawn as numbered camera cells, where one cell can be marked.
const MARKED_MODES = new Set(['rgb', 'levels', 'math']);
// Camera noise nudges the numbers every frame; the card follows at this pace, and
// at once when the view, the lever or the cell changes.
const READOUT_INTERVAL = 250;

/**
 * The cell the cards calculate with: the middle of the picture until a visitor
 * presses it, then the last pressed spot. It is outlined on the picture, and its
 * reading (cellReadout.js) goes to `onReading`. `getViewKey` names the current
 * option and lever value, so a change shows up without waiting.
 */
function createCellPicker({ marker, getViewKey, onReading }) {
  let spot = { u: 0.5, v: 0.5 };
  let grid = null;
  let lastKey = '';
  let lastAt = -Infinity;

  function placeMarker(frame, cell) {
    const visible = MARKED_MODES.has(frame.mode) && !frame.moving;
    marker.hidden = !visible;
    if (!visible) return;
    const { x, y, cellSize } = frame.grid;
    marker.style.width = `${cellSize}px`;
    marker.style.height = `${cellSize}px`;
    marker.style.transform = `translate(${x + cell.x * cellSize}px, ${y + cell.y * cellSize}px)`;
  }

  /** Call after every drawn frame with the frame loop's `frame`. */
  function update(frame) {
    grid = frame.grid;
    if (!grid.cols) return;
    const cell = getSpotCell(grid, spot);
    placeMarker(frame, cell);
    const key = `${frame.mode}:${getViewKey()}:${cell.x}:${cell.y}`;
    const now = performance.now();
    if (key === lastKey && now - lastAt < READOUT_INTERVAL) return;
    lastKey = key;
    lastAt = now;
    onReading(readCell(frame, cell.x, cell.y), frame);
  }

  /** Marks the cell under a screen point, such as where the picture is pressed. */
  function pick(point) {
    if (grid?.cols) spot = getGridSpot(grid, point);
  }

  return { update, pick };
}

module.exports = { createCellPicker };
