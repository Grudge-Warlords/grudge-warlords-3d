/**
 * Player Character Registry — Modular MMO Character Definitions
 *
 * Maps the 12 DungeonCrawler character models to playable archetypes.
 * Each model has a body type (heavy/medium/slim) that determines which
 * races can use it. Players choose race + class + body at character creation,
 * then own that character through the Grudge backend.
 *
 * Character models are DungeonCrawler_Character.fbx → converted to GLB.
 * All share the same Mixamo-compatible skeleton for animation retargeting.
 * Palette texture (256×1 PNG) drives skin/armor color variants per race.
 */

import type { EquipmentAppearance } from './voxel-equipment';

// ── Types ──────────────────────────────────────────────────────

export type BodyType = 'heavy_male' | 'medium_male' | 'slim_male' | 'heavy_female' | 'medium_female' | 'slim_female';

export interface PlayerCharacterDef {
  /** Index into DungeonCrawler_Character array (0-11) */
  modelIndex: number;
  /** Source filename (for conversion pipeline) */
  sourceFbx: string;
  /** Display name shown in character creator */
  displayName: string;
  /** Body type category */
  bodyType: BodyType;
  /** Which races can pick this body */
  availableRaces: string[];
  /** Default model scale in world */
  modelScale: number;
  /** Default skin tone hex (overridden by race selection) */
  defaultSkinColor: string;
  /** ObjectStore asset ID (set after upload) */
  objectStoreId?: string;
  /** ObjectStore GLB URL (set after upload) */
  glbUrl?: string;
}

export interface PlayerCharacterState {
  /** Grudge backend account ID */
  accountId: string;
  /** Grudge ID for this character */
  grudgeId: string;
  /** Selected model index (0-11) */
  modelIndex: number;
  /** Body type */
  bodyType: BodyType;
  /** Player-chosen name */
  customName: string;
  /** Race */
  race: string;
  /** Class */
  heroClass: string;
  /** Faction (derived from race) */
  faction: string;
  /** Level */
  level: number;
  /** Starting weapon type (e.g. 'swords', 'bow', 'fireStaves') */
  weaponType: string;
  /** Equipment appearance snapshot */
  appearance: EquipmentAppearance;
  /** Bear sprite variant for Worg class (brown/white) */
  bearSpriteVariant: 'brown' | 'white';
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  lastLogin: string;
}

// ── Race → Skin Color Mapping ──────────────────────────────────

export const RACE_SKIN_COLORS: Record<string, string> = {
  Human: '#c4956a',
  Barbarian: '#a57850',
  Dwarf: '#d4a574',
  Elf: '#e8d5b8',
  Orc: '#5a8a3a',
  Undead: '#7a8a7a',
};

// ── Race → Faction Mapping ─────────────────────────────────────

export const RACE_FACTIONS: Record<string, string> = {
  Human: 'Crusade',
  Barbarian: 'Crusade',
  Dwarf: 'Fabled',
  Elf: 'Fabled',
  Orc: 'Legion',
  Undead: 'Legion',
};

// ── Race → Bear Form Variant ───────────────────────────────────

export const RACE_BEAR_VARIANT: Record<string, 'brown' | 'white'> = {
  Human: 'white',
  Barbarian: 'brown',
  Dwarf: 'white',
  Elf: 'white',
  Orc: 'brown',
  Undead: 'white',
};

// ── Race → Compatible Body Types ───────────────────────────────

const RACE_BODY_COMPAT: Record<string, BodyType[]> = {
  Human:     ['medium_male', 'medium_female', 'slim_male', 'slim_female', 'heavy_male'],
  Barbarian: ['heavy_male', 'heavy_female', 'medium_male'],
  Dwarf:     ['heavy_male', 'heavy_female', 'medium_male'],
  Elf:       ['slim_male', 'slim_female', 'medium_male', 'medium_female'],
  Orc:       ['heavy_male', 'heavy_female', 'medium_male'],
  Undead:    ['slim_male', 'slim_female', 'medium_male', 'medium_female', 'heavy_male'],
};

// ── Character Definitions (12 models) ──────────────────────────

export const PLAYER_CHARACTER_DEFS: PlayerCharacterDef[] = [
  { modelIndex: 0,  sourceFbx: 'DungeonCrawler_Character.fbx',   displayName: 'Knight',         bodyType: 'heavy_male',    availableRaces: ['Human', 'Barbarian', 'Orc', 'Dwarf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 1,  sourceFbx: 'DungeonCrawler_Character1.fbx',  displayName: 'Warrior',        bodyType: 'medium_male',   availableRaces: ['Human', 'Barbarian', 'Elf', 'Orc', 'Dwarf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 2,  sourceFbx: 'DungeonCrawler_Character2.fbx',  displayName: 'Rogue',          bodyType: 'slim_male',     availableRaces: ['Human', 'Elf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 3,  sourceFbx: 'DungeonCrawler_Character3.fbx',  displayName: 'Mage',           bodyType: 'medium_male',   availableRaces: ['Human', 'Barbarian', 'Elf', 'Orc', 'Dwarf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 4,  sourceFbx: 'DungeonCrawler_Character4.fbx',  displayName: 'Ranger',         bodyType: 'slim_male',     availableRaces: ['Human', 'Elf', 'Barbarian', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 5,  sourceFbx: 'DungeonCrawler_Character5.fbx',  displayName: 'Berserker',      bodyType: 'heavy_male',    availableRaces: ['Human', 'Barbarian', 'Orc', 'Dwarf'], modelScale: 0.008, defaultSkinColor: '#a57850' },
  { modelIndex: 6,  sourceFbx: 'DungeonCrawler_Character6.fbx',  displayName: 'Huntress',       bodyType: 'slim_female',   availableRaces: ['Human', 'Elf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#e8d5b8' },
  { modelIndex: 7,  sourceFbx: 'DungeonCrawler_Character7.fbx',  displayName: 'Valkyrie',       bodyType: 'medium_female', availableRaces: ['Human', 'Barbarian', 'Elf', 'Orc', 'Dwarf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 8,  sourceFbx: 'DungeonCrawler_Character8.fbx',  displayName: 'Witch',          bodyType: 'medium_female', availableRaces: ['Human', 'Elf', 'Barbarian', 'Undead'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
  { modelIndex: 9,  sourceFbx: 'DungeonCrawler_Character9.fbx',  displayName: 'Brute',          bodyType: 'heavy_male',    availableRaces: ['Orc', 'Barbarian', 'Dwarf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#5a8a3a' },
  { modelIndex: 10, sourceFbx: 'DungeonCrawler_Character10.fbx', displayName: 'Shadow',         bodyType: 'slim_female',   availableRaces: ['Human', 'Elf', 'Undead'], modelScale: 0.008, defaultSkinColor: '#7a8a7a' },
  { modelIndex: 11, sourceFbx: 'DungeonCrawler_Character11.fbx', displayName: 'Shieldmaiden',   bodyType: 'heavy_female',  availableRaces: ['Human', 'Barbarian', 'Orc', 'Dwarf'], modelScale: 0.008, defaultSkinColor: '#c4956a' },
];

// ── Lookup Functions ───────────────────────────────────────────

/** Get all character defs compatible with a given race */
export function getCharacterDefsForRace(race: string): PlayerCharacterDef[] {
  return PLAYER_CHARACTER_DEFS.filter(d => d.availableRaces.includes(race));
}

/** Get a specific character def by model index */
export function getCharacterDef(modelIndex: number): PlayerCharacterDef | null {
  return PLAYER_CHARACTER_DEFS.find(d => d.modelIndex === modelIndex) ?? null;
}

/** Get character defs filtered by race and body type */
export function getCharacterDefsByBody(race: string, bodyType: BodyType): PlayerCharacterDef[] {
  return PLAYER_CHARACTER_DEFS.filter(d =>
    d.bodyType === bodyType && d.availableRaces.includes(race)
  );
}

/** Get compatible body types for a race */
export function getBodyTypesForRace(race: string): BodyType[] {
  return RACE_BODY_COMPAT[race] || ['medium_male'];
}

/** Create initial character state for a new player */
export function createPlayerCharacterState(
  accountId: string,
  grudgeId: string,
  modelIndex: number,
  race: string,
  heroClass: string,
  customName: string,
  weaponType?: string,
): PlayerCharacterState {
  const def = getCharacterDef(modelIndex);
  return {
    accountId,
    grudgeId,
    modelIndex,
    bodyType: def?.bodyType || 'medium_male',
    customName,
    race,
    heroClass,
    faction: RACE_FACTIONS[race] || 'Crusade',
    level: 1,
    weaponType: weaponType || '',
    appearance: {},
    bearSpriteVariant: RACE_BEAR_VARIANT[race] || 'brown',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

// ── Weapon Model Paths (from Voxel RPG Characters pack) ────────

export const PLAYER_WEAPON_MODELS: Record<string, { fbx: string; displayName: string }> = {
  sword:      { fbx: 'Content/Weapons/Sword.fbx',      displayName: 'Sword' },
  sword_1:    { fbx: 'Content/Weapons/Sword_1.fbx',    displayName: 'Short Sword' },
  longsword:  { fbx: 'Content/Weapons/LongSword.fbx',  displayName: 'Long Sword' },
  longsword_1:{ fbx: 'Content/Weapons/LongSword_1.fbx',displayName: 'Greatsword' },
  longsword_2:{ fbx: 'Content/Weapons/LongSword_2.fbx',displayName: 'Claymore' },
  knife:      { fbx: 'Content/Weapons/Knife.fbx',      displayName: 'Dagger' },
  knife_1:    { fbx: 'Content/Weapons/Knife_1.fbx',    displayName: 'Stiletto' },
  spear:      { fbx: 'Content/Weapons/Spear.fbx',      displayName: 'Spear' },
  spear_1:    { fbx: 'Content/Weapons/Spear_1.fbx',    displayName: 'Halberd' },
  longbow:    { fbx: 'Content/Weapons/LongBow.fbx',    displayName: 'Long Bow' },
  bowrope:    { fbx: 'Content/Weapons/BowRope.fbx',    displayName: 'Bow' },
  shield:     { fbx: 'Content/Weapons/Shield.fbx',     displayName: 'Tower Shield' },
  shield_1:   { fbx: 'Content/Weapons/Shield_1.fbx',   displayName: 'Round Shield' },
  shield_2:   { fbx: 'Content/Weapons/Shield_2.fbx',   displayName: 'Kite Shield' },
  magiccane:  { fbx: 'Content/Weapons/MagicCane.fbx',  displayName: 'Magic Staff' },
  magiccane_1:{ fbx: 'Content/Weapons/MagicCane_1.fbx',displayName: 'Wand' },
  spellbook:  { fbx: 'Content/Weapons/SpellBook.fbx',  displayName: 'Spell Book' },
  arrow:      { fbx: 'Content/Weapons/Arrow.fbx',      displayName: 'Arrow' },
};

/** Map game weapon types to player weapon model keys */
export const WEAPON_TYPE_TO_PLAYER_MODEL: Record<string, string> = {
  swords: 'sword',
  daggers: 'knife',
  bows: 'longbow',
  crossbows: 'bowrope',
  spears: 'spear',
  hammers: 'longsword_1', // re-skin as hammer via palette
  greataxes: 'longsword_2',
  greatswords: 'longsword',
  scythes: 'spear_1',
  axes1h: 'sword_1',
  guns: 'magiccane_1', // re-skin via palette
  fireStaves: 'magiccane',
  frostStaves: 'magiccane',
  arcaneStaves: 'magiccane',
  natureStaves: 'magiccane',
  lightningStaves: 'magiccane',
  holyStaves: 'magiccane',
};
