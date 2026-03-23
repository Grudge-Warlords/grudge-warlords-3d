/**
 * Resource Nodes — Harvestable trees, crystals, and flowers.
 * Mapped to craftpix sprite packs (trees, crystals, glade objects).
 * Depletion stages, tier-based drops, profession integration.
 *
 * Trees: stretched 1.3× vertically, base-only collision, turn to stump on deplete.
 * Crystals: 4 sizes (shrink per hit), disappear on deplete.
 * Flowers/herbs: 1-hit harvest, particle effect, respawn on timer.
 */

import { getTierForLevel, getBonusQuantity } from './professions-system';

// ── Resource Node Definition ───────────────────────────────────

export interface ResourceDrop {
  materialId: string;
  category: string; // 'wood' | 'ore' | 'gem' | 'essence' | 'cloth' | 'food'
  minQty: number;
  maxQty: number;
  chance: number; // 0-1
}

export interface ResourceNodeDef {
  id: string;
  name: string;
  profession: string; // 'logging' | 'mining' | 'herbalism' | 'farming'
  spriteKey: string;
  depletedSpriteKey: string | null; // stump for trees, null for crystals/flowers
  depletionStages: number; // hits to deplete
  hpPerStage: number;
  tier: number;
  drops: ResourceDrop[];
  respawnMs: number;
  renderScale: { x: number; y: number }; // trees = {1, 1.3}
  collisionBox: { offsetY: number; width: number; height: number };
  biomes: string[];
}

// ── Tree Definitions ───────────────────────────────────────────

const TREE_NODES: ResourceNodeDef[] = [
  { id: 'tree_pine', name: 'Pine Tree', profession: 'logging', spriteKey: 'Tree1', depletedSpriteKey: 'Broken_tree1', depletionStages: 3, hpPerStage: 20, tier: 1,
    drops: [{ materialId: 'pine_log', category: 'wood', minQty: 1, maxQty: 3, chance: 1.0 }],
    respawnMs: 30000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 30, height: 20 }, biomes: ['forest', 'plains'] },
  { id: 'tree_oak', name: 'Oak Tree', profession: 'logging', spriteKey: 'Tree2', depletedSpriteKey: 'Broken_tree2', depletionStages: 4, hpPerStage: 25, tier: 1,
    drops: [{ materialId: 'oak_log', category: 'wood', minQty: 1, maxQty: 3, chance: 1.0 }],
    respawnMs: 35000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 30, height: 20 }, biomes: ['forest', 'plains'] },
  { id: 'tree_autumn', name: 'Autumn Tree', profession: 'logging', spriteKey: 'Autumn_tree1', depletedSpriteKey: 'Broken_tree3', depletionStages: 4, hpPerStage: 30, tier: 3,
    drops: [{ materialId: 'hardwood', category: 'wood', minQty: 1, maxQty: 2, chance: 1.0 }],
    respawnMs: 45000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 30, height: 20 }, biomes: ['forest'] },
  { id: 'tree_moss', name: 'Moss Tree', profession: 'logging', spriteKey: 'Moss_tree1', depletedSpriteKey: 'Broken_tree4', depletionStages: 5, hpPerStage: 35, tier: 4,
    drops: [{ materialId: 'ancient_wood', category: 'wood', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'moss_essence', category: 'essence', minQty: 0, maxQty: 1, chance: 0.3 }],
    respawnMs: 60000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 30, height: 20 }, biomes: ['swamp', 'forest'] },
  { id: 'tree_snow', name: 'Frost Pine', profession: 'logging', spriteKey: 'Snow_tree1', depletedSpriteKey: 'Broken_tree5', depletionStages: 5, hpPerStage: 40, tier: 5,
    drops: [{ materialId: 'frostwood', category: 'wood', minQty: 1, maxQty: 2, chance: 1.0 }],
    respawnMs: 60000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 30, height: 20 }, biomes: ['snow', 'mountain'] },
  { id: 'tree_palm', name: 'Palm Tree', profession: 'logging', spriteKey: 'Palm_tree1_1', depletedSpriteKey: 'Broken_tree6', depletionStages: 3, hpPerStage: 15, tier: 1,
    drops: [{ materialId: 'palm_log', category: 'wood', minQty: 1, maxQty: 2, chance: 1.0 }],
    respawnMs: 25000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 24, height: 16 }, biomes: ['beach', 'tropical'] },
  { id: 'tree_fruit', name: 'Fruit Tree', profession: 'logging', spriteKey: 'Fruit_tree1', depletedSpriteKey: 'Broken_tree7', depletionStages: 3, hpPerStage: 20, tier: 2,
    drops: [{ materialId: 'fruitwood', category: 'wood', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'fruit', category: 'food', minQty: 1, maxQty: 3, chance: 0.6 }],
    respawnMs: 30000, renderScale: { x: 1, y: 1.3 }, collisionBox: { offsetY: 0.7, width: 30, height: 20 }, biomes: ['forest', 'plains', 'tropical'] },
];

// ── Crystal Definitions ────────────────────────────────────────

const CRYSTAL_NODES: ResourceNodeDef[] = [
  { id: 'crystal_green', name: 'Copper Crystal', profession: 'mining', spriteKey: 'Green_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 25, tier: 1,
    drops: [{ materialId: 'copper_ore', category: 'ore', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'emerald', category: 'gem', minQty: 0, maxQty: 1, chance: 0.15 }],
    respawnMs: 40000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['cave', 'mountain', 'plains'] },
  { id: 'crystal_red', name: 'Iron Crystal', profession: 'mining', spriteKey: 'Red_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 30, tier: 2,
    drops: [{ materialId: 'iron_ore', category: 'ore', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'ruby', category: 'gem', minQty: 0, maxQty: 1, chance: 0.12 }],
    respawnMs: 45000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['cave', 'mountain', 'volcano'] },
  { id: 'crystal_yellow', name: 'Gold Crystal', profession: 'mining', spriteKey: 'Yellow_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 35, tier: 3,
    drops: [{ materialId: 'gold_ore', category: 'ore', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'topaz', category: 'gem', minQty: 0, maxQty: 1, chance: 0.1 }],
    respawnMs: 50000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['cave', 'mountain'] },
  { id: 'crystal_blue', name: 'Mithril Crystal', profession: 'mining', spriteKey: 'Blue_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 40, tier: 4,
    drops: [{ materialId: 'mithril_ore', category: 'ore', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'sapphire', category: 'gem', minQty: 0, maxQty: 1, chance: 0.1 }],
    respawnMs: 60000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['cave', 'dungeon'] },
  { id: 'crystal_violet', name: 'Adamantine Crystal', profession: 'mining', spriteKey: 'Violet_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 50, tier: 5,
    drops: [{ materialId: 'adamantine_ore', category: 'ore', minQty: 1, maxQty: 1, chance: 1.0 }, { materialId: 'amethyst', category: 'gem', minQty: 0, maxQty: 1, chance: 0.1 }],
    respawnMs: 75000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['cave', 'dungeon', 'void'] },
  { id: 'crystal_black', name: 'Orichalcum Crystal', profession: 'mining', spriteKey: 'Black_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 60, tier: 6,
    drops: [{ materialId: 'orichalcum_ore', category: 'ore', minQty: 1, maxQty: 1, chance: 1.0 }, { materialId: 'obsidian', category: 'gem', minQty: 0, maxQty: 1, chance: 0.08 }],
    respawnMs: 90000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['dungeon', 'void'] },
  { id: 'crystal_white', name: 'Starmetal Crystal', profession: 'mining', spriteKey: 'White_crystal_4', depletedSpriteKey: null, depletionStages: 4, hpPerStage: 75, tier: 7,
    drops: [{ materialId: 'starmetal_ore', category: 'ore', minQty: 1, maxQty: 1, chance: 1.0 }, { materialId: 'diamond', category: 'gem', minQty: 0, maxQty: 1, chance: 0.05 }],
    respawnMs: 120000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.3, width: 32, height: 32 }, biomes: ['dungeon', 'void', 'boss'] },
];

// ── Flower / Herb Definitions ──────────────────────────────────

const HERB_NODES: ResourceNodeDef[] = [
  { id: 'flower_white', name: 'White Bloom', profession: 'herbalism', spriteKey: 'White_blue_1', depletedSpriteKey: null, depletionStages: 1, hpPerStage: 10, tier: 1,
    drops: [{ materialId: 'common_herb', category: 'cloth', minQty: 1, maxQty: 2, chance: 1.0 }, { materialId: 'nature_essence', category: 'essence', minQty: 0, maxQty: 1, chance: 0.2 }],
    respawnMs: 20000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.5, width: 16, height: 16 }, biomes: ['plains', 'forest'] },
  { id: 'flower_lavender', name: 'Lavender', profession: 'herbalism', spriteKey: 'Lavender_1', depletedSpriteKey: null, depletionStages: 1, hpPerStage: 15, tier: 3,
    drops: [{ materialId: 'lavender', category: 'essence', minQty: 1, maxQty: 2, chance: 1.0 }],
    respawnMs: 25000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.5, width: 16, height: 16 }, biomes: ['plains', 'forest', 'mountain'] },
  { id: 'flower_black', name: 'Nightshade', profession: 'herbalism', spriteKey: 'Black-red_1', depletedSpriteKey: null, depletionStages: 1, hpPerStage: 20, tier: 5,
    drops: [{ materialId: 'nightshade', category: 'essence', minQty: 1, maxQty: 1, chance: 1.0 }],
    respawnMs: 40000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.5, width: 16, height: 16 }, biomes: ['swamp', 'dungeon', 'void'] },
  { id: 'sunflower', name: 'Sunflower', profession: 'herbalism', spriteKey: 'Sunflowers_1', depletedSpriteKey: null, depletionStages: 1, hpPerStage: 10, tier: 2,
    drops: [{ materialId: 'sunpetal', category: 'cloth', minQty: 1, maxQty: 3, chance: 1.0 }, { materialId: 'seeds', category: 'food', minQty: 0, maxQty: 2, chance: 0.4 }],
    respawnMs: 20000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.5, width: 16, height: 16 }, biomes: ['plains'] },
  { id: 'mushroom', name: 'Cave Mushroom', profession: 'herbalism', spriteKey: 'Mushrooms_1', depletedSpriteKey: null, depletionStages: 1, hpPerStage: 10, tier: 3,
    drops: [{ materialId: 'mushroom_cap', category: 'essence', minQty: 1, maxQty: 2, chance: 1.0 }],
    respawnMs: 25000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.5, width: 16, height: 16 }, biomes: ['cave', 'swamp', 'dungeon'] },
  { id: 'wheat', name: 'Wild Wheat', profession: 'herbalism', spriteKey: 'Wheat_1', depletedSpriteKey: null, depletionStages: 2, hpPerStage: 10, tier: 1,
    drops: [{ materialId: 'wheat', category: 'food', minQty: 2, maxQty: 4, chance: 1.0 }],
    respawnMs: 20000, renderScale: { x: 1, y: 1 }, collisionBox: { offsetY: 0.5, width: 20, height: 16 }, biomes: ['plains', 'farm'] },
];

// ── Master List ────────────────────────────────────────────────

export const ALL_RESOURCE_NODES: ResourceNodeDef[] = [...TREE_NODES, ...CRYSTAL_NODES, ...HERB_NODES];

/** Get nodes that can appear in a given biome. */
export function getNodesForBiome(biome: string): ResourceNodeDef[] {
  return ALL_RESOURCE_NODES.filter(n => n.biomes.includes(biome));
}

// ── Active Node Instance ───────────────────────────────────────

export interface ResourceNodeInstance {
  defId: string;
  worldX: number;
  worldY: number;
  currentStage: number; // 0 = full, depletionStages = depleted
  hp: number;
  depleted: boolean;
  respawnTimer: number; // ms remaining until respawn
}

/** Create a new node instance at a world position. */
export function createNodeInstance(def: ResourceNodeDef, x: number, y: number): ResourceNodeInstance {
  return {
    defId: def.id,
    worldX: x, worldY: y,
    currentStage: 0,
    hp: def.hpPerStage,
    depleted: false,
    respawnTimer: 0,
  };
}

// ── Harvest Logic ──────────────────────────────────────────────

export interface NodeHarvestResult {
  stageAdvanced: boolean;
  depleted: boolean;
  drops: { materialId: string; category: string; qty: number }[];
}

/**
 * Hit a resource node. Profession level determines minimum drop tier.
 * User rule: profession level = minimum tier of resource dropped.
 */
export function hitResourceNode(
  node: ResourceNodeInstance,
  def: ResourceNodeDef,
  damage: number,
  profLevel: number,
): NodeHarvestResult {
  if (node.depleted) return { stageAdvanced: false, depleted: true, drops: [] };

  node.hp -= damage;
  if (node.hp > 0) return { stageAdvanced: false, depleted: false, drops: [] };

  // Stage advanced
  node.currentStage++;
  const isDepleted = node.currentStage >= def.depletionStages;
  node.depleted = isDepleted;

  if (!isDepleted) {
    node.hp = def.hpPerStage; // reset HP for next stage
  }

  // Calculate drops: tier floor = max(nodeTier, profLevel), capped at 8
  const effectiveTier = Math.min(8, Math.max(def.tier, profLevel));
  const bonus = getBonusQuantity(profLevel);
  const drops: { materialId: string; category: string; qty: number }[] = [];

  for (const drop of def.drops) {
    if (Math.random() > drop.chance) continue;
    const qty = drop.minQty + Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1)) + bonus;
    if (qty > 0) {
      drops.push({ materialId: drop.materialId, category: drop.category, qty });
    }
  }

  if (isDepleted) {
    node.respawnTimer = def.respawnMs;
  }

  return { stageAdvanced: true, depleted: isDepleted, drops };
}

/** Update respawn timers. Call each frame with dt in ms. */
export function updateNodeRespawns(nodes: ResourceNodeInstance[], dtMs: number): void {
  for (const node of nodes) {
    if (!node.depleted) continue;
    node.respawnTimer -= dtMs;
    if (node.respawnTimer <= 0) {
      node.depleted = false;
      node.currentStage = 0;
      const def = ALL_RESOURCE_NODES.find(d => d.id === node.defId);
      node.hp = def ? def.hpPerStage : 20;
    }
  }
}
