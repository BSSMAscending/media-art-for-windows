// Opening 3D animation: the exhibit's maths on one 64×48 picture. Each pixel is a
// block; the loop shows the photo, brightness as height, the R/G/B layers of light
// pulled apart and added back, and the person as 1s. Falls back to the static
// screenshot when WebGL or the module cannot load.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const COLS = 64;
const ROWS = 48;
const COUNT = COLS * ROWS;
const FLAT = 0.15;
const LOOP = 18;
// A cell on the shirt whose numbers the caption follows.
const SAMPLE = { col: 30, row: 22 };

const stage = document.getElementById('heroStage');
const canvas = stage?.querySelector('canvas');

// Steps of the loop: when they start, what the caption says and which numbers show.
const STEPS = [
  {
    at: 0,
    ko: '사진 = 픽셀 3,072개',
    en: 'A photo = 3,072 pixels',
    sample: ({ r, g, b }) => `(R, G, B) = (${r}, ${g}, ${b})`,
  },
  {
    at: 2,
    ko: '밝기 = 숫자 = 높이',
    en: 'Brightness = number = height',
    sample: ({ r, g, b, grey }) => `0.299×${r} + 0.587×${g} + 0.114×${b} = ${grey}`,
  },
  {
    at: 6,
    ko: '빛의 삼원색: R · G · B',
    en: 'Primary colors of light: R · G · B',
    sample: ({ r, g, b }) => `R ${r} · G ${g} · B ${b}`,
  },
  {
    at: 11.5,
    ko: '사람이 있는 칸은 1, 나머지는 0',
    en: 'Person cells are 1, the rest are 0',
    sample: ({ person }) => (person ? '→ 1' : '→ 0'),
  },
];

// Camera keyframes: seconds, position, look-at target and up. The grid lies in x/y
// with heights in z; front views keep the picture upright (y up), oblique views
// stand the blocks up (z up).
const Y_UP = [0, 1, 0];
const Z_UP = [0, 0, 1];
const CAMERA_KEYS = [
  [0, [0, -6, 80], [0, 0, 0], Y_UP],
  [2, [0, -6, 80], [0, 0, 0], Y_UP],
  [4.5, [34, -48, 50], [0, 2, 4], Z_UP],
  [6, [30, -46, 52], [0, 2, 3], Z_UP],
  [8, [-30, -6, 104], [-6, 0, 4], Y_UP],
  [10.5, [-26, -8, 106], [-6, 0, 4], Y_UP],
  [12.5, [0, -46, 58], [0, 3, 2], Z_UP],
  [15.5, [6, -44, 60], [0, 3, 2], Z_UP],
  [17, [0, -6, 80], [0, 0, 0], Y_UP],
  [LOOP, [0, -6, 80], [0, 0, 0], Y_UP],
];

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
// 0 → 1 between seconds a and b, eased.
const ramp = (time, a, b) => smooth(clamp01((time - a) / (b - a)));

async function loadPixels(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  const sketch = document.createElement('canvas');
  sketch.width = COLS;
  sketch.height = ROWS;
  const context = sketch.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, COLS, ROWS);
  return context.getImageData(0, 0, COLS, ROWS).data;
}

// Unit block standing on z = 0; side faces are darker so the blocks read as solid
// without lighting, which keeps every top face its exact pixel colour.
function createBlockGeometry() {
  const geometry = new THREE.BoxGeometry(0.9, 0.9, 1);
  geometry.translate(0, 0, 0.5);
  const shades = [0.62, 0.62, 0.78, 0.5, 1, 0.35];
  const colors = [];
  for (let face = 0; face < 6; face++) {
    for (let vertex = 0; vertex < 4; vertex++)
      colors.push(shades[face], shades[face], shades[face]);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

async function start() {
  const [pixels, mask] = await Promise.all([
    loadPixels('assets/scene-64x48.png'),
    loadPixels('assets/person-64x48.png'),
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#020306');
  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 600);

  // Per-cell data: photo colour, brightness and whether the AI found a person.
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = (row * COLS + col) * 4;
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      cells.push({
        x: col - COLS / 2 + 0.5,
        y: ROWS / 2 - row - 0.5,
        r,
        g,
        b,
        grey: Math.round(0.299 * r + 0.587 * g + 0.114 * b),
        person: mask[i] > 127,
      });
    }
  }

  // Solid blocks: photo, height map and the 0/1 view.
  const blocks = new THREE.InstancedMesh(
    createBlockGeometry(),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
    COUNT
  );
  scene.add(blocks);

  // Three additive light layers for the R · G · B split; together they add up to the photo.
  const tile = new THREE.PlaneGeometry(0.92, 0.92);
  const layers = [0, 1, 2].map((channel) => {
    const mesh = new THREE.InstancedMesh(
      tile,
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
      COUNT
    );
    const color = new THREE.Color();
    const place = new THREE.Matrix4();
    cells.forEach((cell, index) => {
      place.makeTranslation(cell.x, cell.y, FLAT);
      mesh.setMatrixAt(index, place);
      const value = [cell.r, cell.g, cell.b][channel] / 255;
      color.setRGB(
        channel === 0 ? value : 0,
        channel === 1 ? value : 0,
        channel === 2 ? value : 0,
        THREE.SRGBColorSpace
      );
      mesh.setColorAt(index, color);
    });
    // Each light is a group, so pulling the layers apart only moves three transforms.
    const group = new THREE.Group();
    group.add(mesh);
    scene.add(group);
    return group;
  });

  // The followed cell, outlined in white.
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, 1.05, 1).translate(0, 0, 0.5)),
    new THREE.LineBasicMaterial({ color: '#ffffff' })
  );
  scene.add(outline);
  const sample = cells[SAMPLE.row * COLS + SAMPLE.col];

  const photo = cells.map((cell) =>
    new THREE.Color().setRGB(cell.r / 255, cell.g / 255, cell.b / 255, THREE.SRGBColorSpace)
  );
  photo.forEach((color, index) => blocks.setColorAt(index, color));
  const one = new THREE.Color('#29f3f3');
  const zero = new THREE.Color('#0b2226');
  const mixed = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const target = new THREE.Vector3();
  const pointer = { x: 0, y: 0 };

  // Reduced motion shows one still frame: the R/G/B layers pulled apart.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stillTime = 9.5;
  let running = false;
  let visible = true;
  let clock = 0;
  let last = null;

  // Caption chips in both languages; the page shows the chosen one.
  const stepKo = stage.querySelector('.stage-step[data-l="ko"]');
  const stepEn = stage.querySelector('.stage-step[data-l="en"]');
  const sampleLine = stage.querySelector('.stage-sample');
  const dots = [...stage.querySelectorAll('.stage-dots li')];
  let shownStep = -1;

  function showStep(index) {
    if (index === shownStep) return;
    shownStep = index;
    stepKo.textContent = STEPS[index].ko;
    stepEn.textContent = STEPS[index].en;
    sampleLine.textContent = STEPS[index].sample(sample);
    dots.forEach((dot, i) => dot.classList.toggle('is-on', i === index));
  }

  function placeCamera(time) {
    let k = 0;
    while (k < CAMERA_KEYS.length - 2 && time >= CAMERA_KEYS[k + 1][0]) k++;
    const [t0, p0, a0, u0] = CAMERA_KEYS[k];
    const [t1, p1, a1, u1] = CAMERA_KEYS[k + 1];
    const f = smooth(clamp01((time - t0) / (t1 - t0)));
    const mix = (from, to) => from.map((v, i) => v + (to[i] - v) * f);
    camera.position.set(...mix(p0, p1));
    target.set(...mix(a0, a1));
    camera.up.set(...mix(u0, u1)).normalize();
    // A little parallax from the pointer, so the scene answers the visitor.
    camera.position.x += pointer.x * 6;
    camera.position.z += pointer.y * 4;
    camera.lookAt(target);
  }

  function draw(time) {
    const rise = ramp(time, 2, 3.5) - ramp(time, 6, 7);
    const split = ramp(time, 7, 8.5) - ramp(time, 10.5, 11.5);
    const binary = ramp(time, 11.5, 13) - ramp(time, 15.5, 17);
    const lightsOn = time >= 7 && time < 11.5;

    blocks.visible = !lightsOn;
    layers.forEach((layer) => (layer.visible = lightsOn));

    cells.forEach((cell, index) => {
      if (!lightsOn) {
        const height = FLAT + rise * (cell.grey / 255) * 9 + binary * (cell.person ? 3 : 0);
        position.set(cell.x, cell.y, 0);
        scale.set(1, 1, height);
        matrix.compose(position, rotation, scale);
        blocks.setMatrixAt(index, matrix);
        mixed.copy(photo[index]).lerp(cell.person ? one : zero, binary);
        blocks.setColorAt(index, mixed);
      }
    });
    if (!lightsOn) {
      blocks.instanceMatrix.needsUpdate = true;
      blocks.instanceColor.needsUpdate = true;
    } else {
      // Fanned like cards, as in the app: turned sideways, red in front, blue behind.
      layers.forEach((layer, channel) => {
        const offset = 1 - channel;
        layer.rotation.y = -0.6 * split;
        layer.position.set(-offset * 17 * split, offset * 3 * split, offset * 22 * split);
      });
    }

    const sampleHeight = lightsOn
      ? 0.1
      : FLAT + rise * (sample.grey / 255) * 9 + binary * (sample.person ? 3 : 0);
    outline.visible = !lightsOn;
    outline.position.set(sample.x, sample.y, 0);
    outline.scale.set(1, 1, sampleHeight);

    let step = 0;
    STEPS.forEach((s, i) => {
      if (time >= s.at) step = i;
    });
    if (time >= 17) step = 0;
    showStep(step);
    placeCamera(time);
    renderer.render(scene, camera);
  }

  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => {
    resize();
    if (!running) draw(stillTime);
  }).observe(stage);
  resize();

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
  });
  stage.addEventListener('pointerleave', () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  function frame(now) {
    if (!running) return;
    if (last !== null) clock = (clock + Math.min(0.05, (now - last) / 1000)) % LOOP;
    last = now;
    draw(clock);
    requestAnimationFrame(frame);
  }

  function setRunning(next) {
    if (reduced || next === running) return;
    running = next;
    last = null;
    if (running) requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(visible && !document.hidden);
  }).observe(stage);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  stage.classList.add('is-3d');
  draw(reduced ? stillTime : 0);
  setRunning(!reduced);
  // Lets screenshots and tests jump to a moment of the loop.
  window.__heroSeek = (time) => {
    setRunning(false);
    clock = time;
    draw(time);
  };
}

if (stage && canvas) {
  start().catch((error) => {
    // The screenshot stays in place; the page works without the animation.
    console.warn('3D intro unavailable:', error);
  });
}
