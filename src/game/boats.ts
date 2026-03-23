/**
 * Boat System
 * Provides water traversal mechanics: boat purchase, dock interactions,
 * mount/dismount, water movement speed bonuses.
 */

import { ISLAND_ZONES, OPEN_WORLD_SIZE } from './zones';
import { WorldHeightmap, TerrainLayer } from './terrain-heightmap';

// ── Types ──────────────────────────────────────────────────────

export interface BoatDock {
  id: string;
  x: number;
  y: number;
  zoneId: number;
  zoneName: string;
}

export interface BoatState {
  owned: boolean;
  mounted: boolean;
  dockId: string | null;     // last dock used
  x: number;
  y: number;
  speed: number;             // base boat speed multiplier
  hp: number;
  maxHp: number;
}

export interface BoatPurchaseOption {
  id: string;
  name: string;
  cost: number;
  speed: number;
  hp: number;
  description: string;
}

// ── Boat Shop ──────────────────────────────────────────────────

export const BOAT_SHOP: BoatPurchaseOption[] = [
  {
    id: 'rowboat',
    name: 'Rowboat',
    cost: 200,
    speed: 1.5,
    hp: 50,
    description: 'A simple rowboat. Slow but gets the job done.',
  },
  {
    id: 'sloop',
    name: 'Sloop',
    cost: 800,
    speed: 2.0,
    hp: 120,
    description: 'A nimble single-mast vessel. Good speed.',
  },
  {
    id: 'warship',
    name: 'War Galley',
    cost: 2500,
    speed: 2.5,
    hp: 300,
    description: 'A fearsome warship. Fast and durable.',
  },
];

// ── Dock Generation ────────────────────────────────────────────

/** Auto-generate dock positions from zones with water terrain or port type */
export function generateDocks(): BoatDock[] {
  const docks: BoatDock[] = [];

  for (const zone of ISLAND_ZONES) {
    const needsDock =
      zone.terrainType === 'water' ||
      zone.islandType === 'port' ||
      // Coastal zones that connect to water zones
      zone.connectedZoneIds.some(id => {
        const other = ISLAND_ZONES.find(z => z.id === id);
        return other && other.terrainType === 'water';
      });

    if (!needsDock) continue;

    const b = zone.bounds;
    // Place dock at zone edge closest to water/center
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;

    // For water zones, place dock near center
    // For land zones adjacent to water, place dock at boundary edge
    let dockX = cx;
    let dockY = cy;

    if (zone.terrainType !== 'water') {
      // Find the connected water zone and place dock facing it
      for (const connId of zone.connectedZoneIds) {
        const other = ISLAND_ZONES.find(z => z.id === connId);
        if (other && other.terrainType === 'water') {
          const ox = other.bounds.x + other.bounds.w / 2;
          const oy = other.bounds.y + other.bounds.h / 2;
          const dx = ox - cx, dy = oy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            dockX = cx + (dx / dist) * (b.w / 2 - 60);
            dockY = cy + (dy / dist) * (b.h / 2 - 60);
          }
          break;
        }
      }
    }

    // Clamp to zone bounds
    dockX = Math.max(b.x + 40, Math.min(b.x + b.w - 40, dockX));
    dockY = Math.max(b.y + 40, Math.min(b.y + b.h - 40, dockY));

    docks.push({
      id: `dock-${zone.id}`,
      x: dockX,
      y: dockY,
      zoneId: zone.id,
      zoneName: zone.name,
    });
  }

  return docks;
}

// Pre-generate docks
export const BOAT_DOCKS: BoatDock[] = generateDocks();

// ── Boat State Factory ─────────────────────────────────────────

export function createBoatState(): BoatState {
  return {
    owned: false,
    mounted: false,
    dockId: null,
    x: 0,
    y: 0,
    speed: 1.5,
    hp: 50,
    maxHp: 50,
  };
}

export function loadBoatState(): BoatState {
  try {
    const raw = localStorage.getItem('grudge_boat_state');
    if (raw) return JSON.parse(raw);
  } catch {}
  return createBoatState();
}

export function saveBoatState(state: BoatState): void {
  try { localStorage.setItem('grudge_boat_state', JSON.stringify(state)); } catch {}
}

// ── Boat Purchase ──────────────────────────────────────────────

export function purchaseBoat(
  boatState: BoatState,
  option: BoatPurchaseOption,
  playerGold: number,
): { success: boolean; newGold: number; message: string } {
  if (playerGold < option.cost) {
    return { success: false, newGold: playerGold, message: `Need ${option.cost} gold (have ${playerGold})` };
  }
  if (boatState.owned && boatState.speed >= option.speed) {
    return { success: false, newGold: playerGold, message: 'You already have a better or equal boat!' };
  }

  boatState.owned = true;
  boatState.speed = option.speed;
  boatState.hp = option.hp;
  boatState.maxHp = option.hp;
  saveBoatState(boatState);

  return {
    success: true,
    newGold: playerGold - option.cost,
    message: `Purchased ${option.name}!`,
  };
}

// ── Mount / Dismount ───────────────────────────────────────────

const DOCK_INTERACT_RANGE = 120;
const AUTO_DISMOUNT_RANGE = 80;

/** Find nearest dock within range */
export function getNearbyDock(x: number, y: number, range = DOCK_INTERACT_RANGE): BoatDock | null {
  let nearest: BoatDock | null = null;
  let nearestDist = range;
  for (const dock of BOAT_DOCKS) {
    const dx = dock.x - x, dy = dock.y - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = dock;
    }
  }
  return nearest;
}

/** Check if player should auto-mount boat */
export function shouldMount(
  playerX: number, playerY: number,
  boatState: BoatState,
  heightmap: WorldHeightmap,
): boolean {
  if (!boatState.owned || boatState.mounted) return false;
  // Must be near a dock and stepping into water
  const dock = getNearbyDock(playerX, playerY);
  if (!dock) return false;
  return heightmap.isWater(playerX, playerY);
}

/** Check if player should auto-dismount */
export function shouldDismount(
  playerX: number, playerY: number,
  boatState: BoatState,
  heightmap: WorldHeightmap,
): boolean {
  if (!boatState.mounted) return false;
  // Reached walkable dry ground near a dock
  const cell = heightmap.getCell(playerX, playerY);
  if (!cell) return false;
  if (cell.terrain === TerrainLayer.GROUND || cell.terrain === TerrainLayer.ROAD) {
    return getNearbyDock(playerX, playerY, AUTO_DISMOUNT_RANGE) !== null;
  }
  return false;
}

/** Mount the boat */
export function mountBoat(boatState: BoatState, playerX: number, playerY: number): void {
  boatState.mounted = true;
  boatState.x = playerX;
  boatState.y = playerY;
  const dock = getNearbyDock(playerX, playerY);
  if (dock) boatState.dockId = dock.id;
}

/** Dismount the boat */
export function dismountBoat(boatState: BoatState): void {
  boatState.mounted = false;
}

/** Update boat position to follow player */
export function updateBoatPosition(boatState: BoatState, playerX: number, playerY: number): void {
  if (boatState.mounted) {
    boatState.x = playerX;
    boatState.y = playerY;
  }
}

/** Get effective movement speed multiplier for current state */
export function getBoatSpeedMultiplier(boatState: BoatState, heightmap: WorldHeightmap, x: number, y: number): number {
  if (!boatState.mounted) return 1.0;
  const terrain = heightmap.getTerrainLayer(x, y);
  if (terrain === TerrainLayer.DEEP_WATER) return boatState.speed;
  if (terrain === TerrainLayer.SHALLOW_WATER) return boatState.speed * 0.8;
  return 1.0; // on land with boat = normal speed
}

// ── Dock Zones (which zones allow boat purchase) ───────────────

/** Zone IDs where boats can be purchased */
export const BOAT_SHOP_ZONES = new Set([11, 14]); // Pirate Cove, Fisherman's Haven

/** Check if player is in a zone where boats are sold */
export function canPurchaseBoatHere(zoneId: number): boolean {
  return BOAT_SHOP_ZONES.has(zoneId);
}
