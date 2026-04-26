function erode(maskData, width, height, iterations = 1) {
  let current = new Uint8Array(maskData);
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(current);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (current[y * width + x] === 1) {
          const hasBackground =
            current[(y - 1) * width + x] === 0 ||
            current[(y + 1) * width + x] === 0 ||
            current[y * width + (x - 1)] === 0 ||
            current[y * width + (x + 1)] === 0;
          if (hasBackground) next[y * width + x] = 0;
        }
      }
    }
    current = next;
  }
  return current;
}

function dilate(maskData, width, height, iterations = 1) {
  let current = new Uint8Array(maskData);
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(current);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (current[y * width + x] === 0) {
          const hasPerson =
            current[(y - 1) * width + x] === 1 ||
            current[(y + 1) * width + x] === 1 ||
            current[y * width + (x - 1)] === 1 ||
            current[y * width + (x + 1)] === 1;
          if (hasPerson) next[y * width + x] = 1;
        }
      }
    }
    current = next;
  }
  return current;
}

function cleanMask(maskData, width, height) {
  return dilate(erode(maskData, width, height, 1), width, height, 2);
}

module.exports = { erode, dilate, cleanMask };
