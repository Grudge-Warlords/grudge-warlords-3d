import * as THREE from 'three';

export interface PrefabConfig {
  modelPath: string;
  texturePath?: string;
  scale: number;
  offset: THREE.Vector3;
  rotation?: THREE.Euler;
  animations?: Record<string, string>;
  format?: 'glb' | 'fbx';
}

export const TOWER_PREFABS: Record<string, PrefabConfig> = {
  archer: {
    modelPath: '/assets/models/towers/archer_tower_1.fbx',
    texturePath: '/assets/textures/tower_texture.png',
    scale: 0.025,
    offset: new THREE.Vector3(0, 0, 0),
  },
  cannon: {
    modelPath: '/assets/models/towers/cannon_tower_1.fbx',
    texturePath: '/assets/textures/tower_texture.png',
    scale: 0.025,
    offset: new THREE.Vector3(0, 0, 0),
  },
  wizard: {
    modelPath: '/assets/models/towers/wizard_tower_1.fbx',
    texturePath: '/assets/textures/tower_texture.png',
    scale: 0.025,
    offset: new THREE.Vector3(0, 0, 0),
  },
  poison: {
    modelPath: '/assets/models/towers/poison_tower_1.fbx',
    texturePath: '/assets/textures/tower_texture.png',
    scale: 0.025,
    offset: new THREE.Vector3(0, 0, 0),
  },
  flamethrower: {
    modelPath: '/assets/models/turrets/Flamethrower_Turret.glb',
    scale: 0.4,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  gun_cannon: {
    modelPath: '/assets/models/turrets/Gun_Cannon_Turret.glb',
    scale: 0.4,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  mortar: {
    modelPath: '/assets/models/turrets/Mortar_Tower.glb',
    scale: 0.4,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  railgun: {
    modelPath: '/assets/models/turrets/Rail_Gun_Turret.glb',
    scale: 0.4,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  castle_tower: {
    modelPath: '/assets/models/turrets/Castle_Tower.glb',
    scale: 0.3,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  tower3: {
    modelPath: '/assets/models/turrets/Tower3.glb',
    scale: 0.3,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  cannon_glb: {
    modelPath: '/assets/models/turrets/Cannon.glb',
    scale: 0.3,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
};

const SHARED_ANIMS: Record<string, string> = {
  idle: '/assets/models/animations/Idle.fbx',
  run: '/assets/models/animations/Run.fbx',
  attack: '/assets/models/animations/Attack.fbx',
  death: '/assets/models/animations/Death.fbx',
  hit: '/assets/models/animations/Hit.fbx',
};

const RACALVIN_ANIMS: Record<string, string> = {
  idle: '/assets/models/heroes/racalvin/idle.fbx',
  walk: '/assets/models/heroes/racalvin/walk.fbx',
  run: '/assets/models/heroes/racalvin/run.fbx',
  attack: '/assets/models/heroes/racalvin/attack.fbx',
  block: '/assets/models/heroes/racalvin/block.fbx',
  death: '/assets/models/heroes/racalvin/death.fbx',
  slash: '/assets/models/heroes/racalvin/slash.fbx',
  jump: '/assets/models/heroes/racalvin/jump.fbx',
};

export const HERO_PREFABS: Record<string, PrefabConfig> = {
  human_warrior: {
    modelPath: '/assets/models/characters/crusaders_knight.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  human_worg: {
    modelPath: '/assets/models/characters/berserker.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  human_mage: {
    modelPath: '/assets/models/characters/Animated_Wizard.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  human_ranger: {
    modelPath: '/assets/models/characters/Anne.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  barbarian_warrior: {
    modelPath: '/assets/models/characters/BarbarianGlad.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  barbarian_worg: {
    modelPath: '/assets/models/characters/humandeathgiver.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  barbarian_mage: {
    modelPath: '/assets/models/characters/fabledworker.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  barbarian_ranger: {
    modelPath: '/assets/models/characters/Pirate_Captain.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  dwarf_warrior: {
    modelPath: '/assets/models/characters/dwarf_enforcer.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  dwarf_worg: {
    modelPath: '/assets/models/characters/Character_Toon_Animated.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  dwarf_mage: {
    modelPath: '/assets/models/characters/Animated_Character_Base.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  dwarf_ranger: {
    modelPath: '/assets/models/characters/survivealtoon.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  elf_warrior: {
    modelPath: '/assets/models/characters/elf_enforcer.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  elf_worg: {
    modelPath: '/assets/models/characters/Animated_Woman.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  elf_mage: {
    modelPath: '/assets/models/characters/Animated_Wizard.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  elf_ranger: {
    modelPath: '/assets/models/characters/ElfRanger.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  orc_warrior: {
    modelPath: '/assets/models/characters/graatorc.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  orc_worg: {
    modelPath: '/assets/models/characters/orcpeon.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  orc_mage: {
    modelPath: '/assets/models/characters/Animated_Zombie.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  orc_ranger: {
    modelPath: '/assets/models/characters/Animated_Human.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  undead_warrior: {
    modelPath: '/assets/models/characters/skeletong_warrior.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  undead_worg: {
    modelPath: '/assets/models/characters/undeadworker.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  undead_mage: {
    modelPath: '/assets/models/characters/Animated_Zombie.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  undead_ranger: {
    modelPath: '/assets/models/characters/Skeleton.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: SHARED_ANIMS,
  },
  racalvin: {
    modelPath: '/assets/models/characters/Pirate_Captain.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: RACALVIN_ANIMS,
  },
  pirate: {
    modelPath: '/assets/models/characters/Pirate_Captain.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
    animations: RACALVIN_ANIMS,
  },
};

export const CREATURE_PREFABS: Record<string, PrefabConfig> = {
  wolf: {
    modelPath: '/assets/models/creatures/Wolf.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  dragon: {
    modelPath: '/assets/models/creatures/Red_Dragon.glb',
    scale: 0.005,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  raptor: {
    modelPath: '/assets/models/creatures/Velociraptor.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  shark: {
    modelPath: '/assets/models/creatures/Shark.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  tentacle: {
    modelPath: '/assets/models/creatures/Tentacle.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  sea_monster: {
    modelPath: '/assets/models/creatures/Sea_Monster_Scene.glb',
    scale: 0.005,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  skeleton: {
    modelPath: '/assets/models/characters/Skeleton.glb',
    scale: 0.008,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  goblin: {
    modelPath: '/assets/models/creatures/GoblinCr3w.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  neutral_minion_01: {
    modelPath: '/assets/models/neutrals/neutral_minion_01.fbx',
    scale: 0.01,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'fbx',
  },
  neutral_minion_02: {
    modelPath: '/assets/models/neutrals/neutral_minion_02.fbx',
    scale: 0.01,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'fbx',
  },
  neutral_minion_03: {
    modelPath: '/assets/models/neutrals/neutral_minion_03.fbx',
    scale: 0.01,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'fbx',
  },
  skullgoon: {
    modelPath: '/assets/models/creatures/skullgoon.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
};

export const MINION_PREFABS: Record<string, PrefabConfig> = {
  melee_team0: {
    modelPath: '/assets/models/characters/crusaders_knight.glb',
    scale: 0.005,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  melee_team1: {
    modelPath: '/assets/models/characters/Skeleton.glb',
    scale: 0.005,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  ranged_team0: {
    modelPath: '/assets/models/characters/Animated_Human.glb',
    scale: 0.005,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  ranged_team1: {
    modelPath: '/assets/models/characters/Animated_Zombie.glb',
    scale: 0.005,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  siege_team0: {
    modelPath: '/assets/models/characters/BarbarianGlad.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
  siege_team1: {
    modelPath: '/assets/models/characters/skeletong_warrior.glb',
    scale: 0.006,
    offset: new THREE.Vector3(0, 0, 0),
    format: 'glb',
  },
};

export const ENV_PREFABS: Record<string, PrefabConfig> = {
  castle: { modelPath: '/assets/models/environment/Castle.glb', scale: 0.5, offset: new THREE.Vector3(0, 0, 0) },
  fortress: { modelPath: '/assets/models/environment/Fortress.glb', scale: 0.3, offset: new THREE.Vector3(0, 0, 0) },
  tree: { modelPath: '/assets/models/environment/Tree.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0) },
  rock: { modelPath: '/assets/models/environment/Rock.glb', scale: 0.1, offset: new THREE.Vector3(0, 0, 0) },
  mountain: { modelPath: '/assets/models/environment/Mountain.glb', scale: 0.3, offset: new THREE.Vector3(0, 0, 0) },
  bridge: { modelPath: '/assets/models/environment/Bridge.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0) },
  well: { modelPath: '/assets/models/environment/Well.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0) },
  campfire: { modelPath: '/assets/models/environment/Campfire.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0) },
  camp_fire_glb: { modelPath: '/assets/models/environment/Camp_Fire.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  tent: { modelPath: '/assets/models/environment/Tent.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0) },
  shrine: { modelPath: '/assets/models/environment/Shrine.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0) },
  banner: { modelPath: '/assets/models/environment/Banner.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0) },
  torch: { modelPath: '/assets/models/environment/Torch.glb', scale: 0.12, offset: new THREE.Vector3(0, 0, 0) },
  statue: { modelPath: '/assets/models/environment/Statue.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0) },
  marketStalls: { modelPath: '/assets/models/environment/MarketStalls.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0) },
  villageMarket: { modelPath: '/assets/models/environment/VillageMarket.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0) },
  chest: { modelPath: '/assets/models/environment/Chest.glb', scale: 0.1, offset: new THREE.Vector3(0, 0, 0) },
  portalDoor: { modelPath: '/assets/models/environment/PortalDoor.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0) },
  sail_ship: { modelPath: '/assets/models/props/Sail_Ship.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  sail_boat: { modelPath: '/assets/models/props/Sail_Boat.glb', scale: 0.1, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  ship_wreck: { modelPath: '/assets/models/props/Ship_Wreck.glb', scale: 0.1, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  port: { modelPath: '/assets/models/props/Port.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  weaponschest: { modelPath: '/assets/models/props/weaponschest.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  boat: { modelPath: '/assets/models/environment/Boat.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  palmTree: { modelPath: '/assets/models/environment/PalmTree.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  lantern: { modelPath: '/assets/models/environment/Lantern_1.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  rowboat: { modelPath: '/assets/models/environment/Rowboat.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  gravestone: { modelPath: '/assets/models/environment/Gravestone.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  tree_lava: { modelPath: '/assets/models/environment/Tree_Lava.glb', scale: 0.15, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  crypt: { modelPath: '/assets/models/structures/Crypt.glb', scale: 0.25, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  barracks: { modelPath: '/assets/models/structures/Fantasy_Barracks.glb', scale: 0.25, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  forge: { modelPath: '/assets/models/structures/Forge.glb', scale: 0.25, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  storage_house: { modelPath: '/assets/models/structures/Storage_House.glb', scale: 0.25, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  hellhouse: { modelPath: '/assets/models/structures/Hellhouse.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  tree_house: { modelPath: '/assets/models/structures/Tree_House.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  cabin_shed: { modelPath: '/assets/models/structures/Cabin_Shed.glb', scale: 0.2, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  coliseum: { modelPath: '/assets/models/structures/Coliseum.glb', scale: 0.3, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  necropolis_walls: { modelPath: '/assets/models/structures/Necropolis_Walls.glb', scale: 0.25, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
  arch: { modelPath: '/assets/models/structures/Arch.glb', scale: 0.25, offset: new THREE.Vector3(0, 0, 0), format: 'glb' },
};

export const DUNGEON_PREFABS: Record<string, PrefabConfig> = {
  armor: { modelPath: '/assets/models/dungeon/Armor_01_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  door: { modelPath: '/assets/models/dungeon/Door_03_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  doorFrame: { modelPath: '/assets/models/dungeon/DoorFrame_02_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  floorCorner: { modelPath: '/assets/models/dungeon/Floor_Corner_01_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  pillar: { modelPath: '/assets/models/dungeon/Pillar_03_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  plinth: { modelPath: '/assets/models/dungeon/Plinth_Big_01_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  redBanner: { modelPath: '/assets/models/dungeon/RedBanner_Small_01_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  smallChest: { modelPath: '/assets/models/dungeon/SmallChest_02_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  torchWall: { modelPath: '/assets/models/dungeon/Torch_Wall_01_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
  wallBrick: { modelPath: '/assets/models/dungeon/WallBrick_Tall_01_001.fbx', scale: 0.01, offset: new THREE.Vector3(0, 0, 0), format: 'fbx' },
};

export const WEAPON_PREFABS: Record<string, PrefabConfig> = {
  sword: { modelPath: '/assets/models/weapons/Sword.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
  axe: { modelPath: '/assets/models/weapons/Axe.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
  bow: { modelPath: '/assets/models/weapons/Bow.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
  staff: { modelPath: '/assets/models/weapons/Staff.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
  shield: { modelPath: '/assets/models/weapons/Shield.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
  dagger: { modelPath: '/assets/models/weapons/Dagger.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
  mace: { modelPath: '/assets/models/weapons/Mace.glb', scale: 0.08, offset: new THREE.Vector3(0, 0, 0) },
};

export function getTowerPrefab(team: number, lane: number): string {
  if (team === 0) {
    return lane === 0 ? 'archer' : lane === 1 ? 'wizard' : 'cannon';
  }
  return lane === 0 ? 'poison' : lane === 1 ? 'cannon' : 'archer';
}

export function getHeroPrefabKey(race: string, heroClass: string, heroName?: string): string {
  if (heroName) {
    const lowerName = heroName.toLowerCase();
    if (lowerName.includes('racalvin') || lowerName.includes('pirate')) return 'racalvin';
  }
  const key = `${race.toLowerCase()}_${heroClass.toLowerCase()}`;
  if (HERO_PREFABS[key]) return key;
  return 'human_warrior';
}

export function getMinionPrefabKey(minionType: string, team: number): string {
  if (minionType === 'siege' || minionType === 'super') return `siege_team${team}`;
  if (minionType === 'ranged') return `ranged_team${team}`;
  return `melee_team${team}`;
}

export function getJungleMobPrefab(mobType: string): string {
  switch (mobType) {
    case 'buff': return 'dragon';
    case 'medium': return 'wolf';
    case 'small':
    default: return 'raptor';
  }
}

export function getWeaponForClass(heroClass: string): string {
  switch (heroClass.toLowerCase()) {
    case 'warrior': return 'sword';
    case 'worg': return 'axe';
    case 'mage': return 'staff';
    case 'ranger': return 'bow';
    default: return 'sword';
  }
}
