/**
 * Reusable buffers for the hot rendering path.
 *
 * Typed arrays are intentionally resized only when the grid dimensions change.
 * This keeps per-frame work out of the garbage collector during an installation's
 * long-running sessions.
 */
class FrameBuffers {
  constructor() {
    this.width = 0;
    this.height = 0;
  }

  ensure(width, height) {
    if (this.width === width && this.height === height) return;

    this.width = width;
    this.height = height;
    const pixelCount = width * height;
    const rgbaLength = pixelCount * 4;

    this.levelPixels = new Uint8ClampedArray(rgbaLength);
    this.mathInput = new Uint8ClampedArray(pixelCount);
    this.mathOutput = new Uint8ClampedArray(pixelCount);
    this.mathScratch = new Uint8ClampedArray(pixelCount);
    this.gridRaw = new Uint8Array(pixelCount);
    this.gridFiltered = new Uint8Array(pixelCount);
    this.regionVisited = new Uint8Array(pixelCount);
    this.regionQueue = new Int32Array(pixelCount);
  }
}

module.exports = { FrameBuffers };
