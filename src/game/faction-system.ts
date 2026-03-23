/**
 * Faction System — zone ownership, hostility matrix, and relationship logic.
 *
 * Factions: Docks (neutral hub), Crusade (north), Fabled (east), Legion (west), Pirates (south)
 */

export type Faction = 'Docks' | 'Crusade' | 'Fabled' | 'Legion' | 'Pirates';

export const ALL_FACTIONS: Faction[] = ['Docks', 'Crusade', 'Fabled', 'Legion', 'Pirates'];

/** Faction → home zone ID */
export const FACTION_HOME_ZONE: Record<Faction, number> = {
  Docks: 0,     // Starting Village
  Crusade: 8,   // Crusade Island
  Fabled: 9,    // Fabled Island
  Legion: 10,   // Legion Outpost
  Pirates: 11,  // Pirate Cove
};

/** Faction → zone IDs they actively patrol */
export const FACTION_PATROL_ZONES: Record<Faction, number[]> = {
  Docks: [0],
  Crusade: [0, 1, 3, 8],
  Fabled: [1, 2, 9, 14],
  Legion: [3, 5, 6, 10],
  Pirates: [2, 4, 11, 12],
};

/** Faction → color for UI */
export const FACTION_COLORS: Record<Faction, string> = {
  Docks: '#94a3b8',
  Crusade: '#3b82f6',
  Fabled: '#22c55e',
  Legion: '#ef4444',
  Pirates: '#f59e0b',
};

// ── Hostility Matrix ───────────────────────────────────────────

export type FactionRelation = 'allied' | 'neutral' | 'hostile';

const HOSTILITY_MAP: Record<string, FactionRelation> = {
  'Crusade:Legion': 'hostile',
  'Legion:Crusade': 'hostile',
  'Fabled:Pirates': 'hostile',
  'Pirates:Fabled': 'hostile',
  'Crusade:Fabled': 'neutral',
  'Fabled:Crusade': 'neutral',
  'Legion:Pirates': 'neutral',
  'Pirates:Legion': 'neutral',
};

export function getFactionRelation(a: Faction, b: Faction): FactionRelation {
  if (a === b) return 'allied';
  if (a === 'Docks' || b === 'Docks') return 'neutral';
  return HOSTILITY_MAP[`${a}:${b}`] || 'neutral';
}

export function isHostile(a: Faction, b: Faction): boolean {
  return getFactionRelation(a, b) === 'hostile';
}

export function isAllied(a: Faction, b: Faction): boolean {
  return getFactionRelation(a, b) === 'allied';
}

// ── Personality Templates (for GPT prompts) ────────────────────

export const FACTION_PERSONALITY: Record<Faction, string> = {
  Docks: 'You are a neutral trader from the Docks. You are friendly to everyone, love gossip, and always looking for a deal. You speak casually and joke often.',
  Crusade: 'You are a proud Crusade knight. You value honor, duty, and protecting the weak. You speak formally and with conviction. You distrust the Legion deeply.',
  Fabled: 'You are a mystical Fabled scholar. You value knowledge, magic, and the ancient arts. You speak eloquently and reference old lore. You find Pirates uncouth.',
  Legion: 'You are a fierce Legion warrior. You value strength, conquest, and glory in battle. You speak bluntly and with aggression. You despise the Crusade as hypocrites.',
  Pirates: 'You are a cunning Pirate. You value freedom, treasure, and adventure. You speak with swagger and sea slang. You find the Fabled pompous and boring.',
};

/** What each faction knows about others */
export const FACTION_KNOWLEDGE: Record<Faction, string[]> = {
  Docks: [
    'The Docks are neutral ground — all factions trade here',
    'Crusade and Legion have been at war for generations',
    'Fabled scholars have powerful magic but look down on Pirates',
    'Pirates raid supply lines but are the best sailors',
  ],
  Crusade: [
    'The Crusade protects the northern lands from the Legion threat',
    'Our stronghold on Crusade Island is impregnable',
    'The Legion are savages who worship blood magic',
    'We tolerate the Fabled but find their aloofness frustrating',
    'Pirates are lawless but occasionally useful as mercenaries',
  ],
  Fabled: [
    'The Fabled preserve ancient knowledge on our mystical island',
    'We study the arcane arts that others fear to touch',
    'The Pirates desecrate ruins we spent centuries protecting',
    'The Crusade means well but their zeal blinds them',
    'The Legion are a symptom of unchecked power without wisdom',
  ],
  Legion: [
    'The Legion fights for the strong — weakness is death',
    'Our outpost in the west is the most heavily fortified position',
    'The Crusade calls us evil but they started this war',
    'Undead warriors are our greatest asset — they do not tire',
    'We respect the Pirates — they understand survival',
  ],
  Pirates: [
    'Freedom is the only law worth following',
    'The Pirate Cove is our sanctuary — no faction dares attack it',
    'The Fabled hoard treasures in their towers that belong to everyone',
    'The sea provides everything — gold, food, and escape routes',
    'Racalvin the Pirate King united the crews under one flag',
  ],
};
