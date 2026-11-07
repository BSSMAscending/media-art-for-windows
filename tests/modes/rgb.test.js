const { drawChannelValues, renderRgb } = require('../../src/renderer/modes/rgb');
const {
  createChannelTransition,
  TRANSITION_MS,
} = require('../../src/renderer/modes/rgbTransition');

function createRecordingContext() {
  return {
    draws: [],
    fillText(char, x, y) {
      this.draws.push({ char, x, y, color: this.fillStyle });
    },
  };
}

const grid = { cols: 3, rows: 1, cellSize: 16, x: 100, y: 50 };
const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 10, 200, 240, 255]);

describe('drawChannelValues', () => {
  it.each([
    ['R', ['0', '255', '10']],
    ['G', ['0', '255', '200']],
    ['B', ['0', '255', '240']],
  ])('writes the %s value of every cell at the grid origin', (channel, values) => {
    const ctx = createRecordingContext();
    drawChannelValues(ctx, grid, pixels, channel);
    expect(ctx.draws.map(({ char }) => char)).toEqual(values);
    expect(ctx.draws.map(({ x, y }) => [x, y])).toEqual([
      [108, 58],
      [124, 58],
      [140, 58],
    ]);
    expect(ctx.font).toBe("bold 8px 'Courier New', monospace");
  });

  it('switches to dark digits on bright green cells only', () => {
    const ctx = createRecordingContext();
    drawChannelValues(ctx, grid, pixels, 'G');
    expect(ctx.draws.map(({ color }) => color)).toEqual(['#ffffff', '#000000', '#000000']);
  });

  it('draws nothing for the combined view', () => {
    const ctx = createRecordingContext();
    drawChannelValues(ctx, grid, pixels, 'N');
    expect(ctx.draws).toEqual([]);
  });

  it('leaves cells too small for readable digits as plain colour', () => {
    const ctx = createRecordingContext();
    drawChannelValues(ctx, { ...grid, cellSize: 8 }, pixels, 'R');
    expect(ctx.draws).toEqual([]);
  });
});

describe('renderRgb', () => {
  it('hands the camera pixels to the GPU layers and labels them once settled', () => {
    const received = [];
    const overlay = {
      renderLayers(_grid, source, layers) {
        received.push({ source, active: layers.active });
      },
    };
    const ctx = createRecordingContext();
    const update = createChannelTransition();

    renderRgb(ctx, overlay, grid, pixels, 'R', update('R', 0));
    expect(received[0]).toEqual({ source: pixels, active: true });
    expect(ctx.draws).toEqual([]);

    renderRgb(ctx, overlay, grid, pixels, 'R', update('R', TRANSITION_MS));
    expect(received[1].active).toBe(false);
    expect(ctx.draws.map(({ char }) => char)).toEqual(['0', '255', '10']);
  });

  it('shows the full colour as the camera picture itself, with no cells or numbers', () => {
    const received = [];
    const overlay = {
      renderLayers(_grid, source) {
        received.push(source);
      },
    };
    const ctx = createRecordingContext();
    const photo = { width: 1280, height: 960 };
    const settled = createChannelTransition()('N', 0);
    renderRgb(ctx, overlay, { ...grid, cellSize: 32 }, pixels, 'N', settled, photo);
    expect(received).toEqual([photo]);
    expect(ctx.draws).toEqual([]);
  });

  it('turns into pixel cells as soon as a light is picked', () => {
    const received = [];
    const overlay = {
      renderLayers(_grid, source) {
        received.push(source);
      },
    };
    const update = createChannelTransition();
    update('N', 0);
    renderRgb(createRecordingContext(), overlay, grid, pixels, 'B', update('B', 1), null);
    expect(received).toEqual([pixels]);
  });
});
