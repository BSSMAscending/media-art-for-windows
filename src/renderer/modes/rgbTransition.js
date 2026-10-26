const CHANNELS = ['R', 'G', 'B'];
const TRANSITION_MS = 1800;
const AERO_ANGLE = -0.6;
const AERO_SCALE = 0.82;
const AERO_OFFSET = 0.025;
const AERO_DEPTH = 0.36;

function ease(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function phase(progress, start, end) {
  return ease(Math.min(1, Math.max(0, (progress - start) / (end - start))));
}

function createChannelTransition() {
  let selected = 'N';
  let startedAt = Number.NEGATIVE_INFINITY;
  const state = {
    opacity: [1, 1, 1],
    offset: [0, 0, 0],
    depth: [0, 0, 0],
    angle: [0, 0, 0],
    scale: [1, 1, 1],
    active: false,
  };
  const fromWeight = [1, 1, 1];
  const fromOffset = [0, 0, 0];
  const fromDepth = [0, 0, 0];
  const fromAngle = [0, 0, 0];
  const fromScale = [1, 1, 1];
  return function update(channel = 'N', now = 0, reducedMotion = false) {
    if (channel !== selected) {
      selected = channel;
      startedAt = now;
      for (let c = 0; c < 3; c++) {
        fromWeight[c] = state.opacity[c];
        fromOffset[c] = state.offset[c];
        fromDepth[c] = state.depth[c];
        fromAngle[c] = state.angle[c];
        fromScale[c] = state.scale[c];
      }
    }
    const progress = reducedMotion
      ? 1
      : Math.min(1, Math.max(0, (now - startedAt) / TRANSITION_MS));
    const tilt = phase(progress, 0, 0.15);
    const split = phase(progress, 0.15, 0.35);
    const fade = phase(progress, 0.35, 0.62);
    const expand = phase(progress, 0.72, 1);
    const reverseSplit = phase(progress, 0, 0.28);
    const reverseReveal = phase(progress, 0.38, 0.65);
    const recombine = phase(progress, 0.65, 0.85);
    const straighten = phase(progress, 0.85, 1);
    state.active = progress < 1;
    for (let c = 0; c < 3; c++) {
      const target = selected === CHANNELS[c] ? 1 : 0;
      if (selected === 'N') {
        state.opacity[c] = fromWeight[c] + (1 - fromWeight[c]) * reverseReveal;
        // Return to each Aero slot before revealing the other channels.
        state.scale[c] =
          (fromScale[c] + (AERO_SCALE - fromScale[c]) * reverseSplit) * (1 - recombine) + recombine;
        state.offset[c] =
          (fromOffset[c] + ((c - 1) * AERO_OFFSET - fromOffset[c]) * reverseSplit) *
          (1 - recombine);
        state.depth[c] =
          (fromDepth[c] + ((1 - c) * AERO_DEPTH - fromDepth[c]) * reverseSplit) * (1 - recombine);
        // Merge at the full sideways angle, then straighten the aligned sum.
        state.angle[c] =
          (fromAngle[c] + (AERO_ANGLE - fromAngle[c]) * reverseSplit) * (1 - straighten);
      } else {
        const revealed = fromWeight[c] + (1 - fromWeight[c]) * split;
        state.opacity[c] = progress >= 0.62 ? target : revealed + (target - revealed) * fade;
        state.scale[c] =
          fromScale[c] + (AERO_SCALE - fromScale[c]) * tilt + (1 - AERO_SCALE) * expand;
        const offset = fromOffset[c] + ((c - 1) * AERO_OFFSET - fromOffset[c]) * split;
        const depth = fromDepth[c] + ((1 - c) * AERO_DEPTH - fromDepth[c]) * split;
        // Keep the full split pose through removal and the isolated hold.
        state.offset[c] = offset * (1 - expand);
        state.depth[c] = depth * (1 - expand);
        state.angle[c] = (fromAngle[c] + (AERO_ANGLE - fromAngle[c]) * tilt) * (1 - expand);
      }
      if (progress === 1) {
        state.opacity[c] = selected === 'N' ? 1 : target;
        state.scale[c] = 1;
        state.offset[c] = 0;
        state.depth[c] = 0;
        state.angle[c] = 0;
      }
    }
    return state;
  };
}

module.exports = { createChannelTransition, TRANSITION_MS };
