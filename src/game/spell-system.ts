/**
 * Dota 2-Inspired Spell Pattern System
 *
 * Defines advanced spell behaviors beyond simple damage/projectile.
 * Each pattern type creates multi-stage VFX + gameplay effects.
 */

import type { TrailColor } from './trail-effects';
import type { SpriteEffectType } from './sprite-effects';

// ── Spell Pattern Types ────────────────────────────────────────

export type SpellPatternType =
  | 'persistent_aoe'      // Blizzard, Poison Cloud — stays for duration
  | 'fan_projectile'      // Multi-Shot — fan of projectiles
  | 'chain_bounce'        // Chain Lightning — jumps between targets
  | 'moving_zone'         // Tornado — AoE that moves across map
  | 'sequential_impact'   // Fire Rain / Meteor Shower — impacts over time
  | 'expanding_ring'      // Frost Nova — expanding freeze ring
  | 'scatter_burst'       // Arcane Multi-Blast — bursts to multiple targets
  | 'beam';               // Searing Beam — continuous line damage

// ── Spell Definition ───────────────────────────────────────────

export interface SpellDefinition {
  id: string;
  name: string;
  pattern: SpellPatternType;
  element: 'fire' | 'frost' | 'poison' | 'lightning' | 'arcane' | 'nature' | 'holy' | 'shadow' | 'physical';
  /** Total damage dealt over full duration */
  totalDamage: number;
  /** Radius of effect area */
  radius: number;
  /** How long the spell lasts (seconds) */
  duration: number;
  /** How often it ticks damage (seconds) */
  tickRate: number;
  /** Cast range */
  range: number;

  // ── Pattern-specific params ──
  /** Number of projectiles (fan_projectile) */
  projectileCount?: number;
  /** Spread angle in radians (fan_projectile) */
  spreadAngle?: number;
  /** Max bounce targets (chain_bounce) */
  maxBounces?: number;
  /** Bounce range (chain_bounce) */
  bounceRange?: number;
  /** Movement speed (moving_zone) */
  moveSpeed?: number;
  /** Number of sequential impacts (sequential_impact) */
  impactCount?: number;
  /** Delay between impacts (sequential_impact) */
  impactDelay?: number;
  /** Expansion speed (expanding_ring) */
  expandSpeed?: number;
  /** Burst target count (scatter_burst) */
  burstCount?: number;

  // ── VFX ──
  /** Trail color for projectiles */
  trailColor?: TrailColor;
  /** Cast sprite effect */
  castVfx?: SpriteEffectType;
  /** Per-tick/impact sprite effect */
  tickVfx?: SpriteEffectType;
  /** Final/completion sprite effect */
  endVfx?: SpriteEffectType;
  /** Area overlay sprite */
  aoeVfx?: SpriteEffectType;

  // ── Status effects ──
  /** Slow multiplier (0-1, 0 = no slow) */
  slow?: number;
  /** Stun duration per hit */
  stunDuration?: number;
  /** DoT damage per second */
  dotDps?: number;
}

// ── Spell Registry ─────────────────────────────────────────────

export const SPELL_REGISTRY: Record<string, SpellDefinition> = {

  // ═══ MAGE SPELLS ═══

  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    pattern: 'persistent_aoe',
    element: 'frost',
    totalDamage: 360,
    radius: 150,
    duration: 6,
    tickRate: 0.5,
    range: 600,
    slow: 0.35,
    trailColor: 'purple',
    castVfx: 'os_frozen_ice',
    tickVfx: 'os_ice_vfx1',
    aoeVfx: 'os_ice_vfx2',
    endVfx: 'os_frozen_ice',
  },

  frost_nova: {
    id: 'frost_nova',
    name: 'Frost Nova',
    pattern: 'expanding_ring',
    element: 'frost',
    totalDamage: 180,
    radius: 120,
    duration: 0.6,
    tickRate: 0.1,
    range: 0, // self-cast
    expandSpeed: 300,
    stunDuration: 1.5,
    trailColor: 'purple',
    castVfx: 'os_frostbolt',
    tickVfx: 'os_frozen_ice',
    aoeVfx: 'os_ice_vfx2',
  },

  chain_lightning: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    pattern: 'chain_bounce',
    element: 'lightning',
    totalDamage: 280,
    radius: 40,
    duration: 0.8,
    tickRate: 0.15,
    range: 500,
    maxBounces: 5,
    bounceRange: 300,
    trailColor: 'purple',
    castVfx: 'os_arcane_lightning',
    tickVfx: 'os_thunder_hit',
  },

  arcane_multi_blast: {
    id: 'arcane_multi_blast',
    name: 'Arcane Multi-Blast',
    pattern: 'scatter_burst',
    element: 'arcane',
    totalDamage: 320,
    radius: 60,
    duration: 1.2,
    tickRate: 0.3,
    range: 600,
    burstCount: 5,
    trailColor: 'purple',
    castVfx: 'os_arcane_bolt',
    tickVfx: 'os_arcane_bolt',
    endVfx: 'os_thunder_hit',
  },

  meteor_shower: {
    id: 'meteor_shower',
    name: 'Meteor Shower',
    pattern: 'sequential_impact',
    element: 'fire',
    totalDamage: 450,
    radius: 120,
    duration: 4,
    tickRate: 0.5,
    range: 700,
    impactCount: 8,
    impactDelay: 0.5,
    trailColor: 'red',
    castVfx: 'os_flamestrike',
    tickVfx: 'os_fire_explosion',
    endVfx: 'os_fire_explosion2',
  },

  // ═══ RANGER SPELLS ═══

  multi_shot: {
    id: 'multi_shot',
    name: 'Multi-Shot',
    pattern: 'fan_projectile',
    element: 'physical',
    totalDamage: 200,
    radius: 0,
    duration: 0,
    tickRate: 0,
    range: 600,
    projectileCount: 5,
    spreadAngle: Math.PI / 4, // 45 degrees
    trailColor: 'green',
    castVfx: 'os_wind_proj',
    tickVfx: 'os_hit1',
  },

  poison_cloud: {
    id: 'poison_cloud',
    name: 'Poison Cloud',
    pattern: 'persistent_aoe',
    element: 'poison',
    totalDamage: 240,
    radius: 130,
    duration: 8,
    tickRate: 1.0,
    range: 500,
    slow: 0.25,
    dotDps: 30,
    trailColor: 'green',
    castVfx: 'os_arcane_mist',
    tickVfx: 'os_arcane_mist',
    aoeVfx: 'os_arcane_mist',
  },

  // ═══ WORG SPELLS ═══

  tornado: {
    id: 'tornado',
    name: 'Tornado',
    pattern: 'moving_zone',
    element: 'nature',
    totalDamage: 300,
    radius: 100,
    duration: 5,
    tickRate: 0.4,
    range: 800,
    moveSpeed: 180,
    stunDuration: 0.5,
    trailColor: 'orange',
    castVfx: 'os_worge_tornado',
    tickVfx: 'os_worge_tornado',
    aoeVfx: 'os_wind_breath',
  },

  // ═══ WARRIOR SPELLS ═══

  fire_rain: {
    id: 'fire_rain',
    name: 'Fire Rain',
    pattern: 'sequential_impact',
    element: 'fire',
    totalDamage: 350,
    radius: 140,
    duration: 3,
    tickRate: 0.4,
    range: 600,
    impactCount: 6,
    impactDelay: 0.4,
    trailColor: 'red',
    castVfx: 'os_flamestrike',
    tickVfx: 'os_fire_explosion2',
    endVfx: 'os_fire_explosion',
  },
};

// ── Ability Name → Spell Pattern mapping ───────────────────────
// Maps existing ability names to advanced spell patterns
export const ABILITY_SPELL_PATTERNS: Record<string, string> = {
  'Blizzard':         'blizzard',
  'Frost Nova':       'frost_nova',
  'Chain Lightning':  'chain_lightning',
  'Arcane Barrage':   'arcane_multi_blast',
  'Arcane Cataclysm': 'arcane_multi_blast',
  'Meteor':           'meteor_shower',
  'Multi Shot':       'multi_shot',
  'Multi-Shot':       'multi_shot',
  'Moonfire Volley':  'multi_shot',
  'Poison Arrow':     'poison_cloud',
  'Rain of Arrows':   'fire_rain',
  'Storm of Arrows':  'fire_rain',
  'Thunder Storm':    'chain_lightning',
  'Inferno':          'meteor_shower',
  'Wrath of Nature':  'tornado',
  'Primal Fury':      'tornado',
  'Blood Fury':       'fire_rain',
  'Whirlwind':        'tornado',
  'Blade Storm':      'tornado',
};

// ── Active Spell Instance ──────────────────────────────────────

export interface ActiveSpell {
  id: number;
  spellId: string;
  pattern: SpellPatternType;
  x: number;
  y: number;
  /** Direction for moving/fan patterns */
  angle: number;
  team: number;
  sourceId: number;
  damage: number;
  radius: number;
  elapsed: number;
  duration: number;
  tickTimer: number;
  tickRate: number;
  /** Entities already hit (for chain/scatter) */
  hitIds: number[];

  // Pattern state
  /** Current bounce target index (chain_bounce) */
  bounceIndex?: number;
  /** Current expansion radius (expanding_ring) */
  currentRadius?: number;
  /** Impact counter (sequential_impact) */
  impactsDone?: number;
  /** Moving position (moving_zone) */
  moveX?: number;
  moveY?: number;

  // VFX references
  trailColor?: TrailColor;
  castVfx?: SpriteEffectType;
  tickVfx?: SpriteEffectType;
  endVfx?: SpriteEffectType;
  aoeVfx?: SpriteEffectType;

  // Effects
  slow?: number;
  stunDuration?: number;
  dotDps?: number;

  // Fan projectile data
  projectileCount?: number;
  spreadAngle?: number;
  maxBounces?: number;
  bounceRange?: number;
  moveSpeed?: number;
  impactCount?: number;
  impactDelay?: number;
  expandSpeed?: number;
  burstCount?: number;
}

// ── Create Active Spell ────────────────────────────────────────

let nextSpellId = 1;

export function createActiveSpell(
  spellDef: SpellDefinition,
  x: number, y: number, angle: number,
  team: number, sourceId: number,
  bonusDamage: number = 0,
): ActiveSpell {
  const damagePerTick = spellDef.tickRate > 0
    ? (spellDef.totalDamage + bonusDamage) / Math.max(1, spellDef.duration / spellDef.tickRate)
    : spellDef.totalDamage + bonusDamage;

  return {
    id: nextSpellId++,
    spellId: spellDef.id,
    pattern: spellDef.pattern,
    x, y, angle,
    team, sourceId,
    damage: damagePerTick,
    radius: spellDef.radius,
    elapsed: 0,
    duration: spellDef.duration,
    tickTimer: 0,
    tickRate: spellDef.tickRate,
    hitIds: [],
    bounceIndex: 0,
    currentRadius: 0,
    impactsDone: 0,
    moveX: x,
    moveY: y,
    trailColor: spellDef.trailColor,
    castVfx: spellDef.castVfx,
    tickVfx: spellDef.tickVfx,
    endVfx: spellDef.endVfx,
    aoeVfx: spellDef.aoeVfx,
    slow: spellDef.slow,
    stunDuration: spellDef.stunDuration,
    dotDps: spellDef.dotDps,
    projectileCount: spellDef.projectileCount,
    spreadAngle: spellDef.spreadAngle,
    maxBounces: spellDef.maxBounces,
    bounceRange: spellDef.bounceRange,
    moveSpeed: spellDef.moveSpeed,
    impactCount: spellDef.impactCount,
    impactDelay: spellDef.impactDelay,
    expandSpeed: spellDef.expandSpeed,
    burstCount: spellDef.burstCount,
  };
}

// ── Update Active Spell (called per frame) ─────────────────────

export interface SpellTickResult {
  /** Entities to damage: { id, damage } */
  damages: { entityId: number; damage: number }[];
  /** VFX to spawn */
  vfxSpawns: { type: SpriteEffectType; x: number; y: number; scale: number; duration: number }[];
  /** Projectiles to spawn (fan pattern) */
  projectiles: { x: number; y: number; angle: number; speed: number; damage: number; trail: TrailColor }[];
  /** Whether this spell has completed */
  done: boolean;
  /** AoE visual data for rendering */
  aoeVisuals: { x: number; y: number; radius: number; color: string; opacity: number }[];
}

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff4422', frost: '#44aaff', poison: '#44ff44',
  lightning: '#ffdd44', arcane: '#aa44ff', nature: '#22cc44',
  holy: '#ffdd88', shadow: '#8844aa', physical: '#ff8844',
};

export function updateActiveSpell(spell: ActiveSpell, dt: number): SpellTickResult {
  const result: SpellTickResult = { damages: [], vfxSpawns: [], projectiles: [], done: false, aoeVisuals: [] };

  spell.elapsed += dt;
  spell.tickTimer += dt;

  // Check duration
  if (spell.duration > 0 && spell.elapsed >= spell.duration) {
    result.done = true;
    if (spell.endVfx) {
      result.vfxSpawns.push({ type: spell.endVfx, x: spell.x, y: spell.y, scale: 2.5, duration: 800 });
    }
    return result;
  }

  const color = ELEMENT_COLORS[spell.spellId.includes('fire') ? 'fire' : spell.spellId.includes('frost') || spell.spellId.includes('blizzard') ? 'frost' : spell.spellId.includes('poison') ? 'poison' : spell.spellId.includes('chain') || spell.spellId.includes('thunder') ? 'lightning' : spell.spellId.includes('arcane') ? 'arcane' : spell.spellId.includes('tornado') ? 'nature' : 'physical'] || '#ffffff';

  switch (spell.pattern) {
    case 'persistent_aoe': {
      // Continuous AoE zone — damage on tick
      result.aoeVisuals.push({
        x: spell.x, y: spell.y,
        radius: spell.radius,
        color,
        opacity: 0.3 + Math.sin(spell.elapsed * 4) * 0.1,
      });
      if (spell.tickTimer >= spell.tickRate) {
        spell.tickTimer = 0;
        // Signal to engine: damage all enemies in radius
        result.damages.push({ entityId: -1, damage: spell.damage }); // -1 = AoE marker
        if (spell.tickVfx) {
          // Random position within radius for VFX variety
          const ox = (Math.random() - 0.5) * spell.radius;
          const oy = (Math.random() - 0.5) * spell.radius;
          result.vfxSpawns.push({ type: spell.tickVfx, x: spell.x + ox, y: spell.y + oy, scale: 1.5, duration: 600 });
        }
      }
      break;
    }

    case 'sequential_impact': {
      const maxImpacts = spell.impactCount || 6;
      const delay = spell.impactDelay || 0.5;
      if (spell.tickTimer >= delay && (spell.impactsDone || 0) < maxImpacts) {
        spell.tickTimer = 0;
        spell.impactsDone = (spell.impactsDone || 0) + 1;
        // Random position within radius
        const ox = (Math.random() - 0.5) * spell.radius * 1.5;
        const oy = (Math.random() - 0.5) * spell.radius * 1.5;
        result.damages.push({ entityId: -1, damage: spell.damage });
        if (spell.tickVfx) {
          result.vfxSpawns.push({ type: spell.tickVfx, x: spell.x + ox, y: spell.y + oy, scale: 2.0, duration: 700 });
        }
      }
      result.aoeVisuals.push({
        x: spell.x, y: spell.y,
        radius: spell.radius,
        color,
        opacity: 0.15 + Math.sin(spell.elapsed * 6) * 0.05,
      });
      break;
    }

    case 'expanding_ring': {
      const speed = spell.expandSpeed || 400;
      spell.currentRadius = (spell.currentRadius || 0) + speed * dt;
      if (spell.currentRadius >= spell.radius) {
        result.done = true;
      }
      result.aoeVisuals.push({
        x: spell.x, y: spell.y,
        radius: spell.currentRadius || 0,
        color,
        opacity: 0.5 * (1 - (spell.currentRadius || 0) / spell.radius),
      });
      if (spell.tickTimer >= spell.tickRate) {
        spell.tickTimer = 0;
        result.damages.push({ entityId: -1, damage: spell.damage });
        if (spell.tickVfx) {
          result.vfxSpawns.push({ type: spell.tickVfx, x: spell.x, y: spell.y, scale: Math.max(1.0, (spell.currentRadius || 50) / 40), duration: 500 });
        }
      }
      break;
    }

    case 'moving_zone': {
      const spd = spell.moveSpeed || 180;
      spell.moveX = (spell.moveX || spell.x) + Math.cos(spell.angle) * spd * dt;
      spell.moveY = (spell.moveY || spell.y) + Math.sin(spell.angle) * spd * dt;
      result.aoeVisuals.push({
        x: spell.moveX, y: spell.moveY,
        radius: spell.radius,
        color,
        opacity: 0.4 + Math.sin(spell.elapsed * 8) * 0.15,
      });
      if (spell.tickTimer >= spell.tickRate) {
        spell.tickTimer = 0;
        result.damages.push({ entityId: -2, damage: spell.damage }); // -2 = moving AoE
        if (spell.tickVfx) {
          result.vfxSpawns.push({ type: spell.tickVfx, x: spell.moveX, y: spell.moveY, scale: 1.8, duration: 600 });
        }
      }
      break;
    }

    case 'fan_projectile': {
      // Fires all projectiles immediately, then done
      if (spell.elapsed < dt * 2) {
        const count = spell.projectileCount || 5;
        const spread = spell.spreadAngle || Math.PI / 4;
        const startAngle = spell.angle - spread / 2;
        const step = count > 1 ? spread / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
          const a = startAngle + step * i;
          result.projectiles.push({
            x: spell.x, y: spell.y,
            angle: a,
            speed: 500,
            damage: spell.damage,
            trail: spell.trailColor || 'green',
          });
        }
        if (spell.castVfx) {
          result.vfxSpawns.push({ type: spell.castVfx, x: spell.x, y: spell.y, scale: 1.5, duration: 500 });
        }
      }
      result.done = spell.elapsed > 0.1;
      break;
    }

    case 'chain_bounce': {
      // Handled by engine — signals via damages with sequential IDs
      if (spell.tickTimer >= spell.tickRate && (spell.bounceIndex || 0) < (spell.maxBounces || 5)) {
        spell.tickTimer = 0;
        spell.bounceIndex = (spell.bounceIndex || 0) + 1;
        result.damages.push({ entityId: -3, damage: spell.damage * (1 - (spell.bounceIndex || 0) * 0.1) }); // -3 = chain marker
        if (spell.tickVfx) {
          result.vfxSpawns.push({ type: spell.tickVfx, x: spell.x, y: spell.y, scale: 1.0, duration: 400 });
        }
      }
      if ((spell.bounceIndex || 0) >= (spell.maxBounces || 5)) {
        result.done = true;
      }
      break;
    }

    case 'scatter_burst': {
      // Burst to multiple random nearby targets
      if (spell.elapsed < dt * 2) {
        const count = spell.burstCount || 5;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
          result.projectiles.push({
            x: spell.x, y: spell.y,
            angle: a,
            speed: 400 + Math.random() * 100,
            damage: spell.damage,
            trail: spell.trailColor || 'purple',
          });
        }
        if (spell.castVfx) {
          result.vfxSpawns.push({ type: spell.castVfx, x: spell.x, y: spell.y, scale: 2.5, duration: 700 });
        }
      }
      result.done = spell.elapsed > 0.15;
      break;
    }

    case 'beam': {
      // Continuous line damage
      result.aoeVisuals.push({
        x: spell.x, y: spell.y,
        radius: spell.radius,
        color,
        opacity: 0.6 + Math.sin(spell.elapsed * 10) * 0.2,
      });
      if (spell.tickTimer >= spell.tickRate) {
        spell.tickTimer = 0;
        result.damages.push({ entityId: -4, damage: spell.damage }); // -4 = beam marker
      }
      break;
    }
  }

  return result;
}

// ── Get spell definition by ability name ───────────────────────

export function getSpellForAbility(abilityName: string): SpellDefinition | null {
  const spellId = ABILITY_SPELL_PATTERNS[abilityName];
  if (!spellId) return null;
  return SPELL_REGISTRY[spellId] || null;
}
