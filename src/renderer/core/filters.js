function applyBrightness(pixels, width, height, factor) {
  const delta = Math.round(factor * 255);
  for (let i = 0; i < width * height * 4; i += 4) {
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + delta));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + delta));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + delta));
  }
}

function applyGaussianBlur(pixels, width, height, radius) {
  if (radius <= 0) return;
  const kernel =
    radius === 1
      ? [[1, 2, 1], [2, 4, 2], [1, 2, 1]]
      : [[1, 4, 6, 4, 1], [4, 16, 24, 16, 4], [6, 24, 36, 24, 6], [4, 16, 24, 16, 4], [1, 4, 6, 4, 1]];
  const size = radius === 1 ? 3 : 5;
  const half = Math.floor(size / 2);
  const divisor = kernel.flat().reduce((a, b) => a + b, 0);
  const tmp = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < size; ky++) {
        const sy = Math.max(0, Math.min(height - 1, y + ky - half));
        for (let kx = 0; kx < size; kx++) {
          const sx = Math.max(0, Math.min(width - 1, x + kx - half));
          const w = kernel[ky][kx];
          const idx = (sy * width + sx) * 4;
          r += pixels[idx] * w;
          g += pixels[idx + 1] * w;
          b += pixels[idx + 2] * w;
        }
      }
      const out = (y * width + x) * 4;
      tmp[out] = r / divisor;
      tmp[out + 1] = g / divisor;
      tmp[out + 2] = b / divisor;
      tmp[out + 3] = pixels[out + 3];
    }
  }
  pixels.set(tmp);
}

function applySharpen(pixels, width, height, strength) {
  if (strength <= 0) return;
  const center = 1 + 8 * strength;
  const side = -strength;
  const tmp = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = pixels[idx] * center;
      let g = pixels[idx + 1] * center;
      let b = pixels[idx + 2] * center;

      const neighbors = [
        [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1],
      ];
      for (const [ny, nx] of neighbors) {
        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
          const ni = (ny * width + nx) * 4;
          r += pixels[ni] * side;
          g += pixels[ni + 1] * side;
          b += pixels[ni + 2] * side;
        }
      }
      tmp[idx] = Math.max(0, Math.min(255, r));
      tmp[idx + 1] = Math.max(0, Math.min(255, g));
      tmp[idx + 2] = Math.max(0, Math.min(255, b));
      tmp[idx + 3] = pixels[idx + 3];
    }
  }
  pixels.set(tmp);
}

function applySobelEdge(pixels, width, height) {
  const result = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getLum = (dy, dx) => {
        const i = ((y + dy) * width + (x + dx)) * 4;
        return (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
      };
      const gx =
        -getLum(-1, -1) + getLum(-1, 1) - 2 * getLum(0, -1) + 2 * getLum(0, 1) - getLum(1, -1) + getLum(1, 1);
      const gy =
        -getLum(-1, -1) - 2 * getLum(-1, 0) - getLum(-1, 1) + getLum(1, -1) + 2 * getLum(1, 0) + getLum(1, 1);
      result[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return result;
}

module.exports = { applyBrightness, applyGaussianBlur, applySharpen, applySobelEdge };
