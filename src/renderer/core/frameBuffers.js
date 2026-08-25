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

    this.filteredPixels = new Uint8ClampedArray(rgbaLength);
    this.filterScratch = new Uint8ClampedArray(rgbaLength);
    this.edgeData = new Float32Array(pixelCount);
    this.gridRaw = new Uint8Array(pixelCount);
    this.gridFiltered = new Uint8Array(pixelCount);
    this.morphologyScratch = new Uint8Array(pixelCount);
    this.morphologyOutput = new Uint8Array(pixelCount);
    this.regionVisited = new Uint8Array(pixelCount);
    this.regionQueue = new Int32Array(pixelCount);
  }

  copyPixels(pixels) {
    this.filteredPixels.set(pixels);
    return this.filteredPixels;
  }
}

module.exports = { FrameBuffers };
