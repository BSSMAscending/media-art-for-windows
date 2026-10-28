const {
  getArtworkArea,
  getFullFrameGrid,
  getGridSpot,
  getSpotCell,
} = require('../src/renderer/core/renderGeometry');

describe('getArtworkArea', () => {
  it('uses the space left of a right-hand side column with its outer margin', () => {
    const column = { left: 1240, right: 1872, top: 48, bottom: 1032 };
    expect(getArtworkArea(1920, 1080, column)).toEqual({ x: 48, y: 48, width: 1144, height: 984 });
  });

  it('uses the space above a column that spans the bottom of a narrow screen', () => {
    const column = { left: 16, right: 704, top: 600, bottom: 1264 };
    expect(getArtworkArea(720, 1280, column)).toEqual({ x: 16, y: 16, width: 688, height: 568 });
  });
});

describe('getFullFrameGrid', () => {
  const area = { x: 48, y: 48, width: 1144, height: 984 };

  it('fits the whole 16:9 frame into whole cells and centers it in the area', () => {
    const grid = getFullFrameGrid(area, 1280, 720, 16);
    expect(grid).toMatchObject({ cols: 71, rows: 40, cellSize: 16 });
    expect(grid.x).toBe(Math.round(48 + (1144 - 71 * 16) / 2));
    expect(grid.y).toBe(Math.round(48 + (984 - 40 * 16) / 2));
    expect(grid.cols * 16).toBeLessThanOrEqual(area.width);
    expect(grid.rows * 16).toBeLessThanOrEqual(area.height);
  });

  it('reuses the output object between frames', () => {
    const out = {};
    expect(getFullFrameGrid(area, 640, 480, 16, out)).toBe(out);
  });

  it('returns null before the camera reports a frame size', () => {
    expect(getFullFrameGrid(area, 0, 0, 16)).toBeNull();
  });
});

describe('picked cell', () => {
  const grid = { x: 40, y: 20, cols: 10, rows: 5, cellSize: 24 };

  it('keeps a pressed point as a spot on the picture and finds its cell', () => {
    const spot = getGridSpot(grid, { x: 40 + 24 * 3 + 5, y: 20 + 24 * 4 + 23 });
    expect(getSpotCell(grid, spot)).toEqual({ x: 3, y: 4 });
  });

  it('stays on the picture at its edges', () => {
    expect(getGridSpot(grid, { x: 0, y: 999 })).toEqual({ u: 0, v: 1 });
    expect(getSpotCell(grid, { u: 1, v: 1 })).toEqual({ x: 9, y: 4 });
  });

  it('lands on the same part of the picture after the cell size changes', () => {
    const spot = getGridSpot(grid, { x: 40 + 120, y: 20 + 60 });
    expect(getSpotCell({ ...grid, cols: 20, rows: 10, cellSize: 12 }, spot)).toEqual({
      x: 10,
      y: 5,
    });
  });
});
