/**
 * Weapon-Based Skill System
 * Skills change dynamically based on the player's equipped weapon.
 * Shared skills (slots 1-3) come from weapon TYPE (e.g. swords, bows).
 * Weapon-specific skills (slot 4) and ultimate (slot 5) come from the named weapon.
 * Falls back to CLASS_ABILITIES when no weapon loadout is configured.
 */

import { AbilityDef, CLASS_ABILITIES, HERO_WEAPONS, getHeroAbilities as baseGetHeroAbilities } from './types';
import {
  OSWeaponSkillOption, OSWeaponTypeSkills, OSWeaponSpecific,
  grudgeApi
} from './grudge-api';

// ── Loadout Types ──────────────────────────────────────────────

export interface WeaponSkillSlot {
  options: OSWeaponSkillOption[];
  selectedIndex: number;
}

export interface WeaponSkillLoadout {
  weaponType: string;       // e.g. 'swords', 'bows', 'fireStaves'
  weaponId: string | null;  // specific weapon e.g. 'bloodfeud-blade'
  slot1: WeaponSkillSlot;   // Attack
  slot2: WeaponSkillSlot;   // Core Skill
  slot3: WeaponSkillSlot;   // Defensive
  slot4: WeaponSkillSlot;   // Weapon Special (weapon-specific)
  classUltimate: AbilityDef | null; // R key - class ultimate preserved
}

const STORAGE_KEY = 'grudge_weapon_loadout';

// ── Loadout Management ─────────────────────────────────────────

/** Create a default loadout from weapon type skills data */
export function createDefaultLoadout(
  typeSkills: OSWeaponTypeSkills,
  weaponType: string,
  weaponId: string | null,
  weaponSpecific: OSWeaponSpecific | null,
  classUltimate: AbilityDef | null
): WeaponSkillLoadout {
  return {
    weaponType,
    weaponId,
    slot1: { options: typeSkills.sharedSkills.slot1, selectedIndex: 0 },
    slot2: { options: typeSkills.sharedSkills.slot2, selectedIndex: 0 },
    slot3: { options: typeSkills.sharedSkills.slot3, selectedIndex: 0 },
    slot4: { options: weaponSpecific?.slot4 || [], selectedIndex: 0 },
    classUltimate,
  };
}

/** Convert an OSWeaponSkillOption to an in-game AbilityDef */
function osSkillToAbility(skill: OSWeaponSkillOption, key: string, slotType: AbilityDef['slot']): AbilityDef {
  return {
    name: skill.name,
    key,
    cooldown: skill.cooldown,
    manaCost: skill.manaCost,
    damage: Math.floor((skill.damageMultiplier || 1.0) * 35), // base damage scaled by multiplier
    range: slotType === 'attack' ? 80 : slotType === 'core' ? 120 : 100,
    radius: 0,
    duration: 0,
    type: skill.cooldown === 0 ? 'damage' : skill.effect?.includes('block') || skill.effect?.includes('dodge') ? 'buff' : 'damage',
    castType: skill.effect?.includes('dodge') || skill.effect?.includes('dash') ? 'ground_aoe'
      : skill.effect?.includes('AoE') || skill.effect?.includes('cone') ? 'cone'
      : skill.cooldown === 0 ? 'targeted' : 'targeted',
    description: skill.description,
    slot: slotType,
    weaponSkillId: skill.id,
    damageMultiplier: skill.damageMultiplier,
    effect: skill.effect,
  };
}

/** Build game-ready AbilityDef[] from a weapon loadout */
export function buildAbilitiesFromLoadout(loadout: WeaponSkillLoadout): AbilityDef[] {
  const abilities: AbilityDef[] = [];

  // Slot 1 - Attack (Q key)
  const s1 = loadout.slot1.options[loadout.slot1.selectedIndex];
  if (s1) abilities.push(osSkillToAbility(s1, 'Q', 'attack'));

  // Slot 2 - Core Skill (E key)
  const s2 = loadout.slot2.options[loadout.slot2.selectedIndex];
  if (s2) abilities.push(osSkillToAbility(s2, 'E', 'core'));

  // Slot 3 - Defensive (Space key)
  const s3 = loadout.slot3.options[loadout.slot3.selectedIndex];
  if (s3) abilities.push(osSkillToAbility(s3, 'Space', 'defensive'));

  // Slot 4 - Weapon Special (D key) — weapon-specific ability
  if (loadout.slot4.options.length > 0) {
    const s4 = loadout.slot4.options[loadout.slot4.selectedIndex];
    if (s4) abilities.push(osSkillToAbility(s4, 'D', 'core'));
  }

  // R key - ALWAYS class ultimate, never overridden by weapon
  if (loadout.classUltimate) {
    abilities.push({ ...loadout.classUltimate, key: 'R' });
  }

  return abilities;
}

/** Change which skill is selected in a given slot */
export function setSlotSelection(loadout: WeaponSkillLoadout, slotKey: 'slot1' | 'slot2' | 'slot3' | 'slot4', index: number): void {
  const slot = loadout[slotKey];
  if (index >= 0 && index < slot.options.length) {
    slot.selectedIndex = index;
  }
}

/** Cycle to next skill option in a slot */
export function cycleSlot(loadout: WeaponSkillLoadout, slotKey: 'slot1' | 'slot2' | 'slot3' | 'slot4'): void {
  const slot = loadout[slotKey];
  if (slot.options.length > 1) {
    slot.selectedIndex = (slot.selectedIndex + 1) % slot.options.length;
  }
}

// ── Async Loadout Builder ──────────────────────────────────────

/**
 * Build a weapon loadout by fetching skills from ObjectStore.
 * Falls back gracefully if API is unavailable.
 */
export async function buildWeaponLoadout(
  weaponType: string,
  weaponId: string | null,
  race: string,
  heroClass: string
): Promise<WeaponSkillLoadout | null> {
  try {
    const typeSkills = await grudgeApi.getWeaponTypeSkills(weaponType);
    if (!typeSkills) return null;

    let weaponSpecific: OSWeaponSpecific | null = null;
    if (weaponId) {
      weaponSpecific = await grudgeApi.getWeaponSpecificSkills(weaponType, weaponId);
    }

    // Get class ultimate (last ability in CLASS_ABILITIES)
    const classAbilities = baseGetHeroAbilities(race, heroClass);
    const classUltimate = classAbilities.find(a => a.slot === 'ultimate') || classAbilities[classAbilities.length - 1] || null;

    return createDefaultLoadout(typeSkills, weaponType, weaponId, weaponSpecific, classUltimate);
  } catch {
    return null;
  }
}

/**
 * Get abilities for a hero, preferring weapon loadout over class defaults.
 * This is the new "smart" version of getHeroAbilities.
 */
export function getAbilitiesWithWeapon(
  loadout: WeaponSkillLoadout | null,
  race: string,
  heroClass: string
): AbilityDef[] {
  if (loadout && loadout.slot1.options.length > 0) {
    return buildAbilitiesFromLoadout(loadout);
  }
  return baseGetHeroAbilities(race, heroClass);
}

// ── Persistence ────────────────────────────────────────────────

export function saveLoadout(loadout: WeaponSkillLoadout): void {
  try {
    const save = {
      weaponType: loadout.weaponType,
      weaponId: loadout.weaponId,
      s1: loadout.slot1.selectedIndex,
      s2: loadout.slot2.selectedIndex,
      s3: loadout.slot3.selectedIndex,
      s4: loadout.slot4.selectedIndex,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

export function loadSavedLoadoutSelections(): { weaponType: string; weaponId: string | null; s1: number; s2: number; s3: number; s4: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Apply saved selections to a freshly built loadout */
export function applySavedSelections(loadout: WeaponSkillLoadout): void {
  const saved = loadSavedLoadoutSelections();
  if (!saved || saved.weaponType !== loadout.weaponType) return;
  if (saved.s1 < loadout.slot1.options.length) loadout.slot1.selectedIndex = saved.s1;
  if (saved.s2 < loadout.slot2.options.length) loadout.slot2.selectedIndex = saved.s2;
  if (saved.s3 < loadout.slot3.options.length) loadout.slot3.selectedIndex = saved.s3;
  if (saved.s4 < loadout.slot4.options.length) loadout.slot4.selectedIndex = saved.s4;
}

// ── Weapon Type Mapping ────────────────────────────────────────
// Maps the game's HERO_WEAPONS categories to ObjectStore weaponSkills keys

const WEAPON_TYPE_TO_OS_KEY: Record<string, string> = {
  swords: 'swords',
  axes1h: 'axes',
  greataxes: 'greataxes',
  greatsword: 'greatswords',
  greatswords: 'greatswords',
  hammers: 'hammers',
  daggers: 'daggers',
  spear: 'spears',
  spears: 'spears',
  bow: 'bows',
  bows: 'bows',
  crossbows: 'crossbows',
  guns: 'guns',
  scythes: 'scythes',
  fireStaves: 'fireStaves',
  frostStaves: 'frostStaves',
  arcaneStaves: 'arcaneStaves',
  natureStaves: 'natureStaves',
  lightningStaves: 'lightningStaves',
  holyStaves: 'holyStaves',
};

/** Convert HERO_WEAPONS value to ObjectStore key */
export function getOSWeaponTypeKey(heroWeaponType: string): string {
  return WEAPON_TYPE_TO_OS_KEY[heroWeaponType] || heroWeaponType;
}
