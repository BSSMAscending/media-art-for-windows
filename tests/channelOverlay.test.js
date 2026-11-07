const { createChannelOverlay } = require('../src/renderer/core/channelOverlay');
const { createChannelTransition } = require('../src/renderer/modes/rgbTransition');

function createGl() {
  const uniforms = {};
  const gl = {
    passes: [],
    uploads: [],
    viewports: [],
    bound: [],
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    TEXTURE_MIN_FILTER: 'min-filter',
    NEAREST: 'nearest',
    createShader: (type) => ({ type }),
    shaderSource() {},
    compileShader() {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader() {},
    linkProgram() {},
    getProgramParameter: () => true,
    deleteShader() {},
    useProgram() {},
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData() {},
    getAttribLocation: () => 0,
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    getUniformLocation: (_program, name) => name,
    createTexture: () => ({ filter: null }),
    activeTexture() {},
    bindTexture(_target, texture) {
      gl.current = texture;
      gl.bound.push(texture);
    },
    texParameteri(_target, name, value) {
      if (name === gl.TEXTURE_MIN_FILTER) gl.current.filter = value;
    },
    pixelStorei() {},
    enable() {},
    blendFunc() {},
    clearColor() {},
    clear() {},
    viewport(...args) {
      gl.viewports.push(args);
    },
    uniform1i() {},
    uniform1f(name, value) {
      uniforms[name] = value;
    },
    uniform2f(name, ...values) {
      uniforms[name] = values;
    },
    uniform3f(name, ...values) {
      uniforms[name] = values;
    },
    texImage2D(...args) {
      gl.uploads.push({ resize: true, width: args[3], height: args[4], pixels: args[8] });
    },
    texSubImage2D(...args) {
      gl.uploads.push({ resize: false, width: args[4], height: args[5], pixels: args[8] });
    },
    drawArrays() {
      gl.passes.push({ ...uniforms });
    },
  };
  return gl;
}

function createOverlay() {
  const gl = createGl();
  const canvas = {
    style: {},
    setAttribute() {},
    addEventListener() {},
    getContext: () => gl,
  };
  vi.stubGlobal('document', { createElement: () => canvas });
  vi.stubGlobal('window', { devicePixelRatio: 2 });
  return { overlay: createChannelOverlay({}, null), gl, canvas };
}

afterEach(() => vi.unstubAllGlobals());

const grid = { cols: 4, rows: 2, cellSize: 16, x: 30, y: 40 };
const pixels = new Uint8ClampedArray(4 * 2 * 4);

describe('channel overlay', () => {
  it('covers exactly the full-frame grid at device resolution', () => {
    const { overlay, gl, canvas } = createOverlay();
    overlay.renderFlat(grid, pixels);
    expect(canvas.hidden).toBe(false);
    expect(canvas.style).toEqual({ left: '30px', top: '40px', width: '64px', height: '32px' });
    expect([canvas.width, canvas.height]).toEqual([128, 64]);
    expect(gl.viewports).toEqual([[0, 0, 128, 64]]);
  });

  it('uploads one texel per cell and only reallocates when the grid changes', () => {
    const { overlay, gl } = createOverlay();
    overlay.renderFlat(grid, pixels);
    overlay.renderFlat(grid, pixels);
    expect(gl.uploads.map(({ resize, width, height }) => [resize, width, height])).toEqual([
      [true, 4, 2],
      [false, 4, 2],
    ]);
  });

  it('draws precomputed colours in one untransformed pass', () => {
    const { overlay, gl } = createOverlay();
    overlay.renderFlat(grid, pixels);
    expect(gl.passes).toEqual([
      {
        projection: [0, 1],
        channel: [1, 1, 1],
        weight: 1,
        offset: 0,
        depth: 0,
        angle: 0,
        scale: 1,
      },
    ]);
  });

  it('adds the three channel layers for the combined view and skips hidden ones', () => {
    const { overlay, gl } = createOverlay();
    const update = createChannelTransition();
    overlay.renderLayers(grid, pixels, update('N', 0));
    expect(gl.passes.map(({ channel, weight }) => [channel, weight])).toEqual([
      [[1, 0, 0], 1],
      [[0, 1, 0], 1],
      [[0, 0, 1], 1],
    ]);

    gl.passes.length = 0;
    overlay.renderLayers(grid, pixels, update('G', 1, true));
    expect(gl.passes.map(({ channel }) => channel)).toEqual([[0, 1, 0]]);
  });

  it('keeps every cell a crisp block', () => {
    const { overlay, gl } = createOverlay();
    overlay.renderFlat(grid, pixels);
    expect(gl.current.filter).toBe('nearest');
  });
});
