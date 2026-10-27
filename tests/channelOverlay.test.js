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
    LINEAR: 'linear',
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
    uniform4f(name, ...values) {
      uniforms[name] = values;
    },
    texImage2D(...args) {
      if (args.length === 6) {
        gl.uploads.push({ video: args[5], filter: gl.current.filter });
        return;
      }
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
    overlay.renderFlat(grid, { pixels });
    expect(canvas.hidden).toBe(false);
    expect(canvas.style).toEqual({ left: '30px', top: '40px', width: '64px', height: '32px' });
    expect([canvas.width, canvas.height]).toEqual([128, 64]);
    expect(gl.viewports).toEqual([[0, 0, 128, 64]]);
  });

  it('uploads one texel per cell and only reallocates when the grid changes', () => {
    const { overlay, gl } = createOverlay();
    overlay.renderFlat(grid, { pixels });
    overlay.renderFlat(grid, { pixels });
    expect(gl.uploads.map(({ resize, width, height }) => [resize, width, height])).toEqual([
      [true, 4, 2],
      [false, 4, 2],
    ]);
  });

  it('draws precomputed colours in one untransformed pass', () => {
    const { overlay, gl } = createOverlay();
    overlay.renderFlat(grid, { pixels });
    expect(gl.passes).toEqual([
      {
        sourceRect: [0, 0, 1, 1],
        mirror: 0,
        levels: 0,
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
    overlay.renderLayers(grid, { pixels }, update('N', 0));
    expect(gl.passes.map(({ channel, weight }) => [channel, weight])).toEqual([
      [[1, 0, 0], 1],
      [[0, 1, 0], 1],
      [[0, 0, 1], 1],
    ]);

    gl.passes.length = 0;
    overlay.renderLayers(grid, { pixels }, update('G', 1, true));
    expect(gl.passes.map(({ channel }) => channel)).toEqual([[0, 1, 0]]);
  });

  it('streams the live video smoothly, mirrored and cropped to the grid', () => {
    const { overlay, gl } = createOverlay();
    const video = { videoWidth: 640, videoHeight: 480 };
    const crop = { x: 0, y: 60, width: 640, height: 360 };
    overlay.renderLayers(grid, { video, crop }, createChannelTransition()('N', 0));

    expect(gl.uploads).toEqual([{ video, filter: 'linear' }]);
    expect(gl.passes).toHaveLength(3);
    expect(gl.passes[0]).toMatchObject({ sourceRect: [0, 0.125, 1, 0.75], mirror: 1, levels: 0 });
  });

  it('keeps sampled cells crisp and quantizes video greys on the GPU', () => {
    const { overlay, gl } = createOverlay();
    overlay.renderFlat(grid, { pixels });
    expect(gl.current.filter).toBe('nearest');

    const video = { videoWidth: 640, videoHeight: 480 };
    overlay.renderFlat(grid, { video, crop: { x: 0, y: 0, width: 640, height: 480 } }, 10);
    expect(gl.current.filter).toBe('linear');
    expect(gl.passes[1]).toMatchObject({ levels: 10, mirror: 1, channel: [1, 1, 1] });
  });
});
