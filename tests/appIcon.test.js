import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const { renderIcon, MAC_MARGIN } = require('../scripts/build-app-icons');
const forgeConfig = require('../forge.config');

const ROOT = path.join(__dirname, '..');
const ICON_DIR = path.join(ROOT, 'assets', 'icon');

// Pixels of a PNG written by scripts/build-app-icons.js (one IDAT, filter 0 rows).
function readPngPixels(file) {
  const png = fs.readFileSync(file);
  const size = png.readUInt32BE(16);
  let offset = 8;
  let data = Buffer.alloc(0);
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') data = Buffer.concat([data, png.subarray(offset + 8, offset + 8 + length)]);
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(data);
  const rows = [];
  for (let y = 0; y < size; y += 1) rows.push(raw.subarray(y * (size * 4 + 1) + 1, (y + 1) * (size * 4 + 1)));
  return { size, pixels: Buffer.concat(rows) };
}

describe('app icon', () => {
  it('is what the packager and the Windows installer are given', () => {
    const icon = forgeConfig.packagerConfig.icon;
    expect(fs.existsSync(`${icon}.icns`)).toBe(true);
    expect(fs.existsSync(`${icon}.ico`)).toBe(true);
    const squirrel = forgeConfig.makers.find((maker) => maker.name === '@electron-forge/maker-squirrel');
    expect(squirrel.config.setupIcon).toBe(`${icon}.ico`);
    expect(squirrel.config.iconUrl).toMatch(/\/main\/assets\/icon\/icon\.ico$/);
  });

  it('stays out of the packaged app', () => {
    expect(forgeConfig.packagerConfig.ignore.some((rule) => rule.test('/assets/icon/icon.ico'))).toBe(true);
  });

  it('matches the drawing script', () => {
    const { size, pixels } = readPngPixels(path.join(ICON_DIR, 'icon.png'));
    expect(size).toBe(1024);
    expect(pixels.equals(renderIcon(1024, MAC_MARGIN))).toBe(true);
  });

  it('draws the brand mark: bright corners and centre, dim edges, clear outside the plate', () => {
    const pixels = renderIcon(1024, MAC_MARGIN);
    const at = (x, y) => [...pixels.subarray((y * 1024 + x) * 4, (y * 1024 + x) * 4 + 4)];
    expect(at(512, 512)).toEqual([0, 229, 229, 255]);
    expect(at(512, 330)[1]).toBeLessThan(100);
    expect(at(512, 330)[3]).toBe(255);
    expect(at(10, 10)[3]).toBe(0);
  });

  it('holds every Windows size, 256px as PNG', () => {
    const ico = fs.readFileSync(path.join(ICON_DIR, 'icon.ico'));
    const count = ico.readUInt16LE(4);
    const entries = Array.from({ length: count }, (_, i) => ({
      size: ico[6 + 16 * i] || 256,
      offset: ico.readUInt32LE(6 + 16 * i + 12),
    }));
    expect(entries.map((entry) => entry.size)).toEqual([16, 24, 32, 48, 64, 128, 256]);
    const big = entries.find((entry) => entry.size === 256);
    expect(ico.subarray(big.offset, big.offset + 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});
