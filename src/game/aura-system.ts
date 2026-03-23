/**
 * Passive Aura System
 *
 * Heroes emit auras that buff nearby allies or debuff nearby enemies.
 * Each class has a signature aura; additional auras come from items/abilities.
 * Auras pulse visually and apply effects every tick.
 */

// ── Aura Definition ────────────────────────────────────────────

export type AuraTarget = 'self' | 'allies' | 'enemies' | 'all_allies';

export interface AuraEffect {
  /** Stat to modify */
  stat: 'atk' | 'def' | 'spd' | 'maxHp' | 'hpRegen' | 'mpRegen' | 'critChance' | 'lifesteal' | 'armorPen';
  /** Flat bonus */
  flat: number;
  /** Percentage bonus (0.1 = 10%) */
  percent: number;
}

export interface AuraDefinition {
  id: string;
  name: string;
  icon: string;
  /** Who it affects */
  target: AuraTarget;
  /** Radius of effect */
  radius: number;
  /** Effects applied each tick */
  effects: AuraEffect[];
  /** Visual ring color */
  color: string;
  /** Secondary color for pulse */
  pulseColor: string;
  /** How often to re-apply (seconds) */
  tickRate: number;
  /** Minimum hero level required */
  levelRequired: number;
  /** Associated class (null = universal) */
  heroClass: string | null;
}

// ── Class Aura Registry ────────────────────────────────────────

export const CLASS_AURAS: Record<string, AuraDefinition> = {
  // Warrior: Commanding Presence — nearby allies get +ATK and +DEF
  warrior_presence: {
    id: 'warrior_presence',
    name: 'Commanding Presence',
    icon: '⚔',
    target: 'all_allies',
    radius: 250,
    effects: [
      { stat: 'atk', flat: 8, percent: 0.08 },
      { stat: 'def', flat: 5, percent: 0.05 },
    ],
    color: '#ef4444',
    pulseColor: '#fca5a5',
    tickRate: 1.0,
    levelRequired: 3,
    heroClass: 'Warrior',
  },

  // Mage: Arcane Brilliance — nearby allies get +MP regen and +crit
  mage_brilliance: {
    id: 'mage_brilliance',
    name: 'Arcane Brilliance',
    icon: '✨',
    target: 'all_allies',
    radius: 300,
    effects: [
      { stat: 'mpRegen', flat: 3, percent: 0 },
      { stat: 'critChance', flat: 5, percent: 0 },
    ],
    color: '#8b5cf6',
    pulseColor: '#c4b5fd',
    tickRate: 1.0,
    levelRequired: 3,
    heroClass: 'Mage',
  },

  // Ranger: Swift Winds — nearby allies get +SPD and +armor penetration
  ranger_winds: {
    id: 'ranger_winds',
    name: 'Swift Winds',
    icon: '💨',
    target: 'all_allies',
    radius: 280,
    effects: [
      { stat: 'spd', flat: 12, percent: 0.1 },
      { stat: 'armorPen', flat: 5, percent: 0 },
    ],
    color: '#22c55e',
    pulseColor: '#86efac',
    tickRate: 1.0,
    levelRequired: 3,
    heroClass: 'Ranger',
  },

  // Worg: Primal Regeneration — nearby allies get +HP regen and +lifesteal
  worg_regen: {
    id: 'worg_regen',
    name: 'Primal Regeneration',
    icon: '🐺',
    target: 'all_allies',
    radius: 260,
    effects: [
      { stat: 'hpRegen', flat: 5, percent: 0 },
      { stat: 'lifesteal', flat: 3, percent: 0 },
    ],
    color: '#f97316',
    pulseColor: '#fdba74',
    tickRate: 1.0,
    levelRequired: 3,
    heroClass: 'Worg',
  },
};

// ── Active Aura Instance (on a hero) ──────────────────────────

export interface ActiveAura {
  auraId: string;
  tickTimer: number;
  /** Visual pulse phase (0-2π) */
  pulsePhase: number;
  /** Entities currently affected */
  affectedIds: number[];
}

// ── Aura Visual Data (for rendering) ──────────────────────────

export interface AuraVisual {
  x: number;
  y: number;
  radius: number;
  color: string;
  pulseColor: string;
  opacity: number;
  pulseRadius: number;
}

// ── Get class aura definition ──────────────────────────────────

export function getClassAura(heroClass: string): AuraDefinition | null {
  switch (heroClass) {
    case 'Warrior': return CLASS_AURAS.warrior_presence;
    case 'Mage': return CLASS_AURAS.mage_brilliance;
    case 'Ranger': return CLASS_AURAS.ranger_winds;
    case 'Worg': return CLASS_AURAS.worg_regen;
    default: return null;
  }
}

// ── Create initial aura state ──────────────────────────────────

export function createActiveAura(auraId: string): ActiveAura {
  return {
    auraId,
    tickTimer: 0,
    pulsePhase: 0,
    affectedIds: [],
  };
}

// ── Update aura tick ───────────────────────────────────────────

export interface AuraTickResult {
  /** Should apply effects this tick */
  shouldApply: boolean;
  /** Visual data for rendering */
  visual: AuraVisual | null;
  /** Cleared affected list (ready for new scan) */
  clearAffected: boolean;
}

export function updateAura(
  aura: ActiveAura,
  auraDef: AuraDefinition,
  heroX: number, heroY: number,
  dt: number,
): AuraTickResult {
  aura.pulsePhase += dt * 2.5;
  if (aura.pulsePhase > Math.PI * 2) aura.pulsePhase -= Math.PI * 2;

  aura.tickTimer += dt;
  const shouldApply = aura.tickTimer >= auraDef.tickRate;
  if (shouldApply) {
    aura.tickTimer = 0;
    aura.affectedIds = [];
  }

  const pulseT = (Math.sin(aura.pulsePhase) + 1) / 2;
  const visual: AuraVisual = {
    x: heroX,
    y: heroY,
    radius: auraDef.radius,
    color: auraDef.color,
    pulseColor: auraDef.pulseColor,
    opacity: 0.08 + pulseT * 0.07,
    pulseRadius: auraDef.radius * (0.85 + pulseT * 0.15),
  };

  return { shouldApply, visual, clearAffected: shouldApply };
}

// ── Apply aura effects to a target ─────────────────────────────

export interface AuraStatModifiers {
  atkFlat: number;
  atkPercent: number;
  defFlat: number;
  defPercent: number;
  spdFlat: number;
  spdPercent: number;
  hpRegen: number;
  mpRegen: number;
  critChance: number;
  lifesteal: number;
  armorPen: number;
}

export function emptyAuraModifiers(): AuraStatModifiers {
  return { atkFlat: 0, atkPercent: 0, defFlat: 0, defPercent: 0, spdFlat: 0, spdPercent: 0, hpRegen: 0, mpRegen: 0, critChance: 0, lifesteal: 0, armorPen: 0 };
}

export function accumulateAuraEffects(mods: AuraStatModifiers, effects: AuraEffect[]): void {
  for (const eff of effects) {
    switch (eff.stat) {
      case 'atk': mods.atkFlat += eff.flat; mods.atkPercent += eff.percent; break;
      case 'def': mods.defFlat += eff.flat; mods.defPercent += eff.percent; break;
      case 'spd': mods.spdFlat += eff.flat; mods.spdPercent += eff.percent; break;
      case 'hpRegen': mods.hpRegen += eff.flat; break;
      case 'mpRegen': mods.mpRegen += eff.flat; break;
      case 'critChance': mods.critChance += eff.flat; break;
      case 'lifesteal': mods.lifesteal += eff.flat; break;
      case 'armorPen': mods.armorPen += eff.flat; break;
    }
  }
}
