const {
  getCoverCrop,
  getCellMaskIndex,
  mapLandmarksToCover,
  upsampleCoverMaskToGrid,
} = require('../src/renderer/core/coverCrop');
const { getMirroredMaskIndex } = require('../src/renderer/utils');

describe('cover crop', () => {
  it('crops the horizontal edges of a wide input for a taller target', () => {
    expect(getCoverCrop(1920, 1080, 1000, 1000)).toEqual({
      x: 420,
      y: 0,
      width: 1080,
      height: 1080,
    });
  });

  it('crops the vertical edges of a tall input for a wider target', () => {
    expect(getCoverCrop(1080, 1920, 1000, 1000)).toEqual({
      x: 0,
      y: 420,
      width: 1080,
      height: 1080,
    });
  });

  it('maps an off-center landmark into the same visible crop', () => {
    const crop = getCoverCrop(1920, 1080, 1000, 1000);
    const [[landmark]] = mapLandmarksToCover([[{ x: 0.25, y: 0.75, z: 0 }]], crop, 1920, 1080);

    expect(landmark).toMatchObject({ x: 1 / 18, y: 0.75 });
  });

  it('samples the segmentation mask from the visible crop', () => {
    const segmentation = { width: 4, height: 1, data: new Uint8Array([0, 1, 1, 0]) };
    const crop = getCoverCrop(4, 1, 1, 1);

    expect(Array.from(upsampleCoverMaskToGrid(segmentation, crop, 4, 1, 1, 1))).toEqual([1]);
  });

  it('keeps the cropped mask aligned with the mirrored camera pixels', () => {
    const segmentation = { width: 4, height: 1, data: new Uint8Array([1, 0, 0, 0]) };
    const crop = getCoverCrop(4, 1, 4, 1);
    const grid = upsampleCoverMaskToGrid(segmentation, crop, 4, 1, 4, 1);

    expect(grid[getMirroredMaskIndex(3, 0, 4, 1, { data: grid, width: 4, height: 1 })]).toBe(1);
  });
});

describe('cell to mask pixel', () => {
  it('picks the same mask pixel the upsampled grid used for every cell', () => {
    const data = Uint8Array.from({ length: 8 * 6 }, (_, i) => i % 7 === 0);
    const segmentation = { width: 8, height: 6, data };
    const crop = getCoverCrop(640, 480, 10, 5);
    const grid = upsampleCoverMaskToGrid(segmentation, crop, 640, 480, 10, 5);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 10; x++) {
        const index = getCellMaskIndex(segmentation, crop, 640, 480, 10, 5, x, y);
        expect(data[index]).toBe(grid[y * 10 + x]);
      }
    }
  });
});
