/**
 * Zone System - ported from GRUDGE_IslandZoneController + GRUDGE_ZoneTrigger
 * Defines world zones with properties, detects player zone transitions.
 */

export interface ZoneSpawnPoint {
  x: number;
  y: number;
}

export interface MonsterSpawnDef {
  x: number;
  y: number;
  type: string;       // enemy type name
  level: number;
  respawnTime: number; // seconds
  count: number;       // how many to spawn at this point
}

export interface ZoneDef {
  id: number;
  name: string;
  bounds: { x: number; y: number; w: number; h: number };
  requiredLevel: number;
  isPvP: boolean;
  isSafeZone: boolean;
  terrainType: string;      // primary terrain for procedural fill
  ambientColor: string;     // hex color tint for zone
  description: string;
  playerSpawns: ZoneSpawnPoint[];
  monsterSpawns: MonsterSpawnDef[];
  connectedZoneIds: number[];
  npcPositions: ZoneSpawnPoint[];
  portalPositions: { x: number; y: number; targetZoneId: number }[];
  /** Asset pack id for structures in this zone */
  assetPack?: string;
  /** Specific structure asset IDs to place in this zone */
  structureAssets?: string[];
  /** Island type for world map rendering */
  islandType?: 'town' | 'port' | 'dungeon' | 'wilderness' | 'boss-arena' | 'village';
}

// Open world expanded to 16000x16000 for island-based MMO with boats
export const OPEN_WORLD_SIZE = 16000;

export const ISLAND_ZONES: ZoneDef[] = [
  {
    id: 0,
    name: 'Starting Village',
    bounds: { x: 3500, y: 3500, w: 1000, h: 1000 },
    requiredLevel: 1,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'grass',
    ambientColor: '#4a7a3a',
    description: 'A peaceful village where adventurers begin their journey.',
    playerSpawns: [{ x: 4000, y: 4000 }, { x: 3900, y: 3900 }, { x: 4100, y: 4050 }],
    monsterSpawns: [],
    connectedZoneIds: [1, 2, 3],
    npcPositions: [{ x: 3800, y: 3800 }, { x: 4100, y: 3700 }, { x: 3700, y: 4100 }],
    portalPositions: [],
  },
  {
    id: 1,
    name: 'Forest of Whispers',
    bounds: { x: 1500, y: 3000, w: 2000, h: 2000 },
    requiredLevel: 1,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'jungle',
    ambientColor: '#1a4a12',
    description: 'Dense woods teeming with creatures. Watch your step.',
    playerSpawns: [{ x: 2500, y: 4000 }],
    monsterSpawns: [
      { x: 2000, y: 3500, type: 'Slime', level: 1, respawnTime: 30, count: 3 },
      { x: 2500, y: 3200, type: 'Slime', level: 2, respawnTime: 30, count: 2 },
      { x: 1800, y: 4200, type: 'Skeleton', level: 3, respawnTime: 45, count: 2 },
      { x: 2200, y: 4500, type: 'Slime', level: 2, respawnTime: 30, count: 4 },
      { x: 3000, y: 3800, type: 'Skeleton', level: 4, respawnTime: 60, count: 2 },
      { x: 1600, y: 3600, type: 'Spider', level: 2, respawnTime: 25, count: 3 },
      { x: 2800, y: 4200, type: 'Treant', level: 4, respawnTime: 60, count: 2 },
      { x: 2100, y: 3800, type: 'Timber Wolf', level: 3, respawnTime: 35, count: 3 },
      { x: 3200, y: 4600, type: 'Goblin Shaman', level: 5, respawnTime: 50, count: 1 },
      { x: 1900, y: 4400, type: 'Sky Hawk', level: 3, respawnTime: 30, count: 2 },
    ],
    connectedZoneIds: [0, 2, 4],
    npcPositions: [{ x: 2500, y: 4800 }],
    portalPositions: [{ x: 1600, y: 4500, targetZoneId: 4 }],
  },
  {
    id: 2,
    name: 'Cursed Swamp',
    bounds: { x: 4500, y: 3000, w: 2000, h: 2000 },
    requiredLevel: 5,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'water',
    ambientColor: '#2a3a2a',
    description: 'A fetid swamp where the undead stir beneath murky waters.',
    playerSpawns: [{ x: 5500, y: 4000 }],
    monsterSpawns: [
      { x: 5000, y: 3500, type: 'Slime', level: 5, respawnTime: 30, count: 3 },
      { x: 5500, y: 3300, type: 'Skeleton', level: 6, respawnTime: 40, count: 3 },
      { x: 6000, y: 4000, type: 'Golem', level: 7, respawnTime: 60, count: 2 },
      { x: 5200, y: 4500, type: 'Skeleton', level: 8, respawnTime: 45, count: 3 },
      { x: 4800, y: 3800, type: 'Slime', level: 6, respawnTime: 30, count: 4 },
      { x: 5600, y: 4200, type: 'Wraith', level: 7, respawnTime: 50, count: 2 },
      { x: 6200, y: 3700, type: 'Wraith', level: 8, respawnTime: 55, count: 2 },
      { x: 4700, y: 4300, type: 'Imp', level: 6, respawnTime: 25, count: 4 },
      { x: 5300, y: 3900, type: 'Tentacle Horror', level: 7, respawnTime: 55, count: 2 },
    ],
    connectedZoneIds: [0, 3, 5],
    npcPositions: [{ x: 4700, y: 3200 }],
    portalPositions: [{ x: 6200, y: 3500, targetZoneId: 5 }],
  },
  {
    id: 3,
    name: 'Mountain Pass',
    bounds: { x: 3000, y: 500, w: 2000, h: 2500 },
    requiredLevel: 8,
    isPvP: true,
    isSafeZone: false,
    terrainType: 'stone',
    ambientColor: '#5a5a6a',
    description: 'A treacherous mountain pass. PvP enabled — watch your back.',
    playerSpawns: [{ x: 4000, y: 1500 }],
    monsterSpawns: [
      { x: 3500, y: 1000, type: 'Golem', level: 8, respawnTime: 60, count: 2 },
      { x: 4200, y: 800, type: 'Dragon', level: 10, respawnTime: 90, count: 1 },
      { x: 3800, y: 2000, type: 'Skeleton', level: 9, respawnTime: 45, count: 3 },
      { x: 4500, y: 1500, type: 'Golem', level: 10, respawnTime: 60, count: 2 },
      { x: 3200, y: 1500, type: 'Bandit', level: 8, respawnTime: 35, count: 4 },
      { x: 4000, y: 2500, type: 'Bandit', level: 9, respawnTime: 35, count: 3 },
      { x: 4800, y: 1000, type: 'Bandit Chief', level: 10, respawnTime: 90, count: 1 },
      { x: 3600, y: 2200, type: 'Sky Hawk', level: 9, respawnTime: 40, count: 3 },
      { x: 3400, y: 1800, type: 'Cave Bear', level: 10, respawnTime: 60, count: 2 },
    ],
    connectedZoneIds: [0, 6, 7],
    npcPositions: [],
    portalPositions: [{ x: 4800, y: 600, targetZoneId: 7 }],
    assetPack: 'stone-terrain',
    structureAssets: [
      'st-big-1', 'st-big-2', 'st-big-3', 'st-big-4', 'st-big-5',
      'st-lit-1', 'st-lit-2', 'st-lit-3', 'st-lit-4', 'st-lit-5',
      'mn-mine-1', 'mn-mine-2', 'mn-coal', 'mn-gold-1', 'mn-crystal-1',
    ],
    islandType: 'wilderness',
  },
  {
    id: 4,
    name: "Dragon's Reach",
    bounds: { x: 200, y: 500, w: 2800, h: 2500 },
    requiredLevel: 10,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'dirt',
    ambientColor: '#6a4a2a',
    description: 'Ancient dragon territory. Powerful beasts lurk in every crevice.',
    playerSpawns: [{ x: 1500, y: 2000 }],
    monsterSpawns: [
      { x: 800, y: 1200, type: 'Dragon', level: 10, respawnTime: 90, count: 1 },
      { x: 1500, y: 800, type: 'Dragon', level: 12, respawnTime: 90, count: 1 },
      { x: 2200, y: 1500, type: 'Golem', level: 11, respawnTime: 60, count: 2 },
      { x: 1000, y: 2200, type: 'Skeleton', level: 12, respawnTime: 45, count: 3 },
      { x: 2500, y: 900, type: 'Dragon', level: 14, respawnTime: 120, count: 1 },
      { x: 600, y: 2000, type: 'Timber Wolf', level: 11, respawnTime: 40, count: 4 },
      { x: 1800, y: 1400, type: 'Fire Drake', level: 12, respawnTime: 80, count: 1 },
      { x: 2800, y: 1800, type: 'Corrupted Knight', level: 13, respawnTime: 55, count: 2 },
      { x: 1200, y: 1600, type: 'Cave Bear', level: 12, respawnTime: 55, count: 2 },
    ],
    connectedZoneIds: [1],
    npcPositions: [{ x: 1500, y: 2800 }],
    portalPositions: [],
  },
  {
    id: 5,
    name: 'Undead Crypts',
    bounds: { x: 5500, y: 500, w: 2300, h: 2500 },
    requiredLevel: 12,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'stone',
    ambientColor: '#2a1a2a',
    description: 'Crumbling crypts filled with restless dead. High danger, high reward.',
    playerSpawns: [{ x: 6500, y: 2000 }],
    monsterSpawns: [
      { x: 6000, y: 1000, type: 'Skeleton', level: 12, respawnTime: 30, count: 4 },
      { x: 6800, y: 800, type: 'Necromancer', level: 14, respawnTime: 50, count: 2 },
      { x: 7200, y: 1500, type: 'Iron Sentinel', level: 15, respawnTime: 60, count: 2 },
      { x: 5800, y: 1800, type: 'Skeleton', level: 13, respawnTime: 35, count: 5 },
      { x: 6500, y: 2500, type: 'Lich King', level: 18, respawnTime: 180, count: 1 },
      { x: 7000, y: 2000, type: 'Dark Archer', level: 13, respawnTime: 40, count: 3 },
      { x: 6200, y: 1400, type: 'Plague Rat Swarm', level: 12, respawnTime: 25, count: 5 },
    ],
    connectedZoneIds: [2],
    npcPositions: [{ x: 6500, y: 2800 }],
    portalPositions: [],
  },
  {
    id: 6,
    name: 'Volcano Rim',
    bounds: { x: 200, y: 5500, w: 3000, h: 2300 },
    requiredLevel: 15,
    isPvP: true,
    isSafeZone: false,
    terrainType: 'dirt',
    ambientColor: '#5a2010',
    description: 'The scorched rim of an active volcano. PvP zone — only the strong survive.',
    playerSpawns: [{ x: 1500, y: 6500 }],
    monsterSpawns: [
      { x: 800, y: 6000, type: 'Berserker', level: 16, respawnTime: 45, count: 3 },
      { x: 1500, y: 7000, type: 'Dragon', level: 17, respawnTime: 90, count: 2 },
      { x: 2500, y: 6500, type: 'Infernal Colossus', level: 20, respawnTime: 180, count: 1 },
      { x: 1000, y: 7200, type: 'Iron Sentinel', level: 17, respawnTime: 60, count: 2 },
      { x: 600, y: 6500, type: 'Plague Rat Swarm', level: 15, respawnTime: 25, count: 6 },
      { x: 2000, y: 6200, type: 'Pit Demon', level: 17, respawnTime: 60, count: 2 },
      { x: 2800, y: 7200, type: 'Fire Drake', level: 17, respawnTime: 80, count: 1 },
      { x: 1200, y: 7600, type: 'Tentacle Horror', level: 16, respawnTime: 50, count: 3 },
    ],
    connectedZoneIds: [3],
    npcPositions: [],
    portalPositions: [{ x: 300, y: 7500, targetZoneId: 7 }],
    assetPack: 'volcano',
    structureAssets: [
      'vl-volcano-1', 'vl-volcano-2', 'vl-volcano-3', 'vl-volcano-4', 'vl-volcano-5',
      'vl-boulder-1', 'vl-boulder-2', 'vl-boulder-3', 'vl-boulder-4', 'vl-boulder-5',
      'vl-boulder-6', 'vl-boulder-7', 'vl-boulder-8',
    ],
    islandType: 'wilderness',
  },
  {
    id: 7,
    name: 'Boss Arena',
    bounds: { x: 5000, y: 5500, w: 2800, h: 2300 },
    requiredLevel: 18,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'stone',
    ambientColor: '#3a0a0a',
    description: 'The final battleground. World bosses spawn here.',
    playerSpawns: [{ x: 6500, y: 6500 }],
    monsterSpawns: [
      { x: 6000, y: 6000, type: 'Iron Sentinel', level: 18, respawnTime: 60, count: 3 },
      { x: 7000, y: 6500, type: 'Infernal Colossus', level: 22, respawnTime: 180, count: 1 },
      { x: 5500, y: 7000, type: 'Berserker', level: 19, respawnTime: 40, count: 4 },
      { x: 6500, y: 7200, type: 'Lich King', level: 22, respawnTime: 240, count: 1 },
      { x: 7500, y: 7000, type: 'Necromancer', level: 20, respawnTime: 55, count: 2 },
      { x: 5800, y: 6400, type: 'Dark Archer', level: 19, respawnTime: 40, count: 3 },
    ],
    connectedZoneIds: [3, 6, 8, 15],
    npcPositions: [],
    portalPositions: [],
    assetPack: 'bossgraveyard',
    structureAssets: ['bg-ruin-1', 'bg-ruin-2', 'bg-ruin-3', 'bg-ruin-5', 'bg-ruin-8', 'bg-ruin-12', 'bg-ruin-15', 'bg-ruin-18', 'bg-ruin-21'],
    islandType: 'boss-arena',
  },

  // ── New Island Zones (expanded world) ────────────────────────

  {
    id: 8,
    name: 'Crusade Island',
    bounds: { x: 9000, y: 2000, w: 2500, h: 2500 },
    requiredLevel: 5,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'grass',
    ambientColor: '#5a6a3a',
    description: 'A fortified crusader stronghold. Faction vendors and trainers reside here.',
    playerSpawns: [{ x: 10250, y: 3250 }],
    monsterSpawns: [
      { x: 9200, y: 2200, type: 'Frost Wyrm', level: 17, respawnTime: 90, count: 1 },
      { x: 11300, y: 4300, type: 'Frost Wyrm', level: 18, respawnTime: 90, count: 1 },
      { x: 9400, y: 4100, type: 'Skeleton', level: 8, respawnTime: 40, count: 2 },
    ],
    connectedZoneIds: [0, 9, 13],
    npcPositions: [
      { x: 10000, y: 3000 }, { x: 10500, y: 3000 }, { x: 10250, y: 2600 },
      { x: 9800, y: 3500 }, { x: 10700, y: 3500 },
    ],
    portalPositions: [{ x: 9200, y: 3200, targetZoneId: 0 }],
    assetPack: 'crusadetown',
    structureAssets: [
      'ct-fortress', 'ct-tower-01', 'ct-tower-03', 'ct-tower-05',
      'ct-wall-01', 'ct-wall-02', 'ct-bridge', 'ct-barracks', 'ct-armory',
      'ct-gates-1', 'ct-brazier', 'ct-firebell', 'ct-sentry',
    ],
    islandType: 'town',
  },
  {
    id: 9,
    name: 'Fabled Island',
    bounds: { x: 12000, y: 4000, w: 2500, h: 2500 },
    requiredLevel: 8,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'grass',
    ambientColor: '#3a5a6a',
    description: 'A mystical island of ancient towers and arcane knowledge.',
    playerSpawns: [{ x: 13250, y: 5250 }],
    monsterSpawns: [
      { x: 12200, y: 4200, type: 'Fire Drake', level: 14, respawnTime: 90, count: 1 },
      { x: 14300, y: 6200, type: 'Fire Drake', level: 15, respawnTime: 90, count: 1 },
      { x: 12400, y: 6000, type: 'Orc Grunt', level: 10, respawnTime: 40, count: 2 },
    ],
    connectedZoneIds: [8, 10, 14],
    npcPositions: [
      { x: 13000, y: 5000 }, { x: 13500, y: 5000 }, { x: 13250, y: 4600 },
      { x: 12800, y: 5400 },
    ],
    portalPositions: [{ x: 12200, y: 5200, targetZoneId: 8 }],
    assetPack: 'fabledtown',
    structureAssets: [
      'ft-fortress', 'ft-tower-1', 'ft-tower-3', 'ft-tower-5',
      'ft-wall-1', 'ft-bridge', 'ft-arsenal', 'ft-barracks',
      'ft-brazier', 'ft-watchtower', 'ft-gates-1',
    ],
    islandType: 'town',
  },
  {
    id: 10,
    name: 'Legion Outpost',
    bounds: { x: 9000, y: 7000, w: 2500, h: 2500 },
    requiredLevel: 10,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'stone',
    ambientColor: '#4a4a5a',
    description: 'A military legion outpost. War drums echo across the stone walls.',
    playerSpawns: [{ x: 10250, y: 8250 }],
    monsterSpawns: [],
    connectedZoneIds: [9, 11, 12],
    npcPositions: [
      { x: 10000, y: 8000 }, { x: 10500, y: 8000 }, { x: 10250, y: 7600 },
      { x: 9800, y: 8500 }, { x: 10700, y: 8400 },
    ],
    portalPositions: [{ x: 9200, y: 8200, targetZoneId: 7 }],
    assetPack: 'legiontown',
    structureAssets: [
      'lt-fortress', 'lt-tower-01', 'lt-tower-3', 'lt-tower-5',
      'lt-wall-1', 'lt-bridge', 'lt-barracks', 'lt-arsenal',
      'lt-drum', 'lt-brazier', 'lt-shed', 'lt-gates-1',
    ],
    islandType: 'town',
  },
  {
    id: 11,
    name: 'Pirate Cove',
    bounds: { x: 12500, y: 8000, w: 3000, h: 2500 },
    requiredLevel: 6,
    isPvP: true,
    isSafeZone: false,
    terrainType: 'water',
    ambientColor: '#1a3a5a',
    description: 'A lawless pirate port. Ships dock here. PvP zone — trust no one.',
    playerSpawns: [{ x: 14000, y: 9250 }],
    monsterSpawns: [
      { x: 13200, y: 8500, type: 'Skeleton', level: 6, respawnTime: 30, count: 3 },
      { x: 14500, y: 8800, type: 'Spider', level: 7, respawnTime: 35, count: 2 },
      { x: 13800, y: 9800, type: 'Skeleton', level: 8, respawnTime: 40, count: 3 },
      { x: 15000, y: 9500, type: 'Orc Grunt', level: 9, respawnTime: 50, count: 2 },
      { x: 12800, y: 9200, type: 'Bandit', level: 7, respawnTime: 30, count: 3 },
      { x: 14200, y: 9400, type: 'Sea Serpent', level: 9, respawnTime: 120, count: 1 },
      { x: 15200, y: 8600, type: 'Spider', level: 8, respawnTime: 30, count: 3 },
    ],
    connectedZoneIds: [10, 12],
    npcPositions: [
      { x: 14000, y: 9000 }, { x: 13500, y: 9200 },
    ],
    portalPositions: [],
    assetPack: 'pirate-kit',
    structureAssets: [
      'pk-ship-large', 'pk-ship-small', 'pk-dock', 'pk-dock-broken',
      'pk-house-1', 'pk-house-2', 'pk-house-3', 'pk-sawmill',
      'pk-cannon', 'pk-barrel', 'pk-chest-closed', 'pk-anchor',
      'pk-cliff-1', 'pk-cliff-2', 'pk-palm-1', 'pk-palm-2', 'pk-palm-3',
    ],
    islandType: 'port',
  },
  {
    id: 12,
    name: 'Dungeon Depths',
    bounds: { x: 9500, y: 11000, w: 2000, h: 2000 },
    requiredLevel: 14,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'stone',
    ambientColor: '#1a1a2a',
    description: 'An underground dungeon complex. Dangerous monsters guard ancient treasure.',
    playerSpawns: [{ x: 10500, y: 12000 }],
    monsterSpawns: [
      { x: 10000, y: 11500, type: 'Skeleton', level: 14, respawnTime: 30, count: 4 },
      { x: 10800, y: 11300, type: 'Dark Mage', level: 15, respawnTime: 45, count: 2 },
      { x: 10200, y: 12500, type: 'Golem', level: 16, respawnTime: 60, count: 2 },
      { x: 11000, y: 12200, type: 'Lich', level: 18, respawnTime: 120, count: 1 },
      { x: 10500, y: 11800, type: 'Skeleton', level: 15, respawnTime: 35, count: 5 },
    ],
    connectedZoneIds: [10, 11, 15],
    npcPositions: [{ x: 10500, y: 12800 }],
    portalPositions: [{ x: 9600, y: 12000, targetZoneId: 10 }],
    assetPack: 'modular-dungeon',
    structureAssets: [
      // modular-dungeon core
      'md-floor', 'md-wall', 'md-wall-top', 'md-column', 'md-column-broken',
      'md-entrance', 'md-stairs', 'md-barrel', 'md-bars', 'md-bones',
      'md-chest', 'md-chest-gold', 'md-torch', 'md-torch-wall',
      'md-candelabrum-tall', 'md-carpet', 'md-book-open',
      // kaykit-dungeon extras
      'kd-barrel-lg', 'kd-barrel-lg-dec', 'kd-barrel-sm', 'kd-barrel-stack',
      'kd-barrier', 'kd-barrier-half', 'kd-barrier-corner', 'kd-barrier-column',
      'kd-bed-decorated', 'kd-candle-lit', 'kd-candle-triple',
      'kd-box-lg', 'kd-box-sm', 'kd-box-stack',
      'kd-bottle-brown', 'kd-bottle-green',
    ],
    islandType: 'dungeon',
  },
  {
    id: 13,
    name: 'Graveyard of Titans',
    bounds: { x: 12500, y: 1000, w: 2500, h: 2500 },
    requiredLevel: 20,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'dirt',
    ambientColor: '#2a1a1a',
    description: 'Ancient ruins where fallen titans rest. The most powerful bosses dwell here.',
    playerSpawns: [{ x: 13750, y: 2250 }],
    monsterSpawns: [
      { x: 13000, y: 1500, type: 'Golem', level: 20, respawnTime: 60, count: 3 },
      { x: 14000, y: 1800, type: 'Dragon', level: 22, respawnTime: 120, count: 1 },
      { x: 13500, y: 2500, type: 'Lich', level: 24, respawnTime: 150, count: 1 },
      { x: 14500, y: 2200, type: 'Dragon', level: 25, respawnTime: 180, count: 1 },
      { x: 13200, y: 3000, type: 'Golem', level: 22, respawnTime: 60, count: 4 },
    ],
    connectedZoneIds: [8, 14],
    npcPositions: [],
    portalPositions: [],
    assetPack: 'bossgraveyard',
    structureAssets: [
      'bg-ruin-1', 'bg-ruin-2', 'bg-ruin-3', 'bg-ruin-4', 'bg-ruin-5',
      'bg-ruin-6', 'bg-ruin-7', 'bg-ruin-8', 'bg-ruin-9', 'bg-ruin-10',
      'bg-ruin-11', 'bg-ruin-12', 'bg-ruin-13', 'bg-ruin-14', 'bg-ruin-15',
      'bg-ruin-16', 'bg-ruin-17', 'bg-ruin-18', 'bg-ruin-19', 'bg-ruin-20', 'bg-ruin-21',
    ],
    islandType: 'boss-arena',
  },
  {
    id: 14,
    name: 'Fisherman\'s Haven',
    bounds: { x: 14500, y: 2000, w: 1500, h: 1500 },
    requiredLevel: 3,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'water',
    ambientColor: '#2a5a7a',
    description: 'A quiet fishing village with a blacksmith, inn, and market stalls.',
    playerSpawns: [{ x: 15250, y: 2750 }],
    monsterSpawns: [],
    connectedZoneIds: [9, 13],
    npcPositions: [
      { x: 15000, y: 2500 }, { x: 15400, y: 2500 }, { x: 15200, y: 2300 },
      { x: 14800, y: 2800 },
    ],
    portalPositions: [{ x: 14600, y: 2700, targetZoneId: 9 }],
    assetPack: 'medieval-village',
    structureAssets: [
      'mv-inn', 'mv-blacksmith', 'mv-house-1', 'mv-house-2', 'mv-house-3',
      'mv-stable', 'mv-mill', 'mv-bell-tower', 'mv-well', 'mv-gazebo',
      'mv-market-1', 'mv-market-2', 'mv-bonfire', 'mv-cart', 'mv-fence',
    ],
    islandType: 'village',
  },
  {
    id: 15,
    name: 'Piglin Outpost',
    bounds: { x: 5000, y: 10000, w: 3000, h: 2500 },
    requiredLevel: 18,
    isPvP: false,
    isSafeZone: false,
    terrainType: 'dirt',
    ambientColor: '#4a2a0a',
    description: 'A fortified piglin warcamp. Dragons roost above while brutes patrol below.',
    playerSpawns: [{ x: 6500, y: 11250 }],
    monsterSpawns: [
      { x: 5500, y: 10500, type: 'Piglin Grunt', level: 18, respawnTime: 30, count: 4 },
      { x: 6200, y: 10800, type: 'Piglin Brute', level: 19, respawnTime: 45, count: 2 },
      { x: 7200, y: 11000, type: 'Piglin Grunt', level: 19, respawnTime: 35, count: 3 },
      { x: 5800, y: 11500, type: 'Boar Dragon', level: 19, respawnTime: 120, count: 1 },
      { x: 7500, y: 11800, type: 'Piglin Brute', level: 20, respawnTime: 50, count: 3 },
      { x: 6500, y: 12000, type: 'Shadow Dragon', level: 21, respawnTime: 180, count: 1 },
      { x: 6000, y: 10200, type: 'Boar Dragon', level: 18, respawnTime: 120, count: 1 },
    ],
    connectedZoneIds: [7, 12],
    npcPositions: [],
    portalPositions: [{ x: 5200, y: 11200, targetZoneId: 7 }],
    assetPack: 'orc-fortress',
    structureAssets: [
      // orc-fortress walls & towers
      'of-fortress', 'of-tower-1', 'of-tower-2', 'of-tower-3',
      'of-wall-1', 'of-wall-2', 'of-bridge', 'of-barracks', 'of-arsenal',
      'of-gates-1', 'of-drum', 'of-brazier', 'of-shed',
      // orc-settlement buildings
      'os-tavern', 'os-smithy', 'os-brewery', 'os-prison',
      'os-huts', 'os-tent-1', 'os-tent-2', 'os-fountain-1', 'os-statue-1',
    ],
    islandType: 'wilderness',
  },

  // ── Cardinal Coastal Faction Towns ────────────────────────────
  // N/W/E/S edges of the 16000×16000 world — AI faction heroes patrol here

  {
    id: 16,
    name: 'Crusade Coast',
    bounds: { x: 6000, y: 200, w: 3000, h: 2000 },
    requiredLevel: 3,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'grass',
    ambientColor: '#5a7a3a',
    description: 'Northern shoreline fortress of the Crusade. Human and Barbarian heroes patrol the ramparts.',
    playerSpawns: [{ x: 7500, y: 1200 }],
    monsterSpawns: [
      { x: 6200, y: 400, type: 'Slime', level: 2, respawnTime: 30, count: 3 },
      { x: 8800, y: 600, type: 'Skeleton', level: 3, respawnTime: 40, count: 2 },
      { x: 7000, y: 1800, type: 'Bandit', level: 4, respawnTime: 35, count: 3 },
    ],
    connectedZoneIds: [0, 3, 8],
    npcPositions: [
      { x: 7200, y: 1000 }, { x: 7800, y: 1000 }, { x: 7500, y: 700 },
      { x: 7000, y: 1400 }, { x: 8000, y: 1400 },
    ],
    portalPositions: [{ x: 7500, y: 2000, targetZoneId: 0 }, { x: 8800, y: 1200, targetZoneId: 8 }],
    structureAssets: [
      'ct-fortress', 'ct-tower-01', 'ct-tower-03', 'ct-wall-01', 'ct-wall-02',
      'ct-barracks', 'ct-armory', 'ct-brazier', 'ct-gates-1',
      'mv-inn', 'mv-blacksmith', 'mv-house-1', 'mv-market-1', 'mv-well',
    ],
    islandType: 'town',
  },
  {
    id: 17,
    name: 'Fabled Shore',
    bounds: { x: 200, y: 7000, w: 2500, h: 3000 },
    requiredLevel: 5,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'grass',
    ambientColor: '#3a6a6a',
    description: 'Western coast ruled by Elves and Dwarves. Ancient temples overlook the sea.',
    playerSpawns: [{ x: 1400, y: 8500 }],
    monsterSpawns: [
      { x: 400, y: 7400, type: 'Spider', level: 4, respawnTime: 30, count: 3 },
      { x: 2200, y: 9200, type: 'Treant', level: 6, respawnTime: 50, count: 2 },
      { x: 1000, y: 9600, type: 'Harpy', level: 5, respawnTime: 35, count: 3 },
    ],
    connectedZoneIds: [6, 9, 14],
    npcPositions: [
      { x: 1200, y: 8200 }, { x: 1600, y: 8200 }, { x: 1400, y: 7800 },
      { x: 1000, y: 8800 }, { x: 1800, y: 8800 },
    ],
    portalPositions: [{ x: 2400, y: 8500, targetZoneId: 9 }, { x: 1400, y: 7200, targetZoneId: 14 }],
    structureAssets: [
      'ft-fortress', 'ft-tower-1', 'ft-tower-3', 'ft-wall-1', 'ft-bridge',
      'ft-barracks', 'ft-arsenal', 'ft-brazier', 'ft-gates-1',
      'mv-inn', 'mv-mill', 'mv-house-2', 'mv-market-2', 'mv-gazebo',
    ],
    islandType: 'town',
  },
  {
    id: 18,
    name: 'Legion Harbor',
    bounds: { x: 13500, y: 7000, w: 2300, h: 3000 },
    requiredLevel: 8,
    isPvP: false,
    isSafeZone: true,
    terrainType: 'stone',
    ambientColor: '#4a3a5a',
    description: 'Eastern dark harbor of the Legion. Orc and Undead heroes guard the docks.',
    playerSpawns: [{ x: 14650, y: 8500 }],
    monsterSpawns: [
      { x: 13800, y: 7400, type: 'Wraith', level: 8, respawnTime: 40, count: 2 },
      { x: 15400, y: 9200, type: 'Dark Archer', level: 9, respawnTime: 45, count: 3 },
      { x: 14200, y: 9600, type: 'Orc Grunt', level: 8, respawnTime: 35, count: 4 },
    ],
    connectedZoneIds: [5, 10, 11],
    npcPositions: [
      { x: 14400, y: 8200 }, { x: 14900, y: 8200 }, { x: 14650, y: 7800 },
      { x: 14200, y: 8800 }, { x: 15100, y: 8800 },
    ],
    portalPositions: [{ x: 13600, y: 8500, targetZoneId: 10 }, { x: 15600, y: 8500, targetZoneId: 11 }],
    structureAssets: [
      'lt-fortress', 'lt-tower-01', 'lt-tower-3', 'lt-wall-1', 'lt-bridge',
      'lt-barracks', 'lt-arsenal', 'lt-brazier', 'lt-gates-1',
      'of-tower-1', 'of-wall-1', 'os-tavern', 'os-smithy',
    ],
    islandType: 'town',
  },
  {
    id: 19,
    name: 'Pirate Bay',
    bounds: { x: 6000, y: 13500, w: 3000, h: 2300 },
    requiredLevel: 6,
    isPvP: true,
    isSafeZone: false,
    terrainType: 'water',
    ambientColor: '#1a4a6a',
    description: 'Southern pirate stronghold. Lawless waters where the Pirates faction rules. PvP zone.',
    playerSpawns: [{ x: 7500, y: 14650 }],
    monsterSpawns: [
      { x: 6400, y: 13800, type: 'Bandit', level: 6, respawnTime: 30, count: 4 },
      { x: 8200, y: 14200, type: 'Spider', level: 7, respawnTime: 35, count: 3 },
      { x: 7000, y: 15200, type: 'Sea Serpent', level: 9, respawnTime: 120, count: 1 },
      { x: 8500, y: 15000, type: 'Skeleton', level: 7, respawnTime: 30, count: 3 },
      { x: 6800, y: 14800, type: 'Bandit Chief', level: 10, respawnTime: 90, count: 1 },
    ],
    connectedZoneIds: [11, 12, 15],
    npcPositions: [
      { x: 7200, y: 14400 }, { x: 7800, y: 14400 }, { x: 7500, y: 14000 },
    ],
    portalPositions: [{ x: 8800, y: 14650, targetZoneId: 11 }, { x: 6200, y: 14650, targetZoneId: 15 }],
    structureAssets: [
      'pk-ship-large', 'pk-ship-small', 'pk-dock', 'pk-dock-broken',
      'pk-house-1', 'pk-house-2', 'pk-cannon', 'pk-barrel', 'pk-anchor',
      'pk-cliff-1', 'pk-palm-1', 'pk-palm-2',
    ],
    islandType: 'port',
  },
];

// --- Zone queries ---

export function getZoneAtPosition(x: number, y: number): ZoneDef | null {
  for (const zone of ISLAND_ZONES) {
    const b = zone.bounds;
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
      return zone;
    }
  }
  return null;
}

export function getZoneById(id: number): ZoneDef | null {
  return ISLAND_ZONES.find(z => z.id === id) ?? null;
}

export function canEnterZone(playerLevel: number, zone: ZoneDef): boolean {
  return playerLevel >= zone.requiredLevel;
}

export function getActiveZones(): ZoneDef[] {
  return ISLAND_ZONES;
}

export function getZoneColor(zone: ZoneDef): string {
  if (zone.isSafeZone) return '#22c55e';
  if (zone.isPvP) return '#ef4444';
  return '#f59e0b';
}

// --- Zone transition tracker ---

export interface ZoneTracker {
  currentZoneId: number | null;
  previousZoneId: number | null;
  transitionTime: number;
}

export function createZoneTracker(): ZoneTracker {
  return { currentZoneId: null, previousZoneId: null, transitionTime: 0 };
}

/** Returns the new zone if a transition just happened, null otherwise */
export function updateZoneTracker(tracker: ZoneTracker, playerX: number, playerY: number, dt: number): ZoneDef | null {
  tracker.transitionTime += dt;
  const zone = getZoneAtPosition(playerX, playerY);
  const newId = zone?.id ?? null;

  if (newId !== tracker.currentZoneId) {
    tracker.previousZoneId = tracker.currentZoneId;
    tracker.currentZoneId = newId;
    tracker.transitionTime = 0;
    return zone;
  }
  return null;
}

// ── Dungeon Entrances ──────────────────────────────────────────

export interface DungeonEntrance {
  id: string;
  name: string;
  x: number;
  y: number;
  zoneId: number;
  requiredLevel: number;
  description: string;
  difficulty: 'normal' | 'hard' | 'heroic';
  icon: string;       // emoji for map display
  floors: number;     // how many floors the dungeon has
}

export const DUNGEON_ENTRANCES: DungeonEntrance[] = [
  {
    id: 'forest-crypt',
    name: 'Forest Crypt',
    x: 1700, y: 4400,
    zoneId: 1,
    requiredLevel: 3,
    description: 'A crumbling crypt hidden among the roots of ancient trees.',
    difficulty: 'normal',
    icon: '🏚️',
    floors: 3,
  },
  {
    id: 'swamp-cavern',
    name: 'Swamp Cavern',
    x: 5800, y: 3200,
    zoneId: 2,
    requiredLevel: 6,
    description: 'A dank cavern beneath the cursed swamp. The air reeks of decay.',
    difficulty: 'normal',
    icon: '🕳️',
    floors: 4,
  },
  {
    id: 'mountain-mine',
    name: 'Abandoned Mine',
    x: 4600, y: 900,
    zoneId: 3,
    requiredLevel: 9,
    description: 'An old mine overrun by golems and bandits.',
    difficulty: 'hard',
    icon: '⛏️',
    floors: 5,
  },
  {
    id: 'dragon-lair',
    name: 'Dragon\'s Lair',
    x: 2400, y: 1000,
    zoneId: 4,
    requiredLevel: 12,
    description: 'The entrance to a dragon\'s underground lair. Heat radiates from within.',
    difficulty: 'hard',
    icon: '🐉',
    floors: 5,
  },
  {
    id: 'catacombs',
    name: 'Catacombs',
    x: 6200, y: 900,
    zoneId: 5,
    requiredLevel: 13,
    description: 'Ancient catacombs stretching deep beneath the crypts.',
    difficulty: 'hard',
    icon: '💀',
    floors: 6,
  },
  {
    id: 'volcanic-caldera',
    name: 'Volcanic Caldera',
    x: 1200, y: 6800,
    zoneId: 6,
    requiredLevel: 16,
    description: 'A descent into the molten heart of the volcano.',
    difficulty: 'heroic',
    icon: '🌋',
    floors: 7,
  },
  {
    id: 'titan-vault',
    name: 'Titan\'s Vault',
    x: 6200, y: 6200,
    zoneId: 7,
    requiredLevel: 19,
    description: 'A sealed vault where ancient titans were imprisoned.',
    difficulty: 'heroic',
    icon: '🗿',
    floors: 8,
  },
  {
    id: 'pirate-grotto',
    name: 'Pirate Grotto',
    x: 14200, y: 9600,
    zoneId: 11,
    requiredLevel: 7,
    description: 'A hidden sea cave filled with pirate treasure and traps.',
    difficulty: 'normal',
    icon: '🏴‍☠️',
    floors: 3,
  },
  {
    id: 'dungeon-depths',
    name: 'The Deep Descent',
    x: 10500, y: 11200,
    zoneId: 12,
    requiredLevel: 15,
    description: 'The deepest level of the dungeon complex. No light reaches here.',
    difficulty: 'heroic',
    icon: '🕸️',
    floors: 10,
  },
  {
    id: 'piglin-warren',
    name: 'Piglin Warren',
    x: 6800, y: 11600,
    zoneId: 15,
    requiredLevel: 19,
    description: 'The underground tunnels beneath the piglin outpost.',
    difficulty: 'heroic',
    icon: '🐗',
    floors: 8,
  },
];

export function getDungeonEntrancesInZone(zoneId: number): DungeonEntrance[] {
  return DUNGEON_ENTRANCES.filter(d => d.zoneId === zoneId);
}

export function getDungeonEntranceNear(x: number, y: number, range: number): DungeonEntrance | null {
  for (const d of DUNGEON_ENTRANCES) {
    const dx = d.x - x, dy = d.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < range) return d;
  }
  return null;
}

// ── Roads (connections rendered as paths between zones) ────────

export interface RoadSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  width: number;      // road width in world units
  type: 'dirt' | 'stone' | 'bridge';
}

function zoneCenter(id: number): { x: number; y: number } {
  const z = ISLAND_ZONES.find(z => z.id === id);
  if (!z) return { x: 0, y: 0 };
  return { x: z.bounds.x + z.bounds.w / 2, y: z.bounds.y + z.bounds.h / 2 };
}

// Auto-generate roads from zone connections
export const ZONE_ROADS: RoadSegment[] = (() => {
  const roads: RoadSegment[] = [];
  const seen = new Set<string>();

  for (const zone of ISLAND_ZONES) {
    const from = zoneCenter(zone.id);
    for (const connId of zone.connectedZoneIds) {
      const key = [Math.min(zone.id, connId), Math.max(zone.id, connId)].join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const to = zoneCenter(connId);
      const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
      roads.push({
        from, to,
        width: dist > 4000 ? 60 : 40,
        type: dist > 5000 ? 'bridge' : zone.terrainType === 'stone' ? 'stone' : 'dirt',
      });
    }
  }
  return roads;
})();

// ── Buildings (placed structures in zones for rendering) ───────

export interface BuildingPlacement {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zoneId: number;
  color: string;
  roofColor: string;
  type: 'fortress' | 'tower' | 'house' | 'shop' | 'wall' | 'dock' | 'ruin' | 'camp' | 'gate' | 'inn' | 'well' | 'mill';
}

// Auto-generate building placements from zone structureAssets
export const ZONE_BUILDINGS: BuildingPlacement[] = (() => {
  const buildings: BuildingPlacement[] = [];
  const BTYPE: Record<string, { type: BuildingPlacement['type']; w: number; h: number; color: string; roofColor: string }> = {
    fortress: { type: 'fortress', w: 120, h: 100, color: '#5a5040', roofColor: '#8a7050' },
    tower:    { type: 'tower', w: 40, h: 40, color: '#6a6050', roofColor: '#907060' },
    wall:     { type: 'wall', w: 80, h: 16, color: '#5a5a5a', roofColor: '#5a5a5a' },
    house:    { type: 'house', w: 50, h: 40, color: '#6a5030', roofColor: '#a06030' },
    shop:     { type: 'shop', w: 45, h: 35, color: '#5a6040', roofColor: '#7a9050' },
    barracks: { type: 'house', w: 70, h: 50, color: '#5a4a3a', roofColor: '#7a5a3a' },
    arsenal:  { type: 'shop', w: 60, h: 45, color: '#4a4a5a', roofColor: '#6a6a7a' },
    dock:     { type: 'dock', w: 80, h: 20, color: '#5a4030', roofColor: '#5a4030' },
    ship:     { type: 'dock', w: 60, h: 30, color: '#4a3020', roofColor: '#6a4030' },
    ruin:     { type: 'ruin', w: 50, h: 50, color: '#4a4040', roofColor: '#3a3030' },
    camp:     { type: 'camp', w: 30, h: 30, color: '#6a4020', roofColor: '#ff8c00' },
    gate:     { type: 'gate', w: 50, h: 24, color: '#5a5040', roofColor: '#8a7050' },
    inn:      { type: 'inn', w: 60, h: 50, color: '#6a5535', roofColor: '#a07040' },
    well:     { type: 'well', w: 20, h: 20, color: '#5a5a6a', roofColor: '#4a4a5a' },
    mill:     { type: 'mill', w: 50, h: 50, color: '#5a4a3a', roofColor: '#8a7a5a' },
  };

  for (const zone of ISLAND_ZONES) {
    if (!zone.structureAssets || zone.structureAssets.length === 0) continue;
    const b = zone.bounds;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;

    for (let i = 0; i < zone.structureAssets.length; i++) {
      const assetId = zone.structureAssets[i];
      // Determine building type from asset id
      let btype = BTYPE.house;
      if (assetId.includes('fortress')) btype = BTYPE.fortress;
      else if (assetId.includes('tower')) btype = BTYPE.tower;
      else if (assetId.includes('wall')) btype = BTYPE.wall;
      else if (assetId.includes('barracks') || assetId.includes('kazarm')) btype = BTYPE.barracks;
      else if (assetId.includes('arsenal') || assetId.includes('armory') || assetId.includes('ammourry')) btype = BTYPE.arsenal;
      else if (assetId.includes('gate')) btype = BTYPE.gate;
      else if (assetId.includes('dock')) btype = BTYPE.dock;
      else if (assetId.includes('ship')) btype = BTYPE.ship;
      else if (assetId.includes('ruin')) btype = BTYPE.ruin;
      else if (assetId.includes('brazier') || assetId.includes('fire') || assetId.includes('bonfire')) btype = BTYPE.camp;
      else if (assetId.includes('inn')) btype = BTYPE.inn;
      else if (assetId.includes('well')) btype = BTYPE.well;
      else if (assetId.includes('mill') || assetId.includes('sawmill')) btype = BTYPE.mill;
      else if (assetId.includes('house')) btype = BTYPE.house;
      else if (assetId.includes('market') || assetId.includes('shop')) btype = BTYPE.shop;

      // Place buildings in a pattern around zone center
      const angle = (i / zone.structureAssets.length) * Math.PI * 2;
      const radius = btype.type === 'fortress' ? 0 : 80 + i * 25;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;

      buildings.push({
        id: `${zone.id}-${assetId}`,
        name: assetId,
        x: Math.max(b.x + 30, Math.min(b.x + b.w - 30, px)),
        y: Math.max(b.y + 30, Math.min(b.y + b.h - 30, py)),
        w: btype.w,
        h: btype.h,
        zoneId: zone.id,
        color: btype.color,
        roofColor: btype.roofColor,
        type: btype.type,
      });
    }
  }
  return buildings;
})();

export function getBuildingsInZone(zoneId: number): BuildingPlacement[] {
  return ZONE_BUILDINGS.filter(b => b.zoneId === zoneId);
}
