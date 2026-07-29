// Detects Korean mini heart gesture (손하트):
// thumb tip (4) and index tip (8) pinched close while other fingers extended.

const PINCH_THRESHOLD = 0.26;
const CONFIRM_FRAMES = 10;
const COOLDOWN_MS = 4000;

function dist2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isHeartGesture(hand) {
  const handSize = dist2d(hand[0], hand[9]);
  if (handSize < 0.01) return false;

  const pinchDist = dist2d(hand[4], hand[8]) / handSize;
  if (pinchDist > PINCH_THRESHOLD) return false;

  // At least one of middle/ring/pinky is extended (tip above PIP = lower y value)
  const middleUp = hand[12].y < hand[10].y;
  const ringUp = hand[16].y < hand[14].y;
  const pinkyUp = hand[20].y < hand[18].y;
  return middleUp || ringUp || pinkyUp;
}

function createGestureDetector(onHeart) {
  let confirmCount = 0;
  let lastTrigger = 0;

  function detect(handLandmarks) {
    if (!handLandmarks || handLandmarks.length === 0) {
      if (confirmCount > 0) confirmCount--;
      return;
    }

    const now = Date.now();
    if (now - lastTrigger < COOLDOWN_MS) return;

    if (handLandmarks.some(isHeartGesture)) {
      confirmCount++;
      if (confirmCount >= CONFIRM_FRAMES) {
        confirmCount = 0;
        lastTrigger = now;
        onHeart();
      }
    } else {
      if (confirmCount > 0) confirmCount--;
    }
  }

  return { detect };
}

module.exports = { createGestureDetector };
