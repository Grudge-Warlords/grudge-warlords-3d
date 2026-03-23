/**
 * Grudge Items — ObjectStore Integration
 * Fetches, caches, and exposes all items from:
 *   https://molochdagod.github.io/ObjectStore/api/v1/
 *
 * Provides:
 *   - Full typed item definitions (weapons, armor, consumables, materials)
 *   - Icon URL resolution pointing to ObjectStore CDN
 *   - Stat computation (base + perTier × tier)
 *   - EquipmentInstance conversion for the game's equipment system
 *   - Shop inventory generation using real items
 */

import type { EquipmentInstance, EquipSlot } from './equipment';

// ── ObjectStore base URL ───────────────────────────────────────

export const OS_BASE = 'https://molochdagod.github.io/ObjectStore';

/** Resolve a spritePath (e.g. /icons/weapons/swords/blade.png) to full URL */
export function getIconUrl(spritePath: string | null | undefined): string | null {
  if (!spritePath) return null;
  if (spritePath.startsWith('http')) return spritePath;
  return `${OS_BASE}${spritePath}`;
}

// ── Raw ObjectStore types ──────────────────────────────────────

export interface OSWeaponStats {
  damageBase: number;
  damagePerTier: number;
  speedBase: number;
  speedPerTier: number;
  comboBase: number;
  comboPerTier: number;
  critBase: number;
  critPerTier: number;
  blockBase: number;
  blockPerTier: number;
  defenseBase: number;
  defensePerTier: number;
}

export interface OSWeapon {
  id: string;
  name: string;
  primaryStat: string;
  secondaryStat: string;
  emoji: string;
  grudgeType: string;
  lore: string;
  category: '1h' | '2h' | 'ranged' | 'staff' | 'tome' | 'tool';
  stats: OSWeaponStats;
  basicAbility: string;
  abilities: string[];
  signatureAbility: string;
  passives: string[];
  craftedBy: string;
  spritePath: string | null;
}

export interface OSArmorStats {
  hpBase: number;
  hpPerTier: number;
  manaBase: number;
  manaPerTier: number;
  critBase: number;
  critPerTier: number;
  blockBase: number;
  blockPerTier: number;
  defenseBase: number;
  defensePerTier: number;
}

export interface OSArmor {
  id: string;
  name: string;
  type: string;  // Helm, Shoulder, Chest, Hands, Feet, Ring, Necklace, Cape, Offhand
  material: string;
  lore: string;
  emoji: string;
  grudgeType: string;
  stats: OSArmorStats;
  passive: string;
  attribute: string;
  effect: string;
  proc: string;
  setBonus: string;
  spritePath: string | null;
}

export interface OSConsumable {
  id: number | string;
  name: string;
  lvl: number;
  icon: string;
  mats: Record<string, number>;
  stats: Record<string, string>;  // e.g. { attack: '+10%' } or { heal: '50 HP' }
  desc: string;
  grudgeType: string;
}

export interface OSMaterial {
  id: string;
  name: string;
  tier: number;
  gatheredBy: string;
  emoji: string;
  grudgeType: string;
}

// ── Parsed weapon category meta ────────────────────────────────

export interface OSWeaponCategory {
  iconBase: string;
  iconMax: number;
  items: OSWeapon[];
}

// ── Registry ───────────────────────────────────────────────────

interface Registry {
  weapons: Record<string, OSWeaponCategory>;  // category → items
  armorByMaterial: Record<string, OSArmor[]>; // cloth | leather | metal | gem
  armorSets: string[];
  consumablesByCategory: Record<string, OSConsumable[]>;
  materials: Record<string, OSMaterial[]>;
  loaded: boolean;
  loading: boolean;
}

const _reg: Registry = {
  weapons: {},
  armorByMaterial: {},
  armorSets: [],
  consumablesByCategory: {},
  materials: {},
  loaded: false,
  loading: false,
};

/** Flatten all weapons into a single array */
export function getAllWeapons(): OSWeapon[] {
  const all: OSWeapon[] = [];
  for (const cat of Object.values(_reg.weapons)) {
    all.push(...cat.items);
  }
  return all;
}

/** Get weapons in a category (e.g. 'swords', 'bows') */
export function getWeaponsByCategory(cat: string): OSWeapon[] {
  return _reg.weapons[cat]?.items ?? [];
}

/** Get all armor across all materials */
export function getAllArmor(): OSArmor[] {
  const all: OSArmor[] = [];
  for (const items of Object.values(_reg.armorByMaterial)) {
    all.push(...items);
  }
  return all;
}

/** Get armor by material and optional set name / slot */
export function getArmorItems(material?: string, setName?: string, type?: string): OSArmor[] {
  let pool: OSArmor[] = material ? (_reg.armorByMaterial[material] ?? []) : getAllArmor();
  if (setName) pool = pool.filter(a => a.name.toLowerCase().startsWith(setName.toLowerCase()));
  if (type) pool = pool.filter(a => a.type.toLowerCase() === type.toLowerCase());
  return pool;
}

/** Get all consumables */
export function getAllConsumables(): OSConsumable[] {
  const all: OSConsumable[] = [];
  for (const items of Object.values(_reg.consumablesByCategory)) {
    all.push(...items);
  }
  return all;
}

/** Get consumables by category */
export function getConsumablesByCategory(cat: string): OSConsumable[] {
  return _reg.consumablesByCategory[cat] ?? [];
}

/** All consumable category names */
export function getConsumableCategories(): string[] {
  return Object.keys(_reg.consumablesByCategory);
}

export function isRegistryLoaded(): boolean {
  return _reg.loaded;
}

// ── Async Load ─────────────────────────────────────────────────

export async function loadGrudgeItems(): Promise<void> {
  if (_reg.loaded || _reg.loading) return;
  _reg.loading = true;

  try {
    const [wRes, aRes, cRes, mRes] = await Promise.all([
      fetch(`${OS_BASE}/api/v1/weapons.json`),
      fetch(`${OS_BASE}/api/v1/armor.json`),
      fetch(`${OS_BASE}/api/v1/consumables.json`),
      fetch(`${OS_BASE}/api/v1/materials.json`),
    ]);

    if (wRes.ok) {
      const data = await wRes.json();
      if (data.categories) _reg.weapons = data.categories;
    }

    if (aRes.ok) {
      const data = await aRes.json();
      if (data.materials) {
        for (const [mat, obj] of Object.entries(data.materials as Record<string, { items: OSArmor[] }>)) {
          _reg.armorByMaterial[mat] = obj.items || [];
        }
      }
      if (data.sets) _reg.armorSets = data.sets;
    }

    if (cRes.ok) {
      const data = await cRes.json();
      if (data.categories) {
        for (const [cat, obj] of Object.entries(data.categories as Record<string, { items: OSConsumable[] }>)) {
          _reg.consumablesByCategory[cat] = obj.items || [];
        }
      }
    }

    if (mRes.ok) {
      const data = await mRes.json();
      if (data.categories) {
        for (const [cat, obj] of Object.entries(data.categories as Record<string, { items: OSMaterial[] }>)) {
          _reg.materials[cat] = obj.items || [];
        }
      }
    }

    _reg.loaded = true;
    console.log('[GrudgeItems] Registry loaded:', {
      weapons: getAllWeapons().length,
      armor: getAllArmor().length,
      consumables: getAllConsumables().length,
    });
  } catch (err) {
    console.warn('[GrudgeItems] Failed to load registry:', err);
  } finally {
    _reg.loading = false;
  }
}

// Auto-load on import (fire-and-forget)
loadGrudgeItems();

// ── Stat Computation ───────────────────────────────────────────

/** Compute final stat value at a given tier (1–8) */
export function computeStat(base: number, perTier: number, tier: number): number {
  return Math.floor(base + perTier * Math.max(0, tier - 1));
}

// ── Type → Slot mapping ────────────────────────────────────────

const OS_TYPE_TO_SLOT: Record<string, EquipSlot> = {
  helm: 'helm', Helm: 'helm',
  shoulder: 'shoulder', Shoulder: 'shoulder',
  chest: 'chest', Chest: 'chest',
  hands: 'hands', Hands: 'hands',
  feet: 'feet', Feet: 'feet',
  ring: 'ring', Ring: 'ring',
  necklace: 'necklace', Necklace: 'necklace',
  cape: 'cape', Cape: 'cape',
  offhand: 'offhand', Offhand: 'offhand',
  mainhand: 'mainhand', Mainhand: 'mainhand',
};

const ARMOR_SETS_LIST = ['Bloodfeud', 'Wraithfang', 'Oathbreaker', 'Kinrend', 'Dusksinger', 'Emberclad'];

function extractSetName(itemName: string): string {
  for (const s of ARMOR_SETS_LIST) {
    if (itemName.startsWith(s)) return s;
  }
  return 'Unknown';
}

// ── Weapon category → EquipSlot ────────────────────────────────

const WEAPON_CAT_TO_SLOT: Record<string, EquipSlot> = {
  swords: 'mainhand', axes1h: 'mainhand', daggers: 'mainhand', hammers1h: 'mainhand',
  greatswords: 'mainhand', greataxes: 'mainhand', hammers2h: 'mainhand', spears: 'mainhand',
  bows: 'mainhand', crossbows: 'mainhand', guns: 'mainhand',
  fireStaves: 'mainhand', frostStaves: 'mainhand', holyStaves: 'mainhand',
  lightningStaves: 'mainhand', arcaneStaves: 'mainhand', natureStaves: 'mainhand',
  tools: 'offhand',
  fireTomes: 'offhand', frostTomes: 'offhand', natureTomes: 'offhand',
  holyTomes: 'offhand', arcaneTomes: 'offhand', lightningTomes: 'offhand',
};

// Weapon category → game weapon type key
const WEAPON_CAT_TO_TYPE: Record<string, string> = {
  swords: 'swords', axes1h: 'axes', daggers: 'daggers',
  greatswords: 'greatswords', greataxes: 'greataxes',
  hammers1h: 'hammers', hammers2h: 'hammers2h', spears: 'spears',
  bows: 'bows', crossbows: 'crossbows', guns: 'guns',
  fireStaves: 'staves', frostStaves: 'staves', holyStaves: 'staves',
  lightningStaves: 'staves', arcaneStaves: 'staves', natureStaves: 'staves',
  tools: 'tools',
  fireTomes: 'tomes', frostTomes: 'tomes', natureTomes: 'tomes',
  holyTomes: 'tomes', arcaneTomes: 'tomes', lightningTomes: 'tomes',
};

let _instanceCounter = 10000;

// ── OS Armor → EquipmentInstance ──────────────────────────────

export function osArmorToEquipment(armor: OSArmor, tier: number): EquipmentInstance {
  const slot = OS_TYPE_TO_SLOT[armor.type] ?? 'helm';
  const s = armor.stats;
  const setName = extractSetName(armor.name);
  const mat = armor.material.toLowerCase() as 'cloth' | 'leather' | 'metal';

  return {
    id: `os-${armor.id}-${tier}-${_instanceCounter++}`,
    baseId: armor.id,
    name: armor.name,
    slot,
    tier,
    material: ['cloth', 'leather', 'metal'].includes(mat) ? mat : 'cloth',
    setName,
    hp: computeStat(s.hpBase, s.hpPerTier, tier),
    mp: computeStat(s.manaBase, s.manaPerTier, tier),
    atk: 0,
    def: computeStat(s.defenseBase, s.defensePerTier, tier),
    spd: 0,
    crit: computeStat(s.critBase * 10, s.critPerTier * 10, tier) / 10,
    block: computeStat(s.blockBase * 10, s.blockPerTier * 10, tier) / 10,
    passive: armor.passive,
    effect: armor.effect,
    proc: armor.proc,
    iconUrl: getIconUrl(armor.spritePath) ?? undefined,
  };
}

// ── OS Weapon → EquipmentInstance ─────────────────────────────

export function osWeaponToEquipment(weapon: OSWeapon, category: string, tier: number): EquipmentInstance {
  const slot = WEAPON_CAT_TO_SLOT[category] ?? 'mainhand';
  const weaponType = WEAPON_CAT_TO_TYPE[category] ?? 'swords';
  const s = weapon.stats;

  return {
    id: `os-${weapon.id}-${tier}-${_instanceCounter++}`,
    baseId: weapon.id,
    name: weapon.name,
    slot,
    tier,
    material: 'weapon' as any,
    setName: weapon.id.split('-')[0] ?? 'Unknown',
    weaponType,
    weaponId: weapon.id,
    hp: 0,
    mp: 0,
    atk: computeStat(s.damageBase, s.damagePerTier, tier),
    def: computeStat(s.defenseBase, s.defensePerTier, tier),
    spd: Math.floor(computeStat(s.speedBase, s.speedPerTier, tier) / 10),
    crit: computeStat(s.critBase * 10, s.critPerTier * 10, tier) / 10,
    block: computeStat(s.blockBase * 10, s.blockPerTier * 10, tier) / 10,
    passive: weapon.passives[0],
    effect: weapon.basicAbility,
    iconUrl: getIconUrl(weapon.spritePath) ?? undefined,
    // Store abilities for tooltip
    abilities: weapon.abilities,
    signatureAbility: weapon.signatureAbility,
    lore: weapon.lore,
  } as EquipmentInstance & { abilities?: string[]; signatureAbility?: string; lore?: string };
}

// ── Generate shop inventory from OS items ──────────────────────

const ARMOR_SLOTS_FOR_SHOP: EquipSlot[] = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace', 'cape', 'offhand'];
const WEAPON_CATS_POOL = ['swords', 'axes1h', 'daggers', 'greatswords', 'bows', 'crossbows', 'fireStaves', 'frostStaves', 'arcaneStaves', 'spears', 'hammers1h'];

/**
 * Generate shop equipment from real OS items at the given tier.
 * Falls back to the legacy `generateRandomEquipment` if registry isn't loaded yet.
 */
export function generateOSEquipment(tier: number, slotOverride?: EquipSlot): EquipmentInstance {
  // Fallback if not loaded
  if (!_reg.loaded) {
    return generateLegacyEquipment(tier, slotOverride);
  }

  // Decide: weapon or armor
  const wantWeapon = slotOverride === 'mainhand' || slotOverride === 'offhand' ||
    (!slotOverride && Math.random() < 0.25);

  if (wantWeapon) {
    const cat = WEAPON_CATS_POOL[Math.floor(Math.random() * WEAPON_CATS_POOL.length)];
    const pool = _reg.weapons[cat]?.items ?? [];
    if (pool.length > 0) {
      const weapon = pool[Math.floor(Math.random() * pool.length)];
      return osWeaponToEquipment(weapon, cat, tier);
    }
  }

  // Pick armor
  const allArmor = getAllArmor().filter(a => {
    if (slotOverride) {
      const s = OS_TYPE_TO_SLOT[a.type];
      return s === slotOverride;
    }
    return ARMOR_SLOTS_FOR_SHOP.map(s => s).includes(OS_TYPE_TO_SLOT[a.type] ?? '');
  });

  if (allArmor.length > 0) {
    const armor = allArmor[Math.floor(Math.random() * allArmor.length)];
    return osArmorToEquipment(armor, tier);
  }

  return generateLegacyEquipment(tier, slotOverride);
}

// ── Legacy fallback (same logic as old generateRandomEquipment) ─

const LEGACY_SETS = ['Bloodfeud', 'Wraithfang', 'Oathbreaker', 'Kinrend', 'Dusksinger', 'Emberclad'];
const LEGACY_ARMOR_SLOTS: EquipSlot[] = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace'];
const LEGACY_MATERIALS: ('cloth' | 'leather' | 'metal')[] = ['cloth', 'leather', 'metal'];
const TIER_MULTIPLIERS: Record<number, number> = {
  1: 1.0, 2: 1.15, 3: 1.35, 4: 1.6, 5: 1.9, 6: 2.25, 7: 2.7, 8: 3.3,
};

let _legacyId = 90000;

function generateLegacyEquipment(tier: number, slotOverride?: EquipSlot): EquipmentInstance {
  const slot = slotOverride || LEGACY_ARMOR_SLOTS[Math.floor(Math.random() * LEGACY_ARMOR_SLOTS.length)];
  const material = LEGACY_MATERIALS[Math.floor(Math.random() * LEGACY_MATERIALS.length)];
  const setName = LEGACY_SETS[Math.floor(Math.random() * LEGACY_SETS.length)];
  const mult = TIER_MULTIPLIERS[tier] || 1;
  const isChest = slot === 'chest';
  const isAccessory = slot === 'ring' || slot === 'necklace';
  const baseHp = isChest ? 60 : isAccessory ? 25 : 45;
  const baseMp = isChest ? 120 : isAccessory ? 50 : 80;
  const baseDef = isChest ? 12 : isAccessory ? 5 : 9;
  const baseCrit = isChest ? 6 : isAccessory ? 2.5 : 4.5;

  return {
    id: `equip-${_legacyId++}`,
    baseId: `${material}-${setName.toLowerCase()}-${slot}`,
    name: `${setName} ${slot.charAt(0).toUpperCase() + slot.slice(1)}`,
    slot,
    tier,
    material,
    setName,
    hp: Math.floor(baseHp * mult),
    mp: Math.floor(baseMp * mult),
    atk: Math.floor((isAccessory ? 3 : 5) * mult),
    def: Math.floor(baseDef * mult),
    spd: Math.floor(2 * mult),
    crit: Math.floor(baseCrit * mult * 10) / 10,
    block: Math.floor(2 * mult * 10) / 10,
  };
}

// ── Consumable typed effect ────────────────────────────────────

export interface ConsumableEffect {
  /** HP restore (flat) */
  healHp: number;
  /** MP restore (flat) */
  healMp: number;
  /** Attack % bonus (0.1 = +10%) */
  atkPct: number;
  /** Defense % bonus */
  defPct: number;
  /** Speed % bonus */
  spdPct: number;
  /** Crit bonus % */
  critPct: number;
  /** Duration in seconds (0 = instant) */
  duration: number;
  /** Raw stat string for display */
  statsDisplay: string;
  /** Hotbar color category */
  color: 'red' | 'green' | 'blue' | 'gold' | 'grey';
}

function parseStatPct(val: string): number {
  const m = val.match(/([\d.]+)%/);
  return m ? parseFloat(m[1]) / 100 : 0;
}

function parseStatFlat(val: string): number {
  const m = val.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

export function getConsumableEffect(item: OSConsumable, category: string): ConsumableEffect {
  const s = item.stats;
  const display = Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(', ');

  return {
    healHp: s.heal ? parseStatFlat(s.heal) : s.hp ? parseStatFlat(s.hp) : 0,
    healMp: s.mana ? parseStatFlat(s.mana) : s.mp ? parseStatFlat(s.mp) : 0,
    atkPct: s.attack ? parseStatPct(s.attack) : 0,
    defPct: s.defense ? parseStatPct(s.defense) : s.def ? parseStatPct(s.def) : 0,
    spdPct: s.speed ? parseStatPct(s.speed) : 0,
    critPct: s.crit ? parseStatPct(s.crit) : 0,
    duration: category.includes('Food') ? 300 : category.includes('Potion') ? 0 : 180,
    statsDisplay: display,
    color: category === 'redFoods' ? 'red'
      : category === 'greenFoods' ? 'green'
      : category === 'blueFoods' ? 'blue'
      : category === 'mysticPotions' ? 'gold' : 'grey',
  };
}

/**
 * Find a consumable by level range that matches the player's level.
 */
export function getConsumablesByLevel(category: string, playerLevel: number, count = 6): OSConsumable[] {
  const pool = _reg.consumablesByCategory[category] ?? [];
  const suitable = pool.filter(c => c.lvl <= playerLevel + 5);
  // Sort by level desc, pick top `count`
  return suitable.sort((a, b) => b.lvl - a.lvl).slice(0, count);
}

// ── Weapon lookup by id ────────────────────────────────────────

export function getOSWeaponById(id: string): { weapon: OSWeapon; category: string } | null {
  for (const [cat, catData] of Object.entries(_reg.weapons)) {
    const found = catData.items.find(w => w.id === id);
    if (found) return { weapon: found, category: cat };
  }
  return null;
}

export function getOSArmorById(id: string): OSArmor | null {
  for (const items of Object.values(_reg.armorByMaterial)) {
    const found = items.find(a => a.id === id);
    if (found) return found;
  }
  return null;
}

// ── Weapon abilities string for tooltip ───────────────────────

export function getWeaponTooltip(weapon: OSWeapon): string {
  const lines: string[] = [];
  lines.push(`"${weapon.lore}"`);
  if (weapon.basicAbility) lines.push(`⚡ ${weapon.basicAbility}`);
  if (weapon.signatureAbility) lines.push(`★ ${weapon.signatureAbility}`);
  if (weapon.passives.length > 0) lines.push(weapon.passives.map(p => `• ${p}`).join('\n'));
  return lines.join('\n');
}
