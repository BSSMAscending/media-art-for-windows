const { HAND_REFINEMENT } = require('../config');

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const PALM_ANCHOR_INDICES = [0, 5, 9, 13, 17];
const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20]);
const PALM_INDICES = new Set([0, 1, 2, 5, 9, 13, 17]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneLandmarks(landmarks) {
  return landmarks.map((point) => ({ x: point.x, y: point.y, z: point.z }));
}

function getWristPoint(landmarks, width, height) {
  const wrist = landmarks[0] || { x: 0.5, y: 0.5 };
  return {
    x: wrist.x * (width - 1),
    y: wrist.y * (height - 1),
  };
}

function getNearestPreviousIndex(previousHands, usedIndexes, landmarks, width, height) {
  const currentWrist = getWristPoint(landmarks, width, height);
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  previousHands.forEach((previousLandmarks, index) => {
    if (usedIndexes.has(index)) return;

    const previousWrist = getWristPoint(previousLandmarks, width, height);
    const dx = currentWrist.x - previousWrist.x;
    const dy = currentWrist.y - previousWrist.y;
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function blendHand(previousLandmarks, currentLandmarks, smoothing) {
  if (!previousLandmarks || previousLandmarks.length !== currentLandmarks.length) {
    return cloneLandmarks(currentLandmarks);
  }

  return currentLandmarks.map((landmark, index) => {
    const previous = previousLandmarks[index];
    return {
      x: previous.x + (landmark.x - previous.x) * smoothing,
      y: previous.y + (landmark.y - previous.y) * smoothing,
      z: previous.z + (landmark.z - previous.z) * smoothing,
    };
  });
}

function smoothHandLandmarks(previousHands, currentHands, width, height) {
  if (!currentHands || currentHands.length === 0) return [];
  if (!previousHands || previousHands.length === 0) {
    return currentHands.map((landmarks) => cloneLandmarks(landmarks));
  }

  const usedIndexes = new Set();

  return currentHands.map((landmarks) => {
    const previousIndex = getNearestPreviousIndex(previousHands, usedIndexes, landmarks, width, height);
    if (previousIndex >= 0) {
      usedIndexes.add(previousIndex);
      return blendHand(previousHands[previousIndex], landmarks, HAND_REFINEMENT.smoothing);
    }
    return cloneLandmarks(landmarks);
  });
}

function sampleMask(maskData, width, height, x, y, radius) {
  const minX = clamp(Math.floor(x - radius), 0, width - 1);
  const maxX = clamp(Math.ceil(x + radius), 0, width - 1);
  const minY = clamp(Math.floor(y - radius), 0, height - 1);
  const maxY = clamp(Math.ceil(y + radius), 0, height - 1);

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      if (maskData[py * width + px] === 1) {
        return true;
      }
    }
  }

  return false;
}

function handOverlapsMask(maskData, width, height, landmarks) {
  let overlapCount = 0;

  for (const index of PALM_ANCHOR_INDICES) {
    const landmark = landmarks[index];
    const x = landmark.x * (width - 1);
    const y = landmark.y * (height - 1);
    if (sampleMask(maskData, width, height, x, y, HAND_REFINEMENT.overlapAnchorRadius)) {
      overlapCount++;
    }
  }

  return overlapCount >= HAND_REFINEMENT.minOverlapAnchors;
}

function estimateHandSpan(landmarks, width, height) {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (const landmark of landmarks) {
    const x = landmark.x * (width - 1);
    const y = landmark.y * (height - 1);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return Math.max(maxX - minX, maxY - minY, 1);
}

function radiusFromSpan(span, factor) {
  return clamp(Math.round(span * factor), HAND_REFINEMENT.minRadius, HAND_REFINEMENT.maxRadius);
}

function drawCircle(maskData, width, height, cx, cy, radius) {
  const minX = clamp(Math.floor(cx - radius), 0, width - 1);
  const maxX = clamp(Math.ceil(cx + radius), 0, width - 1);
  const minY = clamp(Math.floor(cy - radius), 0, height - 1);
  const maxY = clamp(Math.ceil(cy + radius), 0, height - 1);
  const radiusSq = radius * radius;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSq) {
        maskData[y * width + x] = 1;
      }
    }
  }
}

function drawLine(maskData, width, height, startX, startY, endX, endY, radius) {
  const dx = endX - startX;
  const dy = endY - startY;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = startX + dx * t;
    const y = startY + dy * t;
    drawCircle(maskData, width, height, x, y, radius);
  }
}

function reinforceHandMask(maskData, width, height, handLandmarks) {
  for (const landmarks of handLandmarks) {
    if (!handOverlapsMask(maskData, width, height, landmarks)) continue;

    const handSpan = estimateHandSpan(landmarks, width, height);
    const connectorRadius = radiusFromSpan(handSpan, HAND_REFINEMENT.connectorRadiusFactor);
    const palmRadius = radiusFromSpan(handSpan, HAND_REFINEMENT.palmRadiusFactor);
    const jointRadius = radiusFromSpan(handSpan, HAND_REFINEMENT.jointRadiusFactor);
    const fingertipRadius = radiusFromSpan(handSpan, HAND_REFINEMENT.fingertipRadiusFactor);

    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      drawLine(
        maskData,
        width,
        height,
        start.x * (width - 1),
        start.y * (height - 1),
        end.x * (width - 1),
        end.y * (height - 1),
        connectorRadius
      );
    }

    landmarks.forEach((landmark, index) => {
      const radius = FINGERTIP_INDICES.has(index)
        ? fingertipRadius
        : PALM_INDICES.has(index)
          ? palmRadius
          : jointRadius;

      drawCircle(maskData, width, height, landmark.x * (width - 1), landmark.y * (height - 1), radius);
    });
  }

  return maskData;
}

module.exports = { smoothHandLandmarks, reinforceHandMask };
