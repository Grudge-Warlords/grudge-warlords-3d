/**
 * AI Map Generation Engine
 * Procedural algorithms for terrain, biomes, enemies, settlements, roads, dungeons.
 * Used by world-editor, map-admin, and open-world runtime.
 */

// ── Simplex Noise (2D) ────────────────────────────────────────

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const GRAD2: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export class SimplexNoise {
  private perm: Uint8Array;

  constructor(seed = 0) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = x - X0, y0 = y - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;

    const ii = i & 255, jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 8;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;

    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2); }

    return 70 * (n0 + n1 + n2); // -1 to 1
  }

  /** Multi-octave fractal noise, returns 0-1 */
  fbm(x: number, y: number, octaves = 4, lacunarity = 2, persistence = 0.5): number {
    let value = 0, amplitude = 1, frequency = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      max += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return (value / max + 1) * 0.5; // normalize to 0-1
  }
}

// ── Seeded Random ──────────────────────────────────────────────

export class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed % 2147483647 || 1; }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
  intRange(min: number, max: number): number { return Math.floor(this.range(min, max + 1)); }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

// ── Types ──────────────────────────────────────────────────────

export interface GeneratedDecoration {
  x: number; y: number;
  type: string;
  scale: number;
  rotation: number;
}

export interface GeneratedBuilding {
  x: number; y: number;
  w: number; h: number;
  type: string;
  color: string;
  roofColor: string;
}

export interface GeneratedRoad {
  points: { x: number; y: number }[];
  width: number;
  type: 'dirt' | 'stone' | 'bridge';
}

export interface GeneratedEnemyCamp {
  x: number; y: number;
  enemies: { type: string; level: number; count: number }[];
  radius: number;
}

export interface GeneratedDungeonRoom {
  x: number; y: number;
  w: number; h: number;
  type: 'room' | 'corridor' | 'entrance' | 'boss';
  connections: number[]; // indices of connected rooms
}

export interface GeneratedZoneData {
  zoneId: number;
  decorations: GeneratedDecoration[];
  buildings: GeneratedBuilding[];
  roads: GeneratedRoad[];
  enemyCamps: GeneratedEnemyCamp[];
  heightmap: number[][]; // relative heightmap within zone bounds
  seed: number;
}

export interface GeneratedWorldData {
  version: number;
  zones: GeneratedZoneData[];
  globalRoads: GeneratedRoad[];
  timestamp: number;
}

// ── Biome Configuration ────────────────────────────────────────

export interface BiomeConfig {
  terrainType: string;
  decorations: { type: string; weight: number; minScale: number; maxScale: number }[];
  density: number;       // decorations per 100x100 area
  enemyTypes: { type: string; weight: number }[];
  buildingTypes: string[];
  roadType: 'dirt' | 'stone' | 'bridge';
  heightVariation: number; // 0-1
}

export const BIOME_CONFIGS: Record<string, BiomeConfig> = {
  grass: {
    terrainType: 'grass',
    decorations: [
      { type: 'tree', weight: 3, minScale: 0.8, maxScale: 1.5 },
      { type: 'pine_tree', weight: 2, minScale: 0.7, maxScale: 1.3 },
      { type: 'bush', weight: 4, minScale: 0.5, maxScale: 1.0 },
      { type: 'flower', weight: 3, minScale: 0.4, maxScale: 0.8 },
      { type: 'grass_tall', weight: 5, minScale: 0.3, maxScale: 0.7 },
      { type: 'rock', weight: 1, minScale: 0.5, maxScale: 1.2 },
      { type: 'clover', weight: 2, minScale: 0.3, maxScale: 0.6 },
    ],
    density: 8,
    enemyTypes: [
      { type: 'Slime', weight: 4 }, { type: 'Skeleton', weight: 2 },
      { type: 'Dire Wolf', weight: 1 }, { type: 'Bandit', weight: 2 },
    ],
    buildingTypes: ['house', 'inn', 'shop', 'well', 'mill'],
    roadType: 'dirt',
    heightVariation: 0.2,
  },
  jungle: {
    terrainType: 'jungle',
    decorations: [
      { type: 'tree_large', weight: 4, minScale: 1.0, maxScale: 2.0 },
      { type: 'tree', weight: 3, minScale: 0.9, maxScale: 1.8 },
      { type: 'fern', weight: 5, minScale: 0.4, maxScale: 1.0 },
      { type: 'bush', weight: 4, minScale: 0.6, maxScale: 1.2 },
      { type: 'mushroom', weight: 2, minScale: 0.3, maxScale: 0.8 },
      { type: 'plant', weight: 4, minScale: 0.3, maxScale: 0.7 },
      { type: 'tree_twisted', weight: 2, minScale: 1.0, maxScale: 1.6 },
    ],
    density: 14,
    enemyTypes: [
      { type: 'Spider', weight: 4 }, { type: 'Treant', weight: 2 },
      { type: 'Goblin Shaman', weight: 2 }, { type: 'Dire Wolf', weight: 3 },
    ],
    buildingTypes: ['camp', 'ruin'],
    roadType: 'dirt',
    heightVariation: 0.15,
  },
  water: {
    terrainType: 'water',
    decorations: [
      { type: 'grass_tall', weight: 4, minScale: 0.5, maxScale: 1.0 },
      { type: 'dead_tree', weight: 2, minScale: 0.8, maxScale: 1.4 },
      { type: 'mushroom', weight: 3, minScale: 0.3, maxScale: 0.7 },
      { type: 'rock', weight: 2, minScale: 0.6, maxScale: 1.0 },
      { type: 'bush', weight: 2, minScale: 0.4, maxScale: 0.8 },
      { type: 'fern', weight: 3, minScale: 0.3, maxScale: 0.6 },
    ],
    density: 6,
    enemyTypes: [
      { type: 'Slime', weight: 3 }, { type: 'Wraith', weight: 3 },
      { type: 'Imp', weight: 2 }, { type: 'Golem', weight: 1 },
    ],
    buildingTypes: ['dock', 'ruin'],
    roadType: 'bridge',
    heightVariation: 0.05,
  },
  stone: {
    terrainType: 'stone',
    decorations: [
      { type: 'rock', weight: 5, minScale: 0.6, maxScale: 1.8 },
      { type: 'rock_large', weight: 3, minScale: 1.0, maxScale: 2.5 },
      { type: 'mountain_rock_0', weight: 2, minScale: 1.5, maxScale: 3.0 },
      { type: 'mountain_rock_1', weight: 2, minScale: 1.5, maxScale: 3.0 },
      { type: 'pebble', weight: 4, minScale: 0.2, maxScale: 0.5 },
      { type: 'dead_tree', weight: 1, minScale: 0.7, maxScale: 1.2 },
      { type: 'bush', weight: 1, minScale: 0.3, maxScale: 0.6 },
    ],
    density: 10,
    enemyTypes: [
      { type: 'Golem', weight: 3 }, { type: 'Harpy', weight: 3 },
      { type: 'Bandit', weight: 2 }, { type: 'Corrupted Knight', weight: 1 },
    ],
    buildingTypes: ['fortress', 'tower', 'gate'],
    roadType: 'stone',
    heightVariation: 0.5,
  },
  dirt: {
    terrainType: 'dirt',
    decorations: [
      { type: 'rock', weight: 3, minScale: 0.5, maxScale: 1.4 },
      { type: 'dead_tree', weight: 2, minScale: 0.7, maxScale: 1.3 },
      { type: 'bush', weight: 2, minScale: 0.4, maxScale: 0.8 },
      { type: 'pebble', weight: 4, minScale: 0.2, maxScale: 0.5 },
      { type: 'gravestone', weight: 1, minScale: 0.6, maxScale: 1.0 },
      { type: 'grass_short', weight: 3, minScale: 0.3, maxScale: 0.6 },
    ],
    density: 7,
    enemyTypes: [
      { type: 'Skeleton', weight: 3 }, { type: 'Dark Mage', weight: 2 },
      { type: 'Dragon', weight: 1 }, { type: 'Fire Drake', weight: 2 },
    ],
    buildingTypes: ['camp', 'ruin', 'tower'],
    roadType: 'dirt',
    heightVariation: 0.3,
  },
};

// ── Poisson Disk Sampling ──────────────────────────────────────
// Generates well-spaced random points within a rectangle

function poissonDisk(
  rng: SeededRandom, width: number, height: number,
  minDist: number, maxAttempts = 30,
): { x: number; y: number }[] {
  const cellSize = minDist / Math.SQRT2;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const grid: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const points: { x: number; y: number }[] = [];
  const active: number[] = [];

  const addPoint = (x: number, y: number) => {
    const idx = points.length;
    points.push({ x, y });
    active.push(idx);
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) grid[row][col] = idx;
  };

  addPoint(rng.range(0, width), rng.range(0, height));

  while (active.length > 0) {
    const ai = Math.floor(rng.next() * active.length);
    const pi = active[ai];
    const p = points[pi];
    let found = false;

    for (let k = 0; k < maxAttempts; k++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = minDist + rng.next() * minDist;
      const nx = p.x + Math.cos(angle) * dist;
      const ny = p.y + Math.sin(angle) * dist;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const col = Math.floor(nx / cellSize);
      const row = Math.floor(ny / cellSize);
      let tooClose = false;

      for (let dr = -2; dr <= 2 && !tooClose; dr++) {
        for (let dc = -2; dc <= 2 && !tooClose; dc++) {
          const r2 = row + dr, c2 = col + dc;
          if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols && grid[r2][c2] !== null) {
            const other = points[grid[r2][c2]!];
            const dx = other.x - nx, dy = other.y - ny;
            if (dx * dx + dy * dy < minDist * minDist) tooClose = true;
          }
        }
      }

      if (!tooClose) {
        addPoint(nx, ny);
        found = true;
        break;
      }
    }

    if (!found) active.splice(ai, 1);
  }

  return points;
}

// ── Weighted random pick ───────────────────────────────────────

function weightedPick<T extends { weight: number }>(rng: SeededRandom, items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng.next() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ── Biome Decoration Generator ─────────────────────────────────

export function generateBiomeDecorations(
  biome: BiomeConfig, bounds: { x: number; y: number; w: number; h: number },
  seed: number,
): GeneratedDecoration[] {
  const rng = new SeededRandom(seed);
  const noise = new SimplexNoise(seed);
  const decorations: GeneratedDecoration[] = [];

  const area = (bounds.w / 100) * (bounds.h / 100);
  const count = Math.floor(area * biome.density);

  // Use Poisson disk for well-spaced primary placement
  const minDist = Math.max(30, 100 / Math.sqrt(biome.density));
  const points = poissonDisk(rng, bounds.w, bounds.h, minDist);

  for (let i = 0; i < Math.min(points.length, count); i++) {
    const pt = points[i];
    const wx = bounds.x + pt.x;
    const wy = bounds.y + pt.y;

    // Use noise to create density variation (clusters)
    const densityNoise = noise.fbm(wx * 0.003, wy * 0.003, 3);
    if (densityNoise < 0.3) continue; // sparse areas

    const decoType = weightedPick(rng, biome.decorations);
    const scale = rng.range(decoType.minScale, decoType.maxScale);
    // Larger objects in high-noise areas
    const scaleBoost = densityNoise > 0.7 ? 1.2 : 1.0;

    decorations.push({
      x: wx, y: wy,
      type: decoType.type,
      scale: scale * scaleBoost,
      rotation: rng.range(0, 360),
    });
  }

  return decorations;
}

// ── Smart Enemy Placement ──────────────────────────────────────

export function generateEnemyCamps(
  biome: BiomeConfig, bounds: { x: number; y: number; w: number; h: number },
  baseLevel: number, seed: number,
): GeneratedEnemyCamp[] {
  const rng = new SeededRandom(seed + 7777);
  const camps: GeneratedEnemyCamp[] = [];

  // Determine camp count based on zone area
  const area = (bounds.w / 1000) * (bounds.h / 1000);
  const campCount = Math.floor(area * 2.5) + 2;

  // Use Poisson disk for spacing
  const points = poissonDisk(rng, bounds.w - 200, bounds.h - 200, 250);

  for (let i = 0; i < Math.min(points.length, campCount); i++) {
    const pt = points[i];
    const campX = bounds.x + pt.x + 100;
    const campY = bounds.y + pt.y + 100;

    // Camp size varies
    const isBoss = i === 0 && rng.next() < 0.3;
    const size = isBoss ? 3 : rng.intRange(1, 3);
    const enemies: { type: string; level: number; count: number }[] = [];

    for (let e = 0; e < size; e++) {
      const enemyDef = weightedPick(rng, biome.enemyTypes);
      const levelVariation = rng.intRange(-1, 2);
      enemies.push({
        type: enemyDef.type,
        level: Math.max(1, baseLevel + levelVariation),
        count: rng.intRange(1, 3),
      });
    }

    camps.push({
      x: campX, y: campY,
      enemies,
      radius: isBoss ? 150 : 80 + size * 20,
    });
  }

  return camps;
}

// ── Settlement Generator ───────────────────────────────────────

const BUILDING_TEMPLATES: Record<string, { w: number; h: number; color: string; roofColor: string }> = {
  house:    { w: 30, h: 25, color: '#8a7a5a', roofColor: '#5a3a2a' },
  inn:      { w: 40, h: 35, color: '#7a6a4a', roofColor: '#6a3a2a' },
  shop:     { w: 30, h: 28, color: '#9a8a6a', roofColor: '#4a4a3a' },
  well:     { w: 15, h: 15, color: '#5a5a6a', roofColor: '#4a4a5a' },
  mill:     { w: 35, h: 30, color: '#8a7a5a', roofColor: '#6a5a3a' },
  fortress: { w: 60, h: 55, color: '#5a5a6a', roofColor: '#3a3a4a' },
  tower:    { w: 20, h: 20, color: '#6a6a7a', roofColor: '#4a4a5a' },
  gate:     { w: 50, h: 15, color: '#5a5a5a', roofColor: '#3a3a3a' },
  camp:     { w: 25, h: 25, color: '#6a5a3a', roofColor: '#4a3a2a' },
  dock:     { w: 45, h: 20, color: '#7a6a4a', roofColor: '#5a4a2a' },
  ruin:     { w: 35, h: 30, color: '#4a4a4a', roofColor: '#3a3a3a' },
};

export function generateSettlement(
  biome: BiomeConfig, center: { x: number; y: number },
  size: 'small' | 'medium' | 'large', seed: number,
): GeneratedBuilding[] {
  const rng = new SeededRandom(seed + 3333);
  const buildings: GeneratedBuilding[] = [];
  const count = size === 'small' ? rng.intRange(3, 5)
    : size === 'medium' ? rng.intRange(6, 10)
    : rng.intRange(11, 16);

  const spreadRadius = size === 'small' ? 120 : size === 'medium' ? 200 : 300;

  // Place buildings in a rough grid/cluster
  const placed: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < count; i++) {
    const bType = rng.pick(biome.buildingTypes);
    const template = BUILDING_TEMPLATES[bType] || BUILDING_TEMPLATES.house;

    // Try to place without overlapping
    let bestX = center.x, bestY = center.y;
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = 40 + rng.next() * spreadRadius;
      const bx = center.x + Math.cos(angle) * dist;
      const by = center.y + Math.sin(angle) * dist;

      const overlaps = placed.some(p => {
        return Math.abs(p.x - bx) < (p.w + template.w) / 2 + 15
          && Math.abs(p.y - by) < (p.h + template.h) / 2 + 15;
      });

      if (!overlaps) { bestX = bx; bestY = by; break; }
    }

    buildings.push({
      x: bestX, y: bestY,
      w: template.w, h: template.h,
      type: bType,
      color: template.color,
      roofColor: template.roofColor,
    });
    placed.push({ x: bestX, y: bestY, w: template.w, h: template.h });
  }

  return buildings;
}

// ── Road Network Generator ─────────────────────────────────────

export function generateRoad(
  from: { x: number; y: number }, to: { x: number; y: number },
  type: 'dirt' | 'stone' | 'bridge', seed: number, windiness = 0.3,
): GeneratedRoad {
  const rng = new SeededRandom(seed + 5555);
  const points: { x: number; y: number }[] = [{ ...from }];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(3, Math.floor(dist / 200));

  // Midpoint displacement for natural curves
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const mx = from.x + dx * t;
    const my = from.y + dy * t;
    // Perpendicular offset for windiness
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const offset = (rng.next() - 0.5) * 2 * dist * windiness * 0.15;
    points.push({ x: mx + perpX * offset, y: my + perpY * offset });
  }

  points.push({ ...to });

  return {
    points,
    width: type === 'bridge' ? 14 : type === 'stone' ? 12 : 10,
    type,
  };
}

export function generateRoadNetwork(
  centers: { x: number; y: number; zoneId: number; connected: number[] }[],
  seed: number,
): GeneratedRoad[] {
  const rng = new SeededRandom(seed + 9999);
  const roads: GeneratedRoad[] = [];
  const visited = new Set<string>();

  for (const center of centers) {
    for (const connId of center.connected) {
      const key = [Math.min(center.zoneId, connId), Math.max(center.zoneId, connId)].join('-');
      if (visited.has(key)) continue;
      visited.add(key);

      const other = centers.find(c => c.zoneId === connId);
      if (!other) continue;

      const type = rng.next() > 0.7 ? 'stone' : 'dirt';
      roads.push(generateRoad(center, other, type as 'dirt' | 'stone', rng.intRange(0, 99999)));
    }
  }

  return roads;
}

// ── Dungeon Layout Generator ───────────────────────────────────

export function generateDungeonLayout(
  width: number, height: number, roomCount: number, seed: number,
): GeneratedDungeonRoom[] {
  const rng = new SeededRandom(seed + 1111);
  const rooms: GeneratedDungeonRoom[] = [];

  // Place entrance
  rooms.push({
    x: width / 2, y: height - 80,
    w: 120, h: 80,
    type: 'entrance',
    connections: [],
  });

  // Generate rooms with BSP-like placement
  for (let i = 0; i < roomCount - 2; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 30 && !placed; attempt++) {
      const rw = rng.intRange(80, 180);
      const rh = rng.intRange(60, 140);
      const rx = rng.range(rw / 2 + 20, width - rw / 2 - 20);
      const ry = rng.range(rh / 2 + 20, height - rh / 2 - 20);

      // Check overlap
      const overlaps = rooms.some(r => {
        return Math.abs(r.x - rx) < (r.w + rw) / 2 + 40
          && Math.abs(r.y - ry) < (r.h + rh) / 2 + 40;
      });

      if (!overlaps) {
        rooms.push({ x: rx, y: ry, w: rw, h: rh, type: 'room', connections: [] });
        placed = true;
      }
    }
  }

  // Boss room at the top
  rooms.push({
    x: width / 2, y: 80,
    w: 160, h: 120,
    type: 'boss',
    connections: [],
  });

  // Connect rooms with corridors (nearest neighbor)
  for (let i = 1; i < rooms.length; i++) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let j = 0; j < i; j++) {
      const dx = rooms[i].x - rooms[j].x;
      const dy = rooms[i].y - rooms[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; nearestIdx = j; }
    }
    rooms[i].connections.push(nearestIdx);
    rooms[nearestIdx].connections.push(i);
  }

  return rooms;
}

// ── Heightmap Generator ────────────────────────────────────────

export function generateHeightmap(
  gridW: number, gridH: number, variation: number, seed: number,
): number[][] {
  const noise = new SimplexNoise(seed + 2222);
  const map: number[][] = [];
  for (let y = 0; y < gridH; y++) {
    map[y] = [];
    for (let x = 0; x < gridW; x++) {
      const n = noise.fbm(x * 0.05, y * 0.05, 4);
      map[y][x] = Math.floor(n * variation * 4);
    }
  }
  return map;
}

// ── Full Zone Generator ────────────────────────────────────────

export function generateZoneData(
  zoneId: number,
  bounds: { x: number; y: number; w: number; h: number },
  terrainType: string,
  baseLevel: number,
  isSafeZone: boolean,
  islandType: string | undefined,
  seed: number,
): GeneratedZoneData {
  const biome = BIOME_CONFIGS[terrainType] || BIOME_CONFIGS.grass;

  const decorations = generateBiomeDecorations(biome, bounds, seed);

  const enemyCamps = isSafeZone ? [] : generateEnemyCamps(biome, bounds, baseLevel, seed);

  // Generate settlement for towns/villages
  const buildings: GeneratedBuilding[] = [];
  if (islandType === 'town' || islandType === 'village' || islandType === 'port' || isSafeZone) {
    const center = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
    const size = islandType === 'town' ? 'large' : isSafeZone ? 'medium' : 'small';
    buildings.push(...generateSettlement(biome, center, size, seed));
  }

  const gridW = Math.ceil(bounds.w / 40);
  const gridH = Math.ceil(bounds.h / 40);
  const heightmap = generateHeightmap(gridW, gridH, biome.heightVariation, seed);

  return {
    zoneId,
    decorations,
    buildings,
    roads: [],
    enemyCamps,
    heightmap,
    seed,
  };
}

// ── Full World Generator ───────────────────────────────────────

import { ISLAND_ZONES } from './zones';

export function generateFullWorld(seed: number): GeneratedWorldData {
  const zones: GeneratedZoneData[] = [];

  for (const zone of ISLAND_ZONES) {
    const zoneData = generateZoneData(
      zone.id, zone.bounds, zone.terrainType,
      zone.requiredLevel, zone.isSafeZone, zone.islandType, seed + zone.id * 137,
    );
    zones.push(zoneData);
  }

  // Generate inter-zone roads
  const centers = ISLAND_ZONES.map(z => ({
    x: z.bounds.x + z.bounds.w / 2,
    y: z.bounds.y + z.bounds.h / 2,
    zoneId: z.id,
    connected: z.connectedZoneIds,
  }));
  const globalRoads = generateRoadNetwork(centers, seed);

  return {
    version: 1,
    zones,
    globalRoads,
    timestamp: Date.now(),
  };
}

// ── Persistence ────────────────────────────────────────────────

const WORLD_GEN_KEY = 'grudge_generated_world';

export function saveGeneratedWorld(data: GeneratedWorldData): void {
  try { localStorage.setItem(WORLD_GEN_KEY, JSON.stringify(data)); } catch {}
}

export function loadGeneratedWorld(): GeneratedWorldData | null {
  try {
    const raw = localStorage.getItem(WORLD_GEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearGeneratedWorld(): void {
  localStorage.removeItem(WORLD_GEN_KEY);
}

// ── MOBA Map AI Tools ──────────────────────────────────────────

/** Fill a rectangular region with noise-blended terrain */
export function aiTerrainFill(
  terrain: number[][], gridSize: number,
  startTx: number, startTy: number, endTx: number, endTy: number,
  primaryType: number, secondaryType: number, seed: number, threshold = 0.5,
): number[][] {
  const noise = new SimplexNoise(seed);
  const result = terrain.map(row => [...row]);
  const minTx = Math.max(0, Math.min(startTx, endTx));
  const maxTx = Math.min(gridSize - 1, Math.max(startTx, endTx));
  const minTy = Math.max(0, Math.min(startTy, endTy));
  const maxTy = Math.min(gridSize - 1, Math.max(startTy, endTy));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const n = noise.fbm(tx * 0.08, ty * 0.08, 4);
      result[ty][tx] = n > threshold ? primaryType : secondaryType;
    }
  }
  return result;
}

/** Auto-scatter decorations in a region based on terrain type */
export function aiAutoScatter(
  terrain: number[][], tileSize: number,
  startTx: number, startTy: number, endTx: number, endTy: number,
  seed: number, density = 1.0,
): GeneratedDecoration[] {
  const rng = new SeededRandom(seed);
  const decorations: GeneratedDecoration[] = [];

  const minTx = Math.min(startTx, endTx);
  const maxTx = Math.max(startTx, endTx);
  const minTy = Math.min(startTy, endTy);
  const maxTy = Math.max(startTy, endTy);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (rng.next() > 0.15 * density) continue;
      const terrainIdx = terrain[ty]?.[tx] ?? 0;
      const terrainName = ['grass', 'dirt', 'stone', 'water', 'grass', 'jungle'][terrainIdx] || 'grass';
      const biome = BIOME_CONFIGS[terrainName];
      if (!biome) continue;

      const deco = weightedPick(rng, biome.decorations);
      decorations.push({
        x: tx * tileSize + rng.range(5, tileSize - 5),
        y: ty * tileSize + rng.range(5, tileSize - 5),
        type: deco.type,
        scale: rng.range(deco.minScale, deco.maxScale),
        rotation: rng.range(0, 360),
      });
    }
  }

  return decorations;
}

/** Generate biome preset for MOBA map */
export interface BiomePreset {
  name: string;
  primaryTerrain: number;
  secondaryTerrain: number;
  decoTypes: string[];
  density: number;
}

export const MOBA_BIOME_PRESETS: BiomePreset[] = [
  { name: 'Dense Forest', primaryTerrain: 5, secondaryTerrain: 0, decoTypes: ['tree', 'pine_tree', 'bush', 'fern'], density: 1.5 },
  { name: 'Rocky Mountain', primaryTerrain: 2, secondaryTerrain: 1, decoTypes: ['rock', 'rock_large', 'mountain_rock_0', 'pebble'], density: 1.2 },
  { name: 'Swamp', primaryTerrain: 3, secondaryTerrain: 5, decoTypes: ['dead_tree', 'mushroom', 'grass_tall', 'fern'], density: 0.8 },
  { name: 'Sandy Beach', primaryTerrain: 1, secondaryTerrain: 0, decoTypes: ['rock', 'bush', 'grass_short', 'pebble'], density: 0.5 },
  { name: 'Volcanic', primaryTerrain: 1, secondaryTerrain: 2, decoTypes: ['volcano_1', 'boulder_1', 'lava_pool', 'rock_large'], density: 1.0 },
  { name: 'Jungle Path', primaryTerrain: 9, secondaryTerrain: 5, decoTypes: ['tree_large', 'fern', 'bush', 'plant'], density: 1.8 },
];
