/**
 * Professions & Harvesting System — Phase 4
 * 6 Gathering professions (Mining, Logging, Skinning, Fishing, Herbalism, Scavenging)
 * 5 Crafting professions (Miner/Weaponsmith, Forester/Leatherworker, Chef, Engineer, Mystic)
 * Tier-based progression with milestone unlocks from ObjectStore data.
 */

// ── Profession Definitions ─────────────────────────────────────

export const TIER_NAMES = ['', 'Novice', 'Apprentice', 'Journeyman', 'Expert', 'Artisan', 'Master', 'Grandmaster', 'Legendary'];
export const TIER_COLORS: Record<number, string> = {
  1: '#9ca3af', 2: '#22c55e', 3: '#3b82f6', 4: '#8b5cf6',
  5: '#f97316', 6: '#ef4444', 7: '#ec4899', 8: '#f59e0b',
};

export interface GatheringProfDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  tierResources: Record<number, string[]>;
}

export const GATHERING_PROFESSIONS: GatheringProfDef[] = [
  { id: 'mining', name: 'Mining', icon: '⛏️', color: '#64748b',
    tierResources: { 1: ['Iron Ore', 'Copper Ore', 'Rough Stone'], 2: ['Steel Ore', 'Silver Ore', 'Granite'], 3: ['Gold Ore', 'Mithril Ore', 'Marble'], 4: ['Adamantine Ore', 'Platinum Ore', 'Obsidian'], 5: ['Celestial Ore', 'Void Stone'], 6: ['Starmetal', 'Moonstone'], 7: ['Dragon Scale Ore', 'Phoenix Metal'], 8: ['Infinity Ore', 'Godmetal'] } },
  { id: 'logging', name: 'Logging', icon: '🪓', color: '#22c55e',
    tierResources: { 1: ['Pine Log', 'Oak Log', 'Birch Log'], 2: ['Ironwood Log', 'Cedar Log'], 3: ['Elderwood Log', 'Ash Log'], 4: ['Bloodwood', 'Frostoak'], 5: ['Ancient Oak', 'Spirit Wood'], 6: ['World Tree Branch', 'Starwood'], 7: ['Dragon Root', 'Titan Timber'], 8: ['Godwood', 'Cosmic Heartwood'] } },
  { id: 'skinning', name: 'Skinning', icon: '🔪', color: '#f59e0b',
    tierResources: { 1: ['Rough Leather', 'Thick Leather'], 2: ['Fine Leather', 'Tough Hide'], 3: ['Exotic Leather', 'Monster Hide'], 4: ['Dragon Hide', 'Demon Leather'], 5: ['Celestial Hide', 'Void Leather'], 6: ['Titan Skin', 'Elder Dragon Scale'], 7: ['Phoenix Feather', 'Leviathan Scale'], 8: ['Infinity Hide', 'Cosmic Scale'] } },
  { id: 'fishing', name: 'Fishing', icon: '🎣', color: '#3b82f6',
    tierResources: { 1: ['Common Fish', 'Salmon', 'Clam'], 2: ['Tuna', 'Lobster'], 3: ['Golden Fish', 'Pearl Oyster'], 4: ['Moonfish', 'Black Pearl'], 5: ['Void Fish', 'Star Pearl'], 6: ['Celestial Koi', 'Moon Pearl'], 7: ['Phoenix Fin', 'Sun Pearl'], 8: ['Infinity Fish', 'Cosmic Pearl'] } },
  { id: 'herbalism', name: 'Herbalism', icon: '🌿', color: '#10b981',
    tierResources: { 1: ['Red Flower', 'Common Herb'], 2: ['Moonpetal', 'Healing Moss'], 3: ['Dragon\'s Breath', 'Mana Bloom'], 4: ['Ethereal Orchid', 'Life Root'], 5: ['Celestial Bloom', 'Spirit Herb'], 6: ['Starflower', 'Sunpetal'], 7: ['Phoenix Ash Flower', 'Titan Root'], 8: ['Infinity Bloom', 'Cosmic Lotus'] } },
  { id: 'scavenging', name: 'Scavenging', icon: '🧲', color: '#8b5cf6',
    tierResources: { 1: ['Scrap Metal', 'Rusty Cogs'], 2: ['Iron Gears', 'Copper Wire'], 3: ['Steel Components', 'Power Cell'], 4: ['Mythril Circuits', 'Energy Core'], 5: ['Void Engine Parts', 'Quantum Gear'], 6: ['Celestial Machinery', 'Star Engine'], 7: ['Dragon Tech', 'Phoenix Reactor'], 8: ['Infinity Machine', 'Cosmic Core'] } },
];

export interface CraftingProfDef {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  crafts: string[];
}

export const CRAFTING_PROFESSIONS: CraftingProfDef[] = [
  { id: 'miner', name: 'Weaponsmith', role: 'Weapons & Metal Armor', icon: '⚔️', color: '#f59e0b', crafts: ['Swords', 'Axes', 'Daggers', 'Hammers', 'Greatswords', 'Spears', 'Metal Armor', 'Shields'] },
  { id: 'forester', name: 'Leatherworker', role: 'Bows & Leather Armor', icon: '🏹', color: '#22c55e', crafts: ['Bows', 'Crossbows', 'Leather Armor', 'Capes', 'Necklaces'] },
  { id: 'chef', name: 'Chef', role: 'Food & Potions', icon: '🍳', color: '#ef4444', crafts: ['Food Buffs', 'Potions', 'Elixirs', 'Fishing Meals'] },
  { id: 'engineer', name: 'Engineer', role: 'Guns & Gadgets', icon: '⚙️', color: '#6366f1', crafts: ['Guns', 'Traps', 'Gadgets', 'Vehicles', 'Structures'] },
  { id: 'mystic', name: 'Mystic', role: 'Staves & Enchants', icon: '🔮', color: '#8b5cf6', crafts: ['Staves', 'Wands', 'Cloth Armor', 'Enchantments', 'Relics'] },
];

// ── Milestone System ───────────────────────────────────────────

export interface Milestone {
  level: number;
  unlock: string;
  description: string;
}

export const GATHERING_MILESTONES: Milestone[] = [
  { level: 1, unlock: 'Tier 1 Resources', description: 'Basic resources' },
  { level: 10, unlock: '+1 Quantity', description: 'Gather +1 additional resource' },
  { level: 13, unlock: 'Tier 2 Resources', description: 'Improved resources' },
  { level: 20, unlock: '+2 Quantity', description: 'Gather +2 additional resources' },
  { level: 25, unlock: 'Tier 3 Resources', description: 'Advanced resources' },
  { level: 30, unlock: '+3 Quantity', description: 'Gather +3 additional resources' },
  { level: 35, unlock: '5% Gear Drop', description: '5% chance for equipment drops' },
  { level: 38, unlock: 'Tier 4 Resources', description: 'Rare resources' },
  { level: 50, unlock: 'Tier 5 Resources', description: 'Epic resources' },
  { level: 63, unlock: 'Tier 6 Resources', description: 'Mythic resources' },
  { level: 76, unlock: 'Tier 7 Resources', description: 'Legendary resources' },
  { level: 88, unlock: 'Tier 8 Resources', description: 'Godlike resources' },
  { level: 100, unlock: 'Grandmaster', description: 'Maximum efficiency, 25% legendary drop chance' },
];

// ── XP Table ───────────────────────────────────────────────────

/** XP required to reach a given level */
export function professionXpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Smooth curve derived from ObjectStore xpTable
  return Math.floor(50 * level * level * 0.8);
}

/** What tier can a profession access at this level */
export function getTierForLevel(level: number): number {
  if (level >= 88) return 8;
  if (level >= 76) return 7;
  if (level >= 63) return 6;
  if (level >= 50) return 5;
  if (level >= 38) return 4;
  if (level >= 25) return 3;
  if (level >= 13) return 2;
  return 1;
}

/** Bonus quantity from milestones */
export function getBonusQuantity(level: number): number {
  if (level >= 90) return 9;
  if (level >= 80) return 8;
  if (level >= 70) return 7;
  if (level >= 60) return 6;
  if (level >= 40) return 4;
  if (level >= 30) return 3;
  if (level >= 20) return 2;
  if (level >= 10) return 1;
  return 0;
}

/** Gear drop chance from milestones */
export function getGearDropChance(level: number): number {
  if (level >= 95) return 0.20;
  if (level >= 75) return 0.15;
  if (level >= 55) return 0.10;
  if (level >= 35) return 0.05;
  return 0;
}

// ── Player Profession State ────────────────────────────────────

export interface ProfessionState {
  id: string;
  level: number;
  xp: number;
}

export interface PlayerProfessions {
  gathering: Record<string, ProfessionState>;
  crafting: Record<string, ProfessionState>;
}

export function createPlayerProfessions(): PlayerProfessions {
  const gathering: Record<string, ProfessionState> = {};
  for (const g of GATHERING_PROFESSIONS) {
    gathering[g.id] = { id: g.id, level: 1, xp: 0 };
  }
  const crafting: Record<string, ProfessionState> = {};
  for (const c of CRAFTING_PROFESSIONS) {
    crafting[c.id] = { id: c.id, level: 1, xp: 0 };
  }
  return { gathering, crafting };
}

// ── XP / Level Up ──────────────────────────────────────────────

export interface ProfessionLevelUpResult {
  leveled: boolean;
  newLevel: number;
  milestone: Milestone | null;
}

export function gainProfessionXp(
  profs: PlayerProfessions,
  type: 'gathering' | 'crafting',
  profId: string,
  amount: number,
): ProfessionLevelUpResult {
  const prof = type === 'gathering' ? profs.gathering[profId] : profs.crafting[profId];
  if (!prof) return { leveled: false, newLevel: 0, milestone: null };

  prof.xp += amount;
  const needed = professionXpForLevel(prof.level + 1);

  if (prof.xp >= needed && prof.level < 100) {
    prof.xp -= needed;
    prof.level++;
    const milestone = GATHERING_MILESTONES.find(m => m.level === prof.level) || null;
    return { leveled: true, newLevel: prof.level, milestone };
  }

  return { leveled: false, newLevel: prof.level, milestone: null };
}

// ── Harvesting (gathering action) ──────────────────────────────

export interface HarvestResult {
  resources: { name: string; quantity: number; tier: number }[];
  xpGained: number;
  gearDrop: boolean;
}

/**
 * Perform a harvest action.
 * @param profId - gathering profession id
 * @param nodeTier - tier of the resource node (1-8)
 * @param profs - player profession state
 */
export function performHarvest(
  profId: string,
  nodeTier: number,
  profs: PlayerProfessions,
): HarvestResult | null {
  const prof = profs.gathering[profId];
  if (!prof) return null;

  const maxTier = getTierForLevel(prof.level);
  if (nodeTier > maxTier) return null; // can't harvest above your tier

  const profDef = GATHERING_PROFESSIONS.find(g => g.id === profId);
  if (!profDef) return null;

  const tierResources = profDef.tierResources[nodeTier] || [];
  if (tierResources.length === 0) return null;

  const baseQuantity = 1 + getBonusQuantity(prof.level);
  const resourceName = tierResources[Math.floor(Math.random() * tierResources.length)];
  const quantity = baseQuantity + Math.floor(Math.random() * 2);

  const xpGained = Math.floor(nodeTier * 15 * (1 + prof.level * 0.02));
  const gearDrop = Math.random() < getGearDropChance(prof.level);

  return {
    resources: [{ name: resourceName, quantity, tier: nodeTier }],
    xpGained,
    gearDrop,
  };
}

// ── Persistence ────────────────────────────────────────────────

const PROF_STORAGE_KEY = 'grudge_professions';

export function saveProfessions(profs: PlayerProfessions): void {
  try {
    localStorage.setItem(PROF_STORAGE_KEY, JSON.stringify(profs));
  } catch {}
}

export function loadProfessions(): PlayerProfessions {
  try {
    const raw = localStorage.getItem(PROF_STORAGE_KEY);
    if (!raw) return createPlayerProfessions();
    const saved = JSON.parse(raw);
    // Merge with defaults to handle newly added professions
    const result = createPlayerProfessions();
    if (saved.gathering) {
      for (const [k, v] of Object.entries(saved.gathering)) {
        if (result.gathering[k]) Object.assign(result.gathering[k], v);
      }
    }
    if (saved.crafting) {
      for (const [k, v] of Object.entries(saved.crafting)) {
        if (result.crafting[k]) Object.assign(result.crafting[k], v);
      }
    }
    return result;
  } catch {
    return createPlayerProfessions();
  }
}

// ── UI Summary ─────────────────────────────────────────────────

export interface ProfessionSummaryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: number;
  xp: number;
  xpToNext: number;
  tier: number;
  tierName: string;
  tierColor: string;
}

export function getProfessionSummaries(profs: PlayerProfessions): {
  gathering: ProfessionSummaryItem[];
  crafting: ProfessionSummaryItem[];
} {
  const gathering = GATHERING_PROFESSIONS.map(g => {
    const p = profs.gathering[g.id];
    const tier = getTierForLevel(p.level);
    return {
      id: g.id, name: g.name, icon: g.icon, color: g.color,
      level: p.level, xp: p.xp, xpToNext: professionXpForLevel(p.level + 1),
      tier, tierName: TIER_NAMES[tier] || 'Unknown', tierColor: TIER_COLORS[tier] || '#fff',
    };
  });
  const crafting = CRAFTING_PROFESSIONS.map(c => {
    const p = profs.crafting[c.id];
    const tier = getTierForLevel(p.level);
    return {
      id: c.id, name: c.name, icon: c.icon, color: c.color,
      level: p.level, xp: p.xp, xpToNext: professionXpForLevel(p.level + 1),
      tier, tierName: TIER_NAMES[tier] || 'Unknown', tierColor: TIER_COLORS[tier] || '#fff',
    };
  });
  return { gathering, crafting };
}

// ── Inventory (simple resource bag) ────────────────────────────

export interface ResourceStack {
  name: string;
  tier: number;
  quantity: number;
}

export interface ResourceInventory {
  resources: ResourceStack[];
  maxSlots: number;
}

export function createResourceInventory(maxSlots = 50): ResourceInventory {
  return { resources: [], maxSlots };
}

export function addResource(inv: ResourceInventory, name: string, tier: number, quantity: number): boolean {
  const existing = inv.resources.find(r => r.name === name && r.tier === tier);
  if (existing) {
    existing.quantity += quantity;
    return true;
  }
  if (inv.resources.length >= inv.maxSlots) return false;
  inv.resources.push({ name, tier, quantity });
  return true;
}

export function removeResource(inv: ResourceInventory, name: string, tier: number, quantity: number): boolean {
  const existing = inv.resources.find(r => r.name === name && r.tier === tier);
  if (!existing || existing.quantity < quantity) return false;
  existing.quantity -= quantity;
  if (existing.quantity <= 0) {
    inv.resources = inv.resources.filter(r => r !== existing);
  }
  return true;
}

export function hasResource(inv: ResourceInventory, name: string, tier: number, quantity: number): boolean {
  const existing = inv.resources.find(r => r.name === name && r.tier === tier);
  return !!existing && existing.quantity >= quantity;
}

const INV_STORAGE_KEY = 'grudge_resource_inventory';

export function saveResourceInventory(inv: ResourceInventory): void {
  try { localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(inv)); } catch {}
}

export function loadResourceInventory(): ResourceInventory {
  try {
    const raw = localStorage.getItem(INV_STORAGE_KEY);
    if (!raw) return createResourceInventory();
    return JSON.parse(raw);
  } catch {
    return createResourceInventory();
  }
}
