/**
 * Crafting System — Phase 5
 * Recipes derived from ObjectStore weapons.json and armor.json craftedBy fields.
 * Integrated with professions-system.ts for crafting profession XP.
 * Integrated with resource inventory for material costs.
 */

import {
  ResourceInventory, removeResource, hasResource,
  PlayerProfessions, gainProfessionXp, getTierForLevel,
  saveProfessions, saveResourceInventory
} from './professions-system';

// ── Recipe Definitions ─────────────────────────────────────────

export interface CraftingIngredient {
  name: string;
  tier: number;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'consumable' | 'tool';
  resultType: string;      // e.g. 'swords', 'cloth-helm', 'health-potion'
  resultTier: number;      // 1-8
  profession: string;      // crafting profession id (miner, forester, chef, engineer, mystic)
  requiredLevel: number;   // profession level needed
  ingredients: CraftingIngredient[];
  craftTime: number;       // seconds to craft
  xpReward: number;        // profession XP granted
  resultCount: number;     // how many items produced
  description: string;
}

// ── Profession → Material Mapping ──────────────────────────────

const PROFESSION_MATERIALS: Record<string, { primary: string; secondary: string }> = {
  miner:    { primary: 'Iron Ore', secondary: 'Rough Stone' },
  forester: { primary: 'Pine Log', secondary: 'Rough Leather' },
  chef:     { primary: 'Common Fish', secondary: 'Common Herb' },
  engineer: { primary: 'Scrap Metal', secondary: 'Copper Wire' },
  mystic:   { primary: 'Red Flower', secondary: 'Common Herb' },
};

// Tier-scaled material names for each tier
const TIER_ORE: Record<number, string> = {
  1: 'Iron Ore', 2: 'Steel Ore', 3: 'Gold Ore', 4: 'Adamantine Ore',
  5: 'Celestial Ore', 6: 'Starmetal', 7: 'Dragon Scale Ore', 8: 'Infinity Ore',
};
const TIER_WOOD: Record<number, string> = {
  1: 'Pine Log', 2: 'Ironwood Log', 3: 'Elderwood Log', 4: 'Bloodwood',
  5: 'Ancient Oak', 6: 'World Tree Branch', 7: 'Dragon Root', 8: 'Godwood',
};
const TIER_LEATHER: Record<number, string> = {
  1: 'Rough Leather', 2: 'Fine Leather', 3: 'Exotic Leather', 4: 'Dragon Hide',
  5: 'Celestial Hide', 6: 'Titan Skin', 7: 'Phoenix Feather', 8: 'Infinity Hide',
};
const TIER_HERB: Record<number, string> = {
  1: 'Common Herb', 2: 'Moonpetal', 3: 'Dragon\'s Breath', 4: 'Ethereal Orchid',
  5: 'Celestial Bloom', 6: 'Starflower', 7: 'Phoenix Ash Flower', 8: 'Infinity Bloom',
};
const TIER_CLOTH: Record<number, string> = {
  1: 'Red Flower', 2: 'Moonpetal', 3: 'Mana Bloom', 4: 'Life Root',
  5: 'Spirit Herb', 6: 'Sunpetal', 7: 'Titan Root', 8: 'Cosmic Lotus',
};
const TIER_SCRAP: Record<number, string> = {
  1: 'Scrap Metal', 2: 'Iron Gears', 3: 'Steel Components', 4: 'Mythril Circuits',
  5: 'Void Engine Parts', 6: 'Celestial Machinery', 7: 'Dragon Tech', 8: 'Infinity Machine',
};

// ── Auto-generate Recipes ──────────────────────────────────────

function generateWeaponRecipes(): CraftingRecipe[] {
  const recipes: CraftingRecipe[] = [];
  // Weapon types and their crafting profession
  const weaponProf: Record<string, string> = {
    swords: 'miner', axes1h: 'miner', greataxes: 'miner', greatswords: 'miner',
    hammers: 'miner', daggers: 'miner', spears: 'miner',
    bows: 'forester', crossbows: 'forester',
    guns: 'engineer', scythes: 'miner',
    fireStaves: 'mystic', frostStaves: 'mystic', arcaneStaves: 'mystic',
    natureStaves: 'mystic', lightningStaves: 'mystic', holyStaves: 'mystic',
  };

  for (const [weaponType, profId] of Object.entries(weaponProf)) {
    for (let tier = 1; tier <= 8; tier++) {
      const baseCost = tier * 3 + 2;
      const ingredients: CraftingIngredient[] = [];

      if (profId === 'miner') {
        ingredients.push({ name: TIER_ORE[tier], tier, quantity: baseCost });
        if (tier >= 3) ingredients.push({ name: TIER_WOOD[Math.max(1, tier - 1)], tier: Math.max(1, tier - 1), quantity: Math.ceil(baseCost / 2) });
      } else if (profId === 'forester') {
        ingredients.push({ name: TIER_WOOD[tier], tier, quantity: baseCost });
        ingredients.push({ name: TIER_LEATHER[tier], tier, quantity: Math.ceil(baseCost / 2) });
      } else if (profId === 'engineer') {
        ingredients.push({ name: TIER_SCRAP[tier], tier, quantity: baseCost });
        ingredients.push({ name: TIER_ORE[tier], tier, quantity: Math.ceil(baseCost / 3) });
      } else if (profId === 'mystic') {
        ingredients.push({ name: TIER_HERB[tier], tier, quantity: baseCost });
        ingredients.push({ name: TIER_WOOD[tier], tier, quantity: Math.ceil(baseCost / 2) });
      }

      recipes.push({
        id: `weapon-${weaponType}-t${tier}`,
        name: `T${tier} ${weaponType.charAt(0).toUpperCase() + weaponType.slice(1)}`,
        category: 'weapon',
        resultType: weaponType,
        resultTier: tier,
        profession: profId,
        requiredLevel: tier * 10 + 3,
        ingredients,
        craftTime: tier * 2,
        xpReward: tier * 25,
        resultCount: 1,
        description: `Craft a Tier ${tier} ${weaponType}`,
      });
    }
  }
  return recipes;
}

function generateArmorRecipes(): CraftingRecipe[] {
  const recipes: CraftingRecipe[] = [];
  const armorSlots = ['Helm', 'Shoulder', 'Chest', 'Hands', 'Feet', 'Ring', 'Necklace'];
  const materials: { type: string; profId: string; mat: Record<number, string> }[] = [
    { type: 'cloth', profId: 'mystic', mat: TIER_CLOTH },
    { type: 'leather', profId: 'forester', mat: TIER_LEATHER },
    { type: 'metal', profId: 'miner', mat: TIER_ORE },
  ];

  for (const mat of materials) {
    for (const slot of armorSlots) {
      for (let tier = 1; tier <= 8; tier++) {
        const baseCost = slot === 'Chest' ? tier * 4 + 3 : slot === 'Ring' || slot === 'Necklace' ? tier * 2 + 1 : tier * 3 + 2;
        const ingredients: CraftingIngredient[] = [
          { name: mat.mat[tier], tier, quantity: baseCost },
        ];
        if (tier >= 4) {
          // Higher tiers need supplementary materials
          const suppMat = mat.profId === 'miner' ? TIER_LEATHER : mat.profId === 'forester' ? TIER_HERB : TIER_HERB;
          ingredients.push({ name: suppMat[Math.max(1, tier - 1)], tier: Math.max(1, tier - 1), quantity: Math.ceil(baseCost / 3) });
        }

        recipes.push({
          id: `armor-${mat.type}-${slot.toLowerCase()}-t${tier}`,
          name: `T${tier} ${mat.type.charAt(0).toUpperCase() + mat.type.slice(1)} ${slot}`,
          category: 'armor',
          resultType: `${mat.type}-${slot.toLowerCase()}`,
          resultTier: tier,
          profession: mat.profId,
          requiredLevel: tier * 10,
          ingredients,
          craftTime: tier * 1.5,
          xpReward: tier * 20,
          resultCount: 1,
          description: `Craft a Tier ${tier} ${mat.type} ${slot}`,
        });
      }
    }
  }
  return recipes;
}

function generateConsumableRecipes(): CraftingRecipe[] {
  const recipes: CraftingRecipe[] = [];
  for (let tier = 1; tier <= 8; tier++) {
    recipes.push({
      id: `potion-hp-t${tier}`,
      name: `T${tier} Health Potion`,
      category: 'consumable',
      resultType: 'health-potion',
      resultTier: tier,
      profession: 'chef',
      requiredLevel: tier * 8,
      ingredients: [
        { name: TIER_HERB[tier], tier, quantity: tier + 1 },
      ],
      craftTime: tier,
      xpReward: tier * 10,
      resultCount: 3,
      description: `Brew ${3} T${tier} health potions`,
    });
    recipes.push({
      id: `potion-mp-t${tier}`,
      name: `T${tier} Mana Potion`,
      category: 'consumable',
      resultType: 'mana-potion',
      resultTier: tier,
      profession: 'chef',
      requiredLevel: tier * 8,
      ingredients: [
        { name: TIER_HERB[tier], tier, quantity: tier + 1 },
        { name: tier <= 4 ? 'Common Fish' : TIER_HERB[Math.max(1, tier - 2)], tier: tier <= 4 ? 1 : Math.max(1, tier - 2), quantity: tier },
      ],
      craftTime: tier,
      xpReward: tier * 12,
      resultCount: 3,
      description: `Brew ${3} T${tier} mana potions`,
    });
    recipes.push({
      id: `food-buff-t${tier}`,
      name: `T${tier} Battle Ration`,
      category: 'consumable',
      resultType: 'food-buff',
      resultTier: tier,
      profession: 'chef',
      requiredLevel: tier * 10,
      ingredients: [
        { name: tier <= 4 ? 'Common Fish' : 'Golden Fish', tier: tier <= 4 ? 1 : 3, quantity: tier + 2 },
        { name: TIER_HERB[Math.min(tier, 6)], tier: Math.min(tier, 6), quantity: Math.ceil(tier / 2) },
      ],
      craftTime: tier * 2,
      xpReward: tier * 18,
      resultCount: 5,
      description: `Cook ${5} T${tier} battle rations (+stats buff)`,
    });
  }
  return recipes;
}

// ── All Recipes ────────────────────────────────────────────────

let _allRecipes: CraftingRecipe[] | null = null;

export function getAllRecipes(): CraftingRecipe[] {
  if (!_allRecipes) {
    _allRecipes = [
      ...generateWeaponRecipes(),
      ...generateArmorRecipes(),
      ...generateConsumableRecipes(),
    ];
  }
  return _allRecipes;
}

export function getRecipesByProfession(profId: string): CraftingRecipe[] {
  return getAllRecipes().filter(r => r.profession === profId);
}

export function getRecipesByCategory(category: CraftingRecipe['category']): CraftingRecipe[] {
  return getAllRecipes().filter(r => r.category === category);
}

export function getRecipeById(id: string): CraftingRecipe | null {
  return getAllRecipes().find(r => r.id === id) || null;
}

// ── Crafting Logic ─────────────────────────────────────────────

export interface CraftResult {
  success: boolean;
  reason?: string;
  recipe?: CraftingRecipe;
  xpGained?: number;
  profLevelUp?: boolean;
  profNewLevel?: number;
}

/** Check if player can craft a recipe */
export function canCraft(
  recipe: CraftingRecipe,
  inv: ResourceInventory,
  profs: PlayerProfessions,
): { craftable: boolean; reason: string } {
  const prof = profs.crafting[recipe.profession];
  if (!prof) return { craftable: false, reason: 'Unknown profession' };
  if (prof.level < recipe.requiredLevel) return { craftable: false, reason: `Requires ${recipe.profession} level ${recipe.requiredLevel}` };

  for (const ing of recipe.ingredients) {
    if (!hasResource(inv, ing.name, ing.tier, ing.quantity)) {
      return { craftable: false, reason: `Need ${ing.quantity}x ${ing.name} (T${ing.tier})` };
    }
  }
  return { craftable: true, reason: 'Ready to craft' };
}

/** Execute a craft, consuming materials and granting XP */
export function executeCraft(
  recipe: CraftingRecipe,
  inv: ResourceInventory,
  profs: PlayerProfessions,
): CraftResult {
  const check = canCraft(recipe, inv, profs);
  if (!check.craftable) return { success: false, reason: check.reason };

  // Consume ingredients
  for (const ing of recipe.ingredients) {
    removeResource(inv, ing.name, ing.tier, ing.quantity);
  }

  // Grant profession XP
  const levelResult = gainProfessionXp(profs, 'crafting', recipe.profession, recipe.xpReward);

  // Auto-save
  saveProfessions(profs);
  saveResourceInventory(inv);

  return {
    success: true,
    recipe,
    xpGained: recipe.xpReward,
    profLevelUp: levelResult.leveled,
    profNewLevel: levelResult.newLevel,
  };
}

// ── Recipe Filtering for UI ────────────────────────────────────

export function getAvailableRecipes(
  profs: PlayerProfessions,
  inv: ResourceInventory,
  professionFilter?: string,
  categoryFilter?: CraftingRecipe['category'],
): { recipe: CraftingRecipe; craftable: boolean; reason: string }[] {
  let recipes = getAllRecipes();
  if (professionFilter) recipes = recipes.filter(r => r.profession === professionFilter);
  if (categoryFilter) recipes = recipes.filter(r => r.category === categoryFilter);

  return recipes.map(recipe => {
    const check = canCraft(recipe, inv, profs);
    return { recipe, craftable: check.craftable, reason: check.reason };
  });
}
