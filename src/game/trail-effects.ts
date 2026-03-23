/**
 * Trail Effects System
 * Renders image-based glowing trails behind projectiles and spells.
 * 4 trail colors mapped to classes/elements:
 *   red    = fire / warrior
 *   green  = nature / ranger
 *   purple = arcane / mage
 *   orange = physical / worg
 */

// ── Trail Color Type ───────────────────────────────────────────
export type TrailColor = 'red' | 'green' | 'purple' | 'orange';

// ── Class → Trail Color mapping ────────────────────────────────
export const CLASS_TRAIL_COLOR: Record<string, TrailColor> = {
  Warrior: 'red',
  Ranger:  'green',
  Mage:    'purple',
  Worg:    'orange',
};

// ── Element → Trail Color mapping ──────────────────────────────
export const ELEMENT_TRAIL_COLOR: Record<string, TrailColor> = {
  fire:      'red',
  nature:    'green',
  poison:    'green',
  arcane:    'purple',
  frost:     'purple',
  lightning: 'purple',
  holy:      'orange',
  shadow:    'orange',
  physical:  'orange',
};

// ── Trail image paths ──────────────────────────────────────────
const TRAIL_PATHS: Record<TrailColor, string> = {
  red:    '/assets/effects/trails/trail_red.png',
  green:  '/assets/effects/trails/trail_green.png',
  purple: '/assets/effects/trails/trail_purple.png',
  orange: '/assets/effects/trails/trail_orange.png',
};

// ── Procedural trail generation (canvas-based glow) ────────────
function generateTrailCanvas(color: TrailColor): HTMLCanvasElement {
  const w = 256, h = 48;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const colors: Record<TrailColor, { core: string; mid: string; edge: string }> = {
    red:    { core: '#ffffff', mid: '#ff4444', edge: '#cc000000' },
    green:  { core: '#ffffcc', mid: '#66ff44', edge: '#22aa0000' },
    purple: { core: '#ffffff', mid: '#cc66ff', edge: '#8800cc00' },
    orange: { core: '#ffffff', mid: '#ffaa33', edge: '#cc660000' },
  };

  const c = colors[color];

  // Horizontal gradient (fade from left tip to right bright core)
  const hGrad = ctx.createLinearGradient(0, 0, w, 0);
  hGrad.addColorStop(0, 'transparent');
  hGrad.addColorStop(0.15, c.mid + '22');
  hGrad.addColorStop(0.5, c.mid + '88');
  hGrad.addColorStop(0.8, c.mid + 'dd');
  hGrad.addColorStop(1, c.core);

  // Vertical gradient (center bright, edges transparent)
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0, 'transparent');
  vGrad.addColorStop(0.25, c.mid + '66');
  vGrad.addColorStop(0.5, c.core + 'cc');
  vGrad.addColorStop(0.75, c.mid + '66');
  vGrad.addColorStop(1, 'transparent');

  // Draw outer glow
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);

  // Draw bright core line
  const coreGrad = ctx.createLinearGradient(0, 0, w, 0);
  coreGrad.addColorStop(0, 'transparent');
  coreGrad.addColorStop(0.3, c.core + '44');
  coreGrad.addColorStop(0.7, c.core + 'aa');
  coreGrad.addColorStop(1, c.core);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, h * 0.35, w, h * 0.3);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}

// ── Trail image cache ──────────────────────────────────────────
interface TrailImage {
  canvas: HTMLCanvasElement;    // Procedural fallback
  image: HTMLImageElement;      // Loaded PNG
  loaded: boolean;
}

const trailCache: Map<TrailColor, TrailImage> = new Map();

function getTrailImage(color: TrailColor): TrailImage {
  let entry = trailCache.get(color);
  if (entry) return entry;

  const canvas = generateTrailCanvas(color);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = TRAIL_PATHS[color];

  entry = { canvas, image: img, loaded: false };
  const e = entry;

  img.onload = () => { e.loaded = true; };
  img.onerror = () => { /* fallback to canvas */ };

  trailCache.set(color, entry);
  return entry;
}

// ── Preload all trail images ───────────────────────────────────
export function preloadTrails(): void {
  (['red', 'green', 'purple', 'orange'] as TrailColor[]).forEach(getTrailImage);
}

// ── Trail Position History ─────────────────────────────────────
interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

const trailHistory: Map<number, TrailPoint[]> = new Map();
const MAX_TRAIL_POINTS = 12;
const TRAIL_LIFETIME = 0.35; // seconds

/** Call each frame to record projectile position */
export function updateTrailPoint(projId: number, x: number, y: number, dt: number): void {
  let points = trailHistory.get(projId);
  if (!points) {
    points = [];
    trailHistory.set(projId, points);
  }

  // Add current position
  points.unshift({ x, y, age: 0 });

  // Age and prune
  for (let i = points.length - 1; i >= 0; i--) {
    points[i].age += dt;
    if (points[i].age > TRAIL_LIFETIME || i >= MAX_TRAIL_POINTS) {
      points.splice(i, 1);
    }
  }
}

/** Remove trail when projectile is destroyed */
export function removeTrail(projId: number): void {
  trailHistory.delete(projId);
}

/** Clear all trails */
export function clearAllTrails(): void {
  trailHistory.clear();
}

// ── Render Trail on 2D Canvas ──────────────────────────────────

/**
 * Render a stretched trail image behind a projectile.
 * Call after camera transform is applied.
 */
export function renderTrail(
  ctx: CanvasRenderingContext2D,
  projId: number,
  headX: number,
  headY: number,
  angle: number,
  color: TrailColor,
  scale: number = 1.0,
  opacity: number = 1.0,
): void {
  const trail = getTrailImage(color);
  const src = trail.loaded ? trail.image : trail.canvas;

  const points = trailHistory.get(projId);
  if (!points || points.length < 2) {
    // Simple single-image trail
    const trailLen = 60 * scale;
    const trailW = 20 * scale;

    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(angle + Math.PI); // Trail points opposite to direction
    ctx.globalAlpha = opacity * 0.8;
    ctx.drawImage(src, 0, -trailW / 2, trailLen, trailW);
    ctx.restore();
    return;
  }

  // Multi-segment trail with fading
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen < 1) continue;

    const segAngle = Math.atan2(dy, dx);
    const fadeT = i / points.length;
    const segAlpha = (1 - fadeT) * 0.9;
    const segWidth = (1 - fadeT * 0.5) * 16 * scale;

    ctx.save();
    ctx.translate(p0.x, p0.y);
    ctx.rotate(segAngle);
    ctx.globalAlpha = opacity * segAlpha;
    ctx.drawImage(src, 0, -segWidth / 2, segLen, segWidth);
    ctx.restore();
  }
  ctx.restore();
}

// ── Render Trail for AoE / Spell usage ─────────────────────────

/**
 * Render a large trail image as a spell aimed visual (e.g., beam or aimed attack indicator).
 */
export function renderSpellTrail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  color: TrailColor,
  opacity: number = 0.8,
): void {
  const trail = getTrailImage(color);
  const src = trail.loaded ? trail.image : trail.canvas;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = opacity;
  ctx.drawImage(src, 0, -width / 2, length, width);
  ctx.restore();
}

/**
 * Render a circular AoE using multiple rotated trail images to create a vortex-like effect.
 */
export function renderAoeTrailRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: TrailColor,
  rotation: number,
  opacity: number = 0.6,
): void {
  const trail = getTrailImage(color);
  const src = trail.loaded ? trail.image : trail.canvas;
  const segments = 8;
  const arcLen = (2 * Math.PI * radius) / segments;
  const trailW = radius * 0.25;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < segments; i++) {
    const a = rotation + (i / segments) * Math.PI * 2;
    const px = Math.cos(a) * radius;
    const py = Math.sin(a) * radius;
    const tangent = a + Math.PI / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(tangent);
    ctx.drawImage(src, -arcLen / 2, -trailW / 2, arcLen, trailW);
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
