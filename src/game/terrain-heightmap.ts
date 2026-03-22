/**
 * Terrain Heightmap System
 * Consumes per-zone heightmaps from ai-map-gen and provides
 * walkability, elevation, and terrain layer queries for movement,
 * rendering, and AI pathfinding.
 */

import { ISLAND_ZONES, OPEN_WORLD_SIZE, ZONE_ROADS, RoadSegment } from './zones';
import { GeneratedWorldData, GeneratedZoneData } from './ai-map-gen';

// ── Constants ──────────────────────────────────────────────────

export const HM_CELL = 40; // cell size in world pixels (matches ai-map-gen)
export const HM_GRID_W = Math.ceil(OPEN_WORLD_SIZE / HM_CELL);
export const HM_GRID_H = Math.ceil(OPEN_WORLD_SIZE / HM_CELL);

// ── Terrain Layer ──────────────────────────────────────────────

export enum TerrainLayer {
  GROUND        = 0,
  SHALLOW_WATER = 1,
  DEEP_WATER    = 2,
  CLIFF         = 3,
  BRIDGE        = 4,
  ROAD          = 5,
  /** Low obstacle (stumps, fences, small ledges) — blocked on foot, clearable by jump/double-jump */
  LOW_OBSTACLE  = 6,
}

// ── Height Cell ────────────────────────────────────────────────

export interface HeightCell {
  elevation: number;     // raw noise value (0-4 typically)
  terrain: TerrainLayer;
  walkable: boolean;     // on foot
  boatable: boolean;     // with a boat
  waterDepth: number;    // 0 = dry, >0 = water depth
  zoneId: number;        // which zone owns this cell (-1 = wilderness)
}

// ── Elevation → Terrain mapping ────────────────────────────────

function elevationToLayer(elevation: number, zoneTerrain: string): { terrain: TerrainLayer; waterDepth: number } {
  // Water-type zones have lower water threshold
  const isWaterZone = zoneTerrain === 'water';

  if (elevation < 0) {
    return { terrain: TerrainLayer.DEEP_WATER, waterDepth: Math.abs(elevation) * 2 };
  }
  if (elevation === 0) {
    if (isWaterZone) {
      return { terrain: TerrainLayer.SHALLOW_WATER, waterDepth: 0.5 };
    }
    return { terrain: TerrainLayer.GROUND, waterDepth: 0 };
  }
  // Elevation 2 = low obstacles (stumps, small fences, ledges) — jumpable
  if (elevation === 2) {
    return { terrain: TerrainLayer.LOW_OBSTACLE, waterDepth: 0 };
  }
  if (elevation >= 3) {
    return { terrain: TerrainLayer.CLIFF, waterDepth: 0 };
  }
  return { terrain: TerrainLayer.GROUND, waterDepth: 0 };
}

// ── WorldHeightmap ─────────────────────────────────────────────

export class WorldHeightmap {
  private cells: Map<string, HeightCell> = new Map();

  /** Build heightmap from generated world data */
  constructor(worldData: GeneratedWorldData | null) {
    this.initDefault();
    if (worldData) {
      for (const zoneData of worldData.zones) {
        this.loadZoneHeightmap(zoneData);
      }
    }
    this.carveRoads();
    this.carvePlayerSpawns();
  }

  // ── Initialization ───────────────────────────────────────────

  /** Fill default cells for all zone areas (flat ground) */
  private initDefault(): void {
    for (const zone of ISLAND_ZONES) {
      const b = zone.bounds;
      const startTx = Math.floor(b.x / HM_CELL);
      const startTy = Math.floor(b.y / HM_CELL);
      const endTx = Math.ceil((b.x + b.w) / HM_CELL);
      const endTy = Math.ceil((b.y + b.h) / HM_CELL);

      for (let ty = startTy; ty < endTy; ty++) {
        for (let tx = startTx; tx < endTx; tx++) {
          const key = `${tx},${ty}`;
          if (!this.cells.has(key)) {
            const isWater = zone.terrainType === 'water';
            this.cells.set(key, {
              elevation: isWater ? 0 : 1,
              terrain: isWater ? TerrainLayer.SHALLOW_WATER : TerrainLayer.GROUND,
              walkable: true, // default walkable; heightmap overrides
              boatable: isWater,
              waterDepth: isWater ? 0.5 : 0,
              zoneId: zone.id,
            });
          }
        }
      }
    }
  }

  /** Load per-zone heightmap from GeneratedZoneData */
  private loadZoneHeightmap(zoneData: GeneratedZoneData): void {
    const zone = ISLAND_ZONES.find(z => z.id === zoneData.zoneId);
    if (!zone) return;

    const b = zone.bounds;
    const startTx = Math.floor(b.x / HM_CELL);
    const startTy = Math.floor(b.y / HM_CELL);
    const hm = zoneData.heightmap;
    if (!hm || hm.length === 0) return;

    for (let gy = 0; gy < hm.length; gy++) {
      for (let gx = 0; gx < (hm[gy]?.length ?? 0); gx++) {
        const elevation = hm[gy][gx];
        const tx = startTx + gx;
        const ty = startTy + gy;
        const key = `${tx},${ty}`;

        const { terrain, waterDepth } = elevationToLayer(elevation, zone.terrainType);
        const walkable = terrain === TerrainLayer.GROUND || terrain === TerrainLayer.ROAD || terrain === TerrainLayer.BRIDGE;
        const boatable = terrain === TerrainLayer.DEEP_WATER || terrain === TerrainLayer.SHALLOW_WATER || terrain === TerrainLayer.BRIDGE;

        this.cells.set(key, {
          elevation,
          terrain,
          walkable,
          boatable,
          waterDepth,
          zoneId: zone.id,
        });
      }
    }
  }

  // ── Road & Spawn Carving ─────────────────────────────────────

  /** Mark road cells as walkable, bridges as BRIDGE terrain */
  private carveRoads(): void {
    for (const road of ZONE_ROADS) {
      this.carveLine(road.from.x, road.from.y, road.to.x, road.to.y, road.width, road.type);
    }
  }

  private carveLine(x1: number, y1: number, x2: number, y2: number, width: number, type: string): void {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const steps = Math.ceil(dist / (HM_CELL * 0.5));
    const halfW = Math.ceil(width / HM_CELL / 2) + 1;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wx = x1 + dx * t;
      const wy = y1 + dy * t;
      const cx = Math.floor(wx / HM_CELL);
      const cy = Math.floor(wy / HM_CELL);

      for (let oy = -halfW; oy <= halfW; oy++) {
        for (let ox = -halfW; ox <= halfW; ox++) {
          const key = `${cx + ox},${cy + oy}`;
          const existing = this.cells.get(key);
          if (existing) {
            const isBridge = type === 'bridge';
            existing.terrain = isBridge ? TerrainLayer.BRIDGE : TerrainLayer.ROAD;
            existing.walkable = true;
            existing.boatable = isBridge || existing.boatable;
            existing.waterDepth = isBridge ? existing.waterDepth : 0;
          }
        }
      }
    }
  }

  /** Ensure all player spawns and NPC positions are walkable */
  private carvePlayerSpawns(): void {
    for (const zone of ISLAND_ZONES) {
      const positions = [
        ...zone.playerSpawns,
        ...zone.npcPositions,
        ...zone.portalPositions.map(p => ({ x: p.x, y: p.y })),
      ];
      for (const pos of positions) {
        const tx = Math.floor(pos.x / HM_CELL);
        const ty = Math.floor(pos.y / HM_CELL);
        // Carve a 3x3 area around each critical position
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const key = `${tx + ox},${ty + oy}`;
            const cell = this.cells.get(key);
            if (cell) {
              cell.walkable = true;
              cell.terrain = cell.terrain === TerrainLayer.BRIDGE ? TerrainLayer.BRIDGE : TerrainLayer.GROUND;
              cell.waterDepth = 0;
            } else {
              this.cells.set(key, {
                elevation: 1,
                terrain: TerrainLayer.GROUND,
                walkable: true,
                boatable: false,
                waterDepth: 0,
                zoneId: zone.id,
              });
            }
          }
        }
      }
    }
  }

  // ── Queries ──────────────────────────────────────────────────

  getCell(worldX: number, worldY: number): HeightCell | null {
    const tx = Math.floor(worldX / HM_CELL);
    const ty = Math.floor(worldY / HM_CELL);
    return this.cells.get(`${tx},${ty}`) ?? null;
  }

  getCellAt(tx: number, ty: number): HeightCell | null {
    return this.cells.get(`${tx},${ty}`) ?? null;
  }

  /** Can the player walk here on foot? */
  isWalkable(worldX: number, worldY: number, hasBoat: boolean): boolean {
    if (worldX < 0 || worldY < 0 || worldX >= OPEN_WORLD_SIZE || worldY >= OPEN_WORLD_SIZE) return false;
    const cell = this.getCell(worldX, worldY);
    if (!cell) {
      // Outside any zone = ocean water. Boats can navigate, walking cannot.
      return hasBoat;
    }
    if (cell.walkable) return true;
    if (hasBoat && cell.boatable) return true;
    // Allow shallow water on foot (slow wade)
    if (cell.terrain === TerrainLayer.SHALLOW_WATER) return true;
    return false;
  }

  /**
   * Can the player jump/vault over this cell?
   * Low obstacles (elevation 2, stumps, fences, small ledges) are clearable
   * during jump or double-jump. Cliffs and deep water remain impassable.
   */
  isJumpable(worldX: number, worldY: number): boolean {
    if (worldX < 0 || worldY < 0 || worldX >= OPEN_WORLD_SIZE || worldY >= OPEN_WORLD_SIZE) return false;
    const cell = this.getCell(worldX, worldY);
    if (!cell) return false;
    // Already walkable = always jumpable
    if (cell.walkable) return true;
    // Low obstacles (elevation 2) can be jumped over
    if (cell.terrain === TerrainLayer.LOW_OBSTACLE) return true;
    // Shallow water can be jumped through
    if (cell.terrain === TerrainLayer.SHALLOW_WATER) return true;
    return false;
  }

  /** Is this deep water requiring a boat? */
  isDeepWater(worldX: number, worldY: number): boolean {
    const cell = this.getCell(worldX, worldY);
    return cell?.terrain === TerrainLayer.DEEP_WATER;
  }

  /** Is this any water? */
  isWater(worldX: number, worldY: number): boolean {
    const cell = this.getCell(worldX, worldY);
    if (!cell) return true; // outside zones = ocean
    return cell.terrain === TerrainLayer.SHALLOW_WATER || cell.terrain === TerrainLayer.DEEP_WATER;
  }

  /** Get elevation at world position (interpolated) */
  getElevation(worldX: number, worldY: number): number {
    const cell = this.getCell(worldX, worldY);
    return cell?.elevation ?? 0;
  }

  /** Get terrain layer at world position */
  getTerrainLayer(worldX: number, worldY: number): TerrainLayer {
    const cell = this.getCell(worldX, worldY);
    return cell?.terrain ?? TerrainLayer.DEEP_WATER; // outside zones = ocean
  }

  /** Get water depth at world position */
  getWaterDepth(worldX: number, worldY: number): number {
    const cell = this.getCell(worldX, worldY);
    return cell?.waterDepth ?? 0;
  }

  /** Movement speed multiplier based on terrain */
  getSpeedMultiplier(worldX: number, worldY: number, hasBoat: boolean): number {
    const cell = this.getCell(worldX, worldY);
    if (!cell) return hasBoat ? 2.0 : 0; // ocean: fast by boat, impassable on foot
    switch (cell.terrain) {
      case TerrainLayer.ROAD: return 1.2;       // roads are faster
      case TerrainLayer.BRIDGE: return 1.1;
      case TerrainLayer.GROUND: return 1.0;
      case TerrainLayer.SHALLOW_WATER: return hasBoat ? 1.5 : 0.5; // wade slow, boat ok
      case TerrainLayer.DEEP_WATER: return hasBoat ? 2.0 : 0;      // boat only, fast
      case TerrainLayer.CLIFF: return 0;
      case TerrainLayer.LOW_OBSTACLE: return 0;  // blocked on foot, must jump
      default: return 1.0;
    }
  }

  /** Get all cells in the map (for testing/debug) */
  get size(): number { return this.cells.size; }

  /** Check if a grid cell is walkable (for pathfinding) */
  isGridWalkable(tx: number, ty: number, hasBoat: boolean): boolean {
    const cell = this.cells.get(`${tx},${ty}`);
    if (!cell) return hasBoat; // ocean = boats only
    if (cell.walkable) return true;
    if (hasBoat && cell.boatable) return true;
    if (cell.terrain === TerrainLayer.SHALLOW_WATER) return true;
    return false;
  }

  /** Get movement cost for a grid cell (for A* pathfinding) */
  getGridCost(tx: number, ty: number, hasBoat: boolean): number {
    const cell = this.cells.get(`${tx},${ty}`);
    if (!cell) return hasBoat ? 0.5 : Infinity; // ocean = cheap by boat, impassable on foot
    switch (cell.terrain) {
      case TerrainLayer.ROAD: return 0.8;
      case TerrainLayer.BRIDGE: return 0.9;
      case TerrainLayer.GROUND: return 1.0;
      case TerrainLayer.SHALLOW_WATER: return hasBoat ? 0.7 : 2.0;
      case TerrainLayer.DEEP_WATER: return hasBoat ? 0.5 : Infinity;
      case TerrainLayer.CLIFF: return Infinity;
      case TerrainLayer.LOW_OBSTACLE: return 3.0; // AI pathfinding: treat as expensive but not impassable
      default: return 1.0;
    }
  }
}

// ── Factory ────────────────────────────────────────────────────

export function createWorldHeightmap(worldData: GeneratedWorldData | null): WorldHeightmap {
  return new WorldHeightmap(worldData);
}
