/**
 * Hero Codex — grudge-heros.puter.site integration module
 *
 * Best-practice pattern for consuming Puter-deployed Grudge Studio sites:
 *  1. Define a single BASE constant for the remote site origin.
 *  2. Derive all asset / portrait URLs from that constant.
 *  3. Keep supplemental data (lore, abilities, traits) co-located here
 *     so the rest of the app imports one clean module.
 *  4. Provide typed helpers (getCodexHeroId, getCodexPortraitUrl) to
 *     ensure consistent ID mapping between the game and the codex site.
 */

import type { HeroData } from './types';

/* ------------------------------------------------------------------ */
/*  Remote base URL                                                    */
/* ------------------------------------------------------------------ */

/** Canonical origin of the Hero Codex Puter deployment */
export const GRUDGE_HEROS_BASE = 'https://grudge-heros.puter.site';

/* ------------------------------------------------------------------ */
/*  Hero-ID mapping                                                    */
/* ------------------------------------------------------------------ */

/**
 * Map a game HeroData record to its grudge-heros.puter.site hero id.
 * Most heroes follow `${race}_${class}` in lowercase.
 * Secret / special heroes have explicit overrides.
 */
export function getCodexHeroId(hero: HeroData): string {
  // Special cases
  if (hero.name === 'Racalvin the Pirate King') return 'pirate_king';
  if (hero.name === 'Cpt. John Wayne') return 'sky_captain';
  // Standard pattern: race_class
  return `${hero.race.toLowerCase()}_${hero.heroClass.toLowerCase()}`;
}

/** Full portrait URL on the Codex CDN with sprite fallback path */
export function getCodexPortraitUrl(hero: HeroData): string {
  return `${GRUDGE_HEROS_BASE}/hero-portraits/${getCodexHeroId(hero)}.png`;
}

/** Fallback sprite path on the Codex CDN */
export function getCodexSpriteFallbackUrl(hero: HeroData): string {
  const race = hero.race.toLowerCase();
  // Map class names to sprite folder names used on grudge-heros
  const classMap: Record<string, string> = {
    warrior: 'warrior', worg: 'paladin', mage: 'mage', ranger: 'archer',
  };
  const cls = classMap[hero.heroClass.toLowerCase()] || hero.heroClass.toLowerCase();
  return `${GRUDGE_HEROS_BASE}/sprites/entities/units/${race}/${race}_${cls}.png`;
}

/* ------------------------------------------------------------------ */
/*  Faction visual styling (matches grudge-heros.puter.site)           */
/* ------------------------------------------------------------------ */

export interface CodexFactionStyle {
  bg: string;
  border: string;
  glow: string;
  gradient: string;
}

export const CODEX_FACTION_STYLES: Record<string, CodexFactionStyle> = {
  Crusade: { bg: '#0c1a3a', border: '#3b82f6', glow: 'rgba(59,130,246,0.3)', gradient: 'linear-gradient(135deg, #0c1a3a 0%, #1a2d5a 50%, #0c1a3a 100%)' },
  Fabled:  { bg: '#0c1e14', border: '#16a34a', glow: 'rgba(22,163,74,0.3)',  gradient: 'linear-gradient(135deg, #0c1e14 0%, #14332a 50%, #0c1e14 100%)' },
  Legion:  { bg: '#2a0c0c', border: '#ef4444', glow: 'rgba(239,68,68,0.3)',  gradient: 'linear-gradient(135deg, #2a0c0c 0%, #3a1a1a 50%, #2a0c0c 100%)' },
  Pirates: { bg: '#1a1505', border: '#c9a030', glow: 'rgba(201,160,48,0.4)', gradient: 'linear-gradient(135deg, #1a1505 0%, #2a2010 50%, #1a1505 100%)' },
};

export const CODEX_RARITY_CONFIG: Record<string, { color: string; stars: number }> = {
  Common:    { color: '#9ca3af', stars: 1 },
  Uncommon:  { color: '#22c55e', stars: 2 },
  Rare:      { color: '#3b82f6', stars: 3 },
  Epic:      { color: '#a855f7', stars: 4 },
  Legendary: { color: '#ffd700', stars: 5 },
};

/* ------------------------------------------------------------------ */
/*  Racial traits (shared per race)                                    */
/* ------------------------------------------------------------------ */

export interface RacialTrait { name: string; effect: string; }

export const RACIAL_TRAITS: Record<string, RacialTrait[]> = {
  Human:     [{ name: 'Adaptable',        effect: '+5% XP gain' },  { name: 'Diplomatic',        effect: '+10% gold from quests' }],
  Barbarian: [{ name: 'Rage',             effect: '+20% damage below 50% HP' }, { name: 'Frost Resistance', effect: '+15% cold defense' }],
  Dwarf:     [{ name: 'Stoneborn',        effect: '+20% Defense' }, { name: 'Master Craftsman',  effect: '+1 crafting tier' }],
  Elf:       [{ name: 'Keen Senses',      effect: '+15% Accuracy' }, { name: 'Arcane Affinity',  effect: '+10% Mana' }],
  Orc:       [{ name: 'Bloodrage',        effect: '+25% damage below 50% HP' }, { name: 'Warborn',          effect: '+10% Critical' }],
  Undead:    [{ name: 'Undying',          effect: '+20% HP' },      { name: 'Fear Aura',         effect: '-10% enemy accuracy' }],
};

/* ------------------------------------------------------------------ */
/*  Codex abilities (from grudge-heros, per class)                     */
/* ------------------------------------------------------------------ */

export interface CodexAbility {
  name: string;
  icon: string;           // icon key for sprite lookup
  description: string;
  manaCost: number;
}

export const CODEX_CLASS_ABILITIES: Record<string, CodexAbility[]> = {
  Warrior: [
    { name: 'Invincibility',    icon: 'shield',       description: 'Become immune to all damage for a short duration',  manaCost: 40 },
    { name: 'Damage Surge',     icon: 'zap',          description: '+25% attack power temporary boost',                 manaCost: 25 },
    { name: "Guardian's Aura",  icon: 'shield-check', description: '+15% defense to all nearby allies',                 manaCost: 30 },
    { name: 'Avatar Form',      icon: 'crown',        description: '+40% all stats, increased size',                    manaCost: 80 },
  ],
  Worg: [
    { name: 'Bear Form',   icon: 'shield', description: '+50% defense, +30% max HP, reduced speed', manaCost: 30 },
    { name: 'Feral Rage',  icon: 'flame',  description: '+30% attack speed and damage',             manaCost: 25 },
    { name: 'Raptor Form', icon: 'zap',    description: '+20% attack, +40% speed, +15% crit',       manaCost: 30 },
    { name: 'Worg Lord',   icon: 'crown',  description: '+40% all stats, +50% max HP, summon pack',  manaCost: 80 },
  ],
  Mage: [
    { name: 'Mana Shield',     icon: 'shield', description: 'Passive shield based on remaining mana percentage', manaCost: 0 },
    { name: 'Fireball',        icon: 'flame',  description: 'AoE fire damage to enemies in target area',         manaCost: 30 },
    { name: 'Heal',            icon: 'heart',  description: 'Restore HP to target ally',                         manaCost: 20 },
    { name: 'Lightning Chain', icon: 'zap',    description: 'Chain lightning hitting up to 5 targets',           manaCost: 35 },
  ],
  Ranger: [
    { name: 'Precision',      icon: 'crosshair',  description: 'Passive accuracy and critical hit bonus',    manaCost: 0 },
    { name: 'Power Shot',     icon: 'target',      description: 'High damage ranged attack at 2x damage',    manaCost: 20 },
    { name: 'Multi Shot',     icon: 'split',       description: 'Fire 5 arrows in a spread pattern',         manaCost: 25 },
    { name: 'Rain of Arrows', icon: 'cloud-rain',  description: 'Massive AoE ranged barrage',                manaCost: 40 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Skill icon sprite URL helper                                       */
/* ------------------------------------------------------------------ */

const SKILL_SPRITE_MAP: Record<string, string> = {
  shield: 'sprites/effects/Icon_07.png',
  zap: 'sprites/effects/Icon_02.png',
  heart: 'sprites/effects/Icon_05.png',
  flame: 'sprites/effects/Icon_01.png',
  crosshair: 'sprites/effects/Icon_09.png',
  target: 'sprites/effects/Icon_04.png',
  split: 'sprites/effects/Icon_03.png',
  'cloud-rain': 'sprites/effects/Icon_03.png',
  crown: 'sprites/effects/Icon_06.png',
  'shield-check': 'sprites/effects/Icon_08.png',
  star: 'sprites/effects/Icon_06.png',
  skull: 'sprites/effects/Icon_09.png',
  sparkles: 'sprites/effects/Icon_10.png',
};

/** Resolve an ability icon key to a full CDN sprite URL */
export function getSkillIconUrl(icon: string): string {
  const path = SKILL_SPRITE_MAP[icon] || 'sprites/effects/Icon_06.png';
  return `${GRUDGE_HEROS_BASE}/${path}`;
}

/* ------------------------------------------------------------------ */
/*  Per-hero codex lore & metadata                                     */
/* ------------------------------------------------------------------ */

export interface CodexHeroMeta {
  lore: string;
  backstory: string;
  strengths: string[];
  weaknesses: string[];
  combatStyle: string;
  weapons: string;
  alignment: string;
  difficulty: string;
  primaryAttribute: string;
  flavorText: string;
  /** Extra racial traits beyond the base ones (e.g. Pirate King) */
  extraTraits?: RacialTrait[];
}

export const CODEX_HERO_META: Record<string, CodexHeroMeta> = {
  human_warrior: {
    lore: 'Born in the fortified city of Valorheim, Aldric rose through the ranks of the Crusade militia to become its most decorated champion. His unbreakable will and mastery of sword and shield have turned the tide of countless battles against the Legion.',
    backstory: 'Orphaned during the First Grudge War, young Aldric was raised by the Temple Knights. He forged his first blade at age twelve and took his oath at sixteen. Now he leads the vanguard of every Crusade offensive, his golden armor a beacon of hope.',
    strengths: ['Highest armor and block chance', 'Invincibility ultimate', 'Flexible tank or DPS builds'],
    weaknesses: ['No ranged attacks', 'No magic or healing', 'Slow movement speed'],
    combatStyle: 'Melee Physical Combat', weapons: 'Swords, Axes, Shields, Heavy Armor',
    alignment: 'Lawful Good', difficulty: 'Beginner', primaryAttribute: 'STR',
    flavorText: 'Where Aldric stands, the line holds.',
  },
  human_worg: {
    lore: 'Gareth was a simple huntsman until a dire wolf spirit bonded with his soul during a blood moon ritual. Now he walks between the worlds of man and beast, his primal fury tempered by human discipline.',
    backstory: 'Once captain of the Crusade rangers, Gareth ventured too deep into the Darkwood seeking a cure for a plague. There, the ancient Wolf Spirit Fenrath chose him as vessel. He returned changed, his eyes gleaming amber in the dark.',
    strengths: ['Multiple combat forms', 'Pack summons for numbers advantage', 'Strong self-buffs and frenzy'],
    weaknesses: ['No ranged attacks', 'No healing spells', 'Form-dependent abilities'],
    combatStyle: 'Melee Shapeshifting Combat', weapons: 'Claws, Fangs, Natural Weapons',
    alignment: 'Chaotic Neutral', difficulty: 'Advanced', primaryAttribute: 'STR',
    flavorText: 'In the space between howl and silence, death waits.',
  },
  human_mage: {
    lore: 'Elara was the youngest scholar ever admitted to the Arcane Consortium. Her mastery of elemental magic and divine healing makes her invaluable on the battlefield, though her fragile form demands protection.',
    backstory: 'Raised in the Brightspire Academy, Elara discovered she could channel both arcane destruction and divine healing, a gift unseen in centuries. The Consortium fears her power; the Crusade depends on it.',
    strengths: ['Powerful AoE damage spells', 'Only class with healing', 'Blink teleport for mobility'],
    weaknesses: ['Very fragile in melee', 'Mana dependent', 'Low physical defense'],
    combatStyle: 'Ranged Magic & Healing', weapons: 'Staves, Wands, Orbs, Robes',
    alignment: 'Neutral Good', difficulty: 'Intermediate', primaryAttribute: 'INT',
    flavorText: 'The sky splits at her command.',
  },
  human_ranger: {
    lore: "A ghost who moves through shadows, Kael is the Crusade's deadliest operative. His arrows find their mark before the enemy even knows war has begun. He answers to no one but the cause.",
    backstory: "Kael grew up in the slums of Port Grimaldi, learning to survive through cunning and speed. Recruited by the Crusade's covert division, he became their finest scout and assassin, preferring to end wars before they start.",
    strengths: ['Longest attack range', 'High critical hit chance', 'Stealth and evasion'],
    weaknesses: ['Low armor and HP', 'Weak in prolonged melee', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'Bows, Crossbows, Daggers, Light Armor',
    alignment: 'Chaotic Good', difficulty: 'Intermediate', primaryAttribute: 'DEX',
    flavorText: 'Shadows are just arrows waiting to be loosed.',
  },
  barbarian_warrior: {
    lore: 'From the frozen peaks of the Northlands, Ulfgar descends like an avalanche upon his foes. His massive frame and berserker fury make him a force of nature that no shield wall can withstand.',
    backstory: 'Ulfgar earned his title by literally shattering a mountain pass to prevent a Legion invasion, burying an entire army beneath tons of stone. The act cost him his left eye but saved his entire tribe.',
    strengths: ['Highest armor and block chance', 'Rage damage bonus when wounded', 'Flexible tank or DPS builds'],
    weaknesses: ['No ranged attacks', 'No magic or healing', 'Slow movement speed'],
    combatStyle: 'Melee Physical Combat', weapons: 'Great Axes, War Hammers, Fur Armor',
    alignment: 'Chaotic Neutral', difficulty: 'Beginner', primaryAttribute: 'STR',
    flavorText: 'The earth trembles when Ulfgar charges.',
  },
  barbarian_worg: {
    lore: 'In the deepest winter, when wolves howl for blood, Hrothgar answers. Half-man, half-beast, he leads a pack of dire wolves across the frozen wastes, hunting Legion scouts with savage precision.',
    backstory: 'Born during an eclipse, Hrothgar was left in the woods as an omen of doom. Raised by a great wolf mother, he returned to his tribe as a teenager who could speak with beasts and shift his form at will.',
    strengths: ['Multiple combat forms', 'Rage synergy with beast forms', 'Strong self-buffs'],
    weaknesses: ['No ranged attacks', 'No healing spells', 'Form-dependent abilities'],
    combatStyle: 'Melee Shapeshifting Combat', weapons: 'Claws, Fangs, Natural Weapons',
    alignment: 'Chaotic Neutral', difficulty: 'Expert', primaryAttribute: 'STR',
    flavorText: 'When the north wind howls, it speaks his name.',
  },
  barbarian_mage: {
    lore: 'The northern shamans channel magic through primal fury rather than scholarly study. Volka commands blizzards and lightning, her spells fueled by the raw rage of the frozen north.',
    backstory: 'During a deadly blizzard that buried her village, young Volka discovered she could command the storm itself. The tribal elders named her Stormborn and sent her south to aid the Crusade with her elemental fury.',
    strengths: ['Powerful AoE damage', 'Rage bonus applies to spells', 'Frost resistance'],
    weaknesses: ['Very fragile in melee', 'Mana dependent', 'Low physical defense'],
    combatStyle: 'Ranged Magic & Healing', weapons: 'Totems, Bone Staves, Runic Armor',
    alignment: 'Chaotic Neutral', difficulty: 'Advanced', primaryAttribute: 'INT',
    flavorText: 'Her anger is the storm. Her mercy is the calm.',
  },
  barbarian_ranger: {
    lore: 'No prey escapes Svala. She tracks across frozen tundra, through blinding snowstorms, reading the land like an open book. Her arrows are tipped with the venom of ice serpents.',
    backstory: "Svala was the youngest hunter to ever complete the Trial of the Winter Hunt, tracking and slaying a frost drake alone at age fourteen. Now she serves as the Crusade's premier wilderness scout.",
    strengths: ['Longest attack range', 'Rage bonus when wounded', 'Stealth and evasion'],
    weaknesses: ['Low armor and HP', 'Weak in prolonged melee', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'Longbows, Ice Javelins, Leather Armor',
    alignment: 'True Neutral', difficulty: 'Intermediate', primaryAttribute: 'DEX',
    flavorText: 'She does not miss. She does not warn.',
  },
  dwarf_warrior: {
    lore: 'The Thane of Ironhold has defended the mountain passes for over a century. His enchanted shield, Aegis of Ancestors, was forged from the heart of the mountain itself and has never been pierced.',
    backstory: 'Thane Ironshield is the 47th guardian of the Deep Gate, an unbroken lineage stretching back to the founding of Stonehold. When the Grudge Wars began, he sealed the lower mines and marched to war.',
    strengths: ['Highest defense in game', 'Stoneborn defense bonus stacks', 'Impenetrable tank'],
    weaknesses: ['Very slow movement', 'No ranged attacks', 'No healing'],
    combatStyle: 'Melee Physical Combat', weapons: 'War Hammers, Tower Shields, Runic Plate',
    alignment: 'Lawful Good', difficulty: 'Beginner', primaryAttribute: 'STR',
    flavorText: 'The mountain does not move. Neither does he.',
  },
  dwarf_worg: {
    lore: 'Deep beneath the mountains, Bromm discovered an ancient bear spirit imprisoned in crystal. By freeing it, the spirit merged with his dwarven soul, creating something unprecedented: a shapeshifter of living stone.',
    backstory: 'Bromm was a miner who broke through into a sealed cavern containing a primordial earth spirit. The merging nearly killed him but left him able to transform into a creature of rock and fury.',
    strengths: ['Bear Form + Stoneborn = unstoppable tank', 'Multiple combat forms', 'High base defense'],
    weaknesses: ['Extremely slow in all forms', 'No ranged attacks', 'No healing spells'],
    combatStyle: 'Melee Shapeshifting Combat', weapons: 'Stone Claws, Earth Fangs, Crystal Armor',
    alignment: 'Neutral Good', difficulty: 'Expert', primaryAttribute: 'STR',
    flavorText: 'The deep places remember. Bromm makes them forget.',
  },
  dwarf_mage: {
    lore: 'Dwarven magic is not the flashy arcana of elves or humans. It is the deep magic of rune and forge, of fire shaped by will and hammer. Runa channels this ancient craft in battle.',
    backstory: 'Last of the Forgekeeper bloodline, Runa carries the knowledge of runic magic that predates the Grudge Wars. Her forge-spells burn hotter than dragonfire and her rune-shields are nigh unbreakable.',
    strengths: ['Stoneborn makes her tankier than other mages', 'Powerful forge spells', 'Runic healing'],
    weaknesses: ['Slow movement', 'Mana dependent', 'Short range compared to elves'],
    combatStyle: 'Ranged Magic & Healing', weapons: 'Runic Hammers, Forge Staves, Rune Armor',
    alignment: 'Lawful Neutral', difficulty: 'Intermediate', primaryAttribute: 'INT',
    flavorText: 'The forge burns eternal. So does she.',
  },
  dwarf_ranger: {
    lore: 'Not all dwarves fight on the front line. Durin patrols the endless tunnels beneath the mountains, his crossbow picking off threats in the dark long before they reach the surface.',
    backstory: 'Durin lost his squad to a cave-in during a tunnel patrol. Alone in the dark for thirty days, he learned to navigate by echo and smell. He emerged transformed, able to fight in total darkness.',
    strengths: ['Stoneborn gives extra survivability', 'Armor-piercing bolts', 'Dark vision'],
    weaknesses: ['Slow movement', 'Less range than elf rangers', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'Heavy Crossbows, Throwing Axes, Chain Mail',
    alignment: 'Lawful Neutral', difficulty: 'Intermediate', primaryAttribute: 'DEX',
    flavorText: 'He sees in the dark. You do not see him.',
  },
  elf_warrior: {
    lore: "Elven warriors do not rely on brute force. Thalion's blade moves like water, each stroke a masterwork of precision. He has dueled and defeated opponents twice his size through technique alone.",
    backstory: 'Trained in the Moonblade Academy for three centuries, Thalion mastered every weapon form before settling on the twin curved blades that earned him his title. His dance-like fighting style is mesmerizing and lethal.',
    strengths: ['Highest accuracy of all warriors', 'Fast attack speed', 'Arcane mana bonus'],
    weaknesses: ['Lower HP than other warriors', 'No ranged attacks', 'Fragile for a tank'],
    combatStyle: 'Melee Physical Combat', weapons: 'Curved Blades, Mithril Armor, Elven Shields',
    alignment: 'Neutral Good', difficulty: 'Intermediate', primaryAttribute: 'STR',
    flavorText: 'His enemies never see the second strike.',
  },
  elf_worg: {
    lore: "Sylara is the last of the Wildheart druids who once protected the great forests. She channels the spirits of ancient beasts through elven magic, her transformations enhanced by centuries of arcane study.",
    backstory: "When the Darkwood began to wither from Legion corruption, Sylara performed the ancient Rite of Binding, merging her soul with the forest's guardian spirit. Now she IS the forest's wrath.",
    strengths: ['Extra mana for more transformations', 'Keen senses boost form accuracy', 'Ancient spirit power'],
    weaknesses: ['Fragile base form', 'No ranged attacks', 'Form-dependent abilities'],
    combatStyle: 'Melee Shapeshifting Combat', weapons: 'Nature Claws, Spirit Fangs, Living Armor',
    alignment: 'Neutral Good', difficulty: 'Expert', primaryAttribute: 'STR',
    flavorText: 'She wears the shapes of forgotten gods.',
  },
  elf_mage: {
    lore: 'Elven mages are the most powerful spellcasters in all the realms. Lyra channels the raw essence of the ley lines, her magic amplified by centuries of study and an innate arcane connection.',
    backstory: 'Lyra spent four hundred years studying in the Crystal Spire before the Grudge Wars forced her into battle. Her mastery of all eight schools of magic makes her the most versatile caster alive.',
    strengths: ['Highest spell power in game', 'Extra mana from Arcane Affinity', 'Spell accuracy from Keen Senses'],
    weaknesses: ['Extremely fragile', 'Mana dependent', 'Virtually no melee capability'],
    combatStyle: 'Ranged Magic & Healing', weapons: 'Crystal Staves, Moonstone Orbs, Silk Robes',
    alignment: 'True Neutral', difficulty: 'Advanced', primaryAttribute: 'INT',
    flavorText: 'The stars whisper their secrets to her alone.',
  },
  elf_ranger: {
    lore: 'The greatest archer to ever live, Aelindra can split an arrow at three hundred paces while riding at full gallop. Her elven eyes miss nothing, and her enchanted bow never runs dry.',
    backstory: "Captain of the Silverglade Sentinels for two centuries, Aelindra has defended the borders of the Fabled lands against every threat. She trained under Lyra Stormweaver and infuses her arrows with arcane energy.",
    strengths: ['Unmatched accuracy', 'Arcane-enhanced arrows', 'Fastest ranger'],
    weaknesses: ['Very fragile', 'Poor melee defense', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'Enchanted Longbows, Mithril Arrows, Leaf Armor',
    alignment: 'Chaotic Good', difficulty: 'Advanced', primaryAttribute: 'DEX',
    flavorText: 'Her arrows sing the songs of extinction.',
  },
  orc_warrior: {
    lore: 'The mightiest warrior the Legion has ever produced, Grommash earned his chieftainship by defeating every challenger in the Pit of Blood. His massive cleaver has carved a path of destruction across three continents.',
    backstory: 'Born during a blood eclipse, Grommash was destined for war. At age six he killed his first opponent in the fighting pits. By twenty he had united the warring orc clans under a single banner through sheer force.',
    strengths: ['Highest raw damage', 'Bloodrage + crit combo devastating', 'Best warrior for pure DPS'],
    weaknesses: ['No ranged attacks', 'No healing', 'Reckless combat style'],
    combatStyle: 'Melee Physical Combat', weapons: 'Massive Cleavers, Spiked Armor, War Totems',
    alignment: 'Chaotic Evil', difficulty: 'Beginner', primaryAttribute: 'STR',
    flavorText: 'He does not ask for surrender.',
  },
  orc_worg: {
    lore: "Fenris challenged the great dire wolf Shadowmaw to single combat and won, absorbing the beast's spirit. Now he commands the Legion's beast packs, his howl freezing enemies in terror.",
    backstory: "Exiled from his clan for refusing to kill prisoners, Fenris wandered the Ashlands alone until Shadowmaw found him. Their battle lasted three days. When it ended, they were one being.",
    strengths: ['Bloodrage synergizes with feral forms', 'Crit bonus in all forms', 'Most aggressive worg'],
    weaknesses: ['No ranged attacks', 'No healing', 'Berserker tendencies'],
    combatStyle: 'Melee Shapeshifting Combat', weapons: 'Blood Claws, Shadow Fangs, Bone Armor',
    alignment: 'Chaotic Neutral', difficulty: 'Expert', primaryAttribute: 'STR',
    flavorText: 'His shadow has teeth.',
  },
  orc_mage: {
    lore: "Orc magic is blood magic, raw and dangerous. Zul'jin channels the life force of fallen enemies into devastating hexes and dark healing, growing stronger with every kill.",
    backstory: "Born with the gift of blood-sight, Zul'jin was taken by the Legion's war shamans at birth. He learned to weaponize pain itself, turning enemy suffering into fuel for his dark arts.",
    strengths: ['Bloodrage boosts spell damage when wounded', 'Critical hit spells', 'Dark healing'],
    weaknesses: ['Fragile in melee', 'Blood magic is unstable', 'Mana dependent'],
    combatStyle: 'Ranged Magic & Healing', weapons: 'Skull Staves, Blood Orbs, Hex Totems',
    alignment: 'Neutral Evil', difficulty: 'Advanced', primaryAttribute: 'INT',
    flavorText: 'He paints with the colors of agony.',
  },
  orc_ranger: {
    lore: 'Razak hunts for glory, not survival. His trophy rack holds the heads of legendary beasts, and his poison-tipped bolts bring down prey that should be impossible to kill.',
    backstory: 'A disgraced warrior who lost his sword arm in battle, Razak reinvented himself as a marksman. His custom war-crossbow fires bolts that can penetrate dragon scale at fifty paces.',
    strengths: ['Crit bonus stacks with Precision', 'Bloodrage makes him lethal when wounded', 'Armor-piercing'],
    weaknesses: ['Low armor', 'Reckless positioning', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'War Crossbows, Poison Bolts, Spiked Leather',
    alignment: 'Chaotic Evil', difficulty: 'Intermediate', primaryAttribute: 'DEX',
    flavorText: 'His trophies whisper of things that should not die.',
  },
  undead_warrior: {
    lore: 'Once a noble paladin, Malachar was slain and raised by dark necromancy. Now he fights with the skill of his former life but the relentless endurance of undeath, unable to feel pain or fear.',
    backstory: 'Sir Malachar the Pure was the greatest knight of his age until he fell defending a temple. The necromancer who raised him twisted his devotion into dark loyalty. He remembers fragments of who he was and hates what he has become.',
    strengths: ['Highest effective HP from Undying bonus', 'Fear Aura weakens enemies', 'Cannot be feared'],
    weaknesses: ['Slow', 'Vulnerable to holy magic', 'No healing synergies'],
    combatStyle: 'Melee Physical Combat', weapons: 'Cursed Blades, Bone Shields, Death Plate',
    alignment: 'Lawful Evil', difficulty: 'Intermediate', primaryAttribute: 'STR',
    flavorText: 'Death was just the beginning of his war.',
  },
  undead_worg: {
    lore: "A failed necromantic experiment that merged a warrior's corpse with several beast spirits. The result is an abomination that shifts between grotesque forms, each more terrifying than the last.",
    backstory: 'The Ghoulfather was created when a desperate necromancer tried to bind multiple animal spirits to a single corpse. The spirits fought for dominance, creating an entity that shifts between forms uncontrollably, driven by rage.',
    strengths: ['Undying + Bear Form = massive HP pool', 'Fear Aura in all forms', 'Terrifying presence'],
    weaknesses: ['Uncontrollable', 'Vulnerable to holy', 'No healing'],
    combatStyle: 'Melee Shapeshifting Combat', weapons: 'Bone Claws, Corpse Fangs, Stitched Armor',
    alignment: 'Chaotic Evil', difficulty: 'Expert', primaryAttribute: 'STR',
    flavorText: 'It remembers being three different things. None of them were kind.',
  },
  undead_mage: {
    lore: 'Vexis died as a scholar of the arcane arts and was raised specifically for her magical knowledge. In undeath, her power has grown beyond mortal limits, fueled by harvested souls.',
    backstory: 'In life, Vexis was a renowned healer. The irony is not lost on her — she now commands the very forces of death she once fought against. Her soul spells tear the life essence from enemies.',
    strengths: ['Undying makes her surprisingly durable for a mage', 'Fear Aura helps survival', 'Soul magic amplification'],
    weaknesses: ['Still fragile to burst damage', 'Holy magic weakness', 'Mana dependent'],
    combatStyle: 'Ranged Magic & Healing', weapons: 'Bone Staves, Soul Gems, Shadow Robes',
    alignment: 'Neutral Evil', difficulty: 'Advanced', primaryAttribute: 'INT',
    flavorText: 'She weaves spells from the screams of the fallen.',
  },
  undead_ranger: {
    lore: 'Once the finest scout in the Crusade, Shade Whisper was killed and raised to serve the very forces she once hunted. Her spectral arrows pass through armor as if it were mist.',
    backstory: 'In life she was named Elena Brightarrow, and she was beloved by her comrades. Now she hunts them with the same skill, her phantom arrows guided by the memories of a life she can no longer feel.',
    strengths: ['Phase arrows ignore some defense', 'Fear Aura provides safety', 'Undying survivability'],
    weaknesses: ['Holy magic weakness', 'Haunted by past', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'Phantom Bow, Spirit Arrows, Shadow Cloak',
    alignment: 'Neutral Evil', difficulty: 'Intermediate', primaryAttribute: 'DEX',
    flavorText: 'Her arrows carry the weight of a life she can never reclaim.',
  },
  pirate_king: {
    lore: 'Legend speaks of a pirate so ruthless that even the sea feared him. Racalvin conquered the Grudge Ocean Line with nothing but a stolen ship and a crew of outcasts, building an empire of plunder and freedom.',
    backstory: "Born as the bastard son of a barbarian chieftain and a merchant's daughter, Racalvin was cast out at birth. He stowed away on a merchant vessel at age eight, mutinied at twelve, and by twenty commanded a fleet of thirty ships. His true name became synonymous with freedom and terror across every port.",
    strengths: ['Highest base stats of any hero', 'Pirate King bonus on top of racial traits', 'Fastest hero in the game'],
    weaknesses: ['Secret unlock required', 'Glass cannon build', 'No healing abilities'],
    combatStyle: 'Ranged Physical & Stealth', weapons: 'Flintlock Pistols, Cutlass, Captain\'s Coat',
    alignment: 'Chaotic Neutral', difficulty: 'Expert', primaryAttribute: 'DEX',
    flavorText: 'Crowns are taken. Thrones are stolen. The sea is earned.',
    extraTraits: [{ name: 'Pirate King', effect: '+10% HP, +25% ATK, +15% SPD' }],
  },
};
