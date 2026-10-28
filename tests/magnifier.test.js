const {
  getSourceRegion,
  getLensPlacement,
  getCaptionPlacement,
  mapLayer,
  ZOOM,
} = require('../src/renderer/ui/magnifier');

describe('magnifier geometry', () => {
  it('shows a fixed 3× view centred on the pressed point', () => {
    expect(ZOOM).toBe(3);
    expect(getSourceRegion({ x: 500, y: 400 }, 300)).toEqual({ left: 450, top: 350, size: 100 });
  });

  it('floats the lens above the finger, or below it near the top edge', () => {
    const viewport = { width: 1920, height: 1080 };
    expect(getLensPlacement({ x: 600, y: 700 }, 300, viewport)).toEqual({ left: 450, top: 372 });
    expect(getLensPlacement({ x: 600, y: 200 }, 300, viewport)).toEqual({ left: 450, top: 228 });
  });

  it('keeps the lens on screen at the edges', () => {
    const viewport = { width: 1000, height: 600 };
    expect(getLensPlacement({ x: 20, y: 500 }, 300, viewport)).toEqual({ left: 0, top: 172 });
    expect(getLensPlacement({ x: 990, y: 100 }, 300, viewport)).toEqual({ left: 700, top: 128 });
    expect(getLensPlacement({ x: 500, y: 300 }, 300, { width: 1000, height: 320 }).top).toBe(20);
  });

  it('maps the covered part of a layer to backing-store and lens pixels', () => {
    const region = { left: 100, top: 100, size: 50 };
    const rect = { left: 120, top: 80, width: 200, height: 100 };
    const mapped = mapLayer(region, rect, { width: 400, height: 200 }, 3, 2);
    // Overlap is x 120-150, y 100-150 on screen.
    expect(mapped.source).toEqual([0, 40, 60, 100]);
    expect(mapped.target).toEqual([120, 0, 180, 300]);
  });

  it('skips layers outside the region or not laid out', () => {
    const region = { left: 0, top: 0, size: 50 };
    expect(
      mapLayer(region, { left: 60, top: 0, width: 10, height: 10 }, { width: 10, height: 10 }, 3, 1)
    ).toBeNull();
    expect(
      mapLayer(region, { left: 0, top: 0, width: 0, height: 0 }, { width: 1, height: 1 }, 3, 1)
    ).toBeNull();
  });
});

describe('calculation caption', () => {
  const viewport = { width: 1920, height: 1080 };
  const caption = { width: 400, height: 40 };

  it('sits above a lens that floats above the finger, centred on it', () => {
    const lens = { left: 450, top: 372, size: 300 };
    expect(getCaptionPlacement(lens, caption, { x: 600, y: 700 }, viewport)).toEqual({
      left: 400,
      top: 322,
    });
  });

  it('sits below a lens that had to drop below the finger', () => {
    const lens = { left: 450, top: 228, size: 300 };
    expect(getCaptionPlacement(lens, caption, { x: 600, y: 200 }, viewport).top).toBe(538);
  });

  it('stays on screen at the edges', () => {
    const lens = { left: 0, top: 20, size: 300 };
    expect(getCaptionPlacement(lens, caption, { x: 20, y: 400 }, viewport)).toEqual({
      left: 0,
      top: 0,
    });
  });
});
