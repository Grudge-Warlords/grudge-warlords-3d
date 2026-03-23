/**
 * NPC Shop System
 * Per-zone shop inventories, buy/sell, trainer respec, crafter recipe access.
 * Uses ObjectStore registry for real items when loaded, legacy fallback otherwise.
 */

import { EquipmentInstance, generateRandomEquipment, EquipSlot, addToBag, removeFromBag, saveEquipmentBag } from './equipment';
import { ISLAND_ZONES } from './zones';
import type { OpenWorldState } from './open-world';
import {
  generateOSEquipment, getConsumablesByLevel, getConsumableEffect,
  OSConsumable, ConsumableEffect, isRegistryLoaded, OS_BASE,
} from './grudge-items';

// ── Consumable Hotbar Item (persisted in state.consumableSlots) ────────────

const CAT_COLOR: Record<string, string> = {
  redFoods: '#ef4444', greenFoods: '#22c55e',
  blueFoods: '#60a5fa', mysticPotions: '#a855f7',
};

export interface ConsumableHotbarItem {
  name: string;
  category: string;
  iconPath: string | null;
  count: number;
  effect: ConsumableEffect;
  color: string;
}

// ── Shop Item ──────────────────────────────────────────────────

export interface ShopItem {
  equipment: EquipmentInstance;
  buyPrice: number;
  sold: boolean;
}

// ── Consumable Shop Item ───────────────────────────────────────

export interface ConsumableShopItem {
  consumable: OSConsumable;
  effect: ConsumableEffect;
  category: string;
  buyPrice: number;
  sold: boolean;
}

// ── Price Helpers ──────────────────────────────────────────────

const BUY_MULT = 1.5;
const SELL_MULT = 0.4;

function baseGoldValue(item: EquipmentInstance): number {
  return Math.floor((item.hp + item.atk * 5 + item.def * 4 + item.spd * 3) * (1 + item.tier * 0.3));
}

export function buyPriceFor(item: EquipmentInstance): number {
  return Math.max(5, Math.floor(baseGoldValue(item) * BUY_MULT));
}

export function sellPriceFor(item: EquipmentInstance): number {
  return Math.max(1, Math.floor(baseGoldValue(item) * SELL_MULT));
}

// ── Shop Inventory Generation ──────────────────────────────────

const SHOP_SLOTS: EquipSlot[] = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace', 'mainhand', 'offhand'];

export function generateShopInventory(zoneId: number, playerLevel: number): ShopItem[] {
  const zone = ISLAND_ZONES.find(z => z.id === zoneId);
  const baseTier = zone ? Math.max(1, Math.min(8, Math.ceil(zone.requiredLevel / 3))) : 1;
  const count = 10 + Math.floor(Math.random() * 5); // 10-14 items
  const items: ShopItem[] = [];
  const useOS = isRegistryLoaded();

  for (let i = 0; i < count; i++) {
    // Slight tier variance: baseTier ± 1
    const tier = Math.max(1, Math.min(8, baseTier + Math.floor(Math.random() * 3) - 1));
    const slot = SHOP_SLOTS[i % SHOP_SLOTS.length] as EquipSlot;
    const equip = useOS ? generateOSEquipment(tier, slot) : generateRandomEquipment(tier, slot);
    items.push({
      equipment: equip,
      buyPrice: buyPriceFor(equip),
      sold: false,
    });
  }
  return items;
}

export function generateConsumableInventory(playerLevel: number): ConsumableShopItem[] {
  const items: ConsumableShopItem[] = [];
  const cats = ['redFoods', 'greenFoods', 'blueFoods', 'mysticPotions'];

  for (const cat of cats) {
    const pool = getConsumablesByLevel(cat, playerLevel, 4);
    for (const c of pool) {
      const effect = getConsumableEffect(c, cat);
      const price = Math.max(2, Math.floor(c.lvl * 0.8));
      items.push({ consumable: c, effect, category: cat, buyPrice: price, sold: false });
    }
  }
  return items;
}

// ── Buy / Sell ─────────────────────────────────────────────────

export interface ShopTransaction {
  success: boolean;
  reason: string;
  goldChange: number;
}

export function buyItem(state: OpenWorldState, shopItems: ShopItem[], index: number): ShopTransaction {
  if (index < 0 || index >= shopItems.length) return { success: false, reason: 'Invalid item', goldChange: 0 };
  const item = shopItems[index];
  if (item.sold) return { success: false, reason: 'Already sold', goldChange: 0 };
  if (state.player.gold < item.buyPrice) return { success: false, reason: 'Not enough gold', goldChange: 0 };
  if (state.equipmentBag.items.length >= state.equipmentBag.maxSlots) return { success: false, reason: 'Bag full', goldChange: 0 };

  state.player.gold -= item.buyPrice;
  addToBag(state.equipmentBag, item.equipment);
  saveEquipmentBag(state.equipmentBag);
  item.sold = true;
  state.killFeed.push({ text: `Bought ${item.equipment.name} for ${item.buyPrice}g`, color: '#22c55e', time: state.gameTime });
  return { success: true, reason: 'Purchased', goldChange: -item.buyPrice };
}

export function sellItem(state: OpenWorldState, bagItemId: string): ShopTransaction {
  const item = state.equipmentBag.items.find(i => i.id === bagItemId);
  if (!item) return { success: false, reason: 'Item not found', goldChange: 0 };
  const price = sellPriceFor(item);

  removeFromBag(state.equipmentBag, bagItemId);
  state.player.gold += price;
  saveEquipmentBag(state.equipmentBag);
  state.killFeed.push({ text: `Sold ${item.name} for ${price}g`, color: '#ffd700', time: state.gameTime });
  return { success: true, reason: 'Sold', goldChange: price };
}

// ── Trainer Respec ─────────────────────────────────────────────

export function getRespecCost(playerLevel: number): number {
  return 50 * playerLevel;
}

export function respecAttributes(state: OpenWorldState): ShopTransaction {
  const cost = getRespecCost(state.player.level);
  if (state.player.gold < cost) return { success: false, reason: `Need ${cost}g to respec`, goldChange: 0 };

  state.player.gold -= cost;
  // Return all allocated points to unspent
  const attrs = state.playerAttributes;
  let returned = 0;
  for (const key of Object.keys(attrs.base) as (keyof typeof attrs.base)[]) {
    returned += attrs.base[key];
    attrs.base[key] = 0;
  }
  attrs.unspentPoints += returned;
  attrs.totalAllocated = 0;

  state.killFeed.push({ text: `Attributes reset! ${returned} points refunded (${cost}g)`, color: '#a855f7', time: state.gameTime });
  return { success: true, reason: 'Respecced', goldChange: -cost };
}

// ── Buy Consumable ────────────────────────────────────────────

export function buyConsumable(state: OpenWorldState, item: ConsumableShopItem): ShopTransaction {
  if (item.sold) return { success: false, reason: 'Already sold', goldChange: 0 };
  if (state.player.gold < item.buyPrice) return { success: false, reason: 'Not enough gold', goldChange: 0 };
  state.player.gold -= item.buyPrice;
  item.sold = true;

  // Add to consumable hotbar slots (3 slots)
  const slots = (state as any).consumableSlots as (ConsumableHotbarItem | null)[] | undefined;
  if (slots) {
    const newItem: ConsumableHotbarItem = {
      name: item.consumable.name,
      category: item.category,
      iconPath: item.consumable.icon?.startsWith('/') ? item.consumable.icon : null,
      count: 1,
      effect: item.effect,
      color: CAT_COLOR[item.category] || '#d4a400',
    };
    // Stack with existing
    let stacked = false;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i]?.name === newItem.name) {
        slots[i]!.count++;
        stacked = true;
        break;
      }
    }
    // Fill empty slot
    if (!stacked) {
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i]) { slots[i] = newItem; break; }
      }
    }
  }

  state.killFeed.push({ text: `Bought ${item.consumable.name} for ${item.buyPrice}g`, color: '#22c55e', time: state.gameTime });
  return { success: true, reason: 'Purchased', goldChange: -item.buyPrice };
}

// ── Shop Cache (per-zone, regenerates on re-entry) ─────────────

const _shopCache = new Map<string, { items: ShopItem[]; timestamp: number; usedOS?: boolean }>();

export function getOrCreateShop(zoneId: number, playerLevel: number): ShopItem[] {
  const key = `${zoneId}-${playerLevel}`;
  const cached = _shopCache.get(key);
  // Refresh cache if OS registry just loaded
  const stale = cached && Date.now() - cached.timestamp > 300_000;
  const needsOSRefresh = cached && !cached.usedOS && isRegistryLoaded();
  if (cached && !stale && !needsOSRefresh) return cached.items;
  const items = generateShopInventory(zoneId, playerLevel);
  _shopCache.set(key, { items, timestamp: Date.now(), usedOS: isRegistryLoaded() });
  return items;
}

export function refreshShop(zoneId: number, playerLevel: number): ShopItem[] {
  const key = `${zoneId}-${playerLevel}`;
  _shopCache.delete(key);
  return getOrCreateShop(zoneId, playerLevel);
}

// ── Consumable shop cache ──────────────────────────────────────

const _consumableCache = new Map<number, { items: ConsumableShopItem[]; timestamp: number }>();

export function getOrCreateConsumableShop(playerLevel: number): ConsumableShopItem[] {
  const cached = _consumableCache.get(playerLevel);
  if (cached && Date.now() - cached.timestamp < 600_000) return cached.items;
  const items = generateConsumableInventory(playerLevel);
  _consumableCache.set(playerLevel, { items, timestamp: Date.now() });
  return items;
}
