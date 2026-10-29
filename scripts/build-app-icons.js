// Draws the app icon from the site's brand mark (site/favicon.svg): a 3×3 grid of
// cyan cells with the even ones dimmed, on a dark rounded plate in the site's
// colors. Writes assets/icon/icon.icns (macOS, through iconutil), icon.ico
// (Windows) and icon.png (1024px). No image library: the shapes are rectangles,
// so the script rasterizes them itself and writes PNG and ICO bytes directly.
// Usage: node scripts/build-app-icons.js   (macOS, for iconutil)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icon');

// site/style.css: --accent, and --surface-strong to --bg for the plate.
const ACCENT = [0x00, 0xe5, 0xe5];
const PLATE_TOP = [0x0b, 0x1a, 0x22];
const PLATE_BOTTOM = [0x02, 0x03, 0x06];
const DIM_ALPHA = 0.25;

// The brand mark is 22 units wide: three 6-unit cells with 2-unit gaps.
const CELL_UNITS = 6;
const GAP_UNITS = 2;
const MARK_UNITS = 3 * CELL_UNITS + 2 * GAP_UNITS;
const MARK_SHARE = 0.6; // of the plate's width
const CORNER_SHARE = 0.225; // corner radius over plate width, close to macOS's

// macOS draws icons on an 824px plate inside a 1024px canvas; Windows icons fill
// the canvas so the mark stays readable at 16px.
const MAC_MARGIN = 100 / 1024;
const SUPERSAMPLE = 4;

function cellLayout(plate) {
  const unit = (plate * MARK_SHARE) / MARK_UNITS;
  // Whole pixels keep the cells crisp at every size, like shape-rendering="crispEdges".
  let cell = Math.max(2, Math.round(unit * CELL_UNITS));
  const gap = Math.max(1, Math.round(unit * GAP_UNITS));
  // An odd leftover would put the mark a pixel off centre; one pixel more (or
  // less) per cell changes the width by three and evens it out.
  if ((plate - (3 * cell + 2 * gap)) % 2 === 1) {
    cell += 3 * (cell + 1) + 2 * gap <= plate - 2 ? 1 : -1;
  }
  return { cell, gap, span: 3 * cell + 2 * gap };
}

function insideRoundedRect(x, y, left, size, radius) {
  const right = left + size;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, left + radius), right - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 && x >= left && x <= right && y >= left && y <= right;
}

// RGBA pixels, not premultiplied.
function renderIcon(size, margin) {
  const inset = Math.round(size * margin);
  const plate = size - 2 * inset;
  const radius = plate * CORNER_SHARE;
  const { cell, gap, span } = cellLayout(plate);
  const origin = inset + (plate - span) / 2;
  const cellAt = (v) => {
    const offset = v - origin;
    if (offset < 0 || offset >= span) return -1;
    const index = Math.floor(offset / (cell + gap));
    return offset - index * (cell + gap) < cell ? index : -1;
  };

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const t = Math.min(Math.max((y - inset) / Math.max(1, plate - 1), 0), 1);
    const shade = PLATE_TOP.map((top, i) => top + (PLATE_BOTTOM[i] - top) * t);
    const row = cellAt(y);
    for (let x = 0; x < size; x += 1) {
      let covered = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = x + (sx + 0.5) / SUPERSAMPLE;
          const py = y + (sy + 0.5) / SUPERSAMPLE;
          if (insideRoundedRect(px, py, inset, plate, radius)) covered += 1;
        }
      }
      const alpha = covered / SUPERSAMPLE ** 2;
      let color = shade;
      const column = cellAt(x);
      if (row >= 0 && column >= 0) {
        // Even cells (counting from 1, as in the favicon) are dimmed.
        const strength = (row * 3 + column) % 2 === 1 ? DIM_ALPHA : 1;
        color = shade.map((c, i) => c + (ACCENT[i] - c) * strength);
      }
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round(color[0]);
      pixels[offset + 1] = Math.round(color[1]);
      pixels[offset + 2] = Math.round(color[2]);
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 6; // RGBA
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(Buffer.from([0]), pixels.subarray(y * size * 4, (y + 1) * size * 4));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// A 32-bit DIB for one ICO entry: bottom-up BGRA, then an all-zero AND mask
// (the alpha channel already says what is transparent).
function encodeIcoBitmap(size, pixels) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // the XOR image and the mask
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  const color = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const from = (y * size + x) * 4;
      const to = ((size - 1 - y) * size + x) * 4;
      color[to] = pixels[from + 2];
      color[to + 1] = pixels[from + 1];
      color[to + 2] = pixels[from];
      color[to + 3] = pixels[from + 3];
    }
  }
  const maskRow = Math.ceil(size / 32) * 4;
  return Buffer.concat([header, color, Buffer.alloc(maskRow * size)]);
}

// Small sizes as bitmaps, 256px as PNG: what Windows Explorer and rcedit expect.
function encodeIco(sizes, margin) {
  const images = sizes.map((size) => {
    const pixels = renderIcon(size, margin);
    return { size, data: size >= 256 ? encodePng(size, pixels) : encodeIcoBitmap(size, pixels) };
  });
  const directory = Buffer.alloc(6 + 16 * images.length);
  directory.writeUInt16LE(1, 2); // icon
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    directory[entry] = size >= 256 ? 0 : size;
    directory[entry + 1] = size >= 256 ? 0 : size;
    directory.writeUInt16LE(1, entry + 4); // planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([directory, ...images.map(({ data }) => data)]);
}

function writeIcns(file) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'app-icon-'));
  const iconset = path.join(temp, 'icon.iconset');
  fs.mkdirSync(iconset);
  for (const base of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const size = base * scale;
      const name = `icon_${base}x${base}${scale === 2 ? '@2x' : ''}.png`;
      fs.writeFileSync(path.join(iconset, name), encodePng(size, renderIcon(size, MAC_MARGIN)));
    }
  }
  try {
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', file]);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), encodePng(1024, renderIcon(1024, MAC_MARGIN)));
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), encodeIco([16, 24, 32, 48, 64, 128, 256], 0));
  writeIcns(path.join(OUT_DIR, 'icon.icns'));
  console.log(`Wrote icon.png, icon.ico and icon.icns to ${path.relative(process.cwd(), OUT_DIR)}`);
}

module.exports = { renderIcon, encodePng, encodeIco, cellLayout, MAC_MARGIN };
