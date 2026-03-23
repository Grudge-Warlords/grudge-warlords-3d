/**
 * Ability Resource Cost System
 * Handles mana, health, stamina costs for abilities with proper validation,
 * CDR calculation, toggle drain, passive proc tracking, and resource gating.
 *
 * Extends the base AbilityDef with rich cost semantics without breaking
 * the existing type — uses a separate cost lookup that wraps AbilityDef.
 */

import type { AbilityDef } from './types';
import type { DerivedStats } from './attributes';

// ── Extended Cost Definition ───────────────────────────────────

export interface AbilityCost {
  /** Mana cost (flat) */
  mana: number;
  /** Health cost (flat HP spent on cast — e.g. Blood Fury) */
  health: number;
  /** Stamina cost (flat — e.g. warrior charges, dodge-attacks) */
  stamina: number;
  /** Mana cost as % of max mana (0-1, e.g. 0.1 = 10%) */
  manaPercent: number;
  /** Health cost as % of max HP (0-1, e.g. 0.15 = 15% current HP) */
  healthPercent: number;
  /** Is this a toggle ability? (drains per second while active) */
  isToggle: boolean;
  /** Per-second drain while toggled on */
  toggleDrainPerSec: number;
  /** Resource type for the toggle drain */
  toggleDrainType: 'mana' | 'health' | 'stamina';
  /** Minimum resource required (gating threshold, not spent) */
  minMana: number;
  minHealth: number;
  minStamina: number;
}

/** Default cost (just uses manaCost from AbilityDef) */
export function defaultCost(ab: AbilityDef): AbilityCost {
  return {
    mana: ab.manaCost,
    health: 0,
    stamina: 0,
    manaPercent: 0,
    healthPercent: 0,
    isToggle: false,
    toggleDrainPerSec: 0,
    toggleDrainType: 'mana',
    minMana: 0,
    minHealth: 0,
    minStamina: 0,
  };
}

// ── Cost Overrides by Ability Name ─────────────────────────────
// Abilities with non-standard costs (health, stamina, toggles)

const COST_OVERRIDES: Record<string, Partial<AbilityCost>> = {
  // Warrior — stamina-based abilities
  'Bull Rush':       { stamina: 25, mana: 0 },
  'Charge':          { stamina: 30, mana: 0 },
  'Shield Bash':     { stamina: 15, mana: 15 },
  'War Stomp':       { stamina: 20, mana: 20 },
  'Heroic Leap':     { stamina: 30, mana: 18 },
  'Rallying Cry':    { stamina: 10, mana: 25 },

  // Warrior — health cost abilities
  'Blood Fury':      { healthPercent: 0.15, mana: 0 },
  'Executioner':     { healthPercent: 0.05, mana: 30 },
  "Death's Embrace": { healthPercent: 0.20, mana: 0 },

  // Worg — health/stamina hybrid
  'Savage Bite':     { health: 0, mana: 12 },  // heals via lifesteal, no extra cost
  'Feral Frenzy':    { stamina: 20, mana: 18 },
  'Predator Leap':   { stamina: 25, mana: 15 },
  'Blood Pact':      { healthPercent: 0.10, mana: 0 },
  'Shadow Step':     { stamina: 15, mana: 10 },
  'Vanish':          { stamina: 20, mana: 15 },
  'Life Drain':      { mana: 25 },  // drains enemy HP, costs mana

  // Mage — toggle abilities
  'Mana Shield':     { isToggle: true, toggleDrainPerSec: 8, toggleDrainType: 'mana', mana: 0 },
  'Fire Shield':     { isToggle: true, toggleDrainPerSec: 6, toggleDrainType: 'mana', mana: 0 },

  // Mage — % mana cost
  'Arcane Cataclysm': { manaPercent: 0.25, mana: 0 },
  'Elemental Surge':  { manaPercent: 0.15, mana: 35 },
  'Spell Echo':       { manaPercent: 0.10, mana: 15 },

  // Ranger — stamina abilities
  'Camouflage':      { stamina: 30, mana: 15 },
  'Smoke Arrow':     { stamina: 15, mana: 20 },
  'Quick Draw':      { stamina: 10, mana: 5 },
  'Volley':          { stamina: 20, mana: 18 },

  // Dodge roll (universal)
  'Dodge Roll':      { stamina: 25, mana: 0 },
};

export function getAbilityCost(ab: AbilityDef): AbilityCost {
  const base = defaultCost(ab);
  const override = COST_OVERRIDES[ab.name];
  if (!override) return base;
  return { ...base, ...override };
}

// ── CDR Calculation ────────────────────────────────────────────

/**
 * Apply cooldown reduction to an ability's cooldown.
 * CDR caps at 40% (cannot reduce below 60% of base cooldown).
 * @param baseCooldown The ability's base cooldown in seconds
 * @param cdrPercent CDR from derived stats (0-100)
 * @returns Effective cooldown in seconds
 */
export function applyCDR(baseCooldown: number, cdrPercent: number): number {
  const cdr = Math.min(40, Math.max(0, cdrPercent)); // cap at 40%
  return baseCooldown * (1 - cdr / 100);
}

/**
 * Get the effective cooldown for an ability with CDR applied.
 */
export function getEffectiveCooldown(ab: AbilityDef, derived: DerivedStats): number {
  return applyCDR(ab.cooldown, derived.cooldownReduction);
}

// ── Resource Validation ────────────────────────────────────────

export interface ResourceState {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
}

export interface CostCheckResult {
  canCast: boolean;
  reason: string;
  /** Actual amounts that will be deducted */
  manaCost: number;
  healthCost: number;
  staminaCost: number;
}

/**
 * Check if the player has enough resources to cast an ability.
 * Returns the exact costs that will be deducted.
 */
export function checkAbilityCost(ab: AbilityDef, resources: ResourceState): CostCheckResult {
  const cost = getAbilityCost(ab);

  // Calculate actual costs
  const manaCost = cost.mana + Math.floor(cost.manaPercent * resources.maxMp);
  const healthCost = cost.health + Math.floor(cost.healthPercent * resources.hp); // % of CURRENT hp
  const staminaCost = cost.stamina;

  // Check minimums (gating thresholds)
  if (resources.mp < cost.minMana) {
    return { canCast: false, reason: `Need ${cost.minMana} mana`, manaCost, healthCost, staminaCost };
  }
  if (resources.hp < cost.minHealth) {
    return { canCast: false, reason: `Need ${cost.minHealth} HP`, manaCost, healthCost, staminaCost };
  }
  if (resources.stamina < cost.minStamina) {
    return { canCast: false, reason: `Need ${cost.minStamina} stamina`, manaCost, healthCost, staminaCost };
  }

  // Check actual costs
  if (manaCost > 0 && resources.mp < manaCost) {
    return { canCast: false, reason: `Not enough mana (${manaCost})`, manaCost, healthCost, staminaCost };
  }
  if (healthCost > 0 && resources.hp <= healthCost) {
    // Can't kill yourself with ability cost (must survive)
    return { canCast: false, reason: `Not enough HP (${healthCost})`, manaCost, healthCost, staminaCost };
  }
  if (staminaCost > 0 && resources.stamina < staminaCost) {
    return { canCast: false, reason: `Not enough stamina (${staminaCost})`, manaCost, healthCost, staminaCost };
  }

  return { canCast: true, reason: '', manaCost, healthCost, staminaCost };
}

/**
 * Deduct ability costs from player resources.
 * Call this AFTER checkAbilityCost confirms canCast = true.
 */
export function deductAbilityCost(resources: ResourceState, costResult: CostCheckResult): void {
  resources.mp = Math.max(0, resources.mp - costResult.manaCost);
  resources.hp = Math.max(1, resources.hp - costResult.healthCost); // Never kill player
  resources.stamina = Math.max(0, resources.stamina - costResult.staminaCost);
}

// ── Toggle Ability Tracking ────────────────────────────────────

export interface ActiveToggle {
  abilityName: string;
  abilityIndex: number;
  drainPerSec: number;
  drainType: 'mana' | 'health' | 'stamina';
  elapsed: number;
}

/**
 * Update active toggle abilities — drain resources per second.
 * Returns toggles that should be deactivated (ran out of resources).
 */
export function updateToggles(toggles: ActiveToggle[], resources: ResourceState, dt: number): string[] {
  const deactivated: string[] = [];

  for (const toggle of toggles) {
    toggle.elapsed += dt;
    const drain = toggle.drainPerSec * dt;

    switch (toggle.drainType) {
      case 'mana':
        if (resources.mp < drain) { deactivated.push(toggle.abilityName); continue; }
        resources.mp -= drain;
        break;
      case 'health':
        if (resources.hp <= drain + 1) { deactivated.push(toggle.abilityName); continue; }
        resources.hp -= drain;
        break;
      case 'stamina':
        if (resources.stamina < drain) { deactivated.push(toggle.abilityName); continue; }
        resources.stamina -= drain;
        break;
    }
  }

  return deactivated;
}

// ── Passive Proc System ────────────────────────────────────────

export interface PassiveProc {
  id: string;
  name: string;
  /** Chance to proc (0-1) */
  chance: number;
  /** Internal cooldown (seconds) — prevents rapid re-proc */
  icd: number;
  /** Current ICD timer */
  icdTimer: number;
  /** Effect on proc */
  effectType: 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'manaRestore' | 'staminaRestore';
  /** Value of the effect (damage amount, heal amount, etc.) */
  value: number;
  /** Duration for buffs/debuffs */
  duration: number;
  /** Trigger condition */
  trigger: 'onHit' | 'onCrit' | 'onKill' | 'onBlock' | 'onDodge' | 'onCast' | 'onTakeDamage';
  /** Source: equipment slot or ability name */
  source: string;
}

/**
 * Roll for a passive proc. Returns true if it triggers.
 */
export function rollProc(proc: PassiveProc, dt: number): boolean {
  // Check ICD
  if (proc.icdTimer > 0) {
    proc.icdTimer = Math.max(0, proc.icdTimer - dt);
    return false;
  }
  // Roll chance
  if (Math.random() > proc.chance) return false;
  // Triggered — set ICD
  proc.icdTimer = proc.icd;
  return true;
}

/**
 * Update all proc ICD timers.
 */
export function updateProcTimers(procs: PassiveProc[], dt: number): void {
  for (const proc of procs) {
    if (proc.icdTimer > 0) proc.icdTimer -= dt;
  }
}

// ── Damage Formula Helpers ─────────────────────────────────────

/**
 * Calculate spell damage with proper scaling.
 * @param baseDamage Ability's base damage value
 * @param attackStat Player's ATK stat
 * @param scalingRatio How much ATK contributes (0-1, default 0.8)
 * @param spellPower Additional spell power from gear/buffs
 * @param comboBonus Combo multiplier (1.0 = no bonus)
 * @param dmgTypeMultiplier Physical or magic damage multiplier from derived stats
 */
export function calculateSpellDamage(
  baseDamage: number,
  attackStat: number,
  scalingRatio: number = 0.8,
  spellPower: number = 0,
  comboBonus: number = 1.0,
  dmgTypeMultiplier: number = 1.0,
): number {
  const scaledAtk = attackStat * scalingRatio;
  const totalBase = baseDamage + scaledAtk + spellPower;
  return Math.floor(totalBase * comboBonus * dmgTypeMultiplier);
}

/**
 * Calculate heal amount with proper scaling.
 * @param baseHeal Ability's base heal value
 * @param spellPower Additional spell power
 * @param healingMultiplier From derived stats (e.g. nature staff bonus)
 */
export function calculateHeal(
  baseHeal: number,
  spellPower: number = 0,
  healingMultiplier: number = 1.0,
): number {
  return Math.floor((baseHeal + spellPower * 0.5) * healingMultiplier);
}

/**
 * Calculate DoT tick damage.
 * @param totalDotDamage Total damage over full duration
 * @param duration Duration in seconds
 * @param tickRate Seconds between ticks
 */
export function calculateDotTick(
  totalDotDamage: number,
  duration: number,
  tickRate: number,
): number {
  const totalTicks = Math.floor(duration / tickRate);
  return totalTicks > 0 ? Math.floor(totalDotDamage / totalTicks) : totalDotDamage;
}

/**
 * Calculate shield amount.
 * @param baseShield Base shield value
 * @param defStat Player's DEF stat
 * @param scalingRatio How much DEF contributes
 */
export function calculateShield(
  baseShield: number,
  defStat: number,
  scalingRatio: number = 0.5,
): number {
  return Math.floor(baseShield + defStat * scalingRatio);
}
