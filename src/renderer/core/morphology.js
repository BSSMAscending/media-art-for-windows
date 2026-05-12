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

function keepLargestRegion(maskData, width, height) {
  const visited = new Uint8Array(width * height);
  let bestLabel = new Uint8Array(width * height);
  let bestSize = 0;

  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      const startIdx = startY * width + startX;
      if (maskData[startIdx] !== 1 || visited[startIdx]) continue;

      const label = new Uint8Array(width * height);
      const stack = [startX, startY];
      let size = 0;

      while (stack.length > 0) {
        const cy = stack.pop();
        const cx = stack.pop();
        const idx = cy * width + cx;
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
        if (maskData[idx] !== 1 || visited[idx]) continue;

        visited[idx] = 1;
        label[idx] = 1;
        size++;

        stack.push(cx + 1, cy);
        stack.push(cx - 1, cy);
        stack.push(cx, cy + 1);
        stack.push(cx, cy - 1);
      }

      if (size > bestSize) {
        bestSize = size;
        bestLabel = label;
      }
    }
  }

  return bestLabel;
}

function removeSmallRegions(maskData, width, height, minRatio) {
  const total = width * height;
  const minSize = Math.max(8, Math.floor(total * minRatio));
  const visited = new Uint8Array(width * height);
  const result = new Uint8Array(width * height);

  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      const startIdx = startY * width + startX;
      if (maskData[startIdx] !== 1 || visited[startIdx]) continue;

      const region = [];
      const stack = [startX, startY];

      while (stack.length > 0) {
        const cy = stack.pop();
        const cx = stack.pop();
        const idx = cy * width + cx;
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
        if (maskData[idx] !== 1 || visited[idx]) continue;

        visited[idx] = 1;
        region.push(idx);

        stack.push(cx + 1, cy);
        stack.push(cx - 1, cy);
        stack.push(cx, cy + 1);
        stack.push(cx, cy - 1);
      }

      if (region.length >= minSize) {
        for (let i = 0; i < region.length; i++) {
          result[region[i]] = 1;
        }
      }
    }
  }

  return result;
}

module.exports = { erode, dilate, cleanMask, keepLargestRegion, removeSmallRegions };
