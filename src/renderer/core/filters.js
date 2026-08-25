const BLUR_3_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
];
const BLUR_5_KERNEL = [
  [1, 4, 6, 4, 1],
  [4, 16, 24, 16, 4],
  [6, 24, 36, 24, 6],
  [4, 16, 24, 16, 4],
  [1, 4, 6, 4, 1],
];

function applyBrightness(pixels, width, height, factor) {
  const delta = Math.round(factor * 255);
  for (let i = 0; i < width * height * 4; i += 4) {
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + delta));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + delta));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + delta));
  }
}

function applyGaussianBlur(pixels, width, height, radius, scratch) {
  if (radius <= 0) return;
  const kernel = radius === 1 ? BLUR_3_KERNEL : BLUR_5_KERNEL;
  const size = radius === 1 ? 3 : 5;
  const half = Math.floor(size / 2);
  const divisor = radius === 1 ? 16 : 256;
  const tmp =
    scratch && scratch.length === pixels.length ? scratch : new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let ky = 0; ky < size; ky++) {
        const sy = Math.max(0, Math.min(height - 1, y + ky - half));
        for (let kx = 0; kx < size; kx++) {
          const sx = Math.max(0, Math.min(width - 1, x + kx - half));
          const weight = kernel[ky][kx];
          const index = (sy * width + sx) * 4;
          r += pixels[index] * weight;
          g += pixels[index + 1] * weight;
          b += pixels[index + 2] * weight;
        }
      }
      const output = (y * width + x) * 4;
      tmp[output] = r / divisor;
      tmp[output + 1] = g / divisor;
      tmp[output + 2] = b / divisor;
      tmp[output + 3] = pixels[output + 3];
    }
  }
  pixels.set(tmp);
}

function applySharpen(pixels, width, height, strength, scratch) {
  if (strength <= 0) return;
  const center = 1 + 8 * strength;
  const side = -strength;
  const tmp =
    scratch && scratch.length === pixels.length ? scratch : new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let r = pixels[index] * center;
      let g = pixels[index + 1] * center;
      let b = pixels[index + 2] * center;

      if (y > 0) {
        const neighbor = index - width * 4;
        r += pixels[neighbor] * side;
        g += pixels[neighbor + 1] * side;
        b += pixels[neighbor + 2] * side;
      }
      if (y < height - 1) {
        const neighbor = index + width * 4;
        r += pixels[neighbor] * side;
        g += pixels[neighbor + 1] * side;
        b += pixels[neighbor + 2] * side;
      }
      if (x > 0) {
        const neighbor = index - 4;
        r += pixels[neighbor] * side;
        g += pixels[neighbor + 1] * side;
        b += pixels[neighbor + 2] * side;
      }
      if (x < width - 1) {
        const neighbor = index + 4;
        r += pixels[neighbor] * side;
        g += pixels[neighbor + 1] * side;
        b += pixels[neighbor + 2] * side;
      }

      tmp[index] = Math.max(0, Math.min(255, r));
      tmp[index + 1] = Math.max(0, Math.min(255, g));
      tmp[index + 2] = Math.max(0, Math.min(255, b));
      tmp[index + 3] = pixels[index + 3];
    }
  }
  pixels.set(tmp);
}

function applySobelEdge(pixels, width, height, output) {
  const result =
    output && output.length === width * height ? output : new Float32Array(width * height);
  result.fill(0);

  const luminanceAt = (index) =>
    (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const topLeft = ((y - 1) * width + x - 1) * 4;
      const top = topLeft + 4;
      const topRight = top + 4;
      const left = topLeft + width * 4;
      const right = left + 8;
      const bottomLeft = left + width * 4;
      const bottom = bottomLeft + 4;
      const bottomRight = bottom + 4;
      const gx =
        -luminanceAt(topLeft) +
        luminanceAt(topRight) -
        2 * luminanceAt(left) +
        2 * luminanceAt(right) -
        luminanceAt(bottomLeft) +
        luminanceAt(bottomRight);
      const gy =
        -luminanceAt(topLeft) -
        2 * luminanceAt(top) -
        luminanceAt(topRight) +
        luminanceAt(bottomLeft) +
        2 * luminanceAt(bottom) +
        luminanceAt(bottomRight);
      result[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return result;
}

module.exports = { applyBrightness, applyGaussianBlur, applySharpen, applySobelEdge };
