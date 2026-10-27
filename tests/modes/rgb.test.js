const {
  drawChannelValues,
  drawColorValues,
  getColorValueFontSize,
  renderRgb,
} = require('../../src/renderer/modes/rgb');
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

describe('drawColorValues', () => {
  const bigGrid = { cols: 2, rows: 1, cellSize: 40, x: 0, y: 0 };
  const twoPixels = new Uint8ClampedArray([10, 20, 30, 255, 250, 240, 230, 255]);

  it('stacks the R, G and B values of each cell from top to bottom', () => {
    const ctx = createRecordingContext();
    drawColorValues(ctx, bigGrid, twoPixels);
    expect(ctx.draws.map(({ char, x, y }) => [char, x, y])).toEqual([
      ['10', 20, 8],
      ['20', 20, 20],
      ['30', 20, 32],
      ['250', 60, 8],
      ['240', 60, 20],
      ['230', 60, 32],
    ]);
  });

  it('tints each line by its light, darker on bright cells', () => {
    const ctx = createRecordingContext();
    drawColorValues(ctx, bigGrid, twoPixels);
    expect(ctx.draws.map(({ color }) => color)).toEqual([
      '#ff9d9d',
      '#9dff9d',
      '#9dc4ff',
      '#7a0000',
      '#005c00',
      '#00287a',
    ]);
  });

  it('needs cells of at least 24px to fit three readable lines', () => {
    expect(getColorValueFontSize(20)).toBeLessThan(7);
    expect(getColorValueFontSize(24)).toBe(7);
    const ctx = createRecordingContext();
    drawColorValues(ctx, { ...bigGrid, cellSize: 20 }, twoPixels);
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

  it('labels the combined view with all three values once settled', () => {
    const overlay = { renderLayers() {} };
    const ctx = createRecordingContext();
    const settled = createChannelTransition()('N', 0);
    renderRgb(ctx, overlay, { ...grid, cellSize: 32 }, pixels, 'N', settled);
    expect(ctx.draws.map(({ char }) => char)).toEqual([
      '0',
      '0',
      '0',
      '255',
      '255',
      '255',
      '10',
      '200',
      '240',
    ]);
  });
});
