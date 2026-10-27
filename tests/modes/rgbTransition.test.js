// Ported from BusanMathVision's original-mode tests (channel transition only).
const {
  createChannelTransition,
  TRANSITION_MS,
} = require('../../src/renderer/modes/rgbTransition');
const { getProjectionBounds } = require('../../src/renderer/core/renderGeometry');

describe('RGB channel layer transition', () => {
  it('starts N aligned at full additive channel weights without zoom transforms', () => {
    const update = createChannelTransition();
    const state = update('N', 0);
    expect(state.active).toBe(false);
    expect(state.opacity).toEqual([1, 1, 1]);
    expect(state.offset).toEqual([0, 0, 0]);
    expect(state.depth).toEqual([0, 0, 0]);
    expect(state.angle).toEqual([0, 0, 0]);
  });

  it.each(['R', 'G', 'B'])(
    'holds %s in its Aero slot until the other layers are gone, then restores N in reverse order',
    (channel) => {
      const update = createChannelTransition();
      const selectedIndex = ['R', 'G', 'B'].indexOf(channel);
      const isolatedWeights = ['R', 'G', 'B'].map((name) => (name === channel ? 1 : 0));
      const transforms = ['offset', 'depth', 'angle', 'scale'];
      // The update API reuses its state arrays; snapshots preserve earlier samples.
      const sample = (name, time) => {
        const state = update(name, time);
        return {
          opacity: [...state.opacity],
          ...Object.fromEntries(transforms.map((key) => [key, [...state[key]]])),
          active: state.active,
        };
      };
      sample(channel, 0);
      const aeroAngle = sample(channel, TRANSITION_MS * 0.15).angle[0];
      for (const progress of [0.03, 0.075, 0.12, 0.15]) {
        const tilting = sample(channel, TRANSITION_MS * progress);
        expect(tilting.opacity).toEqual([1, 1, 1]);
        expect(tilting.offset).toEqual([0, 0, 0]);
        expect(tilting.depth).toEqual([0, 0, 0]);
        expect(tilting.angle[0]).toBeLessThan(0);
        expect(tilting.angle[0]).toBeGreaterThanOrEqual(aeroAngle);
        expect(tilting.angle).toEqual([tilting.angle[0], tilting.angle[0], tilting.angle[0]]);
      }
      let previousSeparation = 0;
      for (const progress of [0.18, 0.25, 0.32, 0.35]) {
        const separating = sample(channel, TRANSITION_MS * progress);
        expect(separating.opacity).toEqual([1, 1, 1]);
        expect(separating.angle).toEqual(Array(3).fill(aeroAngle));
        expect(separating.scale[0]).toBeLessThan(1);
        expect(separating.scale).toEqual(Array(3).fill(separating.scale[0]));
        expect(separating.offset[2]).toBeGreaterThan(previousSeparation);
        expect(separating.offset[0]).toBe(-separating.offset[2]);
        expect(separating.depth[0]).toBe(-separating.depth[2]);
        expect(Math.abs(separating.depth[2])).toBeGreaterThan(0);
        previousSeparation = separating.offset[2];
      }
      const split = sample(channel, TRANSITION_MS * 0.35);
      expect(split.active).toBe(true);
      expect(split.opacity).toEqual([1, 1, 1]);
      expect(split.offset[0]).toBeLessThan(split.offset[1]);
      expect(split.offset[1]).toBeLessThan(split.offset[2]);
      expect(split.scale[selectedIndex]).toBeLessThan(1);
      expect(split.angle[selectedIndex]).not.toBe(0);

      let previousWeights = split.opacity;
      for (const progress of [0.4, 0.45, 0.55, 0.62, 0.67, 0.72]) {
        const held = sample(channel, TRANSITION_MS * progress);
        for (const key of transforms) {
          expect(held[key][selectedIndex]).toBe(split[key][selectedIndex]);
        }
        expect(held.opacity[selectedIndex]).toBe(1);
        for (let c = 0; c < 3; c++) {
          if (c === selectedIndex) continue;
          expect(held.opacity[c]).toBeLessThanOrEqual(previousWeights[c]);
          if (progress < 0.62) {
            expect(held.opacity[c]).toBeGreaterThan(0);
            expect(held.opacity[c]).toBeLessThan(1);
          } else {
            expect(held.opacity[c]).toBe(0);
          }
        }
        previousWeights = held.opacity;
      }

      for (const progress of [0.73, 0.85, 0.97]) {
        const expanding = sample(channel, TRANSITION_MS * progress);
        expect(expanding.opacity).toEqual(isolatedWeights);
        expect(expanding.scale[selectedIndex]).toBeGreaterThan(split.scale[selectedIndex]);
        expect(expanding.scale[selectedIndex]).toBeLessThan(1);
        for (const key of ['offset', 'depth', 'angle']) {
          expect(Math.abs(expanding[key][selectedIndex])).toBeLessThanOrEqual(
            Math.abs(split[key][selectedIndex])
          );
        }
      }
      const end = sample(channel, TRANSITION_MS);
      expect(end.active).toBe(false);
      expect(end.opacity).toEqual(isolatedWeights);
      expect(end.scale).toEqual([1, 1, 1]);
      for (const key of ['offset', 'depth', 'angle']) expect(end[key]).toEqual([0, 0, 0]);

      const reverseStart = TRANSITION_MS + 1;
      expect(sample('N', reverseStart)).toEqual({ ...end, active: true });
      const shrinking = sample('N', reverseStart + TRANSITION_MS * 0.14);
      expect(shrinking.opacity).toEqual(isolatedWeights);
      expect(shrinking.scale[selectedIndex]).toBeGreaterThan(split.scale[selectedIndex]);
      expect(shrinking.scale[selectedIndex]).toBeLessThan(1);
      const returned = sample('N', reverseStart + TRANSITION_MS * 0.3);
      expect(returned.opacity).toEqual(isolatedWeights);
      for (const key of transforms) {
        expect(returned[key][selectedIndex]).toBeCloseTo(split[key][selectedIndex]);
      }
      const revealing = sample('N', reverseStart + TRANSITION_MS * 0.5);
      for (const key of transforms) expect(revealing[key]).toEqual(returned[key]);
      for (let c = 0; c < 3; c++) {
        if (c === selectedIndex) continue;
        expect(revealing.opacity[c]).toBeGreaterThan(0);
        expect(revealing.opacity[c]).toBeLessThan(1);
      }
      let previousOffset = returned.offset[2];
      for (const progress of [0.65, 0.7, 0.75, 0.8, 0.85]) {
        const recombining = sample('N', reverseStart + TRANSITION_MS * progress);
        expect(recombining.opacity).toEqual([1, 1, 1]);
        expect(recombining.angle).toEqual(Array(3).fill(aeroAngle));
        expect(recombining.offset[2]).toBeLessThanOrEqual(previousOffset);
        expect(recombining.depth[0]).toBeCloseTo(-recombining.depth[2]);
        previousOffset = recombining.offset[2];
      }
      for (const progress of [0.85, 0.9, 0.95]) {
        const straightening = sample('N', reverseStart + TRANSITION_MS * progress);
        expect(straightening.opacity).toEqual([1, 1, 1]);
        expect(straightening.scale).toEqual([1, 1, 1]);
        for (const key of ['offset', 'depth']) {
          for (const value of straightening[key]) expect(value).toBeCloseTo(0, 14);
        }
        expect(straightening.angle[0]).toBeGreaterThanOrEqual(aeroAngle);
        expect(straightening.angle[0]).toBeLessThan(0);
        expect(straightening.angle).toEqual(Array(3).fill(straightening.angle[0]));
      }
      const restored = sample('N', reverseStart + TRANSITION_MS);
      expect(restored.active).toBe(false);
      expect(restored.opacity).toEqual([1, 1, 1]);
      expect(restored.scale).toEqual([1, 1, 1]);
      for (const key of ['offset', 'depth', 'angle']) expect(restored[key]).toEqual([0, 0, 0]);
    }
  );

  it.each(['R', 'G', 'B'])(
    'keeps every projected %s transition corner inside the viewport without magnification',
    (channel) => {
      const update = createChannelTransition();
      const bounds = [0, 1];
      for (const [selection, start] of [
        [channel, 0],
        ['N', TRANSITION_MS + 1],
      ]) {
        update(selection, start);
        for (let step = 0; step <= 100; step++) {
          const layers = update(selection, start + (TRANSITION_MS * step) / 100);
          getProjectionBounds(layers, bounds);
          for (let c = 0; c < 3; c++) {
            for (const px of [-1, 1]) {
              for (const py of [-1, 1]) {
                const x = px * layers.scale[c];
                const y = py * layers.scale[c];
                const sine = Math.sin(layers.angle[c]);
                const cosine = Math.cos(layers.angle[c]);
                const z = -sine * x + cosine * layers.depth[c];
                const w = 1 + 0.32 * (bounds[0] - z);
                const projectedX =
                  (cosine * x + sine * layers.depth[c] + layers.offset[c]) / bounds[1] / w;
                const projectedY = (y - layers.offset[c] * 0.3) / bounds[1] / w;
                expect(w).toBeGreaterThanOrEqual(1 - 1e-12);
                expect(Math.abs(projectedX)).toBeLessThanOrEqual(1 + 1e-12);
                expect(Math.abs(projectedY)).toBeLessThanOrEqual(1 + 1e-12);
              }
            }
          }
        }
      }
    }
  );

  it.each(['R', 'G', 'B', 'N'])(
    'preserves every sampled GPU component when interrupted by %s',
    (nextChannel) => {
      for (const progress of [0.075, 0.15, 0.25, 0.35, 0.45, 0.62, 0.67, 0.72, 0.8, 0.85, 0.925]) {
        const update = createChannelTransition();
        const initialChannel = nextChannel === 'R' ? 'B' : 'R';
        update(initialChannel, 0);
        const now = TRANSITION_MS * progress;
        const state = update(initialChannel, now);
        const before = Object.fromEntries(
          Object.entries(state).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value,
          ])
        );
        expect(update(nextChannel, now)).toEqual(before);
        if (nextChannel !== 'N') {
          update('N', now);
          const reverse = update('N', now + TRANSITION_MS * progress);
          const reverseBefore = Object.fromEntries(
            Object.entries(reverse).map(([key, value]) => [
              key,
              Array.isArray(value) ? [...value] : value,
            ])
          );
          expect(update(nextChannel, now + TRANSITION_MS * progress)).toEqual(reverseBefore);
        }
      }
    }
  );

  it('honors reduced motion with immediate exact selected weights', () => {
    const update = createChannelTransition();
    expect(update('B', 0, true).opacity).toEqual([0, 0, 1]);
    expect(update('N', 1, true).opacity).toEqual([1, 1, 1]);
  });
});
