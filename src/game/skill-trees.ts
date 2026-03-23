/**
 * Skill Tree System — 4 Classes with Weapon-Based Skill Selection
 *
 * Layout: 5 weapon skill slots (Q W E D F) + R class ultimate = 6 total
 * Array indices: [0]=Q, [1]=W, [2]=E, [3]=R(ultimate), [4]=D, [5]=F
 * Display order in HUD: Q W E D F | R
 *
 * Each class has a skill pool per slot with 2-3 options.
 * Skills are filtered by weapon type affinity.
 * The player selects one skill per slot from the available options.
 */

import { AbilityDef, CLASS_ABILITIES, getHeroAbilities } from './types';

// ── Skill Option ───────────────────────────────────────────────

export interface SkillTreeOption {
  id: string;
  ability: AbilityDef;
  requiredLevel: number;
  weaponAffinity?: string[];   // weapon types that unlock this option
  description: string;         // tree-specific tooltip
}

export interface SkillSlotPool {
  slotIndex: number;           // 0-5
  slotLabel: string;           // 'Q','W','E','D','F','R'
  slotType: string;            // 'attack','core','utility','special','burst','ultimate'
  options: SkillTreeOption[];
}

export interface ClassSkillTree {
  className: string;
  color: string;
  slots: SkillSlotPool[];      // 6 slots
}

// ── Extra Abilities (for D and F slots) ────────────────────────

const WARRIOR_EXTRA: AbilityDef[] = [
  // D slot options
  { name: 'Shield Bash', key: 'D', cooldown: 8, manaCost: 15, damage: 30, range: 90, radius: 0, duration: 1, type: 'damage', castType: 'targeted', description: 'Bash with shield, stunning target for 1s', slot: 'core', effect: 'stun 1s' },
  { name: 'War Stomp', key: 'D', cooldown: 10, manaCost: 20, damage: 40, range: 0, radius: 150, duration: 1.5, type: 'aoe', castType: 'self_cast', description: 'Stomp the ground, stunning nearby enemies', slot: 'core', effect: 'stun 1.5s AoE' },
  { name: 'Heroic Leap', key: 'D', cooldown: 12, manaCost: 18, damage: 45, range: 300, radius: 100, duration: 0, type: 'dash', castType: 'ground_aoe', description: 'Leap to target area, dealing AoE damage on landing', slot: 'core', effect: 'gap-close + AoE' },
  // F slot options
  { name: 'Rallying Cry', key: 'F', cooldown: 20, manaCost: 25, damage: 0, range: 0, radius: 300, duration: 5, type: 'buff', castType: 'self_cast', description: 'Boost nearby allies ATK by 15% for 5s', slot: 'core', effect: '+15% ATK allies 5s' },
  { name: 'Rending Strike', key: 'F', cooldown: 7, manaCost: 12, damage: 35, range: 90, radius: 0, duration: 4, type: 'damage', castType: 'targeted', description: 'Slash that causes bleed, dealing damage over 4s', slot: 'core', effect: 'bleed 4s' },
  { name: 'Executioner', key: 'F', cooldown: 14, manaCost: 30, damage: 80, range: 100, radius: 0, duration: 0, type: 'damage', castType: 'targeted', description: 'Massive strike dealing 3x damage to targets below 25% HP', slot: 'core', effect: 'execute <25% HP' },
];

const MAGE_EXTRA: AbilityDef[] = [
  // D slot options
  { name: 'Arcane Missiles', key: 'D', cooldown: 6, manaCost: 20, damage: 20, range: 350, radius: 0, duration: 1.5, type: 'damage', castType: 'targeted', description: 'Fire 3 auto-targeting missiles at nearby enemies', slot: 'core', effect: 'hits 3x auto-target' },
  { name: 'Mana Burn', key: 'D', cooldown: 10, manaCost: 15, damage: 40, range: 300, radius: 0, duration: 0, type: 'damage', castType: 'targeted', description: 'Burn target mana, dealing damage equal to mana burned', slot: 'core', effect: 'drain 40 mana' },
  { name: 'Rune Ward', key: 'D', cooldown: 18, manaCost: 30, damage: 0, range: 200, radius: 120, duration: 8, type: 'heal', castType: 'ground_aoe', description: 'Place a healing rune that regenerates ally HP in area', slot: 'core', effect: 'heal zone 8s' },
  // F slot options
  { name: 'Counterspell', key: 'F', cooldown: 16, manaCost: 25, damage: 0, range: 250, radius: 0, duration: 2, type: 'debuff', castType: 'targeted', description: 'Silence target for 2s, preventing ability use', slot: 'core', effect: 'silence 2s' },
  { name: 'Elemental Surge', key: 'F', cooldown: 12, manaCost: 35, damage: 60, range: 0, radius: 160, duration: 0, type: 'aoe', castType: 'self_cast', description: 'Release stored elemental energy in a burst around you', slot: 'core', effect: 'AoE burst' },
  { name: 'Spell Echo', key: 'F', cooldown: 20, manaCost: 15, damage: 0, range: 0, radius: 0, duration: 6, type: 'buff', castType: 'self_cast', description: 'Next ability cast within 6s is cast twice', slot: 'core', effect: 'double-cast next spell' },
];

const RANGER_EXTRA: AbilityDef[] = [
  // D slot options
  { name: 'Volley', key: 'D', cooldown: 8, manaCost: 18, damage: 25, range: 350, radius: 120, duration: 0, type: 'aoe', castType: 'cone', description: 'Fire a spread of arrows in a cone', slot: 'core', effect: 'cone AoE' },
  { name: 'Net Shot', key: 'D', cooldown: 12, manaCost: 15, damage: 10, range: 300, radius: 0, duration: 2, type: 'debuff', castType: 'skillshot', description: 'Fire a net, rooting target for 2s', slot: 'core', effect: 'root 2s' },
  { name: 'Tracking Mark', key: 'D', cooldown: 14, manaCost: 10, damage: 0, range: 400, radius: 0, duration: 6, type: 'debuff', castType: 'targeted', description: 'Mark target, revealing them and increasing damage taken by 20%', slot: 'core', effect: 'reveal + vuln 20% 6s' },
  // F slot options
  { name: 'Smoke Arrow', key: 'F', cooldown: 16, manaCost: 20, damage: 15, range: 300, radius: 100, duration: 3, type: 'debuff', castType: 'ground_aoe', description: 'Fire a smoke arrow creating a blind zone for 3s', slot: 'core', effect: 'blind zone 3s' },
  { name: 'Quick Draw', key: 'F', cooldown: 4, manaCost: 5, damage: 45, range: 350, radius: 0, duration: 0, type: 'damage', castType: 'line', description: 'Instant quick-draw shot. Short cooldown, high burst.', slot: 'core', effect: 'instant fire' },
  { name: 'Camouflage', key: 'F', cooldown: 20, manaCost: 15, damage: 0, range: 0, radius: 0, duration: 4, type: 'buff', castType: 'self_cast', description: 'Become invisible for 4s. Next attack from stealth crits.', slot: 'core', effect: 'stealth 4s + crit' },
];

const WORG_EXTRA: AbilityDef[] = [
  // D slot options
  { name: 'Predator Leap', key: 'D', cooldown: 10, manaCost: 15, damage: 35, range: 350, radius: 0, duration: 0, type: 'dash', castType: 'targeted', description: 'Leap onto target, dealing damage and slowing 30%', slot: 'core', effect: 'gap-close + slow 30%' },
  { name: 'Pack Howl', key: 'D', cooldown: 18, manaCost: 20, damage: 0, range: 0, radius: 250, duration: 3, type: 'debuff', castType: 'self_cast', description: 'Howl, reducing enemy ATK by 20% and SPD by 15% for 3s', slot: 'core', effect: 'debuff AoE -ATK -SPD' },
  { name: 'Venom Strike', key: 'D', cooldown: 6, manaCost: 10, damage: 20, range: 80, radius: 0, duration: 5, type: 'damage', castType: 'targeted', description: 'Venomous strike dealing poison damage over 5s', slot: 'core', effect: 'poison DoT 5s' },
  // F slot options
  { name: 'Shadow Clone', key: 'F', cooldown: 22, manaCost: 30, damage: 0, range: 0, radius: 0, duration: 6, type: 'summon', castType: 'self_cast', description: 'Create a shadow clone that attacks nearby enemies', slot: 'core', effect: 'summon clone 6s' },
  { name: 'Feral Frenzy', key: 'F', cooldown: 14, manaCost: 18, damage: 15, range: 80, radius: 80, duration: 2, type: 'aoe', castType: 'self_cast', description: 'Rapid multi-hit attack striking all nearby 5 times', slot: 'core', effect: 'hits 5x AoE' },
  { name: 'Savage Bite', key: 'F', cooldown: 8, manaCost: 12, damage: 55, range: 70, radius: 0, duration: 3, type: 'damage', castType: 'targeted', description: 'Ferocious bite that heals for 50% of damage dealt', slot: 'core', effect: 'lifesteal 50%' },
];

const CLASS_EXTRAS: Record<string, AbilityDef[]> = {
  Warrior: WARRIOR_EXTRA,
  Mage: MAGE_EXTRA,
  Ranger: RANGER_EXTRA,
  Worg: WORG_EXTRA,
};

// ── Build Class Skill Trees ────────────────────────────────────

function buildSlotOptions(
  abilities: AbilityDef[],
  slotIndex: number,
  slotLabel: string,
  slotType: string,
  className: string,
): SkillSlotPool {
  const options: SkillTreeOption[] = abilities.map((ab, i) => ({
    id: `${className.toLowerCase()}-${slotType}-${i}`,
    ability: { ...ab, key: slotLabel },
    requiredLevel: 1,
    description: ab.description,
  }));
  return { slotIndex, slotLabel, slotType, options };
}

function gatherSlotAbilities(
  className: string,
  slotType: 'attack' | 'core' | 'defensive' | 'ultimate',
  slotIndex: number,
): AbilityDef[] {
  const collected: AbilityDef[] = [];
  const seen = new Set<string>();

  // Gather from all race-specific CLASS_ABILITIES for this class
  for (const [key, abilities] of Object.entries(CLASS_ABILITIES)) {
    if (!key.endsWith(`_${className}`) && key !== className) continue;
    for (const ab of abilities) {
      if (ab.slot === slotType && !seen.has(ab.name)) {
        seen.add(ab.name);
        collected.push(ab);
      }
    }
  }
  return collected;
}

function buildClassTree(className: string, color: string): ClassSkillTree {
  // Slots 0-2: attack, core, defensive (from CLASS_ABILITIES)
  const attacks = gatherSlotAbilities(className, 'attack', 0);
  const cores = gatherSlotAbilities(className, 'core', 1);
  const defensives = gatherSlotAbilities(className, 'defensive', 2);
  const ultimates = gatherSlotAbilities(className, 'ultimate', 3);

  // Slots 4-5 (D, F): extra skills
  const extras = CLASS_EXTRAS[className] || [];
  const dSlotExtras = extras.filter(ab => ab.key === 'D');
  const fSlotExtras = extras.filter(ab => ab.key === 'F');

  return {
    className,
    color,
    slots: [
      buildSlotOptions(attacks, 0, 'Q', 'attack', className),
      buildSlotOptions(cores, 1, 'W', 'core', className),
      buildSlotOptions(defensives, 2, 'E', 'defensive', className),
      buildSlotOptions(ultimates, 3, 'R', 'ultimate', className),
      buildSlotOptions(dSlotExtras, 4, 'D', 'special', className),
      buildSlotOptions(fSlotExtras, 5, 'F', 'burst', className),
    ],
  };
}

export const SKILL_TREES: Record<string, ClassSkillTree> = {
  Warrior: buildClassTree('Warrior', '#ef4444'),
  Mage: buildClassTree('Mage', '#8b5cf6'),
  Ranger: buildClassTree('Ranger', '#22c55e'),
  Worg: buildClassTree('Worg', '#d97706'),
};

// ── Loadout ────────────────────────────────────────────────────

export interface MobaSkillLoadout {
  className: string;
  race: string;
  /** Selected option index per slot (6 slots) */
  selections: [number, number, number, number, number, number];
}

const LOADOUT_STORAGE_KEY = 'grudge_moba_skill_loadout';

/**
 * Build a default loadout for a hero. Uses their race-specific abilities
 * for slots 0-2 and R, plus first extra option for D and F.
 */
export function createDefaultMobaLoadout(race: string, heroClass: string): MobaSkillLoadout {
  const tree = SKILL_TREES[heroClass];
  if (!tree) return { className: heroClass, race, selections: [0, 0, 0, 0, 0, 0] };

  // Find the race-specific option index for each of the first 3 slots + ultimate
  const raceAbilities = getHeroAbilities(race, heroClass);
  const selections: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];

  // Match race-specific abilities to tree options
  for (let si = 0; si < 4; si++) {
    const pool = tree.slots[si];
    const raceAb = raceAbilities.find(a => a.slot === pool.slotType);
    if (raceAb) {
      const idx = pool.options.findIndex(o => o.ability.name === raceAb.name);
      if (idx >= 0) selections[si] = idx;
    }
  }

  return { className: heroClass, race, selections };
}

/**
 * Build the full 6-ability array from a loadout.
 * Returns abilities in index order: [Q, W, E, R, D, F]
 */
export function buildAbilitiesFromMobaLoadout(loadout: MobaSkillLoadout): AbilityDef[] {
  const tree = SKILL_TREES[loadout.className];
  if (!tree) return getHeroAbilities(loadout.race, loadout.className);

  const abilities: AbilityDef[] = [];
  for (let i = 0; i < 6; i++) {
    const pool = tree.slots[i];
    const selIdx = loadout.selections[i] || 0;
    const option = pool?.options[selIdx];
    if (option) {
      abilities.push({ ...option.ability, key: pool.slotLabel });
    } else {
      // Fallback: empty placeholder
      abilities.push({
        name: '—', key: pool?.slotLabel || '?', cooldown: 0, manaCost: 0,
        damage: 0, range: 0, radius: 0, duration: 0, type: 'damage',
        castType: 'targeted', description: 'No skill selected',
      });
    }
  }
  return abilities;
}

/**
 * Get the display-ordered abilities: [Q, W, E, D, F, R]
 * (weapon skills first, then ultimate)
 */
export function getHudOrderAbilities(abilities: AbilityDef[]): AbilityDef[] {
  if (abilities.length < 6) return abilities;
  // Move R (index 3) to the end: [0,1,2,4,5,3]
  return [abilities[0], abilities[1], abilities[2], abilities[4], abilities[5], abilities[3]];
}

/** Map HUD display index (0-5) back to ability array index */
export function hudIndexToAbilityIndex(hudIdx: number): number {
  // HUD order: Q(0), W(1), E(2), D(4), F(5), R(3)
  const map = [0, 1, 2, 4, 5, 3];
  return map[hudIdx] ?? hudIdx;
}

// ── Persistence ────────────────────────────────────────────────

export function saveMobaLoadout(loadout: MobaSkillLoadout): void {
  try {
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadout));
  } catch {}
}

export function loadMobaLoadout(): MobaSkillLoadout | null {
  try {
    const raw = localStorage.getItem(LOADOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Change skill selection for a slot. Returns updated loadout.
 */
export function setMobaSlotSelection(
  loadout: MobaSkillLoadout,
  slotIndex: number,
  optionIndex: number
): MobaSkillLoadout {
  const tree = SKILL_TREES[loadout.className];
  if (!tree) return loadout;
  const pool = tree.slots[slotIndex];
  if (!pool || optionIndex < 0 || optionIndex >= pool.options.length) return loadout;
  const newSelections = [...loadout.selections] as [number, number, number, number, number, number];
  newSelections[slotIndex] = optionIndex;
  return { ...loadout, selections: newSelections };
}
