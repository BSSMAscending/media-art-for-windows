const { getProjectionBounds } = require('./renderGeometry');

// Adapted from BusanMathVision: one cell texture drawn as additive R/G/B layers.
const VERTEX_SOURCE = `
attribute vec2 position;
varying vec2 uv;
uniform float offset;
uniform float depth;
uniform float angle;
uniform float scale;
uniform vec2 projection;
void main() {
  uv = vec2((position.x + 1.0) * 0.5, (1.0 - position.y) * 0.5);
  vec2 p = position * scale;
  float x = cos(angle) * p.x + sin(angle) * depth + offset;
  float z = -sin(angle) * p.x + cos(angle) * depth;
  // One shared camera keeps depth parallax; w >= 1 prevents perspective zoom.
  float w = 1.0 + 0.32 * (projection.x - z);
  gl_Position = vec4(vec2(x, p.y - offset * 0.3) / projection.y, 0.0, w);
}`;
const FRAGMENT_SOURCE = `
precision highp float;
varying vec2 uv;
uniform sampler2D cells;
uniform vec3 channel;
uniform float weight;
void main() {
  gl_FragColor = vec4(texture2D(cells, uv).rgb * channel * weight, 1.0);
}`;
const UNIFORMS = ['offset', 'depth', 'angle', 'scale', 'projection', 'channel', 'weight'];

/**
 * GPU layer behind the digit canvas. It covers only the artwork grid, so the side
 * column stays visible, and draws grid-sized pixels as crisp cell blocks.
 */
function createChannelOverlay(stage, beforeEl) {
  const canvas = document.createElement('canvas');
  canvas.className = 'channel-overlay';
  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl) throw new Error('WebGL is required for pixel rendering.');

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Pixel shader compilation failed: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Pixel shader linking failed: ' + gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {};
  for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, 'cells'), 0);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  // Additive blending: R + G + B layers sum back to the camera's real colour.
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 1);

  let gridTextureWidth = 0;
  let gridTextureHeight = 0;
  let contextLost = false;
  const projectionBounds = [0, 1];
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
  });

  function beginFrame(grid) {
    if (contextLost) throw new Error('Pixel WebGL context was lost. Restart the application.');
    canvas.hidden = false;
    const width = grid.cols * grid.cellSize;
    const height = grid.rows * grid.cellSize;
    canvas.style.left = `${grid.x}px`;
    canvas.style.top = `${grid.y}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ratio = window.devicePixelRatio || 1;
    const backingWidth = Math.round(width * ratio);
    const backingHeight = Math.round(height * ratio);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    gl.viewport(0, 0, backingWidth, backingHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function bindGridPixels(grid, pixels) {
    beginFrame(grid);
    if (gridTextureWidth !== grid.cols || gridTextureHeight !== grid.rows) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        grid.cols,
        grid.rows,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );
      gridTextureWidth = grid.cols;
      gridTextureHeight = grid.rows;
    } else {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        grid.cols,
        grid.rows,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );
    }
  }

  function drawPass(channel, weight, offset, depth, angle, scale) {
    gl.uniform3f(uniforms.channel, channel[0], channel[1], channel[2]);
    gl.uniform1f(uniforms.weight, weight);
    gl.uniform1f(uniforms.offset, offset);
    gl.uniform1f(uniforms.depth, depth);
    gl.uniform1f(uniforms.angle, angle);
    gl.uniform1f(uniforms.scale, scale);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    mount() {
      if (!canvas.isConnected) stage.insertBefore(canvas, beforeEl);
    },
    remove() {
      canvas.remove();
    },
    hide() {
      canvas.hidden = true;
    },
    /** Draws the cells as three additive R/G/B layers posed by `layers`. */
    renderLayers(grid, pixels, layers) {
      bindGridPixels(grid, pixels);
      getProjectionBounds(layers, projectionBounds);
      gl.uniform2f(uniforms.projection, projectionBounds[0], projectionBounds[1]);
      for (let c = 0; c < 3; c++) {
        if (layers.opacity[c] === 0) continue;
        drawPass(
          [c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0],
          layers.opacity[c],
          layers.offset[c],
          layers.depth[c],
          layers.angle[c],
          layers.scale[c]
        );
      }
    },
    /** Draws the cells' precomputed colours flat. */
    renderFlat(grid, pixels) {
      bindGridPixels(grid, pixels);
      gl.uniform2f(uniforms.projection, 0, 1);
      drawPass([1, 1, 1], 1, 0, 0, 0, 1);
    },
  };
}

module.exports = { createChannelOverlay };
