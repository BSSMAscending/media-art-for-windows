const { FrameBuffers } = require('../src/renderer/core/frameBuffers');
const { removeSmallRegions } = require('../src/renderer/core/morphology');
const { applySobelEdge } = require('../src/renderer/core/filters');

describe('rendering buffer pool', () => {
  it('reuses typed arrays until the grid dimensions change', () => {
    const buffers = new FrameBuffers();
    buffers.ensure(3, 2);
    const firstPixels = buffers.filteredPixels;
    const firstMask = buffers.gridRaw;

    buffers.copyPixels(new Uint8ClampedArray(24).fill(7));
    buffers.ensure(3, 2);

    expect(buffers.filteredPixels).toBe(firstPixels);
    expect(buffers.gridRaw).toBe(firstMask);
    expect(buffers.filteredPixels[0]).toBe(7);

    buffers.ensure(4, 2);
    expect(buffers.filteredPixels).not.toBe(firstPixels);
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

  it('writes edge results into the supplied buffer', () => {
    const pixels = new Uint8ClampedArray(3 * 3 * 4);
    pixels.fill(255);
    const output = new Float32Array(9);

    expect(applySobelEdge(pixels, 3, 3, output)).toBe(output);
  });
});
