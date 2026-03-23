/**
 * AI Hero Brain — State machine that drives autonomous faction NPC heroes.
 *
 * Each AI hero runs this brain every tick. The brain decides what the hero
 * should be doing based on: current state, HP, nearby enemies, available
 * missions, harvestable resources, and faction relationships.
 *
 * States: idle_town → take_mission → travel → combat/harvest/explore/camp_destroy → return_home
 */

import { HeroData, HEROES, Vec2 } from './types';
import { ISLAND_ZONES, ZoneDef } from './zones';
import { WorldHeightmap, HM_CELL } from './terrain-heightmap';
import { findPath, PathResult } from './pathfinding';
import {
  Faction, FACTION_HOME_ZONE, FACTION_PATROL_ZONES,
  isHostile, isAllied, getFactionRelation,
} from './faction-system';

// ── AI State ───────────────────────────────────────────────────

export type AIHeroState =
  | 'idle_town'
  | 'take_mission'
  | 'travel'
  | 'harvest'
  | 'combat'
  | 'camp_destroy'
  | 'explore'
  | 'return_home'
  | 'social'
  | 'dead'
  | 'resting';

export interface AIHeroInstance {
  heroId: number;          // index into HEROES[]
  heroData: HeroData;

  // Position & movement
  x: number;
  y: number;
  facing: number;
  vx: number;
  vy: number;

  // Stats (mutable — level up, gear, etc)
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  gold: number;

  // AI state
  state: AIHeroState;
  stateTimer: number;      // time in current state
  targetX: number;         // where we're heading
  targetY: number;
  path: Vec2[];            // A* path waypoints
  pathIndex: number;       // current waypoint
  pathRecalcTimer: number;

  // Combat
  targetEntityId: number | null;
  attackTimer: number;
  abilityCooldowns: number[];

  // Mission
  activeMissionId: string | null;
  missionProgress: Record<string, number>; // objective target → current count

  // Harvesting
  harvestTimer: number;
  harvestTargetX: number;
  harvestTargetY: number;

  // Zone tracking
  currentZoneId: number;
  homeZoneId: number;
  visitedZones: Set<number>;

  // Social / chat
  lastChatTime: number;
  chatCooldown: number;
  chatBubble: string | null;
  chatBubbleTimer: number;

  // Debug
  decisionLog: string[];
  animState: string;
  dead: boolean;
  respawnTimer: number;
}

// ── Factory ────────────────────────────────────────────────────

export function createAIHero(heroId: number): AIHeroInstance {
  const hd = HEROES[heroId];
  if (!hd) throw new Error(`No hero data for id ${heroId}`);

  const faction = hd.faction as Faction;
  const homeZoneId = FACTION_HOME_ZONE[faction] ?? 0;
  const homeZone = ISLAND_ZONES.find(z => z.id === homeZoneId);
  const spawn = homeZone?.playerSpawns[0] ?? { x: 4000, y: 4000 };

  return {
    heroId,
    heroData: hd,
    x: spawn.x + (Math.random() - 0.5) * 200,
    y: spawn.y + (Math.random() - 0.5) * 200,
    facing: Math.random() * Math.PI * 2,
    vx: 0, vy: 0,

    level: 1,
    xp: 0,
    hp: hd.hp, maxHp: hd.hp,
    mp: hd.mp, maxMp: hd.mp,
    atk: hd.atk, def: hd.def, spd: hd.spd,
    gold: 100,

    state: 'idle_town',
    stateTimer: 0,
    targetX: 0, targetY: 0,
    path: [],
    pathIndex: 0,
    pathRecalcTimer: 0,

    targetEntityId: null,
    attackTimer: 0,
    abilityCooldowns: [0, 0, 0, 0],

    activeMissionId: null,
    missionProgress: {},

    harvestTimer: 0,
    harvestTargetX: 0, harvestTargetY: 0,

    currentZoneId: homeZoneId,
    homeZoneId,
    visitedZones: new Set([homeZoneId]),

    lastChatTime: 0,
    chatCooldown: 30,
    chatBubble: null,
    chatBubbleTimer: 0,

    decisionLog: [],
    animState: 'idle',
    dead: false,
    respawnTimer: 0,
  };
}

/** Create all 26 AI heroes */
export function createAllAIHeroes(): AIHeroInstance[] {
  return HEROES.map((_, i) => createAIHero(i));
}

// ── Brain Tick ──────────────────────────────────────────────────

export interface AIWorldContext {
  heightmap: WorldHeightmap | null;
  gameTime: number;
  dt: number;
  enemies: { id: number; x: number; y: number; hp: number; maxHp: number; faction: string; dead: boolean }[];
  harvestables: { x: number; y: number; resourceType: string; tier: number }[];
  allAIHeroes: AIHeroInstance[];
  playerX: number;
  playerY: number;
  playerFaction: string;
}

export function tickAIHero(hero: AIHeroInstance, ctx: AIWorldContext): void {
  hero.stateTimer += ctx.dt;
  hero.chatBubbleTimer = Math.max(0, hero.chatBubbleTimer - ctx.dt);
  if (hero.chatBubbleTimer <= 0) hero.chatBubble = null;

  // Cooldown ticks
  hero.attackTimer = Math.max(0, hero.attackTimer - ctx.dt);
  for (let i = 0; i < hero.abilityCooldowns.length; i++) {
    hero.abilityCooldowns[i] = Math.max(0, hero.abilityCooldowns[i] - ctx.dt);
  }
  hero.pathRecalcTimer = Math.max(0, hero.pathRecalcTimer - ctx.dt);

  // Regen when idle in town
  if (hero.state === 'idle_town' || hero.state === 'resting') {
    hero.hp = Math.min(hero.maxHp, hero.hp + ctx.dt * 10);
    hero.mp = Math.min(hero.maxMp, hero.mp + ctx.dt * 5);
  }

  // Dead check
  if (hero.dead) {
    hero.state = 'dead';
    hero.respawnTimer -= ctx.dt;
    if (hero.respawnTimer <= 0) {
      respawnHero(hero);
    }
    return;
  }

  // Zone detection
  hero.currentZoneId = detectZone(hero.x, hero.y);
  hero.visitedZones.add(hero.currentZoneId);

  // Threat scan — always check for hostile enemies
  const threat = scanThreats(hero, ctx);
  if (threat && hero.state !== 'combat' && hero.state !== 'dead') {
    if (hero.hp / hero.maxHp > 0.3) {
      logDecision(hero, `Engaging hostile: ${threat.faction} at ${Math.round(threat.x)},${Math.round(threat.y)}`);
      hero.state = 'combat';
      hero.targetEntityId = threat.id;
      hero.stateTimer = 0;
    }
  }

  // State machine
  switch (hero.state) {
    case 'idle_town': tickIdleTown(hero, ctx); break;
    case 'take_mission': tickTakeMission(hero, ctx); break;
    case 'travel': tickTravel(hero, ctx); break;
    case 'combat': tickCombat(hero, ctx); break;
    case 'harvest': tickHarvest(hero, ctx); break;
    case 'camp_destroy': tickCampDestroy(hero, ctx); break;
    case 'explore': tickExplore(hero, ctx); break;
    case 'return_home': tickReturnHome(hero, ctx); break;
    case 'social': tickSocial(hero, ctx); break;
    case 'resting': tickResting(hero, ctx); break;
  }
}

// ── State Handlers ─────────────────────────────────────────────

function tickIdleTown(hero: AIHeroInstance, ctx: AIWorldContext): void {
  hero.animState = 'idle';
  hero.vx = 0; hero.vy = 0;

  // Rest if low HP
  if (hero.hp < hero.maxHp * 0.8) {
    hero.state = 'resting';
    hero.stateTimer = 0;
    logDecision(hero, 'Resting to recover HP');
    return;
  }

  // After a few seconds idle, decide what to do
  if (hero.stateTimer > 3 + Math.random() * 5) {
    const roll = Math.random();

    if (roll < 0.4 && !hero.activeMissionId) {
      hero.state = 'take_mission';
      hero.stateTimer = 0;
      logDecision(hero, 'Looking for a mission');
    } else if (roll < 0.6) {
      // Go harvest
      const nearest = findNearestHarvestable(hero, ctx);
      if (nearest) {
        hero.state = 'harvest';
        hero.harvestTargetX = nearest.x;
        hero.harvestTargetY = nearest.y;
        hero.stateTimer = 0;
        logDecision(hero, `Going to harvest ${nearest.resourceType} at ${Math.round(nearest.x)},${Math.round(nearest.y)}`);
      } else {
        hero.state = 'explore';
        hero.stateTimer = 0;
        logDecision(hero, 'Exploring new areas');
      }
    } else if (roll < 0.8) {
      hero.state = 'explore';
      hero.stateTimer = 0;
      logDecision(hero, 'Exploring');
    } else {
      // Wander in town
      hero.stateTimer = 0;
      const zone = ISLAND_ZONES.find(z => z.id === hero.homeZoneId);
      if (zone) {
        hero.targetX = zone.bounds.x + Math.random() * zone.bounds.w;
        hero.targetY = zone.bounds.y + Math.random() * zone.bounds.h;
      }
    }
  }
}

function tickTakeMission(hero: AIHeroInstance, ctx: AIWorldContext): void {
  // This will be driven by ai-hero-missions.ts
  // For now, transition to explore after "thinking"
  if (hero.stateTimer > 2) {
    hero.state = 'explore';
    hero.stateTimer = 0;
    logDecision(hero, 'Mission accepted, heading out');
  }
}

function tickTravel(hero: AIHeroInstance, ctx: AIWorldContext): void {
  hero.animState = 'walk';
  followPath(hero, ctx);

  // Arrived?
  const dx = hero.targetX - hero.x, dy = hero.targetY - hero.y;
  if (dx * dx + dy * dy < 80 * 80) {
    logDecision(hero, `Arrived at destination ${Math.round(hero.targetX)},${Math.round(hero.targetY)}`);
    hero.state = hero.activeMissionId ? 'combat' : 'idle_town';
    hero.stateTimer = 0;
    hero.path = [];
  }

  // Timeout — give up after 60s of travel
  if (hero.stateTimer > 60) {
    hero.state = 'return_home';
    hero.stateTimer = 0;
    logDecision(hero, 'Travel timeout, returning home');
  }
}

function tickCombat(hero: AIHeroInstance, ctx: AIWorldContext): void {
  hero.animState = 'attack';

  // Find target
  const target = ctx.enemies.find(e => e.id === hero.targetEntityId && !e.dead);
  if (!target) {
    hero.state = hero.hp / hero.maxHp < 0.5 ? 'return_home' : 'idle_town';
    hero.targetEntityId = null;
    hero.stateTimer = 0;
    logDecision(hero, 'Target gone, disengaging');
    return;
  }

  const d = Math.sqrt((target.x - hero.x) ** 2 + (target.y - hero.y) ** 2);
  const isRanged = hero.heroData.heroClass === 'Mage' || hero.heroData.heroClass === 'Ranger';
  const attackRange = isRanged ? 300 : 80;

  // Low HP — retreat
  if (hero.hp / hero.maxHp < 0.2) {
    hero.state = 'return_home';
    hero.stateTimer = 0;
    hero.targetEntityId = null;
    logDecision(hero, 'HP critical, retreating');
    return;
  }

  if (d > attackRange) {
    // Move toward target
    moveToward(hero, target.x, target.y, ctx.dt);
    hero.animState = 'walk';
  } else {
    // Attack
    hero.facing = Math.atan2(target.y - hero.y, target.x - hero.x);
    hero.vx = 0; hero.vy = 0;
    if (hero.attackTimer <= 0) {
      hero.attackTimer = 1.5; // attack speed
      hero.animState = 'attack';
      // Damage is applied by the open-world system that reads our state
    }
  }

  // Timeout
  if (hero.stateTimer > 30) {
    hero.state = 'return_home';
    hero.stateTimer = 0;
    logDecision(hero, 'Combat timeout');
  }
}

function tickHarvest(hero: AIHeroInstance, ctx: AIWorldContext): void {
  const dx = hero.harvestTargetX - hero.x, dy = hero.harvestTargetY - hero.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > 60) {
    moveToward(hero, hero.harvestTargetX, hero.harvestTargetY, ctx.dt);
    hero.animState = 'walk';
    return;
  }

  // At harvest node
  hero.vx = 0; hero.vy = 0;
  hero.animState = 'harvest';
  hero.harvestTimer += ctx.dt;

  if (hero.harvestTimer > 5) {
    hero.harvestTimer = 0;
    hero.gold += 10 + Math.floor(Math.random() * 20);
    hero.xp += 15;
    logDecision(hero, `Harvested resource, gold=${hero.gold}`);

    // Find next or return
    const next = findNearestHarvestable(hero, ctx);
    if (next && Math.random() < 0.6) {
      hero.harvestTargetX = next.x;
      hero.harvestTargetY = next.y;
    } else {
      hero.state = 'return_home';
      hero.stateTimer = 0;
    }
  }
}

function tickCampDestroy(hero: AIHeroInstance, ctx: AIWorldContext): void {
  // Navigate to camp location, then fight
  const dx = hero.targetX - hero.x, dy = hero.targetY - hero.y;
  if (dx * dx + dy * dy > 120 * 120) {
    followPath(hero, ctx);
    hero.animState = 'walk';
  } else {
    hero.animState = 'attack';
    hero.vx = 0; hero.vy = 0;
    // Look for nearest enemy at the camp
    const nearby = ctx.enemies.filter(e => !e.dead && Math.sqrt((e.x - hero.x) ** 2 + (e.y - hero.y) ** 2) < 300);
    if (nearby.length > 0) {
      hero.targetEntityId = nearby[0].id;
      hero.state = 'combat';
      hero.stateTimer = 0;
    } else if (hero.stateTimer > 10) {
      hero.state = 'return_home';
      hero.stateTimer = 0;
      logDecision(hero, 'Camp cleared or empty');
    }
  }
}

function tickExplore(hero: AIHeroInstance, ctx: AIWorldContext): void {
  // Pick a random patrol zone and travel there
  if (hero.path.length === 0 || hero.stateTimer < 0.1) {
    const faction = hero.heroData.faction as Faction;
    const patrolZones = FACTION_PATROL_ZONES[faction] || [0];
    const targetZoneId = patrolZones[Math.floor(Math.random() * patrolZones.length)];
    const zone = ISLAND_ZONES.find(z => z.id === targetZoneId);
    if (zone) {
      hero.targetX = zone.bounds.x + zone.bounds.w / 2 + (Math.random() - 0.5) * zone.bounds.w * 0.6;
      hero.targetY = zone.bounds.y + zone.bounds.h / 2 + (Math.random() - 0.5) * zone.bounds.h * 0.6;
      recalcPath(hero, ctx);
      logDecision(hero, `Exploring toward ${zone.name}`);
    }
  }

  followPath(hero, ctx);
  hero.animState = 'walk';

  // Arrived or timeout
  const dx = hero.targetX - hero.x, dy = hero.targetY - hero.y;
  if (dx * dx + dy * dy < 100 * 100 || hero.stateTimer > 40) {
    hero.state = Math.random() < 0.5 ? 'idle_town' : 'return_home';
    hero.stateTimer = 0;
    hero.path = [];
  }
}

function tickReturnHome(hero: AIHeroInstance, ctx: AIWorldContext): void {
  const homeZone = ISLAND_ZONES.find(z => z.id === hero.homeZoneId);
  if (!homeZone) { hero.state = 'idle_town'; return; }

  const homeX = homeZone.playerSpawns[0]?.x ?? homeZone.bounds.x + homeZone.bounds.w / 2;
  const homeY = homeZone.playerSpawns[0]?.y ?? homeZone.bounds.y + homeZone.bounds.h / 2;

  hero.targetX = homeX;
  hero.targetY = homeY;

  const dx = homeX - hero.x, dy = homeY - hero.y;
  if (dx * dx + dy * dy < 150 * 150) {
    hero.state = 'idle_town';
    hero.stateTimer = 0;
    hero.path = [];
    logDecision(hero, 'Arrived home');
    return;
  }

  followPath(hero, ctx);
  hero.animState = 'walk';

  if (hero.stateTimer > 60) {
    // Teleport home if stuck
    hero.x = homeX;
    hero.y = homeY;
    hero.state = 'idle_town';
    hero.stateTimer = 0;
    hero.path = [];
    logDecision(hero, 'Teleported home (stuck)');
  }
}

function tickSocial(hero: AIHeroInstance, ctx: AIWorldContext): void {
  hero.animState = 'idle';
  hero.vx = 0; hero.vy = 0;
  if (hero.stateTimer > 8) {
    hero.state = 'idle_town';
    hero.stateTimer = 0;
  }
}

function tickResting(hero: AIHeroInstance, ctx: AIWorldContext): void {
  hero.animState = 'idle';
  hero.vx = 0; hero.vy = 0;
  if (hero.hp >= hero.maxHp * 0.95) {
    hero.state = 'idle_town';
    hero.stateTimer = 0;
    logDecision(hero, 'Fully rested');
  }
}

// ── Movement Helpers ───────────────────────────────────────────

function moveToward(hero: AIHeroInstance, tx: number, ty: number, dt: number): void {
  const dx = tx - hero.x, dy = ty - hero.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 5) return;
  const speed = hero.spd * 2;
  hero.vx = (dx / d) * speed;
  hero.vy = (dy / d) * speed;
  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  hero.facing = Math.atan2(dy, dx);
}

function followPath(hero: AIHeroInstance, ctx: AIWorldContext): void {
  if (hero.path.length === 0 || hero.pathRecalcTimer <= 0) {
    recalcPath(hero, ctx);
    hero.pathRecalcTimer = 5; // recalc every 5s
  }

  if (hero.pathIndex >= hero.path.length) {
    // Path complete
    hero.vx = 0; hero.vy = 0;
    return;
  }

  const wp = hero.path[hero.pathIndex];
  const dx = wp.x - hero.x, dy = wp.y - hero.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < 30) {
    hero.pathIndex++;
    return;
  }

  moveToward(hero, wp.x, wp.y, ctx.dt);
}

function recalcPath(hero: AIHeroInstance, ctx: AIWorldContext): void {
  if (!ctx.heightmap) {
    // No heightmap — direct movement
    hero.path = [{ x: hero.targetX, y: hero.targetY }];
    hero.pathIndex = 0;
    return;
  }

  const result = findPath(hero.x, hero.y, hero.targetX, hero.targetY, ctx.heightmap);
  if (result.found && result.path.length > 0) {
    hero.path = result.path;
    hero.pathIndex = 0;
  } else {
    // Fallback — direct line
    hero.path = [{ x: hero.targetX, y: hero.targetY }];
    hero.pathIndex = 0;
  }
}

// ── Utility ────────────────────────────────────────────────────

function detectZone(x: number, y: number): number {
  for (const z of ISLAND_ZONES) {
    if (x >= z.bounds.x && x <= z.bounds.x + z.bounds.w &&
        y >= z.bounds.y && y <= z.bounds.y + z.bounds.h) {
      return z.id;
    }
  }
  return -1; // wilderness
}

function scanThreats(hero: AIHeroInstance, ctx: AIWorldContext): typeof ctx.enemies[0] | null {
  const faction = hero.heroData.faction as Faction;
  let closest: typeof ctx.enemies[0] | null = null;
  let closestDist = 400; // aggro range

  for (const e of ctx.enemies) {
    if (e.dead) continue;
    if (!isHostile(faction, e.faction as Faction)) continue;

    const dx = e.x - hero.x, dy = e.y - hero.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < closestDist) {
      closestDist = d;
      closest = e;
    }
  }
  return closest;
}

function findNearestHarvestable(hero: AIHeroInstance, ctx: AIWorldContext): typeof ctx.harvestables[0] | null {
  let nearest: typeof ctx.harvestables[0] | null = null;
  let nearestDist = 2000;

  for (const h of ctx.harvestables) {
    const dx = h.x - hero.x, dy = h.y - hero.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = h;
    }
  }
  return nearest;
}

function respawnHero(hero: AIHeroInstance): void {
  const homeZone = ISLAND_ZONES.find(z => z.id === hero.homeZoneId);
  const spawn = homeZone?.playerSpawns[0] ?? { x: 4000, y: 4000 };
  hero.x = spawn.x + (Math.random() - 0.5) * 100;
  hero.y = spawn.y + (Math.random() - 0.5) * 100;
  hero.hp = hero.maxHp;
  hero.mp = hero.maxMp;
  hero.dead = false;
  hero.state = 'resting';
  hero.stateTimer = 0;
  hero.path = [];
  hero.targetEntityId = null;
  logDecision(hero, 'Respawned at home');
}

function logDecision(hero: AIHeroInstance, msg: string): void {
  const entry = `[${hero.heroData.name}] ${msg}`;
  hero.decisionLog.push(entry);
  if (hero.decisionLog.length > 50) hero.decisionLog.shift();
}

// ── Serialization (for persistence) ────────────────────────────

export interface AIHeroSaveData {
  heroId: number;
  x: number; y: number;
  level: number; xp: number;
  hp: number; mp: number;
  gold: number;
  state: AIHeroState;
  activeMissionId: string | null;
  missionProgress: Record<string, number>;
  visitedZones: number[];
}

export function serializeAIHero(hero: AIHeroInstance): AIHeroSaveData {
  return {
    heroId: hero.heroId,
    x: hero.x, y: hero.y,
    level: hero.level, xp: hero.xp,
    hp: hero.hp, mp: hero.mp,
    gold: hero.gold,
    state: hero.state,
    activeMissionId: hero.activeMissionId,
    missionProgress: { ...hero.missionProgress },
    visitedZones: Array.from(hero.visitedZones),
  };
}

export function loadAIHeroFromSave(save: AIHeroSaveData): AIHeroInstance {
  const hero = createAIHero(save.heroId);
  hero.x = save.x; hero.y = save.y;
  hero.level = save.level; hero.xp = save.xp;
  hero.hp = save.hp; hero.mp = save.mp;
  hero.gold = save.gold;
  hero.state = save.state;
  hero.activeMissionId = save.activeMissionId;
  hero.missionProgress = save.missionProgress;
  hero.visitedZones = new Set(save.visitedZones);
  return hero;
}
