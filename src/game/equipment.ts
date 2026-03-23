/**
 * Equipment System — Phase 6
 * 7 equipment slots (Helm, Shoulder, Chest, Hands, Feet, Ring, Necklace)
 * + 2 weapon slots (Main Hand, Off-Hand)
 * Tier scaling from ObjectStore equipment.json structure.
 * Equipping a weapon triggers weapon skill swap.
 * Set bonuses when wearing multiple pieces from same set.
 */

import { PlayerAttributes, AttributeId } from './attributes';

// ── Equipment Slot Types ───────────────────────────────────────

export type EquipSlot = 'helm' | 'shoulder' | 'chest' | 'hands' | 'feet' | 'ring' | 'necklace' | 'cape' | 'mainhand' | 'offhand';

export const EQUIP_SLOTS: { id: EquipSlot; label: string; icon: string }[] = [
  { id: 'helm', label: 'Helm', icon: '🪖' },
  { id: 'shoulder', label: 'Shoulder', icon: '🦺' },
  { id: 'chest', label: 'Chest', icon: '👘' },
  { id: 'hands', label: 'Hands', icon: '🧤' },
  { id: 'feet', label: 'Feet', icon: '👟' },
  { id: 'ring', label: 'Ring', icon: '💍' },
  { id: 'necklace', label: 'Necklace', icon: '📿' },
  { id: 'cape', label: 'Cape', icon: '🧣' },
  { id: 'mainhand', label: 'Main Hand', icon: '⚔️' },
  { id: 'offhand', label: 'Off-Hand', icon: '🛡️' },
];

// ── Tier Multipliers (from ObjectStore equipment.json) ─────────

export const TIER_MULTIPLIERS: Record<number, number> = {
  1: 1.0, 2: 1.15, 3: 1.35, 4: 1.6,
  5: 1.9, 6: 2.25, 7: 2.7, 8: 3.3,
};

// ── Equipment Instance ─────────────────────────────────────────

export interface EquipmentInstance {
  id: string;           // unique instance id
  baseId: string;       // ObjectStore item id (e.g. 'cloth-bloodfeud-helm')
  name: string;
  slot: EquipSlot;
  tier: number;         // 1-8
  material: 'cloth' | 'leather' | 'metal' | 'weapon';
  setName: string;      // e.g. 'Bloodfeud'
  weaponType?: string;  // only for mainhand weapons (e.g. 'swords')
  weaponId?: string;    // ObjectStore weapon id for skill lookups

  // Computed stats (base × tier multiplier)
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  block: number;

  // Special effects
  passive?: string;
  effect?: string;
  proc?: string;

  // Attribute bonuses
  attributeBonus?: Partial<Record<AttributeId, number>>;

  // ObjectStore fields (optional — present when item comes from OS registry)
  iconUrl?: string;          // full URL to ObjectStore icon image
  lore?: string;             // item lore text
  abilities?: string[];      // weapon ability names
  signatureAbility?: string; // weapon signature ability
}

// ── Player Equipment State ─────────────────────────────────────

export interface PlayerEquipment {
  slots: Record<EquipSlot, EquipmentInstance | null>;
}

export function createPlayerEquipment(): PlayerEquipment {
  return {
    slots: {
      helm: null, shoulder: null, chest: null, hands: null,
      feet: null, ring: null, necklace: null, cape: null,
      mainhand: null, offhand: null,
    },
  };
}

// ── Equip / Unequip ────────────────────────────────────────────

export interface EquipResult {
  success: boolean;
  removedItem: EquipmentInstance | null;
  weaponChanged: boolean;
  newWeaponType: string | null;
  newWeaponId: string | null;
}

export function equipItem(equip: PlayerEquipment, item: EquipmentInstance): EquipResult {
  const slot = item.slot;
  const current = equip.slots[slot];
  equip.slots[slot] = item;

  const weaponChanged = slot === 'mainhand' && item.weaponType !== undefined;

  return {
    success: true,
    removedItem: current,
    weaponChanged,
    newWeaponType: weaponChanged ? item.weaponType! : null,
    newWeaponId: weaponChanged ? (item.weaponId || null) : null,
  };
}

export function unequipSlot(equip: PlayerEquipment, slot: EquipSlot): EquipmentInstance | null {
  const item = equip.slots[slot];
  equip.slots[slot] = null;
  return item;
}

// ── Stat Totals ────────────────────────────────────────────────

export interface EquipmentStatTotals {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  block: number;
}

export function computeEquipmentStats(equip: PlayerEquipment): EquipmentStatTotals {
  const totals: EquipmentStatTotals = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, crit: 0, block: 0 };

  for (const slot of Object.values(equip.slots)) {
    if (!slot) continue;
    totals.hp += slot.hp;
    totals.mp += slot.mp;
    totals.atk += slot.atk;
    totals.def += slot.def;
    totals.spd += slot.spd;
    totals.crit += slot.crit;
    totals.block += slot.block;
  }

  return totals;
}

/** Get attribute bonuses from all equipped items */
export function computeEquipmentAttrBonuses(equip: PlayerEquipment): Partial<Record<AttributeId, number>> {
  const bonuses: Partial<Record<AttributeId, number>> = {};
  for (const item of Object.values(equip.slots)) {
    if (!item?.attributeBonus) continue;
    for (const [attr, val] of Object.entries(item.attributeBonus)) {
      bonuses[attr as AttributeId] = (bonuses[attr as AttributeId] || 0) + val!;
    }
  }
  return bonuses;
}

// ── Set Bonuses ────────────────────────────────────────────────

export interface SetBonus {
  setName: string;
  pieces: number;
  bonuses: { label: string; hp?: number; atk?: number; def?: number; spd?: number; special?: string }[];
}

const SET_BONUS_THRESHOLDS: { pieces: number; hpMult: number; atkMult: number; defMult: number; special: string }[] = [
  { pieces: 2, hpMult: 0.05, atkMult: 0, defMult: 0.03, special: '' },
  { pieces: 4, hpMult: 0.10, atkMult: 0.05, defMult: 0.05, special: '+5% crit' },
  { pieces: 6, hpMult: 0.15, atkMult: 0.10, defMult: 0.10, special: 'Set Proc Active' },
];

export function getActiveSets(equip: PlayerEquipment): { setName: string; count: number }[] {
  const setCounts: Record<string, number> = {};
  for (const item of Object.values(equip.slots)) {
    if (!item || !item.setName) continue;
    setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
  }
  return Object.entries(setCounts)
    .filter(([_, count]) => count >= 2)
    .map(([setName, count]) => ({ setName, count }));
}

export function computeSetBonuses(equip: PlayerEquipment): SetBonus[] {
  const sets = getActiveSets(equip);
  const bonuses: SetBonus[] = [];

  for (const set of sets) {
    const bonus: SetBonus = { setName: set.setName, pieces: set.count, bonuses: [] };
    for (const threshold of SET_BONUS_THRESHOLDS) {
      if (set.count >= threshold.pieces) {
        bonus.bonuses.push({
          label: `${threshold.pieces}pc`,
          hp: Math.floor(threshold.hpMult * 100),
          atk: Math.floor(threshold.atkMult * 50),
          def: Math.floor(threshold.defMult * 50),
          special: threshold.special || undefined,
        });
      }
    }
    bonuses.push(bonus);
  }
  return bonuses;
}

// ── Equipment Generation (for drops) ───────────────────────────

const SETS = ['Bloodfeud', 'Wraithfang', 'Oathbreaker', 'Kinrend', 'Dusksinger', 'Emberclad'];
const ARMOR_SLOTS: EquipSlot[] = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace'];
const MATERIALS: ('cloth' | 'leather' | 'metal')[] = ['cloth', 'leather', 'metal'];

let _nextEquipId = 1;

export function generateRandomEquipment(tier: number, slotOverride?: EquipSlot): EquipmentInstance {
  const slot = slotOverride || ARMOR_SLOTS[Math.floor(Math.random() * ARMOR_SLOTS.length)];
  const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
  const setName = SETS[Math.floor(Math.random() * SETS.length)];
  const mult = TIER_MULTIPLIERS[tier] || 1;

  const isChest = slot === 'chest';
  const isAccessory = slot === 'ring' || slot === 'necklace';
  const baseHp = isChest ? 60 : isAccessory ? 25 : 45;
  const baseMp = isChest ? 120 : isAccessory ? 50 : 80;
  const baseDef = isChest ? 12 : isAccessory ? 5 : 9;
  const baseCrit = isChest ? 6 : isAccessory ? 2.5 : 4.5;

  return {
    id: `equip-${_nextEquipId++}`,
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

export function generateWeaponDrop(tier: number, weaponType: string, weaponId?: string): EquipmentInstance {
  const setName = SETS[Math.floor(Math.random() * SETS.length)];
  const mult = TIER_MULTIPLIERS[tier] || 1;

  return {
    id: `equip-${_nextEquipId++}`,
    baseId: `weapon-${weaponType}-${setName.toLowerCase()}`,
    name: `${setName} ${weaponType.charAt(0).toUpperCase() + weaponType.slice(1)}`,
    slot: 'mainhand',
    tier,
    material: 'weapon',
    setName,
    weaponType,
    weaponId,
    hp: 0,
    mp: 0,
    atk: Math.floor(50 * mult),
    def: Math.floor(5 * mult),
    spd: Math.floor(3 * mult),
    crit: Math.floor(3 * mult * 10) / 10,
    block: Math.floor(5 * mult * 10) / 10,
  };
}

// ── Persistence ────────────────────────────────────────────────

const EQUIP_STORAGE_KEY = 'grudge_equipment';

export function saveEquipment(equip: PlayerEquipment): void {
  try {
    localStorage.setItem(EQUIP_STORAGE_KEY, JSON.stringify(equip));
  } catch {}
}

export function loadEquipment(): PlayerEquipment {
  try {
    const raw = localStorage.getItem(EQUIP_STORAGE_KEY);
    if (!raw) return createPlayerEquipment();
    const saved = JSON.parse(raw);
    const result = createPlayerEquipment();
    if (saved.slots) {
      for (const [k, v] of Object.entries(saved.slots)) {
        if (v && result.slots[k as EquipSlot] !== undefined) {
          result.slots[k as EquipSlot] = v as EquipmentInstance;
        }
      }
    }
    return result;
  } catch {
    return createPlayerEquipment();
  }
}

// ── Equipment Bag (unequipped items) ───────────────────────────

export interface EquipmentBag {
  items: EquipmentInstance[];
  maxSlots: number;
}

export function createEquipmentBag(maxSlots = 30): EquipmentBag {
  return { items: [], maxSlots };
}

export function addToBag(bag: EquipmentBag, item: EquipmentInstance): boolean {
  if (bag.items.length >= bag.maxSlots) return false;
  bag.items.push(item);
  return true;
}

export function removeFromBag(bag: EquipmentBag, itemId: string): EquipmentInstance | null {
  const idx = bag.items.findIndex(i => i.id === itemId);
  if (idx === -1) return null;
  return bag.items.splice(idx, 1)[0];
}

const BAG_STORAGE_KEY = 'grudge_equipment_bag';

export function saveEquipmentBag(bag: EquipmentBag): void {
  try { localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(bag)); } catch {}
}

export function loadEquipmentBag(): EquipmentBag {
  try {
    const raw = localStorage.getItem(BAG_STORAGE_KEY);
    if (!raw) return createEquipmentBag();
    return JSON.parse(raw);
  } catch {
    return createEquipmentBag();
  }
}
