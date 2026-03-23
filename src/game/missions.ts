/**
 * Missions System
 * Quest objectives: kill X enemies, collect Y resources, explore zones, defeat bosses, enter dungeons.
 * NPCs offer missions based on zone; completed missions grant XP, gold, equipment.
 */

// ── Mission Definitions ────────────────────────────────────────

export type MissionType = 'kill' | 'collect' | 'explore' | 'boss' | 'dungeon';
export type MissionStatus = 'available' | 'active' | 'complete' | 'claimed';

export interface MissionObjective {
  type: MissionType;
  target: string;       // enemy type, resource name, zone name, or dungeon id
  required: number;
  current: number;
}

export interface MissionReward {
  xp: number;
  gold: number;
  reputation: number;
  equipmentTier?: number;   // if set, grants random equipment at this tier
}

export interface MissionDef {
  id: string;
  name: string;
  description: string;
  zoneId: number;           // zone where this mission is offered
  requiredLevel: number;
  objectives: MissionObjective[];
  reward: MissionReward;
  repeatable: boolean;
  chain?: string;           // next mission id in chain
}

export interface ActiveMission {
  def: MissionDef;
  status: MissionStatus;
  objectives: MissionObjective[];   // mutable copies
}

// ── All Missions ───────────────────────────────────────────────

export const MISSIONS: MissionDef[] = [
  // Starting Village (zone 0)
  {
    id: 'sv-kill-slimes',
    name: 'Pest Control',
    description: 'Clear the slimes infesting the nearby forest.',
    zoneId: 0, requiredLevel: 1,
    objectives: [{ type: 'kill', target: 'Slime', required: 5, current: 0 }],
    reward: { xp: 80, gold: 25, reputation: 5 },
    repeatable: true,
  },
  {
    id: 'sv-explore-forest',
    name: 'Into the Whispers',
    description: 'Venture into the Forest of Whispers and return alive.',
    zoneId: 0, requiredLevel: 1,
    objectives: [{ type: 'explore', target: 'Forest of Whispers', required: 1, current: 0 }],
    reward: { xp: 50, gold: 15, reputation: 10 },
    repeatable: false,
    chain: 'sv-kill-skeletons',
  },
  {
    id: 'sv-kill-skeletons',
    name: 'Bone Collectors',
    description: 'Destroy the undead skeletons lurking in the woods.',
    zoneId: 0, requiredLevel: 2,
    objectives: [{ type: 'kill', target: 'Skeleton', required: 8, current: 0 }],
    reward: { xp: 120, gold: 40, reputation: 8 },
    repeatable: true,
  },
  {
    id: 'sv-gather-herbs',
    name: 'Healer\'s Request',
    description: 'Gather herbs for the village healer.',
    zoneId: 0, requiredLevel: 1,
    objectives: [{ type: 'collect', target: 'Common Herb', required: 5, current: 0 }],
    reward: { xp: 60, gold: 20, reputation: 5 },
    repeatable: true,
  },
  // Forest of Whispers (zone 1)
  {
    id: 'fw-kill-spiders',
    name: 'Web of Lies',
    description: 'The forest crawls with spiders. Exterminate them.',
    zoneId: 1, requiredLevel: 3,
    objectives: [{ type: 'kill', target: 'Spider', required: 6, current: 0 }],
    reward: { xp: 100, gold: 35, reputation: 8 },
    repeatable: true,
  },
  {
    id: 'fw-enter-dungeon',
    name: 'Descent Below',
    description: 'Find and enter the hidden dungeon entrance in the forest.',
    zoneId: 1, requiredLevel: 3,
    objectives: [{ type: 'dungeon', target: 'forest-crypt', required: 1, current: 0 }],
    reward: { xp: 150, gold: 50, reputation: 15, equipmentTier: 2 },
    repeatable: false,
  },
  {
    id: 'fw-kill-treants',
    name: 'Timber Terrors',
    description: 'The Treants have gone mad. Put them down.',
    zoneId: 1, requiredLevel: 4,
    objectives: [{ type: 'kill', target: 'Treant', required: 4, current: 0 }],
    reward: { xp: 140, gold: 45, reputation: 10 },
    repeatable: true,
  },
  // Cursed Swamp (zone 2)
  {
    id: 'cs-kill-golems',
    name: 'Stone Sentinels',
    description: 'The swamp golems threaten our scouts. Destroy them.',
    zoneId: 2, requiredLevel: 5,
    objectives: [{ type: 'kill', target: 'Golem', required: 4, current: 0 }],
    reward: { xp: 180, gold: 60, reputation: 12 },
    repeatable: true,
  },
  {
    id: 'cs-kill-wraiths',
    name: 'Spirits Unrest',
    description: 'Wraiths haunt the swamp. Banish their restless souls.',
    zoneId: 2, requiredLevel: 6,
    objectives: [{ type: 'kill', target: 'Wraith', required: 5, current: 0 }],
    reward: { xp: 200, gold: 70, reputation: 15 },
    repeatable: true,
  },
  // Mountain Pass (zone 3)
  {
    id: 'mp-kill-bandits',
    name: 'Highway Robbery',
    description: 'Bandits are ambushing travelers on the mountain pass.',
    zoneId: 3, requiredLevel: 8,
    objectives: [
      { type: 'kill', target: 'Bandit', required: 6, current: 0 },
      { type: 'kill', target: 'Bandit Chief', required: 1, current: 0 },
    ],
    reward: { xp: 250, gold: 100, reputation: 20, equipmentTier: 3 },
    repeatable: true,
  },
  {
    id: 'mp-enter-mine',
    name: 'The Abandoned Mine',
    description: 'Something stirs deep in the old mountain mine...',
    zoneId: 3, requiredLevel: 9,
    objectives: [{ type: 'dungeon', target: 'mountain-mine', required: 1, current: 0 }],
    reward: { xp: 300, gold: 120, reputation: 20 },
    repeatable: false,
  },
  // Dragon's Reach (zone 4)
  {
    id: 'dr-kill-dragon',
    name: 'Dragon Slayer',
    description: 'Slay a dragon in Dragon\'s Reach. Only the bravest dare.',
    zoneId: 4, requiredLevel: 10,
    objectives: [{ type: 'boss', target: 'Dragon', required: 1, current: 0 }],
    reward: { xp: 500, gold: 200, reputation: 30, equipmentTier: 4 },
    repeatable: true,
  },
  {
    id: 'dr-kill-wolves',
    name: 'Dire Menace',
    description: 'Dire wolves stalk the foothills. Thin their pack.',
    zoneId: 4, requiredLevel: 10,
    objectives: [{ type: 'kill', target: 'Dire Wolf', required: 8, current: 0 }],
    reward: { xp: 300, gold: 90, reputation: 15 },
    repeatable: true,
  },
  // Undead Crypts (zone 5)
  {
    id: 'uc-kill-lich',
    name: 'Lich Hunt',
    description: 'End the Lich who commands the crypt\'s undead army.',
    zoneId: 5, requiredLevel: 14,
    objectives: [{ type: 'boss', target: 'Lich', required: 1, current: 0 }],
    reward: { xp: 600, gold: 250, reputation: 35, equipmentTier: 5 },
    repeatable: true,
  },
  {
    id: 'uc-enter-catacombs',
    name: 'Into the Catacombs',
    description: 'Descend into the catacombs beneath the crypts.',
    zoneId: 5, requiredLevel: 13,
    objectives: [{ type: 'dungeon', target: 'catacombs', required: 1, current: 0 }],
    reward: { xp: 400, gold: 180, reputation: 25 },
    repeatable: false,
  },
  // Pirate Cove (zone 11)
  {
    id: 'pc-kill-pirates',
    name: 'Scourge of the Cove',
    description: 'The pirate skeleton crews are raiding supply lines.',
    zoneId: 11, requiredLevel: 6,
    objectives: [{ type: 'kill', target: 'Skeleton', required: 10, current: 0 }],
    reward: { xp: 160, gold: 55, reputation: 10 },
    repeatable: true,
  },
  {
    id: 'pc-kill-serpent',
    name: 'Serpent of the Deep',
    description: 'A sea serpent lurks in the cove waters. Brave soul needed.',
    zoneId: 11, requiredLevel: 8,
    objectives: [{ type: 'boss', target: 'Sea Serpent', required: 1, current: 0 }],
    reward: { xp: 350, gold: 150, reputation: 25, equipmentTier: 3 },
    repeatable: true,
  },
  // Crusade Island (zone 8)
  {
    id: 'ci-explore-fabled',
    name: 'Path to the Fabled',
    description: 'Travel to Fabled Island and report back.',
    zoneId: 8, requiredLevel: 5,
    objectives: [{ type: 'explore', target: 'Fabled Island', required: 1, current: 0 }],
    reward: { xp: 120, gold: 40, reputation: 10 },
    repeatable: false,
  },
  {
    id: 'ci-kill-knights',
    name: 'Corrupted Garrison',
    description: 'Corrupted knights threaten the crusade. Purge them.',
    zoneId: 8, requiredLevel: 8,
    objectives: [{ type: 'kill', target: 'Corrupted Knight', required: 5, current: 0 }],
    reward: { xp: 250, gold: 90, reputation: 18 },
    repeatable: true,
  },
  // Dungeon Depths (zone 12)
  {
    id: 'dd-enter-depths',
    name: 'The Depths Await',
    description: 'Brave the Dungeon Depths and survive to floor 3.',
    zoneId: 12, requiredLevel: 14,
    objectives: [{ type: 'dungeon', target: 'dungeon-depths', required: 1, current: 0 }],
    reward: { xp: 500, gold: 200, reputation: 30, equipmentTier: 5 },
    repeatable: false,
  },
  {
    id: 'dd-kill-liches',
    name: 'Necromancer Purge',
    description: 'Dark mages and liches control the depths. End them.',
    zoneId: 12, requiredLevel: 15,
    objectives: [
      { type: 'kill', target: 'Dark Mage', required: 5, current: 0 },
      { type: 'kill', target: 'Lich', required: 2, current: 0 },
    ],
    reward: { xp: 600, gold: 250, reputation: 30, equipmentTier: 5 },
    repeatable: true,
  },
  // Graveyard of Titans (zone 13)
  {
    id: 'gt-boss-rush',
    name: 'Titan\'s Challenge',
    description: 'Defeat three dragons in the Graveyard of Titans.',
    zoneId: 13, requiredLevel: 20,
    objectives: [{ type: 'boss', target: 'Dragon', required: 3, current: 0 }],
    reward: { xp: 1200, gold: 500, reputation: 50, equipmentTier: 7 },
    repeatable: true,
  },
  // Piglin Outpost (zone 15)
  {
    id: 'po-piglin-assault',
    name: 'Outpost Assault',
    description: 'Assault the piglin warcamp. Destroy their forces.',
    zoneId: 15, requiredLevel: 18,
    objectives: [
      { type: 'kill', target: 'Piglin Grunt', required: 10, current: 0 },
      { type: 'kill', target: 'Piglin Brute', required: 5, current: 0 },
    ],
    reward: { xp: 800, gold: 350, reputation: 40, equipmentTier: 6 },
    repeatable: true,
  },
  {
    id: 'po-shadow-dragon',
    name: 'Shadow of the Outpost',
    description: 'The Shadow Dragon commands the piglin forces. End its reign.',
    zoneId: 15, requiredLevel: 20,
    objectives: [{ type: 'boss', target: 'Shadow Dragon', required: 1, current: 0 }],
    reward: { xp: 1000, gold: 400, reputation: 50, equipmentTier: 7 },
    repeatable: true,
  },
  // Volcano Rim (zone 6)
  {
    id: 'vr-kill-imps',
    name: 'Infernal Pests',
    description: 'Imps and harpies swarm the volcano rim. Clean house.',
    zoneId: 6, requiredLevel: 15,
    objectives: [
      { type: 'kill', target: 'Imp', required: 8, current: 0 },
      { type: 'kill', target: 'Harpy', required: 4, current: 0 },
    ],
    reward: { xp: 400, gold: 150, reputation: 25 },
    repeatable: true,
  },
  {
    id: 'vr-enter-caldera',
    name: 'Heart of the Volcano',
    description: 'Descend into the volcanic caldera dungeon.',
    zoneId: 6, requiredLevel: 16,
    objectives: [{ type: 'dungeon', target: 'volcanic-caldera', required: 1, current: 0 }],
    reward: { xp: 500, gold: 200, reputation: 30, equipmentTier: 6 },
    repeatable: false,
  },
  // Fisherman's Haven (zone 14)
  {
    id: 'fh-gather-fish',
    name: 'Fresh Catch',
    description: 'The village needs fish. Head to the waters and fish.',
    zoneId: 14, requiredLevel: 3,
    objectives: [{ type: 'collect', target: 'Common Fish', required: 8, current: 0 }],
    reward: { xp: 80, gold: 30, reputation: 8 },
    repeatable: true,
  },
];

// ── Mission State Management ───────────────────────────────────

export interface MissionLog {
  active: ActiveMission[];
  completed: string[];       // completed mission ids
  maxActive: number;
}

export function createMissionLog(): MissionLog {
  return { active: [], completed: [], maxActive: 5 };
}

/** Get missions available at a zone for the player */
export function getAvailableMissions(log: MissionLog, zoneId: number, playerLevel: number): MissionDef[] {
  return MISSIONS.filter(m => {
    if (m.zoneId !== zoneId) return false;
    if (m.requiredLevel > playerLevel) return false;
    if (log.active.some(a => a.def.id === m.id)) return false;
    if (!m.repeatable && log.completed.includes(m.id)) return false;
    return true;
  });
}

/** Accept a mission */
export function acceptMission(log: MissionLog, missionId: string): ActiveMission | null {
  if (log.active.length >= log.maxActive) return null;
  const def = MISSIONS.find(m => m.id === missionId);
  if (!def) return null;
  if (log.active.some(a => a.def.id === missionId)) return null;

  const active: ActiveMission = {
    def,
    status: 'active',
    objectives: def.objectives.map(o => ({ ...o, current: 0 })),
  };
  log.active.push(active);
  return active;
}

/** Track a kill event */
export function onMissionKill(log: MissionLog, enemyType: string, isBoss: boolean): string[] {
  const completed: string[] = [];
  for (const mission of log.active) {
    if (mission.status !== 'active') continue;
    for (const obj of mission.objectives) {
      if (obj.type === 'kill' && obj.target === enemyType && obj.current < obj.required) {
        obj.current++;
      }
      if (obj.type === 'boss' && obj.target === enemyType && isBoss && obj.current < obj.required) {
        obj.current++;
      }
    }
    if (mission.objectives.every(o => o.current >= o.required)) {
      mission.status = 'complete';
      completed.push(mission.def.id);
    }
  }
  return completed;
}

/** Track a resource collection */
export function onMissionCollect(log: MissionLog, resourceName: string): string[] {
  const completed: string[] = [];
  for (const mission of log.active) {
    if (mission.status !== 'active') continue;
    for (const obj of mission.objectives) {
      if (obj.type === 'collect' && obj.target === resourceName && obj.current < obj.required) {
        obj.current++;
      }
    }
    if (mission.objectives.every(o => o.current >= o.required)) {
      mission.status = 'complete';
      completed.push(mission.def.id);
    }
  }
  return completed;
}

/** Track zone exploration */
export function onMissionExplore(log: MissionLog, zoneName: string): string[] {
  const completed: string[] = [];
  for (const mission of log.active) {
    if (mission.status !== 'active') continue;
    for (const obj of mission.objectives) {
      if (obj.type === 'explore' && obj.target === zoneName && obj.current < obj.required) {
        obj.current++;
      }
    }
    if (mission.objectives.every(o => o.current >= o.required)) {
      mission.status = 'complete';
      completed.push(mission.def.id);
    }
  }
  return completed;
}

/** Track dungeon entrance */
export function onMissionDungeonEnter(log: MissionLog, dungeonId: string): string[] {
  const completed: string[] = [];
  for (const mission of log.active) {
    if (mission.status !== 'active') continue;
    for (const obj of mission.objectives) {
      if (obj.type === 'dungeon' && obj.target === dungeonId && obj.current < obj.required) {
        obj.current++;
      }
    }
    if (mission.objectives.every(o => o.current >= o.required)) {
      mission.status = 'complete';
      completed.push(mission.def.id);
    }
  }
  return completed;
}

/** Claim rewards for a completed mission */
export function claimMission(log: MissionLog, missionId: string): MissionReward | null {
  const idx = log.active.findIndex(a => a.def.id === missionId && a.status === 'complete');
  if (idx < 0) return null;
  const mission = log.active[idx];
  const reward = mission.def.reward;
  mission.status = 'claimed';
  log.completed.push(missionId);
  log.active.splice(idx, 1);
  return reward;
}

/** Abandon a mission */
export function abandonMission(log: MissionLog, missionId: string): boolean {
  const idx = log.active.findIndex(a => a.def.id === missionId);
  if (idx < 0) return false;
  log.active.splice(idx, 1);
  return true;
}

// ── Persistence ────────────────────────────────────────────────

const MISSION_STORAGE_KEY = 'grudge_mission_log';

export function saveMissionLog(log: MissionLog): void {
  try {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify({
      active: log.active.map(a => ({
        id: a.def.id,
        status: a.status,
        objectives: a.objectives.map(o => o.current),
      })),
      completed: log.completed,
    }));
  } catch {}
}

export function loadMissionLog(): MissionLog {
  const log = createMissionLog();
  try {
    const raw = localStorage.getItem(MISSION_STORAGE_KEY);
    if (!raw) return log;
    const saved = JSON.parse(raw);
    log.completed = saved.completed || [];
    for (const entry of saved.active || []) {
      const def = MISSIONS.find(m => m.id === entry.id);
      if (!def) continue;
      const active: ActiveMission = {
        def,
        status: entry.status || 'active',
        objectives: def.objectives.map((o, i) => ({ ...o, current: entry.objectives?.[i] ?? 0 })),
      };
      // Re-check completion
      if (active.objectives.every(o => o.current >= o.required)) active.status = 'complete';
      log.active.push(active);
    }
  } catch {}
  return log;
}
