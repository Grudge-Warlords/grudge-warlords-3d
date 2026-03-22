/**
 * Attributes System — Full Reference Implementation
 * 8 primary attributes (STR/INT/VIT/DEX/END/WIS/AGI/TAC)
 * 37 derived stats with diminishing returns
 * Matches Grudge Warlords character builder reference system
 */

// ── Attribute Definitions ──────────────────────────────────────

export interface AttributeDef {
  id: string;
  name: string;
  short: string;
  color: string;
  emoji: string;
  description: string;
  formula: string;
}

export const ATTRIBUTES: AttributeDef[] = [
  { id: 'strength',  name: 'Strength',  short: 'STR', color: '#ef4444', emoji: '💪', description: 'Physical power: HP, damage, defense, block, lifesteal', formula: '+5 HP, +1.25 dmg, +4 def, +0.2% block, +0.075% lifesteal /pt' },
  { id: 'intellect', name: 'Intellect', short: 'INT', color: '#8b5cf6', emoji: '🧠', description: 'Magical power: mana, damage, defense, CDR, spell accuracy', formula: '+9 mana, +1.5 dmg, +2 def, +0.075% CDR, +0.15% spell acc /pt' },
  { id: 'vitality',  name: 'Vitality',  short: 'VIT', color: '#22c55e', emoji: '❤️', description: 'Toughness: HP, defense, health regen, bleed resist', formula: '+25 HP, +1.5 def, +0.06 HP regen, +0.15% bleed resist /pt' },
  { id: 'dexterity', name: 'Dexterity', short: 'DEX', color: '#f59e0b', emoji: '🎯', description: 'Finesse: damage, crit, accuracy, attack speed, evasion', formula: '+0.9 dmg, +0.3% crit, +0.25% accuracy, +0.2% atk spd /pt' },
  { id: 'endurance', name: 'Endurance', short: 'END', color: '#6366f1', emoji: '🛡️', description: 'Resilience: stamina, defense, block effect, CC resist, armor', formula: '+6 stamina, +5 def, +0.175% block effect, +0.1% CC resist /pt' },
  { id: 'wisdom',    name: 'Wisdom',    short: 'WIS', color: '#06b6d4', emoji: '✨', description: 'Insight: mana, defense, resistance, CDR resist, spellblock', formula: '+6 mana, +5.5 def, +0.25% resist, +0.2% CDR resist /pt' },
  { id: 'agility',   name: 'Agility',   short: 'AGI', color: '#10b981', emoji: '⚡', description: 'Speed: move speed, evasion, dodge CDR, crit evasion', formula: '+0.15% move, +0.225% evasion, +0.15% dodge CDR, +0.25% crit eva /pt' },
  { id: 'tactics',   name: 'Tactics',   short: 'TAC', color: '#f97316', emoji: '📜', description: 'Strategy: armor pen, block pen, defense break, +0.5% all %', formula: '+0.2% armor pen, +0.175% block pen, +0.1% def break /pt' },
];

export const ATTR_IDS = ['strength', 'intellect', 'vitality', 'dexterity', 'endurance', 'wisdom', 'agility', 'tactics'] as const;
export type AttributeId = typeof ATTR_IDS[number];

// ── Player Attributes State ────────────────────────────────────

export interface PlayerAttributes {
  base: Record<AttributeId, number>;
  bonus: Record<AttributeId, number>;
  unspentPoints: number;
  totalAllocated: number;
}

export const POINTS_PER_LEVEL = 7;
export const STARTING_POINTS = 20;

const CLASS_STARTING_ATTRS: Record<string, Partial<Record<AttributeId, number>>> = {
  Warrior: { strength: 5, vitality: 4, endurance: 4, dexterity: 1, agility: 1 },
  Mage:    { intellect: 5, wisdom: 4, vitality: 2, tactics: 3, agility: 1 },
  Ranger:  { dexterity: 5, agility: 4, strength: 2, endurance: 1, wisdom: 1, tactics: 2 },
  Worg:    { agility: 5, strength: 3, dexterity: 3, vitality: 2, endurance: 2 },
};

/** AI auto-allocation weights per class (used for MOBA bots) */
export const AI_ATTR_WEIGHTS: Record<string, Partial<Record<AttributeId, number>>> = {
  Warrior: { strength: 3, vitality: 3, endurance: 3, dexterity: 1, agility: 1, tactics: 1 },
  Mage:    { intellect: 4, wisdom: 3, vitality: 2, tactics: 2, agility: 1 },
  Ranger:  { dexterity: 4, agility: 3, strength: 2, tactics: 2, endurance: 1 },
  Worg:    { agility: 3, strength: 3, dexterity: 3, vitality: 2, endurance: 1 },
};

function emptyAttrs(): Record<AttributeId, number> {
  return { strength: 0, intellect: 0, vitality: 0, dexterity: 0, endurance: 0, wisdom: 0, agility: 0, tactics: 0 };
}

export function createPlayerAttributes(heroClass: string): PlayerAttributes {
  const base = emptyAttrs();
  const classStart = CLASS_STARTING_ATTRS[heroClass] || CLASS_STARTING_ATTRS.Warrior;
  for (const [key, val] of Object.entries(classStart)) {
    base[key as AttributeId] = val!;
  }
  return {
    base,
    bonus: emptyAttrs(),
    unspentPoints: STARTING_POINTS,
    totalAllocated: Object.values(base).reduce((s, v) => s + v, 0),
  };
}

// ── Point Allocation ───────────────────────────────────────────

export function allocatePoint(attrs: PlayerAttributes, attrId: AttributeId): boolean {
  if (attrs.unspentPoints <= 0) return false;
  attrs.base[attrId]++;
  attrs.unspentPoints--;
  attrs.totalAllocated++;
  return true;
}

export function deallocatePoint(attrs: PlayerAttributes, attrId: AttributeId): boolean {
  if (attrs.base[attrId] <= 0) return false;
  attrs.base[attrId]--;
  attrs.unspentPoints++;
  attrs.totalAllocated--;
  return true;
}

export function grantLevelUpPoints(attrs: PlayerAttributes): void {
  attrs.unspentPoints += POINTS_PER_LEVEL;
}

export function getAttr(attrs: PlayerAttributes, id: AttributeId): number {
  return attrs.base[id] + attrs.bonus[id];
}

/** Auto-allocate a single point for AI heroes based on class weights */
export function autoAllocatePoint(attrs: PlayerAttributes, heroClass: string): void {
  if (attrs.unspentPoints <= 0) return;
  const weights = AI_ATTR_WEIGHTS[heroClass] || AI_ATTR_WEIGHTS.Warrior;
  const pool: AttributeId[] = [];
  for (const [id, w] of Object.entries(weights)) {
    for (let i = 0; i < (w || 0); i++) pool.push(id as AttributeId);
  }
  if (pool.length === 0) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  allocatePoint(attrs, pick);
}

// ── Diminishing Returns ────────────────────────────────────────

/** Points 1-25 full value, 26-50 half, 51+ quarter */
function diminish(raw: number): number {
  if (raw <= 25) return raw;
  if (raw <= 50) return 25 + (raw - 25) * 0.5;
  return 25 + 12.5 + (raw - 50) * 0.25;
}

// ── Full 37 Derived Stats ──────────────────────────────────────

export interface DerivedStats {
  // ── Resource pools ──
  health: number;           // bonus HP
  mana: number;             // bonus MP
  stamina: number;          // bonus stamina
  // ── Offense ──
  damage: number;           // bonus flat damage
  attackSpeed: number;      // % bonus attack speed
  criticalChance: number;   // % crit chance (cap 75)
  criticalDamage: number;   // crit multiplier (base 1.5, cap 3.0)
  accuracy: number;         // % hit accuracy
  spellAccuracy: number;    // % spell accuracy
  armorPenetration: number; // % armor pen
  blockPenetration: number; // % block pen
  defenseBreak: number;     // % defense break
  stagger: number;          // % stagger chance
  // ── Defense ──
  defense: number;          // flat defense (used in √Defense formula)
  block: number;            // % block chance (cap 75)
  blockEffect: number;      // % damage blocked when blocking (cap 90)
  evasion: number;          // % evasion (cap 40)
  resistance: number;       // % magic damage reduction
  armor: number;            // flat armor (extra mitigation)
  damageReduction: number;  // flat % damage reduction
  ccResistance: number;     // % CC duration reduction
  bleedResist: number;      // % bleed resist
  spellblock: number;       // % spell block
  criticalEvasion: number;  // % chance to evade crits
  // ── Utility ──
  movementSpeed: number;    // % bonus move speed
  cooldownReduction: number;// % CDR
  cdrResist: number;        // % resistance to CDR debuffs
  abilityCost: number;      // % mana cost reduction
  statusEffect: number;     // % buff/debuff effectiveness
  drainHealth: number;      // % lifesteal
  healthRegen: number;      // HP/sec regen
  manaRegen: number;        // MP/sec regen
  dodge: number;            // % dodge CDR
  reflexTime: number;       // reduced parry window (smaller = easier)
  comboCooldownRed: number; // % combo cooldown reduction
  fallDamage: number;       // % fall damage reduction
  // ── Legacy compat ──
  bonusHp: number;
  bonusMp: number;
  bonusAtk: number;
  bonusMagicDmg: number;
  bonusDef: number;
  bonusSpd: number;
  healPower: number;
  abilityBonus: number;
  physDmgMult: number;
  magicDmgMult: number;
  evasionChance: number;
}

export function computeDerivedStats(attrs: PlayerAttributes): DerivedStats {
  const str = diminish(getAttr(attrs, 'strength'));
  const int = diminish(getAttr(attrs, 'intellect'));
  const vit = diminish(getAttr(attrs, 'vitality'));
  const dex = diminish(getAttr(attrs, 'dexterity'));
  const end = diminish(getAttr(attrs, 'endurance'));
  const wis = diminish(getAttr(attrs, 'wisdom'));
  const agi = diminish(getAttr(attrs, 'agility'));
  const tac = diminish(getAttr(attrs, 'tactics'));

  // TAC global bonus: +0.5% to all percentage stats per point
  const tacPctBonus = 1 + tac * 0.005;

  // ── Per-point gains (reference system) ──
  const health     = str * 5 + vit * 25;
  const mana       = int * 9 + wis * 6;
  const stamina    = end * 6 + tac * 3;
  const damage     = str * 1.25 + int * 1.5 + dex * 0.9;
  const defense    = str * 4 + int * 2 + vit * 1.5 + end * 5 + wis * 5.5;
  const block      = Math.min(75, str * 0.2 * tacPctBonus);
  const blockEff   = Math.min(90, end * 0.175 * tacPctBonus);
  const evasion    = Math.min(40, (dex * 0.125 + agi * 0.225) * tacPctBonus);
  const accuracy   = Math.min(95, (dex * 0.25) * tacPctBonus);
  const critCh     = Math.min(75, (dex * 0.3) * tacPctBonus);
  const critDmg    = Math.min(3.0, 1.5 + dex * 0.015);
  const atkSpeed   = (dex * 0.2) * tacPctBonus;
  const moveSpeed  = (agi * 0.15) * tacPctBonus;
  const resist     = (wis * 0.25) * tacPctBonus;
  const cdrRes     = (wis * 0.2) * tacPctBonus;
  const armorPen   = (tac * 0.2) * tacPctBonus;
  const blockPen   = (tac * 0.175) * tacPctBonus;
  const defBreak   = (tac * 0.1) * tacPctBonus;
  const drain      = (str * 0.075) * tacPctBonus;
  const mRegen     = 1 + wis * 0.3;
  const hRegen     = vit * 0.06;
  const cdr        = (int * 0.075) * tacPctBonus;
  const abiCost    = (tac * 0.075) * tacPctBonus;
  const spellAcc   = (int * 0.15) * tacPctBonus;
  const stagger    = (str * 0.04) * tacPctBonus;
  const ccRes      = (end * 0.1) * tacPctBonus;
  const armorFlat  = end * 0.6;
  const dmgReduc   = 0;
  const bleedRes   = (vit * 0.15) * tacPctBonus;
  const statusEff  = tac * 0.02;
  const spellblk   = (wis * 0.125) * tacPctBonus;
  const dodgeCdr   = (agi * 0.15) * tacPctBonus;
  const reflexTime = Math.max(0.1, 0.5 - agi * 0.005);
  const critEva    = (agi * 0.25) * tacPctBonus;
  const fallDmg    = Math.min(90, agi * 0.5);
  const comboCdr   = (dex * 0.1 + agi * 0.1) * tacPctBonus;

  return {
    health, mana, stamina,
    damage, attackSpeed: atkSpeed, criticalChance: critCh, criticalDamage: critDmg,
    accuracy, spellAccuracy: spellAcc, armorPenetration: armorPen,
    blockPenetration: blockPen, defenseBreak: defBreak, stagger,
    defense, block, blockEffect: blockEff, evasion, resistance: resist,
    armor: armorFlat, damageReduction: dmgReduc, ccResistance: ccRes,
    bleedResist: bleedRes, spellblock: spellblk, criticalEvasion: critEva,
    movementSpeed: moveSpeed, cooldownReduction: cdr, cdrResist: cdrRes,
    abilityCost: abiCost, statusEffect: statusEff, drainHealth: drain,
    healthRegen: hRegen, manaRegen: mRegen, dodge: dodgeCdr,
    reflexTime, comboCooldownRed: comboCdr, fallDamage: fallDmg,
    // Legacy compat fields
    bonusHp: health,
    bonusMp: mana,
    bonusAtk: Math.floor(damage * 0.8),
    bonusMagicDmg: Math.floor(int * 2),
    bonusDef: Math.floor(defense * 0.15),
    bonusSpd: Math.floor(agi * 2),
    healPower: 1 + wis * 0.04,
    abilityBonus: 1 + tac * 0.02,
    physDmgMult: 1 + str * 0.05,
    magicDmgMult: 1 + int * 0.05,
    evasionChance: evasion,
  };
}

/**
 * Apply attribute bonuses to base hero stats.
 * Backward compatible — returns the 5 core stats.
 */
export function applyAttributeBonus(
  baseStats: { hp: number; atk: number; def: number; spd: number; mp: number },
  attrs: PlayerAttributes,
  heroClass: string,
): { hp: number; atk: number; def: number; spd: number; mp: number } {
  const derived = computeDerivedStats(attrs);
  const isMagic = heroClass === 'Mage';

  // Full derived.damage goes into ATK alongside legacy bonus
  const atkFromDerived = Math.floor(derived.damage);
  const magicAtkFromDerived = Math.floor(derived.damage * (isMagic ? 1.2 : 0.5));

  return {
    hp: baseStats.hp + derived.health,
    atk: baseStats.atk + (isMagic ? magicAtkFromDerived : atkFromDerived),
    def: baseStats.def + Math.floor(derived.defense * 0.15),
    spd: baseStats.spd + derived.bonusSpd,
    mp: baseStats.mp + derived.mana,
  };
}

// ── Persistence ────────────────────────────────────────────────

const ATTR_STORAGE_KEY = 'grudge_player_attributes';

export function saveAttributes(attrs: PlayerAttributes): void {
  try {
    localStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify({
      base: attrs.base,
      bonus: attrs.bonus,
      unspentPoints: attrs.unspentPoints,
      totalAllocated: attrs.totalAllocated,
    }));
  } catch {}
}

export function loadAttributes(heroClass: string): PlayerAttributes {
  try {
    const raw = localStorage.getItem(ATTR_STORAGE_KEY);
    if (!raw) return createPlayerAttributes(heroClass);
    const saved = JSON.parse(raw);
    return {
      base: { ...emptyAttrs(), ...saved.base },
      bonus: { ...emptyAttrs(), ...saved.bonus },
      unspentPoints: saved.unspentPoints ?? 0,
      totalAllocated: saved.totalAllocated ?? 0,
    };
  } catch {
    return createPlayerAttributes(heroClass);
  }
}

// ── Summary for UI ─────────────────────────────────────────────

export interface AttributeSummary {
  attrs: { id: AttributeId; name: string; short: string; color: string; base: number; bonus: number; total: number }[];
  derived: DerivedStats;
  unspentPoints: number;
}

export function getAttributeSummary(attrs: PlayerAttributes): AttributeSummary {
  return {
    attrs: ATTR_IDS.map(id => {
      const def = ATTRIBUTES.find(a => a.id === id)!;
      return {
        id,
        name: def.name,
        short: def.short,
        color: def.color,
        base: attrs.base[id],
        bonus: attrs.bonus[id],
        total: attrs.base[id] + attrs.bonus[id],
      };
    }),
    derived: computeDerivedStats(attrs),
    unspentPoints: attrs.unspentPoints,
  };
}
