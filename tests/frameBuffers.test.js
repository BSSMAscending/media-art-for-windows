const { FrameBuffers } = require('../src/renderer/core/frameBuffers');
const { removeSmallRegions } = require('../src/renderer/core/morphology');

describe('rendering buffer pool', () => {
  it('reuses typed arrays until the grid dimensions change', () => {
    const buffers = new FrameBuffers();
    buffers.ensure(3, 2);
    const firstPixels = buffers.levelPixels;
    const firstMask = buffers.gridRaw;

    buffers.levelPixels.fill(7);
    buffers.ensure(3, 2);

    expect(buffers.levelPixels).toBe(firstPixels);
    expect(buffers.levelPixels).toHaveLength(24);
    expect(buffers.gridRaw).toBe(firstMask);
    expect(buffers.levelPixels[0]).toBe(7);

    buffers.ensure(4, 2);
    expect(buffers.levelPixels).not.toBe(firstPixels);
    expect(buffers.gridRaw).not.toBe(firstMask);
  });

  it('uses caller-owned work buffers for mask cleanup', () => {
    const input = new Uint8Array(25);
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) input[y * 5 + x] = 1;
    }
    input[0] = 1;
    const output = new Uint8Array(25);
    const visited = new Uint8Array(25);
    const queue = new Int32Array(25);

    const result = removeSmallRegions(input, 5, 5, 0.01, output, visited, queue);

    expect(result).toBe(output);
    expect(result[0]).toBe(0);
    expect(result[2 * 5 + 2]).toBe(1);
  });
});
