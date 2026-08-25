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

function erodeInto(input, output, width, height) {
  output.set(input);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (
        input[index] === 1 &&
        (input[index - width] === 0 ||
          input[index + width] === 0 ||
          input[index - 1] === 0 ||
          input[index + 1] === 0)
      ) {
        output[index] = 0;
      }
    }
  }
}

function dilateInto(input, output, width, height) {
  output.set(input);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (
        input[index] === 0 &&
        (input[index - width] === 1 ||
          input[index + width] === 1 ||
          input[index - 1] === 1 ||
          input[index + 1] === 1)
      ) {
        output[index] = 1;
      }
    }
  }
}

function cleanMask(maskData, width, height, output, scratch) {
  if (
    !output ||
    !scratch ||
    output.length !== maskData.length ||
    scratch.length !== maskData.length
  ) {
    return dilate(erode(maskData, width, height, 1), width, height, 2);
  }

  erodeInto(maskData, scratch, width, height);
  dilateInto(scratch, output, width, height);
  dilateInto(output, scratch, width, height);
  output.set(scratch);
  return output;
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

function removeSmallRegions(maskData, width, height, minRatio, output, visitedBuffer, queueBuffer) {
  const total = width * height;
  const minSize = Math.max(8, Math.floor(total * minRatio));
  const visited =
    visitedBuffer && visitedBuffer.length === total ? visitedBuffer : new Uint8Array(total);
  const result = output && output.length === total ? output : new Uint8Array(total);
  const queue = queueBuffer && queueBuffer.length === total ? queueBuffer : new Int32Array(total);

  visited.fill(0);
  result.fill(0);

  for (let startIdx = 0; startIdx < total; startIdx++) {
    if (maskData[startIdx] !== 1 || visited[startIdx]) continue;

    let head = 0;
    let tail = 1;
    queue[0] = startIdx;
    visited[startIdx] = 1;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      let neighbor;

      if (x > 0) {
        neighbor = index - 1;
        if (maskData[neighbor] === 1 && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      if (x < width - 1) {
        neighbor = index + 1;
        if (maskData[neighbor] === 1 && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      if (index >= width) {
        neighbor = index - width;
        if (maskData[neighbor] === 1 && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      if (index < total - width) {
        neighbor = index + width;
        if (maskData[neighbor] === 1 && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
    }

    if (tail >= minSize) {
      for (let i = 0; i < tail; i++) result[queue[i]] = 1;
    }
  }

  return result;
}

module.exports = { erode, dilate, cleanMask, keepLargestRegion, removeSmallRegions };
