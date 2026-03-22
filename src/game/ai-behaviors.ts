/**
 * AI Behavior Tree System
 * Provides composites (Sequence, Selector, Parallel), decorators, and leaf nodes.
 * Pre-built behavior trees for 7 enemy archetypes.
 * Replaces inline enemy AI in open-world.ts.
 */

import { WorldHeightmap } from './terrain-heightmap';
import { findPath, hasLineOfSight } from './pathfinding';

// ── Core Types ─────────────────────────────────────────────────

export type BehaviorStatus = 'success' | 'failure' | 'running';

/** Minimal entity interface for behavior tree context */
export interface AIEntity {
  id: number;
  x: number; y: number;
  hp: number; maxHp: number;
  atk: number; def: number;
  spd: number; rng: number;
  facing: number;
  dead: boolean;
  targetId: number | null;
  homeX: number; homeY: number;
  leashRange: number;
  attackTimer: number;
  attackCooldown: number;
  animState: string;
  animTimer: number;
  attackStyle: 'melee' | 'ranged' | 'aoe';
  isBoss: boolean;
  aggroLink?: boolean;
  patrolWaypoints?: { x: number; y: number }[];
  patrolIndex?: number;
  pathCache?: { x: number; y: number }[];
  pathCacheTimer?: number;
  fleeTimer?: number;
  alertCooldown?: number;
  packId?: string;
}

export interface AITarget {
  id: number;
  x: number; y: number;
  hp: number; maxHp: number;
  dead: boolean;
}

export interface AIContext {
  entity: AIEntity;
  target: AITarget | null;
  allEnemies: AIEntity[];
  heightmap: WorldHeightmap;
  dt: number;
  gameTime: number;
}

// ── Behavior Node Interface ────────────────────────────────────

export interface BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus;
  reset?(): void;
}

// ── Composites ─────────────────────────────────────────────────

/** Runs children in order; fails on first failure */
export class Sequence implements BehaviorNode {
  private children: BehaviorNode[];
  private runningIdx = 0;

  constructor(children: BehaviorNode[]) { this.children = children; }

  tick(ctx: AIContext): BehaviorStatus {
    for (let i = this.runningIdx; i < this.children.length; i++) {
      const status = this.children[i].tick(ctx);
      if (status === 'running') { this.runningIdx = i; return 'running'; }
      if (status === 'failure') { this.runningIdx = 0; return 'failure'; }
    }
    this.runningIdx = 0;
    return 'success';
  }

  reset(): void { this.runningIdx = 0; this.children.forEach(c => c.reset?.()); }
}

/** Runs children until one succeeds */
export class Selector implements BehaviorNode {
  private children: BehaviorNode[];
  private runningIdx = 0;

  constructor(children: BehaviorNode[]) { this.children = children; }

  tick(ctx: AIContext): BehaviorStatus {
    for (let i = this.runningIdx; i < this.children.length; i++) {
      const status = this.children[i].tick(ctx);
      if (status === 'running') { this.runningIdx = i; return 'running'; }
      if (status === 'success') { this.runningIdx = 0; return 'success'; }
    }
    this.runningIdx = 0;
    return 'failure';
  }

  reset(): void { this.runningIdx = 0; this.children.forEach(c => c.reset?.()); }
}

// ── Decorators ─────────────────────────────────────────────────

export class Inverter implements BehaviorNode {
  constructor(private child: BehaviorNode) {}
  tick(ctx: AIContext): BehaviorStatus {
    const s = this.child.tick(ctx);
    if (s === 'success') return 'failure';
    if (s === 'failure') return 'success';
    return 'running';
  }
}

export class Cooldown implements BehaviorNode {
  private timer = 0;
  constructor(private child: BehaviorNode, private cooldownSec: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    this.timer -= ctx.dt;
    if (this.timer > 0) return 'failure';
    const s = this.child.tick(ctx);
    if (s === 'success') this.timer = this.cooldownSec;
    return s;
  }
}

// ── Condition Nodes ────────────────────────────────────────────

export class IsPlayerInRange implements BehaviorNode {
  constructor(private range: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target || ctx.target.dead) return 'failure';
    return dist(ctx.entity, ctx.target) <= this.range ? 'success' : 'failure';
  }
}

export class IsHealthBelow implements BehaviorNode {
  constructor(private pct: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    return (ctx.entity.hp / ctx.entity.maxHp) < this.pct ? 'success' : 'failure';
  }
}

export class HasTarget implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    return ctx.target && !ctx.target.dead ? 'success' : 'failure';
  }
}

export class IsAtHome implements BehaviorNode {
  constructor(private range = 40) {}
  tick(ctx: AIContext): BehaviorStatus {
    const e = ctx.entity;
    return Math.abs(e.x - e.homeX) < this.range && Math.abs(e.y - e.homeY) < this.range ? 'success' : 'failure';
  }
}

export class HasLineOfSight implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target) return 'failure';
    return hasLineOfSight(ctx.entity.x, ctx.entity.y, ctx.target.x, ctx.target.y, ctx.heightmap) ? 'success' : 'failure';
  }
}

export class IsLeashed implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    const e = ctx.entity;
    const dx = e.x - e.homeX, dy = e.y - e.homeY;
    return Math.sqrt(dx * dx + dy * dy) > e.leashRange ? 'success' : 'failure';
  }
}

// ── Action Nodes ───────────────────────────────────────────────

export class MoveToTarget implements BehaviorNode {
  constructor(private stopRange = 0) {}
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target || ctx.target.dead) return 'failure';
    const e = ctx.entity;
    const d = dist(e, ctx.target);
    if (d <= this.stopRange) return 'success';

    moveToward(e, ctx.target.x, ctx.target.y, e.spd, ctx.dt, ctx.heightmap);
    e.animState = 'walk';
    e.facing = Math.atan2(ctx.target.y - e.y, ctx.target.x - e.x);
    return 'running';
  }
}

export class MoveToHome implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    const e = ctx.entity;
    const d = Math.sqrt((e.x - e.homeX) ** 2 + (e.y - e.homeY) ** 2);
    if (d < 30) { e.animState = 'idle'; return 'success'; }

    moveToward(e, e.homeX, e.homeY, e.spd * 1.3, ctx.dt, ctx.heightmap);
    e.animState = 'walk';
    e.facing = Math.atan2(e.homeY - e.y, e.homeX - e.x);
    e.targetId = null;
    return 'running';
  }
}

export class Patrol implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    const e = ctx.entity;
    if (!e.patrolWaypoints || e.patrolWaypoints.length === 0) return 'failure';

    const idx = e.patrolIndex ?? 0;
    const wp = e.patrolWaypoints[idx];
    const d = Math.sqrt((e.x - wp.x) ** 2 + (e.y - wp.y) ** 2);

    if (d < 30) {
      e.patrolIndex = (idx + 1) % e.patrolWaypoints.length;
      return 'running';
    }

    moveToward(e, wp.x, wp.y, e.spd * 0.6, ctx.dt, ctx.heightmap);
    e.animState = 'walk';
    e.facing = Math.atan2(wp.y - e.y, wp.x - e.x);
    return 'running';
  }
}

export class Idle implements BehaviorNode {
  private timer = 0;
  constructor(private duration: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    ctx.entity.animState = 'idle';
    this.timer += ctx.dt;
    if (this.timer >= this.duration) { this.timer = 0; return 'success'; }
    return 'running';
  }
  reset(): void { this.timer = 0; }
}

export class AttackTarget implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target || ctx.target.dead) return 'failure';
    const e = ctx.entity;
    e.attackTimer -= ctx.dt;
    e.facing = Math.atan2(ctx.target.y - e.y, ctx.target.x - e.x);

    if (e.attackTimer <= 0) {
      e.attackTimer = e.attackCooldown;
      e.animState = 'attack';
      e.animTimer = 0;
      return 'success'; // attack executed — open-world.ts handles damage
    }
    e.animState = 'idle';
    return 'running';
  }
}

export class Flee implements BehaviorNode {
  constructor(private fleeDistance: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target) return 'failure';
    const e = ctx.entity;
    const d = dist(e, ctx.target);
    if (d >= this.fleeDistance) return 'success';

    // Move away from target
    const angle = Math.atan2(e.y - ctx.target.y, e.x - ctx.target.x);
    const nx = e.x + Math.cos(angle) * e.spd * 1.2 * ctx.dt;
    const ny = e.y + Math.sin(angle) * e.spd * 1.2 * ctx.dt;
    if (ctx.heightmap.isWalkable(nx, e.y, false)) e.x = nx;
    if (ctx.heightmap.isWalkable(e.x, ny, false)) e.y = ny;
    e.facing = angle;
    e.animState = 'walk';
    return 'running';
  }
}

export class AlertNearby implements BehaviorNode {
  constructor(private range: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target) return 'failure';
    const e = ctx.entity;
    if (e.alertCooldown && e.alertCooldown > 0) return 'success'; // already alerted recently
    e.alertCooldown = 5; // 5 second cooldown

    for (const ally of ctx.allEnemies) {
      if (ally.id === e.id || ally.dead) continue;
      if (dist(e, ally) < this.range && !ally.targetId) {
        ally.targetId = ctx.target.id;
      }
    }
    return 'success';
  }
}

export class MaintainDistance implements BehaviorNode {
  constructor(private minDist: number, private maxDist: number) {}
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target) return 'failure';
    const e = ctx.entity;
    const d = dist(e, ctx.target);

    if (d < this.minDist) {
      // Too close, back off
      const angle = Math.atan2(e.y - ctx.target.y, e.x - ctx.target.x);
      const nx = e.x + Math.cos(angle) * e.spd * ctx.dt;
      const ny = e.y + Math.sin(angle) * e.spd * ctx.dt;
      if (ctx.heightmap.isWalkable(nx, e.y, false)) e.x = nx;
      if (ctx.heightmap.isWalkable(e.x, ny, false)) e.y = ny;
      e.facing = angle;
      e.animState = 'walk';
      return 'running';
    }
    if (d > this.maxDist) {
      // Too far, close in
      moveToward(e, ctx.target.x, ctx.target.y, e.spd, ctx.dt, ctx.heightmap);
      e.facing = Math.atan2(ctx.target.y - e.y, ctx.target.x - e.x);
      e.animState = 'walk';
      return 'running';
    }
    return 'success'; // in range
  }
}

export class SurroundTarget implements BehaviorNode {
  tick(ctx: AIContext): BehaviorStatus {
    if (!ctx.target) return 'failure';
    const e = ctx.entity;
    // Find pack members
    const pack = ctx.allEnemies.filter(a =>
      a.packId && a.packId === e.packId && !a.dead && a.id !== e.id
    );
    const packIdx = pack.findIndex(a => a.id === e.id);
    const totalPack = pack.length + 1;
    const angle = ((packIdx + 1) / totalPack) * Math.PI * 2;
    const surroundDist = 50 + totalPack * 10;

    const targetX = ctx.target.x + Math.cos(angle) * surroundDist;
    const targetY = ctx.target.y + Math.sin(angle) * surroundDist;

    moveToward(e, targetX, targetY, e.spd, ctx.dt, ctx.heightmap);
    e.facing = Math.atan2(ctx.target.y - e.y, ctx.target.x - e.x);
    e.animState = 'walk';

    return dist(e, { x: targetX, y: targetY }) < 20 ? 'success' : 'running';
  }
}

// ── Helpers ────────────────────────────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveToward(
  e: AIEntity, tx: number, ty: number,
  speed: number, dt: number,
  heightmap: WorldHeightmap,
): void {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return;
  const step = Math.min(speed * dt, d);
  const nx = e.x + (dx / d) * step;
  const ny = e.y + (dy / d) * step;
  if (heightmap.isWalkable(nx, e.y, false)) e.x = nx;
  if (heightmap.isWalkable(e.x, ny, false)) e.y = ny;
}

// ── Pre-Built Behavior Trees ───────────────────────────────────

export type AIArchetype =
  | 'melee_grunt'
  | 'ranged_attacker'
  | 'tank'
  | 'boss'
  | 'patrol_guard'
  | 'ambusher'
  | 'pack_hunter';

/** Map enemy type names to archetypes */
export function getArchetype(enemyType: string, isBoss: boolean, attackStyle: string): AIArchetype {
  if (isBoss) return 'boss';
  if (enemyType === 'Spider' || enemyType === 'Dire Wolf') return 'ambusher';
  if (enemyType === 'Plague Rat Swarm') return 'pack_hunter';
  if (enemyType === 'Golem' || enemyType === 'Iron Sentinel' || enemyType === 'Boar Dragon') return 'tank';
  if (attackStyle === 'ranged' || attackStyle === 'aoe') return 'ranged_attacker';
  return 'melee_grunt';
}

/** Build a behavior tree for the given archetype */
export function buildBehaviorTree(archetype: AIArchetype): BehaviorNode {
  switch (archetype) {
    case 'melee_grunt':
      return new Selector([
        // Leash: return home if too far
        new Sequence([new IsLeashed(), new MoveToHome()]),
        // Combat: detect → chase → attack
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(500),
          new Selector([
            // In attack range → attack
            new Sequence([new IsPlayerInRange(60), new AttackTarget()]),
            // Chase
            new MoveToTarget(50),
          ]),
        ]),
        // Patrol or idle
        new Selector([new Patrol(), new Idle(3)]),
      ]);

    case 'ranged_attacker':
      return new Selector([
        new Sequence([new IsLeashed(), new MoveToHome()]),
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(600),
          new Selector([
            // Low HP → flee
            new Sequence([new IsHealthBelow(0.25), new Flee(300)]),
            // In range → maintain distance and attack
            new Sequence([new MaintainDistance(150, 300), new AttackTarget()]),
            // Close in
            new MoveToTarget(200),
          ]),
        ]),
        new Selector([new Patrol(), new Idle(2)]),
      ]);

    case 'tank':
      return new Selector([
        new Sequence([new IsLeashed(), new MoveToHome()]),
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(500),
          // Alert nearby allies
          new Cooldown(new AlertNearby(300), 5),
          new Selector([
            new Sequence([new IsPlayerInRange(70), new AttackTarget()]),
            new MoveToTarget(60),
          ]),
        ]),
        new Idle(4),
      ]);

    case 'boss':
      return new Selector([
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(800),
          new Selector([
            // Enrage at 30% HP: faster attacks, alert all
            new Sequence([
              new IsHealthBelow(0.3),
              new Cooldown(new AlertNearby(500), 10),
              new Selector([
                new Sequence([new IsPlayerInRange(80), new AttackTarget()]),
                new MoveToTarget(70),
              ]),
            ]),
            // Normal combat
            new Selector([
              new Sequence([new IsPlayerInRange(80), new AttackTarget()]),
              new MoveToTarget(70),
            ]),
          ]),
        ]),
        new Idle(2),
      ]);

    case 'patrol_guard':
      return new Selector([
        // Combat with short leash
        new Sequence([new IsLeashed(), new MoveToHome()]),
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(300),
          new Cooldown(new AlertNearby(200), 3),
          new Selector([
            new Sequence([new IsPlayerInRange(60), new AttackTarget()]),
            new MoveToTarget(50),
          ]),
        ]),
        // Patrol is primary behavior
        new Patrol(),
        new Idle(1),
      ]);

    case 'ambusher':
      return new Selector([
        new Sequence([new IsLeashed(), new MoveToHome()]),
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(400),
          new Selector([
            // If target too strong (high HP), retreat
            new Sequence([new IsHealthBelow(0.3), new Flee(400)]),
            // Pounce: rush then attack
            new Sequence([new IsPlayerInRange(60), new AttackTarget()]),
            new MoveToTarget(50),
          ]),
        ]),
        // Hide (idle) until triggered — spawner handles trigger
        new Idle(5),
      ]);

    case 'pack_hunter':
      return new Selector([
        new Sequence([new IsLeashed(), new MoveToHome()]),
        new Sequence([
          new HasTarget(),
          new IsPlayerInRange(500),
          new Cooldown(new AlertNearby(200), 2), // pack alert
          new Selector([
            // Surround then attack
            new Sequence([new SurroundTarget(), new IsPlayerInRange(60), new AttackTarget()]),
            new MoveToTarget(50),
          ]),
        ]),
        new Selector([new Patrol(), new Idle(2)]),
      ]);
  }
}

// ── Main Tick ──────────────────────────────────────────────────

const treeCache = new Map<number, BehaviorNode>();

/**
 * Tick the behavior tree for an enemy.
 * Caches the tree per enemy ID for stateful composites.
 */
export function behaviorTick(
  entity: AIEntity,
  target: AITarget | null,
  allEnemies: AIEntity[],
  heightmap: WorldHeightmap,
  dt: number,
  gameTime: number,
): BehaviorStatus {
  if (entity.dead) return 'failure';

  // Decrement alert cooldown
  if (entity.alertCooldown && entity.alertCooldown > 0) {
    entity.alertCooldown -= dt;
  }

  // Get or create tree
  let tree = treeCache.get(entity.id);
  if (!tree) {
    const archetype = getArchetype(
      '', // type not stored on AIEntity — use attackStyle + isBoss
      entity.isBoss,
      entity.attackStyle,
    );
    tree = buildBehaviorTree(archetype);
    treeCache.set(entity.id, tree);
  }

  const ctx: AIContext = { entity, target, allEnemies, heightmap, dt, gameTime };
  return tree.tick(ctx);
}

/** Build and cache a specific archetype tree for an enemy */
export function assignArchetype(entityId: number, archetype: AIArchetype): void {
  treeCache.set(entityId, buildBehaviorTree(archetype));
}

/** Clear cached tree (e.g. on enemy death) */
export function clearBehaviorCache(entityId: number): void {
  treeCache.delete(entityId);
}
