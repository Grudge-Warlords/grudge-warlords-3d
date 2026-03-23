/**
 * Advanced Spawner System
 * Replaces simple monsterSpawns with rich spawner types:
 * single, camp, patrol_route, boss_encounter, ambush.
 * Auto-generates from zone definitions with per-zone configs.
 */

import { ISLAND_ZONES, ZoneDef, MonsterSpawnDef } from './zones';
import { WorldHeightmap } from './terrain-heightmap';
import { generatePatrolRoute } from './pathfinding';

// ── Types ──────────────────────────────────────────────────────

export type SpawnerType = 'single' | 'camp' | 'patrol_route' | 'boss_encounter' | 'ambush';

export interface SpawnerEnemyDef {
  type: string;
  level: number;
  count: number;
  weight: number;  // for weighted random selection in camps
}

export interface SpawnerDef {
  id: string;
  zoneId: number;
  x: number;
  y: number;
  type: SpawnerType;
  enemyTypes: SpawnerEnemyDef[];
  respawnTime: number;       // seconds
  maxAlive: number;          // max enemies alive at once from this spawner
  aggroLink: boolean;        // all mobs aggro when one is pulled
  patrolWaypoints?: { x: number; y: number }[];  // for patrol_route
  triggerRadius?: number;    // for ambush (only spawn when player enters)
  eventId?: string;          // links to zone events
  bossPhases?: number;       // for boss_encounter: number of phases
}

export interface SpawnerInstance {
  def: SpawnerDef;
  aliveIds: Set<number>;     // enemy IDs currently alive from this spawner
  respawnTimer: number;      // countdown to next respawn batch
  triggered: boolean;        // for ambush: has player entered trigger radius?
  waveCount: number;         // for boss_encounter: current wave/phase
  active: boolean;           // whether this spawner is active (events can toggle)
}

// ── Spawner Manager ────────────────────────────────────────────

export class SpawnerManager {
  spawners: SpawnerInstance[] = [];
  private defMap: Map<string, SpawnerInstance> = new Map();

  constructor(defs: SpawnerDef[]) {
    for (const def of defs) {
      const inst: SpawnerInstance = {
        def,
        aliveIds: new Set(),
        respawnTimer: 0,
        triggered: def.type !== 'ambush', // non-ambush start triggered
        waveCount: 0,
        active: !def.eventId, // event-linked spawners start inactive
      };
      this.spawners.push(inst);
      this.defMap.set(def.id, inst);
    }
  }

  /** Get a spawner by ID */
  get(id: string): SpawnerInstance | undefined {
    return this.defMap.get(id);
  }

  /** Activate event-linked spawners */
  activateEvent(eventId: string): void {
    for (const s of this.spawners) {
      if (s.def.eventId === eventId) {
        s.active = true;
        s.triggered = true;
        s.waveCount = 0;
        s.respawnTimer = 0;
      }
    }
  }

  /** Deactivate event-linked spawners */
  deactivateEvent(eventId: string): void {
    for (const s of this.spawners) {
      if (s.def.eventId === eventId) {
        s.active = false;
      }
    }
  }

  /** Notify that an enemy died */
  onEnemyDeath(enemyId: number, spawnerId: string): void {
    const inst = this.defMap.get(spawnerId);
    if (inst) {
      inst.aliveIds.delete(enemyId);
      if (inst.aliveIds.size === 0 && inst.def.type === 'boss_encounter') {
        inst.waveCount++;
      }
    }
  }

  /** Register a newly spawned enemy */
  registerEnemy(enemyId: number, spawnerId: string): void {
    const inst = this.defMap.get(spawnerId);
    if (inst) inst.aliveIds.add(enemyId);
  }

  /**
   * Update all spawners. Returns list of spawn requests.
   */
  update(
    dt: number,
    playerX: number, playerY: number,
    spawnRadius: number,
  ): SpawnRequest[] {
    const requests: SpawnRequest[] = [];

    for (const s of this.spawners) {
      if (!s.active) continue;

      const def = s.def;
      const dx = playerX - def.x, dy = playerY - def.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only process spawners near player
      if (dist > spawnRadius) continue;

      // Ambush trigger check
      if (def.type === 'ambush' && !s.triggered) {
        if (dist < (def.triggerRadius ?? 200)) {
          s.triggered = true;
          s.respawnTimer = 0; // spawn immediately
        } else {
          continue;
        }
      }

      // Check if we need to spawn
      if (s.aliveIds.size >= def.maxAlive) continue;

      // Boss encounter: check wave state
      if (def.type === 'boss_encounter') {
        if (s.waveCount >= (def.bossPhases ?? 1) && s.aliveIds.size === 0) {
          s.active = false; // boss fully defeated
          continue;
        }
      }

      // Respawn timer
      if (s.aliveIds.size > 0 || s.respawnTimer > 0) {
        s.respawnTimer -= dt;
        if (s.respawnTimer > 0) continue;
      }

      // Generate spawn requests
      const toSpawn = def.maxAlive - s.aliveIds.size;
      for (let i = 0; i < toSpawn; i++) {
        // Pick enemy type (weighted for camps, sequential for others)
        const enemyDef = def.type === 'camp'
          ? weightedPick(def.enemyTypes)
          : def.enemyTypes[i % def.enemyTypes.length];
        if (!enemyDef) continue;

        // Position: spread around spawner, or along patrol route
        let spawnX = def.x;
        let spawnY = def.y;

        if (def.type === 'patrol_route' && def.patrolWaypoints && def.patrolWaypoints.length > 0) {
          const wp = def.patrolWaypoints[i % def.patrolWaypoints.length];
          spawnX = wp.x;
          spawnY = wp.y;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const spread = 20 + Math.random() * 80;
          spawnX += Math.cos(angle) * spread;
          spawnY += Math.sin(angle) * spread;
        }

        requests.push({
          spawnerId: def.id,
          enemyType: enemyDef.type,
          level: enemyDef.level,
          x: spawnX,
          y: spawnY,
          zoneId: def.zoneId,
          aggroLink: def.aggroLink,
          patrolWaypoints: def.type === 'patrol_route' ? def.patrolWaypoints : undefined,
          isBossWave: def.type === 'boss_encounter',
          bossPhase: s.waveCount,
        });
      }

      // Reset respawn timer after spawning
      s.respawnTimer = def.respawnTime;
    }

    return requests;
  }
}

export interface SpawnRequest {
  spawnerId: string;
  enemyType: string;
  level: number;
  x: number;
  y: number;
  zoneId: number;
  aggroLink: boolean;
  patrolWaypoints?: { x: number; y: number }[];
  isBossWave: boolean;
  bossPhase: number;
}

// ── Weighted Pick ──────────────────────────────────────────────

function weightedPick(items: SpawnerEnemyDef[]): SpawnerEnemyDef {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ── Per-Zone Spawner Overrides ─────────────────────────────────

/** Zone-specific spawner type assignments */
const ZONE_SPAWNER_TYPES: Record<number, {
  defaultType: SpawnerType;
  aggroLink: boolean;
  patrolRadius?: number;
  ambushRadius?: number;
  bossPhases?: number;
}> = {
  0:  { defaultType: 'single', aggroLink: false },                           // Starting Village - no combat
  1:  { defaultType: 'patrol_route', aggroLink: false, patrolRadius: 150, ambushRadius: 180 },  // Forest - patrols + ambush
  2:  { defaultType: 'camp', aggroLink: true, ambushRadius: 200 },           // Swamp - camps + water ambush
  3:  { defaultType: 'patrol_route', aggroLink: false, patrolRadius: 200 },  // Mountain Pass - cliff patrols
  4:  { defaultType: 'camp', aggroLink: true },                              // Dragon's Reach - camp clusters
  5:  { defaultType: 'patrol_route', aggroLink: true, patrolRadius: 120 },   // Undead Crypts - skeleton loops
  6:  { defaultType: 'patrol_route', aggroLink: false, patrolRadius: 180 },  // Volcano Rim - fire drake patrols
  7:  { defaultType: 'boss_encounter', aggroLink: true, bossPhases: 3 },     // Boss Arena - wave encounters
  8:  { defaultType: 'patrol_route', aggroLink: false, patrolRadius: 120 },  // Crusade Island - guard patrols
  9:  { defaultType: 'patrol_route', aggroLink: false, patrolRadius: 100 },  // Fabled Island - guard patrols
  10: { defaultType: 'single', aggroLink: false },                           // Legion Outpost - safe zone
  11: { defaultType: 'camp', aggroLink: true, ambushRadius: 250 },           // Pirate Cove - dock patrols + ambush
  12: { defaultType: 'patrol_route', aggroLink: true, patrolRadius: 100 },   // Dungeon Depths - corridor patrols
  13: { defaultType: 'boss_encounter', aggroLink: true, bossPhases: 2 },     // Graveyard of Titans - boss encounters
  14: { defaultType: 'single', aggroLink: false },                           // Fisherman's Haven - peaceful
  15: { defaultType: 'camp', aggroLink: true, ambushRadius: 200 },           // Piglin Outpost - coordinated camps
};

// ── Auto-Generation ────────────────────────────────────────────

/**
 * Convert existing zone monsterSpawns into SpawnerDefs.
 * Applies per-zone type overrides and generates patrol routes.
 */
export function generateSpawnerDefs(heightmap: WorldHeightmap): SpawnerDef[] {
  const defs: SpawnerDef[] = [];
  let nextId = 0;

  for (const zone of ISLAND_ZONES) {
    const config = ZONE_SPAWNER_TYPES[zone.id] ?? { defaultType: 'single' as SpawnerType, aggroLink: false };

    for (let si = 0; si < zone.monsterSpawns.length; si++) {
      const ms = zone.monsterSpawns[si];
      const isBoss = ms.type.includes('Dragon') || ms.type.includes('Lich') || ms.type.includes('Shadow') || ms.type.includes('Colossus');

      let type: SpawnerType = config.defaultType;
      if (isBoss) type = 'boss_encounter';

      // Determine if this should be an ambush (spiders, wolves in forest/jungle)
      const isAmbushType = ms.type === 'Spider' || ms.type === 'Dire Wolf' || ms.type === 'Wraith';
      if (isAmbushType && config.ambushRadius) type = 'ambush';

      // Generate patrol waypoints for patrol_route type
      let patrolWaypoints: { x: number; y: number }[] | undefined;
      if (type === 'patrol_route' && config.patrolRadius) {
        patrolWaypoints = generatePatrolRoute(
          ms.x, ms.y,
          config.patrolRadius,
          4 + Math.floor(Math.random() * 3),
          heightmap,
        );
      }

      const def: SpawnerDef = {
        id: `spawner-${zone.id}-${nextId++}`,
        zoneId: zone.id,
        x: ms.x,
        y: ms.y,
        type,
        enemyTypes: [{
          type: ms.type,
          level: ms.level,
          count: ms.count,
          weight: 1,
        }],
        respawnTime: ms.respawnTime,
        maxAlive: ms.count,
        aggroLink: config.aggroLink,
        patrolWaypoints,
        triggerRadius: type === 'ambush' ? (config.ambushRadius ?? 200) : undefined,
        bossPhases: type === 'boss_encounter' ? (config.bossPhases ?? 1) : undefined,
      };

      defs.push(def);
    }

    // Add extra guard patrols for safe/town zones
    if (zone.isSafeZone && zone.npcPositions.length >= 2) {
      const b = zone.bounds;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const guardPatrol = generatePatrolRoute(cx, cy, b.w / 3, 6, heightmap);
      if (guardPatrol.length >= 3) {
        defs.push({
          id: `spawner-guard-${zone.id}-${nextId++}`,
          zoneId: zone.id,
          x: cx,
          y: cy,
          type: 'patrol_route',
          enemyTypes: [], // guards are NPCs, not enemies — handled by AI behaviors
          respawnTime: 999,
          maxAlive: 0,
          aggroLink: false,
          patrolWaypoints: guardPatrol,
        });
      }
    }
  }

  return defs;
}

/**
 * Create a SpawnerManager from auto-generated defs.
 */
export function createSpawnerManager(heightmap: WorldHeightmap): SpawnerManager {
  const defs = generateSpawnerDefs(heightmap);
  return new SpawnerManager(defs);
}
