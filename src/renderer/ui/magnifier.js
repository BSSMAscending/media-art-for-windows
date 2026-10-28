// Press-and-hold magnifier for the artwork (#40). Pressing the artwork shows a round
// lens with a fixed 3× view of the cells under the finger; it follows the finger
// while held and disappears on release, so small numbers can be read up close.

const ZOOM = 3;
// Lens sits this far above the finger so the finger never hides it.
const LENS_GAP = 28;
const CAPTION_GAP = 10;

/** Square of the screen the lens shows, centred on the pressed point. */
function getSourceRegion(point, lensSize, zoom = ZOOM) {
  const size = lensSize / zoom;
  return { left: point.x - size / 2, top: point.y - size / 2, size };
}

/**
 * Places the lens above the finger, or below when there is no room above, and
 * keeps it on screen.
 */
function getLensPlacement(point, lensSize, viewport) {
  const half = lensSize / 2;
  const above = point.y - LENS_GAP - lensSize;
  const top = above >= 0 ? above : Math.min(point.y + LENS_GAP, viewport.height - lensSize);
  const left = Math.max(0, Math.min(viewport.width - lensSize, point.x - half));
  return { left, top: Math.max(0, top) };
}

/**
 * Places the calculation caption on the far side of the lens from the finger,
 * centred on the lens and kept on screen.
 */
function getCaptionPlacement(lens, caption, point, viewport) {
  const lensAbove = lens.top + lens.size <= point.y;
  const top = lensAbove
    ? Math.max(0, lens.top - CAPTION_GAP - caption.height)
    : Math.min(viewport.height - caption.height, lens.top + lens.size + CAPTION_GAP);
  const centred = lens.left + (lens.size - caption.width) / 2;
  return { left: Math.max(0, Math.min(viewport.width - caption.width, centred)), top };
}

/**
 * Outlines the calculated cell in the lens. For blur and sharpen, `radius` also
 * outlines the neighbours it averages and `weights` (3×3) labels their weights.
 * `toLens` maps a screen point to lens pixels and `scale` is lens pixels per
 * screen pixel; `cell` is the cell's square on screen.
 */
function drawLensMarks(ctx, toLens, scale, cell, { radius = 0, weights = null } = {}) {
  const size = cell.size * scale;
  const line = Math.max(2, scale);
  ctx.save();
  if (radius) {
    const [x, y] = toLens(cell.left - radius * cell.size, cell.top - radius * cell.size);
    const span = size * (radius * 2 + 1);
    ctx.lineWidth = line;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.95)';
    ctx.setLineDash([line * 3, line * 2]);
    ctx.strokeRect(x, y, span, span);
    ctx.setLineDash([]);
  }
  if (weights) {
    const fontSize = Math.round(size * 0.22);
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    weights.forEach((weight, index) => {
      const [x, y] = toLens(
        cell.left + ((index % 3) - 1) * cell.size,
        cell.top + (Math.floor(index / 3) - 1) * cell.size
      );
      const label = `×${weight}`;
      const width = ctx.measureText(label).width + fontSize * 0.3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(x + size - width - line, y + line, width, fontSize * 1.05);
      ctx.fillStyle = '#00ffff';
      ctx.fillText(label, x + size - line - fontSize * 0.15, y + line + fontSize * 0.05);
    });
  }
  const [x, y] = toLens(cell.left, cell.top);
  ctx.lineWidth = line * 2.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeRect(x, y, size, size);
  ctx.lineWidth = line * 1.25;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x, y, size, size);
  ctx.restore();
}

/**
 * Maps the part of `region` that a source canvas covers to drawImage arguments:
 * source pixels in the canvas backing store and destination pixels in the lens.
 * Returns null when the canvas does not overlap the region.
 */
function mapLayer(region, rect, backing, zoom, ratio) {
  const left = Math.max(region.left, rect.left);
  const top = Math.max(region.top, rect.top);
  const right = Math.min(region.left + region.size, rect.left + rect.width);
  const bottom = Math.min(region.top + region.size, rect.top + rect.height);
  if (right <= left || bottom <= top || !rect.width || !rect.height) return null;
  const scaleX = backing.width / rect.width;
  const scaleY = backing.height / rect.height;
  const toLens = zoom * ratio;
  return {
    source: [
      (left - rect.left) * scaleX,
      (top - rect.top) * scaleY,
      (right - left) * scaleX,
      (bottom - top) * scaleY,
    ],
    target: [
      (left - region.left) * toLens,
      (top - region.top) * toLens,
      (right - left) * toLens,
      (bottom - top) * toLens,
    ],
  };
}

// `onPoint` hears every point the lens shows, so the cards can calculate that cell;
// `decorate(ctx, toLens, scale)` draws over the magnified picture (see drawLensMarks).
function createMagnifier({ area, getLayers, getArtworkRect, onPoint, decorate }) {
  const lens = document.createElement('div');
  lens.className = 'magnifier-lens';
  lens.hidden = true;
  lens.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  const badge = document.createElement('span');
  badge.className = 'magnifier-badge';
  badge.textContent = `× ${ZOOM}`;
  lens.append(canvas, badge);
  const marker = document.createElement('div');
  marker.className = 'magnifier-marker';
  marker.hidden = true;
  // The pressed cell's calculation, next to the lens where the visitor is looking.
  const caption = document.createElement('div');
  caption.className = 'magnifier-caption';
  caption.hidden = true;
  document.body.append(lens, marker, caption);
  const ctx = canvas.getContext('2d');

  let pointerId = null;
  const point = { x: 0, y: 0 };

  function lensSize() {
    return lens.getBoundingClientRect().width || 300;
  }

  function place() {
    const size = lensSize();
    const { left, top } = getLensPlacement(point, size, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    lens.style.transform = `translate(${left}px, ${top}px)`;
    const region = getSourceRegion(point, size);
    marker.style.transform = `translate(${region.left}px, ${region.top}px)`;
    marker.style.width = `${region.size}px`;
    marker.style.height = `${region.size}px`;
    if (caption.hidden) return;
    const box = caption.getBoundingClientRect();
    const spot = getCaptionPlacement(
      { left, top, size },
      { width: box.width, height: box.height },
      point,
      { width: window.innerWidth, height: window.innerHeight }
    );
    caption.style.transform = `translate(${spot.left}px, ${spot.top}px)`;
  }

  function follow(event) {
    // The lens stays over the artwork even if the finger slides off its edge.
    const rect = getArtworkRect();
    point.x = Math.max(rect.left, Math.min(rect.right, event.clientX));
    point.y = Math.max(rect.top, Math.min(rect.bottom, event.clientY));
    place();
    onPoint?.(point);
  }

  function show(event) {
    if (pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointerId = event.pointerId;
    try {
      // Keeps the lens following the finger even when it slides off the artwork.
      area.setPointerCapture(pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; following still works.
    }
    lens.hidden = false;
    marker.hidden = false;
    caption.hidden = !caption.textContent;
    follow(event);
    render();
  }

  function hide(event) {
    if (event && event.pointerId !== pointerId) return;
    pointerId = null;
    lens.hidden = true;
    marker.hidden = true;
    caption.hidden = true;
  }

  /** Shows `text` next to the lens while it is open. */
  function setCaption(text) {
    if (caption.textContent === text) return;
    caption.textContent = text;
    caption.hidden = !text || pointerId === null;
    if (!caption.hidden) place();
  }

  /** Copies the freshly drawn frame into the lens; call right after each frame. */
  function render() {
    if (pointerId === null) return;
    const size = lensSize();
    const ratio = window.devicePixelRatio || 1;
    const backing = Math.round(size * ratio);
    if (canvas.width !== backing) canvas.width = backing;
    if (canvas.height !== backing) canvas.height = backing;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, backing, backing);
    const region = getSourceRegion(point, size);
    for (const layer of getLayers()) {
      if (layer.hidden || !layer.width || !layer.height) continue;
      const mapped = mapLayer(region, layer.getBoundingClientRect(), layer, ZOOM, ratio);
      if (!mapped) continue;
      // Cells stay crisp blocks; the digit layer is smoothed so numbers stay legible.
      ctx.imageSmoothingEnabled = layer.dataset.smooth === 'true';
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(layer, ...mapped.source, ...mapped.target);
    }
    const scale = ZOOM * ratio;
    decorate?.(ctx, (x, y) => [(x - region.left) * scale, (y - region.top) * scale], scale);
  }

  area.addEventListener('pointerdown', show);
  area.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) follow(event);
  });
  area.addEventListener('pointerup', hide);
  area.addEventListener('pointercancel', hide);
  area.addEventListener('lostpointercapture', hide);
  // A long touch would otherwise open the context menu on Windows.
  area.addEventListener('contextmenu', (event) => event.preventDefault());

  return { render, setCaption, hide: () => hide({ pointerId }) };
}

module.exports = {
  createMagnifier,
  drawLensMarks,
  getSourceRegion,
  getLensPlacement,
  getCaptionPlacement,
  mapLayer,
  ZOOM,
};
