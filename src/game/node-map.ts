/**
 * Node Map — 3×3 World Grid System
 *
 * Grid layout (zones 1-9):
 *   1  2  3
 *   4  5  6
 *   7  8  9
 *
 * Zone 5 (center) = Starting area, levels 1-10
 * Each square = 10000×10000 world units
 * Total world = 30000×30000
 *
 * Only zone 5 is fully built. Others are stubs for future expansion.
 */

import { ZoneDef, ISLAND_ZONES, getZoneAtPosition } from './zones';

// ── Grid Constants ─────────────────────────────────────────────

export const NODE_SIZE = 10000;              // each square is 10000×10000
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const WORLD_SIZE = NODE_SIZE * GRID_COLS; // 30000

// ── Node Definitions ───────────────────────────────────────────

export interface NodeSquare {
  nodeId: number;       // 1-9
  gridX: number;        // 0-2 (column)
  gridY: number;        // 0-2 (row)
  name: string;
  biome: string;
  description: string;
  requiredLevel: number;
  unlocked: boolean;
  discovered: boolean;
  /** World-space bounds of this square */
  bounds: { x: number; y: number; w: number; h: number };
  /** Zone IDs that belong to this square */
  zoneIds: number[];
}

function makeNode(id: number, gx: number, gy: number, name: string, biome: string, desc: string, lvl: number, zoneIds: number[]): NodeSquare {
  return {
    nodeId: id,
    gridX: gx,
    gridY: gy,
    name,
    biome,
    description: desc,
    requiredLevel: lvl,
    unlocked: id === 5, // Only center unlocked by default
    discovered: id === 5,
    bounds: { x: gx * NODE_SIZE, y: gy * NODE_SIZE, w: NODE_SIZE, h: NODE_SIZE },
    zoneIds,
  };
}

export const NODE_SQUARES: NodeSquare[] = [
  // Row 0 (top): zones 1, 2, 3
  makeNode(1, 0, 0, 'Frozen Highlands', 'stone',  'Snow-capped mountains and frozen caves.',   15, []),
  makeNode(2, 1, 0, 'Undead Crypts',    'stone',  'Crumbling crypts filled with restless dead.', 12, [5]),
  makeNode(3, 2, 0, 'Graveyard of Titans','dirt',  'Ancient ruins where fallen titans rest.',    20, [13]),

  // Row 1 (middle): zones 4, 5, 6
  makeNode(4, 0, 1, "Dragon's Reach",   'dirt',   'Ancient dragon territory.',                 10, [4]),
  makeNode(5, 1, 1, 'Starting Lands',   'grass',  'The starting area. Safe zones, forests, swamps, mountains.', 1, [0, 1, 2, 3]),
  makeNode(6, 2, 1, 'Crusade Islands',  'grass',  'Fortified crusader stronghold and mystical towers.', 5, [8, 9, 14]),

  // Row 2 (bottom): zones 7, 8, 9
  makeNode(7, 0, 2, 'Volcano Rim',      'dirt',   'Scorched volcanic wasteland. PvP zone.',   15, [6]),
  makeNode(8, 1, 2, 'Boss Arena',       'stone',  'The final battleground. World bosses.',     18, [7, 12]),
  makeNode(9, 2, 2, 'Pirate Cove',      'water',  'Lawless pirate port. Ships dock here.',     6,  [10, 11, 15]),
];

// ── Lookups ────────────────────────────────────────────────────

export function getNodeById(id: number): NodeSquare | null {
  return NODE_SQUARES.find(n => n.nodeId === id) ?? null;
}

export function getNodeAtWorldPos(wx: number, wy: number): NodeSquare | null {
  const gx = Math.floor(wx / NODE_SIZE);
  const gy = Math.floor(wy / NODE_SIZE);
  return NODE_SQUARES.find(n => n.gridX === gx && n.gridY === gy) ?? null;
}

export function getAdjacentNodes(nodeId: number): NodeSquare[] {
  const node = getNodeById(nodeId);
  if (!node) return [];
  const adj: NodeSquare[] = [];
  for (const n of NODE_SQUARES) {
    const dx = Math.abs(n.gridX - node.gridX);
    const dy = Math.abs(n.gridY - node.gridY);
    if ((dx + dy === 1) && n.nodeId !== nodeId) adj.push(n);
  }
  return adj;
}

/** Get the center square's world offset (zone 5 = center) */
export function getCenterOffset(): { x: number; y: number } {
  return { x: NODE_SIZE, y: NODE_SIZE }; // (10000, 10000)
}

/** Check if a node is unlocked and discoverable */
export function canEnterNode(nodeId: number, playerLevel: number): boolean {
  const node = getNodeById(nodeId);
  if (!node) return false;
  return node.unlocked && playerLevel >= node.requiredLevel;
}

/** Unlock a node (called when player reaches edge of adjacent unlocked node) */
export function unlockNode(nodeId: number): void {
  const node = getNodeById(nodeId);
  if (node) { node.unlocked = true; node.discovered = true; }
}

// ── Zone 5 Sub-Areas ───────────────────────────────────────────
// Zone 5 (center square, 10000-20000) contains 4 sub-areas:
//   - Starting Town (center): walled village with Guild Hall, vendors, crafting
//   - Forest of Whispers (west): dense trees, herbs, low-level mobs
//   - Cursed Swamp (east): murky water, undead, mid-level mobs
//   - Mountain Pass (north): rocky terrain, mines, high-level mobs

export interface Zone5SubArea {
  id: string;
  name: string;
  bounds: { x: number; y: number; w: number; h: number };
  terrainType: string;
  isSafeZone: boolean;
  requiredLevel: number;
  description: string;
}

// Zone 5 internal coordinates (within 10000-20000 square)
const Z5 = NODE_SIZE; // offset = 10000

export const ZONE_5_AREAS: Zone5SubArea[] = [
  {
    id: 'starting-town',
    name: 'Starting Town',
    bounds: { x: Z5 + 4000, y: Z5 + 4000, w: 2000, h: 2000 },
    terrainType: 'grass',
    isSafeZone: true,
    requiredLevel: 1,
    description: 'A walled village with the Heroes Guild, vendors, and crafting.',
  },
  {
    id: 'forest-whispers',
    name: 'Forest of Whispers',
    bounds: { x: Z5 + 500, y: Z5 + 2500, w: 3500, h: 5000 },
    terrainType: 'jungle',
    isSafeZone: false,
    requiredLevel: 1,
    description: 'Dense woods with creatures, herbs, and lumber.',
  },
  {
    id: 'cursed-swamp',
    name: 'Cursed Swamp',
    bounds: { x: Z5 + 6000, y: Z5 + 2500, w: 3500, h: 5000 },
    terrainType: 'water',
    isSafeZone: false,
    requiredLevel: 5,
    description: 'Fetid swamp where the undead stir beneath murky waters.',
  },
  {
    id: 'mountain-pass',
    name: 'Mountain Pass',
    bounds: { x: Z5 + 2500, y: Z5 + 500, w: 5000, h: 2000 },
    terrainType: 'stone',
    isSafeZone: false,
    requiredLevel: 8,
    description: 'Treacherous mountain pass. PvP enabled.',
  },
  {
    id: 'south-plains',
    name: 'Southern Plains',
    bounds: { x: Z5 + 2000, y: Z5 + 7500, w: 6000, h: 2000 },
    terrainType: 'grass',
    isSafeZone: false,
    requiredLevel: 3,
    description: 'Open grasslands with grazing animals and gathering nodes.',
  },
];

/** Get the Zone5 sub-area at a world position */
export function getZone5Area(wx: number, wy: number): Zone5SubArea | null {
  for (const area of ZONE_5_AREAS) {
    const b = area.bounds;
    if (wx >= b.x && wx < b.x + b.w && wy >= b.y && wy < b.y + b.h) return area;
  }
  return null;
}

// ── Starting Town Wall Layout ──────────────────────────────────
// Stone wall perimeter with left/right gate entrances

export interface WallSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  thickness: number;
  isGate: boolean;
}

export function getStartingTownWalls(): WallSegment[] {
  const t = ZONE_5_AREAS[0].bounds; // Starting Town bounds
  const pad = 20; // wall inset from edge
  const thick = 16;
  const gateW = 120; // gate opening width
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;

  return [
    // Top wall (solid)
    { x1: t.x + pad, y1: t.y + pad, x2: t.x + t.w - pad, y2: t.y + pad, thickness: thick, isGate: false },
    // Bottom wall (solid)
    { x1: t.x + pad, y1: t.y + t.h - pad, x2: t.x + t.w - pad, y2: t.y + t.h - pad, thickness: thick, isGate: false },
    // Left wall (top half)
    { x1: t.x + pad, y1: t.y + pad, x2: t.x + pad, y2: cy - gateW / 2, thickness: thick, isGate: false },
    // Left gate opening
    { x1: t.x + pad, y1: cy - gateW / 2, x2: t.x + pad, y2: cy + gateW / 2, thickness: thick, isGate: true },
    // Left wall (bottom half)
    { x1: t.x + pad, y1: cy + gateW / 2, x2: t.x + pad, y2: t.y + t.h - pad, thickness: thick, isGate: false },
    // Right wall (top half)
    { x1: t.x + t.w - pad, y1: t.y + pad, x2: t.x + t.w - pad, y2: cy - gateW / 2, thickness: thick, isGate: false },
    // Right gate opening
    { x1: t.x + t.w - pad, y1: cy - gateW / 2, x2: t.x + t.w - pad, y2: cy + gateW / 2, thickness: thick, isGate: true },
    // Right wall (bottom half)
    { x1: t.x + t.w - pad, y1: cy + gateW / 2, x2: t.x + t.w - pad, y2: t.y + t.h - pad, thickness: thick, isGate: false },
  ];
}

// ── Collision Helpers ──────────────────────────────────────────

/** Check if a point collides with any wall segment */
export function collidesWithWall(wx: number, wy: number, radius: number): boolean {
  const walls = getStartingTownWalls();
  for (const w of walls) {
    if (w.isGate) continue; // Gates are passable
    // Line segment collision
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((wx - w.x1) * dx + (wy - w.y1) * dy) / len2));
    const closestX = w.x1 + t * dx;
    const closestY = w.y1 + t * dy;
    const distSq = (wx - closestX) ** 2 + (wy - closestY) ** 2;
    if (distSq < (radius + w.thickness / 2) ** 2) return true;
  }
  return false;
}

/** Check if a position is in deep water (impassable) */
export function isDeepWater(wx: number, wy: number): boolean {
  const area = getZone5Area(wx, wy);
  if (!area || area.terrainType !== 'water') return false;
  // Only deep water in the interior of the swamp is impassable
  // Edge tiles near land are passable (shallow)
  const b = area.bounds;
  const innerPad = 200;
  return (wx > b.x + innerPad && wx < b.x + b.w - innerPad &&
          wy > b.y + innerPad && wy < b.y + b.h - innerPad);
}
